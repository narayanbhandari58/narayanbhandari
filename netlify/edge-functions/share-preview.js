export default async (request, context) => {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/share\/([^/?#]+)\/?$/i);
  const id = match ? decodeURIComponent(match[1]) : '';

  if (!id) return context.next();

  try {
    const response = await fetch('https://raw.githubusercontent.com/narayanbhandari58/narayanbhandari/main/posts/index.json', {
      headers: { 'User-Agent': 'narayan-bhandari-social-preview/3.4' }
    });
    if (!response.ok) return new Response('Share preview unavailable', { status: 502 });

    const posts = await response.json();
    const post = (Array.isArray(posts) ? posts : []).find(
      p => String(p.id) === String(id) && p.status !== 'draft'
    );
    if (!post) return new Response('Post not found', { status: 404 });

    const esc = value => String(value ?? '').replace(/[&<>\"']/g, m => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#039;'
    }[m]));
    const text = String(post.content || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const description = String(post.seoDescription || '').trim() || (text.slice(0, 180) + (text.length > 180 ? '…' : ''));
    const title = String(post.seoTitle || '').trim() || `${String(post.title || '').trim()} — नारायण भण्डारी`;

    const rawImage = String(post.featuredImage || '').trim();
    const fallbackImage = 'https://narayan-bhandari.com.np/image/logo.png';
    let image = fallbackImage;
    try { image = new URL(rawImage || fallbackImage, url.origin).href; } catch {}

    const shareUrl = `${url.origin}${url.pathname}`;
    const canonical = shareUrl;
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
      author: { '@type': 'Person', name: 'नारायण भण्डारी', url: 'https://narayan-bhandari.com.np/' },
      publisher: { '@type': 'Person', name: 'नारायण भण्डारी', url: 'https://narayan-bhandari.com.np/' },
      image: [image],
      datePublished: publishedIso || undefined,
      dateModified: modifiedIso || undefined,
      articleSection: category || undefined,
      keywords: tags.length ? tags.join(', ') : undefined,
      inLanguage: 'ne-NP'
    };

    const html = `<!doctype html><html lang="ne"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<meta property="og:type" content="article"><meta property="og:site_name" content="नारायण भण्डारी"><meta property="og:locale" content="ne_NP">
<meta property="og:title" content="${esc(post.title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(shareUrl)}">
<meta property="og:image" content="${esc(image)}"><meta property="og:image:secure_url" content="${esc(image)}"><meta property="og:image:alt" content="${esc(post.title)}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
${publishedIso ? `<meta property="article:published_time" content="${esc(publishedIso)}">` : ''}
${modifiedIso ? `<meta property="article:modified_time" content="${esc(modifiedIso)}">` : ''}
${category ? `<meta property="article:section" content="${esc(category)}">` : ''}
${tags.map(tag => `<meta property="article:tag" content="${esc(tag)}">`).join('')}
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(post.title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${esc(image)}"><meta name="twitter:image:alt" content="${esc(post.title)}">
<link rel="canonical" href="${esc(canonical)}"><script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script></head><body><main><h1>${esc(post.title)}</h1><p>${esc(description)}</p><p><a href="${esc(canonical)}">पोस्ट पढ्नुहोस्</a></p></main>
<script>(function(){var target=${JSON.stringify(`https://narayan-bhandari.com.np/?post=${encodeURIComponent(post.id)}`)};var ua=navigator.userAgent||'';var crawler=/facebookexternalhit|Facebot|WhatsApp|Twitterbot|LinkedInBot|Googlebot|bingbot|Slackbot|TelegramBot|Discordbot|Pinterest|Skype/i.test(ua);if(!crawler)window.location.replace(target);})();</script></body></html>`;
    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=UTF-8',
        'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60'
      }
    });
  } catch (error) {
    console.error(error);
    return new Response('Share preview unavailable', { status: 500 });
  }
};

export const config = { path: '/share/*' };
