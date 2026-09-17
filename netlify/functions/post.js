const SITE = "https://narayan-bhandari.com.np";
const INDEX_URL = "https://raw.githubusercontent.com/narayanbhandari58/narayanbhandari/main/posts/index.json";

function esc(value) {
  return String(value ?? "").replace(/[&<>\"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;"
  }[m]));
}

function plain(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function absolute(value, fallback) {
  try { return new URL(String(value || fallback), SITE).href; }
  catch { return fallback; }
}

exports.handler = async event => {
  const id = event.pathParameters?.id || event.queryStringParameters?.id || "";
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) {
    return { statusCode: 404, headers: { "Content-Type": "text/plain; charset=UTF-8", "X-Content-Type-Options": "nosniff" }, body: "Post not found" };
  }

  try {
    const response = await fetch(INDEX_URL, { headers: { "User-Agent": "narayan-bhandari-post-page/1.1" } });
    if (!response.ok) throw new Error(`Index request failed: ${response.status}`);
    const posts = await response.json();
    const post = (Array.isArray(posts) ? posts : []).find(p => String(p.id) === id && p.status !== "draft");
    if (!post) return { statusCode: 404, headers: { "Content-Type": "text/plain; charset=UTF-8", "X-Content-Type-Options": "nosniff" }, body: "Post not found" };

    const title = String(post.title || "पोस्ट").trim();
    const body = plain(post.content);
    const description = String(post.seoDescription || "").trim() || body.slice(0, 180) + (body.length > 180 ? "…" : "");
    const seoTitle = String(post.seoTitle || "").trim() || `${title} — नारायण भण्डारी`;
    const canonical = `${SITE}/post/${encodeURIComponent(id)}`;
    const image = absolute(post.featuredImage, `${SITE}/image/logo.png`);
    const published = post.created || post.date || "";
    const modified = post.updated || published;
    const category = String(post.category || "").trim();
    const tags = Array.isArray(post.tags)
      ? post.tags.map(String).map(x => x.trim()).filter(Boolean).slice(0, 10)
      : String(post.tags || "").split(/[,\n]/).map(x => x.trim()).filter(Boolean).slice(0, 10);

    const tagJson = tags.map(esc).join(", ");
    const jsonLd = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": title,
      "description": description,
      "image": [image],
      "datePublished": published || undefined,
      "dateModified": modified || published || undefined,
      "author": { "@type": "Person", "name": "नारायण भण्डारी", "url": `${SITE}/about_me.html` },
      "publisher": { "@type": "Person", "name": "नारायण भण्डारी", "url": SITE },
      "mainEntityOfPage": { "@type": "WebPage", "@id": canonical },
      "articleSection": category || undefined,
      "keywords": tags.length ? tags.join(", ") : undefined,
      "inLanguage": "ne-NP"
    }).replace(/,?\"[^\"]+\":undefined/g, "");

    const breadcrumbJsonLd = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "गृहपृष्ठ", "item": SITE + "/" },
        { "@type": "ListItem", "position": 2, "name": "लेखहरू", "item": SITE + "/#blog" },
        { "@type": "ListItem", "position": 3, "name": title, "item": canonical }
      ]
    }).replace(/<\/script/gi, "<\\/script");

    const articleText = body || "यो पोस्टको सामग्री उपलब्ध छैन।";

    const html = `<!doctype html>
<html lang="ne">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(seoTitle)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="नारायण भण्डारी">
<meta property="og:locale" content="ne_NP">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:secure_url" content="${esc(image)}">
<meta property="og:image:alt" content="${esc(title)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
${published ? `<meta property="article:published_time" content="${esc(published)}">` : ""}
${modified ? `<meta property="article:modified_time" content="${esc(modified)}">` : ""}
${category ? `<meta property="article:section" content="${esc(category)}">` : ""}
${tags.map(tag => `<meta property="article:tag" content="${esc(tag)}">`).join("")}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<meta name="twitter:image:alt" content="${esc(title)}">
<script type="application/ld+json">${jsonLd.replace(/<\/script/gi, "<\\/script")}</script>
<script type="application/ld+json">${breadcrumbJsonLd}</script>
<style>body{font-family:system-ui,-apple-system,"Noto Sans Devanagari",sans-serif;max-width:860px;margin:auto;padding:24px;line-height:1.8;color:#222}img{max-width:100%;height:auto;border-radius:12px}a{color:#8f0e04}nav{margin-bottom:20px}.meta{color:#666;font-size:.9rem}h1{line-height:1.45}</style>
</head>
<body>
<nav><a href="${SITE}/">गृहपृष्ठ</a> · <a href="${SITE}/about_me.html">मेरो बारेमा</a> · <a href="${SITE}/loksewa.html">लोकसेवा</a></nav>
<main>
${post.featuredImage ? `<img src="${esc(image)}" alt="${esc(title)}" width="1200" height="630" loading="eager" fetchpriority="high">` : ""}
<p class="meta">${esc(category)}${published ? ` · ${esc(new Date(published).toLocaleDateString("ne-NP"))}` : ""}${tagJson ? ` · ${tagJson}` : ""}</p>
<h1>${esc(title)}</h1>
<p>${esc(articleText)}</p>
<p><a href="${SITE}/?post=${encodeURIComponent(id)}">वेबसाइटको पूर्ण पोस्ट दृश्य खोल्नुहोस्</a></p>
</main>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=60",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin"
      },
      body: html
    };
  } catch (error) {
    console.error("Post page error:", error);
    return { statusCode: 500, headers: { "Content-Type": "text/plain; charset=UTF-8", "X-Content-Type-Options": "nosniff" }, body: "Post page unavailable" };
  }
};