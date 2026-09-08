exports.handler = async (event) => {
  const id = event.queryStringParameters?.post;
  const site = 'https://narayan-bhandari.com.np';

  if (!id) {
    return {
      statusCode: 302,
      headers: { Location: `${site}/` },
      body: ''
    };
  }

  // Social crawlers need server-rendered metadata. The public API is used
  // here only to read the already-published post data.
  try {
    const apiUrl = `${site}/.netlify/functions/api?action=posts`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    const post = (data.posts || []).find(p => String(p.id) === String(id) && p.status !== 'draft');

    if (!post) {
      return {
        statusCode: 302,
        headers: { Location: `${site}/` },
        body: ''
      };
    }

    const esc = value => String(value ?? '').replace(/[&<>"']/g, m => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
    }[m]));

    const text = String(post.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const description = text.slice(0, 180) + (text.length > 180 ? '…' : '');

    // og:image must be an absolute URL for reliable social previews.
    const image = post.featuredImage
      ? new URL(post.featuredImage, site).toString()
      : `${site}/image/logo.png`;

    const canonical = `${site}/?post=${encodeURIComponent(post.id)}`;

    const html = `<!doctype html><html lang="ne"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(post.title)} — नारायण भण्डारी</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="नारायण भण्डारी">
<meta property="og:locale" content="ne_NP">
<meta property="og:title" content="${esc(post.title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(`${site}/post/${encodeURIComponent(post.id)}`)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:alt" content="${esc(post.title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(post.title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<meta name="twitter:image:alt" content="${esc(post.title)}">
<meta http-equiv="refresh" content="0;url=${esc(canonical)}">
</head><body><p>पोस्ट खोलिँदैछ…</p><script>location.replace(${JSON.stringify(canonical)});</script></body></html>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        'Cache-Control': 'public, max-age=300'
      },
      body: html
    };
  } catch (error) {
    return {
      statusCode: 302,
      headers: { Location: `${site}/?post=${encodeURIComponent(id)}` },
      body: ''
    };
  }
};
