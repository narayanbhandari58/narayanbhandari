exports.handler = async () => {
  const site = 'https://narayan-bhandari.com.np';
  const indexUrl = 'https://raw.githubusercontent.com/narayanbhandari58/narayanbhandari/main/posts/index.json';

  try {
    const response = await fetch(indexUrl, {
      headers: { 'User-Agent': 'narayan-bhandari-sitemap/1.1' }
    });
    if (!response.ok) throw new Error(`Post index request failed: ${response.status}`);

    const posts = await response.json();
    const published = (Array.isArray(posts) ? posts : [])
      .filter(post => post && /^[A-Za-z0-9_-]{1,100}$/.test(String(post.id || '')) && post.status !== 'draft');

    const esc = value => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    const urls = [
      { loc: `${site}/`, changefreq: 'daily', priority: '1.0' },
      { loc: `${site}/about_me.html`, changefreq: 'monthly', priority: '0.8' },
      { loc: `${site}/loksewa.html`, changefreq: 'weekly', priority: '0.9' },
      { loc: `${site}/gallery.html`, changefreq: 'monthly', priority: '0.6' },
      { loc: `${site}/font.html`, changefreq: 'monthly', priority: '0.5' }
    ];

    for (const post of published) {
      urls.push({
        loc: `${site}/post/${encodeURIComponent(post.id)}`,
        lastmod: post.updated || post.created || post.date || '',
        changefreq: 'monthly',
        priority: '0.8'
      });
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
      urls.map(item => `<url><loc>${esc(item.loc)}</loc>${item.lastmod ? `<lastmod>${esc(item.lastmod)}</lastmod>` : ''}<changefreq>${item.changefreq}</changefreq><priority>${item.priority}</priority></url>`).join('') +
      `</urlset>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml; charset=UTF-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60'
      },
      body: xml
    };
  } catch (error) {
    console.error('Sitemap error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/xml; charset=UTF-8', 'Cache-Control': 'no-store' },
      body: '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'
    };
  }
};
