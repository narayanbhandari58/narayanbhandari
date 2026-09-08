exports.handler = async (event) => {
  const site = 'https://narayan-bhandari.com.np';
  const qsId = event.queryStringParameters?.post;
  const path = event.path || '';

  // Support both Netlify's rewritten query parameter and direct /share/<id>
  // requests. This keeps social crawlers and normal browsers on the same
  // post-specific server-rendered endpoint.
  const pathMatch = path.match(/\/share\/([^/?#]+)\/?$/i);
  const id = qsId || (pathMatch ? decodeURIComponent(pathMatch[1]) : '');

  if (!id) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'text/plain; charset=UTF-8',
        'Cache-Control': 'no-store'
      },
      body: 'Missing post id'
    };
  }

  try {
    const indexUrl = 'https://raw.githubusercontent.com/narayanbhandari58/narayanbhandari/main/posts/index.json';
    const response = await fetch(indexUrl, {
      headers: { 'User-Agent': 'narayan-bhandari-social-preview' }
    });

    if (!response.ok) throw new Error(`Post index request failed: ${response.status}`);

    const posts = await response.json();
    const post = (Array.isArray(posts) ? posts : []).find(
      p => String(p.id) === String(id) && p.status !== 'draft'
    );

    if (!post) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'text/plain; charset=UTF-8',
          'Cache-Control': 'no-store'
        },
        body: 'Post not found'
      };
    }

    const esc = value => String(value ?? '').replace(/[&<>"']/g, m => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
    }[m]));

    const text = String(post.content || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const description = text.slice(0, 180) + (text.length > 180 ? '…' : '');
    const image = post.featuredImage
      ? new URL(post.featuredImage, site).toString()
      : `${site}/image/logo.png`;

    // Keep /share/<id> as the crawler-facing URL. The actual app URL remains
    // /?post=<id>, which app.js uses to open the post modal.
    const shareUrl = `${site}/share/${encodeURIComponent(post.id)}`;
    const canonical = `${site}/?post=${encodeURIComponent(post.id)}`;

    const html = `<!doctype html>
<html lang="ne">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(post.title)} — नारायण भण्डारी</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index,follow">
<meta property="og:type" content="article">
<meta property="og:site_name" content="नारायण भण्डारी">
<meta property="og:locale" content="ne_NP">
<meta property="og:title" content="${esc(post.title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(shareUrl)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:secure_url" content="${esc(image)}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:alt" content="${esc(post.title)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="article:published_time" content="${esc(post.created || '')}">
<meta property="article:modified_time" content="${esc(post.updated || post.created || '')}">
<meta property="article:section" content="${esc(post.category || '')}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(post.title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<meta name="twitter:image:alt" content="${esc(post.title)}">
<link rel="canonical" href="${esc(canonical)}">
<meta http-equiv="refresh" content="0;url=${esc(canonical)}">
</head>
<body>
<p>पोस्ट खोलिँदैछ…</p>
<script>location.replace(${JSON.stringify(canonical)});</script>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        // Do not let an old homepage preview remain cached at the edge.
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      body: html
    };
  } catch (error) {
    console.error('Share preview error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'text/plain; charset=UTF-8',
        'Cache-Control': 'no-store'
      },
      body: 'Share preview unavailable'
    };
  }
};
