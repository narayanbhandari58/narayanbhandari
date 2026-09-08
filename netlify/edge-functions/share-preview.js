export default async (request, context) => {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/share\/([^/?#]+)\/?$/i);
  const id = match ? decodeURIComponent(match[1]) : '';

  if (!id) return context.next();

  try {
    const response = await fetch('https://raw.githubusercontent.com/narayanbhandari58/narayanbhandari/main/posts/index.json', {
      headers: { 'User-Agent': 'narayan-bhandari-social-preview/3.0' }
    });
    if (!response.ok) return new Response('Share preview unavailable', { status: 502 });

    const posts = await response.json();
    const post = (Array.isArray(posts) ? posts : []).find(p => String(p.id) === String(id) && p.status !== 'draft');
    if (!post) return new Response('Post not found', { status: 404 });

    const esc = value => String(value ?? '').replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
    const text = String(post.content || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
    const description = text.slice(0, 180) + (text.length > 180 ? '…' : '');
    const image = post.featuredImage || 'https://narayan-bhandari.com.np/image/logo.png';
    const shareUrl = `https://narayan-bhandari.com.np/share/${encodeURIComponent(post.id)}`;
    const canonical = `https://narayan-bhandari.com.np/?post=${encodeURIComponent(post.id)}`;

    const html = `<!doctype html><html lang="ne"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(post.title)} — नारायण भण्डारी</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="नारायण भण्डारी"><meta property="og:locale" content="ne_NP">
<meta property="og:title" content="${esc(post.title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(shareUrl)}">
<meta property="og:image" content="${esc(image)}"><meta property="og:image:secure_url" content="${esc(image)}"><meta property="og:image:alt" content="${esc(post.title)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(post.title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${esc(image)}">
<meta name="robots" content="index,follow"></head><body><h1>${esc(post.title)}</h1><p>${esc(description)}</p><p><a href="${esc(canonical)}">पोस्ट पढ्नुहोस्</a></p>
<script>if(!/facebookexternalhit|Facebot|WhatsApp|Twitterbot|LinkedInBot|Googlebot|bingbot|Slackbot|TelegramBot|Discordbot|Pinterest|Skype/i.test(navigator.userAgent||'')){location.replace(${JSON.stringify(canonical)})}</script></body></html>`;
    return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=UTF-8', 'cache-control': 'public,max-age=300,s-maxage=300,stale-while-revalidate=60' } });
  } catch (error) {
    console.error(error);
    return new Response('Share preview unavailable', { status: 500 });
  }
};

export const config = { path: '/share/*' };
