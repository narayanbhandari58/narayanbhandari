exports.handler = async (event) => {
  const site = 'https://narayan-bhandari.com.np';
  const qsId = event.queryStringParameters?.post;
  const path = event.path || '';
  const pathMatch = path.match(/\/share\/([^/?#]+)\/?$/i);
  const id = qsId || (pathMatch ? decodeURIComponent(pathMatch[1]) : '');

  if (!id) return { statusCode: 400, headers: { 'Content-Type': 'text/plain; charset=UTF-8', 'Cache-Control': 'no-store' }, body: 'Missing post id' };

  try {
    const response = await fetch('https://raw.githubusercontent.com/narayanbhandari58/narayanbhandari/main/posts/index.json', {
      headers: { 'User-Agent': 'narayan-bhandari-social-preview/3.5' }
    });
    if (!response.ok) throw new Error(`Post index request failed: ${response.status}`);

    const posts = await response.json();
    const post = (Array.isArray(posts) ? posts : []).find(p => String(p.id) === String(id) && p.status !== 'draft');
    if (!post) return { statusCode: 404, headers: { 'Content-Type': 'text/plain; charset=UTF-8', 'Cache-Control': 'no-store' }, body: 'Post not found' };

    const esc = value => String(value ?? '').replace(/[&<>\"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#039;' }[m]));
    const text = String(post.content || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
    const description = String(post.seoDescription || '').trim() || (text.slice(0, 180) + (text.length > 180 ? '…' : ''));
    const title = String(post.seoTitle || '').trim() || `${String(post.title || '').trim()} — नारायण भण्डारी`;
    let image = `${site}/image/logo.png`;
    try { image = new URL(String(post.featuredImage || '').trim() || image, site).toString(); } catch {}

    const shareUrl = `${site}/share/${encodeURIComponent(post.id)}`;
    const canonical = `${site}/post/${encodeURIComponent(post.id)}`;
    const published = post.created || post.date || '';
    const modified = post.updated || published;
    const category = String(post.category || '').trim();
    const tags = Array.isArray(post.tags)
      ? post.tags.map(String).map(x => x.trim()).filter(Boolean).slice(0, 10)
      : String(post.tags || '').split(/[,\n]/).map(x => x.trim()).filter(Boolean).slice(0, 10);
    const publishedIso = published ? new Date(published).toISOString() : '';
    const modifiedIso = modified ? new Date(modified).toISOString() : '';

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: String(post.title || ''),
      description,
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
      author: { '@type': 'Person', name: 'नारायण भण्डारी', url: site + '/' },
      publisher: { '@type': 'Person', name: 'नारायण भण्डारी', url: site + '/' },
      image: [image],
      datePublished: publishedIso || undefined,
      dateModified: modifiedIso || undefined,
      articleSection: category || undefined,
      keywords: tags.length ? tags.join(', ') : undefined,
      inLanguage: 'ne-NP'
    };

    const html = `<!doctype html><html lang="ne"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}"><meta name="robots" content="noindex,follow">
<meta property="og:type" content="article"><meta property="og:site_name" content="नारायण भण्डारी"><meta property="og:locale" content="ne_NP">
<meta property="og:title" content="${esc(post.title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(shareUrl)}">
<meta property="og:image" content="${esc(image)}"><meta property="og:image:secure_url" content="${esc(image)}"><meta property="og:image:alt" content="${esc(post.title)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
${publishedIso ? `<meta property="article:published_time" content="${esc(publishedIso)}">` : ''}${modifiedIso ? `<meta property="article:modified_time" content="${esc(modifiedIso)}">` : ''}${category ? `<meta property="article:section" content="${esc(category)}">` : ''}${tags.map(tag => `<meta property="article:tag" content="${esc(tag)}">`).join('')}
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(post.title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${esc(image)}"><meta name="twitter:image:alt" content="${esc(post.title)}">
<link rel="canonical" href="${esc(canonical)}"><script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script></head><body><main><h1>${esc(post.title)}</h1><p>${esc(description)}</p><p><a href="${esc(canonical)}">पोस्ट पढ्नुहोस्</a></p></main>
<script>(function(){var target=${JSON.stringify(`${site}/?post=${encodeURIComponent(post.id)}`)};var ua=navigator.userAgent||'';var crawler=/facebookexternalhit|Facebot|WhatsApp|Twitterbot|LinkedInBot|Googlebot|bingbot|Slackbot|TelegramBot|Discordbot|Pinterest|Skype/i.test(ua);if(!crawler)window.location.replace(target);})();</script>
</body></html>`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60' },
      body: html
    };
  } catch (error) {
    console.error('Share preview error:', error);
    return { statusCode: 500, headers: { 'Content-Type': 'text/plain; charset=UTF-8', 'Cache-Control': 'no-store' }, body: 'Share preview unavailable' };
  }
};