exports.handler = async (event) => {
  const site = 'https://narayan-bhandari.com.np';
  const qsId = event.queryStringParameters?.post;
  const path = event.path || '';

  // Support both the Netlify rewrite query parameter and direct /share/<id>.
  const pathMatch = path.match(/\/share\/([^/?#]+)\/?$/i);
  const id = qsId || (pathMatch ? decodeURIComponent(pathMatch[1]) : '');

  if (!id) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain; charset=UTF-8', 'Cache-Control': 'no-store' },
      body: 'Missing post id'
    };
  }

  try {
    const indexUrl = 'https://raw.githubusercontent.com/narayanbhandari58/narayanbhandari/main/posts/index.json';
    const response = await fetch(indexUrl, {
      headers: { 'User-Agent': 'narayan-bhandari-social-preview/2.0' }
    });

    if (!response.ok) throw new Error(`Post index request failed: ${response.status}`);

    const posts = await response.json();
    const post = (Array.isArray(posts) ? posts : []).find(
      p => String(p.id) === String(id) && p.status !== 'draft'
    );

    if (!post) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/plain; charset=UTF-8', 'Cache-Control': 'no-store' },
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

    // IMPORTANT: social crawlers must receive this exact URL as og:url.
    // The browser is redirected separately to the client-side post URL.
    const shareUrl = `${site}/share/${encodeURIComponent(post.id)}`;
    const canonical = `${site}/?post=${encodeURIComponent(post.id)}`;

    const html = `<!doctype html>
<html lang="ne">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(post.title)} — नारायण भण्डारी</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="noindex,follow">
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
</head>
<body>
<main>
<h1>${esc(post.title)}</h1>
<p>${esc(description)}</p>
${post.featuredImage ? `<img src="${esc(image)}" alt="${esc(post.title)}">` : ''}
<p><a href="${esc(canonical)}">पोस्ट पढ्नुहोस्</a></p>
</main>
<script>
(function(){
  var target = ${JSON.stringify(canonical)};
  var ua = navigator.userAgent || '';
  var crawler = /facebookexternalhit|Facebot|WhatsApp|Twitterbot|LinkedInBot|Googlebot|bingbot|Slackbot|TelegramBot|Discordbot/i.test(ua);
  if (!crawler) window.location.replace(target);
})();
</script>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60'
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
