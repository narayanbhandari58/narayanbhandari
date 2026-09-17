const crypto = require('crypto');
const { allow, cleanup } = require('./security-rate-limit');
const { handler: apiHandler } = require('./api');

const REPO = process.env.GITHUB_REPO || 'narayanbhandari58/narayanbhandari';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN;
const GH = 'https://api.github.com';
const MAX_REQUEST_BYTES = 5_800_000;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const DEVICE_COOKIE = 'nb_device_id';
const DEVICE_MAX_AGE = 60 * 60 * 24 * 365 * 5;

const ALLOWED_UPLOADS = new Map([
  ['image/jpeg', ['jpg', 'jpeg']],
  ['image/png', ['png']],
  ['image/webp', ['webp']],
  ['image/gif', ['gif']],
  ['video/mp4', ['mp4']],
  ['video/webm', ['webm']]
]);

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      ...extraHeaders
    },
    body: JSON.stringify(body)
  };
}

function actionOf(event) {
  return new URLSearchParams(event.rawQuery || '').get('action') || '';
}

function methodOf(event) {
  return String(event.httpMethod || 'GET').toUpperCase();
}

function bodyBytes(event) {
  if (!event.body) return 0;
  return Buffer.byteLength(String(event.body), 'utf8');
}

function extOf(name) {
  const match = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}

function hasMagic(buffer, mime) {
  if (!buffer || buffer.length < 4) return false;
  if (mime === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  if (mime === 'image/gif') return buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a';
  if (mime === 'image/webp') return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  if (mime === 'video/mp4') return buffer.subarray(4, 8).toString('ascii') === 'ftyp';
  if (mime === 'video/webm') return buffer.subarray(0, 4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
  return false;
}

function validateUpload(body) {
  if (!body || !body.data || !body.name || !body.mime) return 'File name, MIME type र data आवश्यक छ';

  const mime = String(body.mime).toLowerCase().trim();
  const allowedExts = ALLOWED_UPLOADS.get(mime);
  if (!allowedExts) return 'यो file type upload गर्न अनुमति छैन';

  const name = String(body.name).trim();
  if (name.length > 120 || name.includes('\\') || name.includes('/') || name.includes('\0')) return 'Invalid file name';

  const ext = extOf(name);
  if (!allowedExts.includes(ext)) return 'File extension र MIME type मिलेन';

  const data = String(body.data).replace(/\s/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data) || data.length % 4 !== 0) return 'Invalid base64 file data';

  const buffer = Buffer.from(data, 'base64');
  if (!buffer.length) return 'Empty file';
  if (buffer.length > MAX_UPLOAD_BYTES) return 'File size 4 MB भन्दा बढी हुन मिल्दैन';
  if (!hasMagic(buffer, mime)) return 'File content र MIME type मिलेन';

  return null;
}

function header(event, name) {
  const h = event?.headers || {};
  return h[name] || h[name.toLowerCase()] || h[name.toUpperCase()] || '';
}

function cookieValue(event, name) {
  const raw = header(event, 'cookie');
  const part = String(raw).split(';').map(x => x.trim()).find(x => x.startsWith(`${name}=`));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : '';
}

function newDeviceId() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(24).toString('hex');
}

function deviceId(event) {
  const value = cookieValue(event, DEVICE_COOKIE);
  if (/^[A-Za-z0-9_-]{20,100}$/.test(value)) return value;
  return newDeviceId();
}

function deviceCookie(id) {
  return `${DEVICE_COOKIE}=${encodeURIComponent(id)}; Max-Age=${DEVICE_MAX_AGE}; Path=/; SameSite=Lax; Secure`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

async function gh(path, options = {}) {
  if (!TOKEN) throw new Error('Server configuration error');
  const response = await fetch(`${GH}/repos/${REPO}/contents/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Storage request failed');
  return data;
}

async function readJsonFile(path) {
  const data = await gh(path);
  return {
    sha: data.sha,
    value: JSON.parse(Buffer.from(String(data.content).replace(/\n/g, ''), 'base64').toString('utf8'))
  };
}

async function writeJsonFile(path, value, message, sha) {
  const body = {
    message,
    content: Buffer.from(JSON.stringify(value, null, 2)).toString('base64'),
    branch: BRANCH,
    ...(sha ? { sha } : {})
  };
  return gh(path, { method: 'PUT', body: JSON.stringify(body) });
}

async function handleUniqueLike(event) {
  const body = event.body ? JSON.parse(event.body) : {};
  const id = String(body.id || '');
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) return json(400, { error: 'Invalid post id' });

  const device = deviceId(event);
  const deviceHash = sha256(device);
  const postFile = await readJsonFile(`posts/${id}.json`);
  const post = postFile.value;

  if (!post || typeof post !== 'object') return json(404, { error: 'Post not found' }, { 'Set-Cookie': deviceCookie(device) });

  const liked = Array.isArray(post.likedDevices) ? post.likedDevices : [];
  if (liked.includes(deviceHash)) {
    return json(200, {
      likes: Number(post.likes || 0),
      comments: Array.isArray(post.comments) ? post.comments : [],
      alreadyLiked: true
    }, { 'Set-Cookie': deviceCookie(device) });
  }

  liked.push(deviceHash);
  post.likedDevices = liked;
  post.likes = Number(post.likes || 0) + 1;

  await writeJsonFile(`posts/${id}.json`, post, `Update like: ${post.title || id}`, postFile.sha);

  const indexFile = await readJsonFile('posts/index.json');
  const index = Array.isArray(indexFile.value) ? indexFile.value : [];
  const indexPos = index.findIndex(x => String(x?.id) === id);
  if (indexPos >= 0) {
    index[indexPos] = post;
    await writeJsonFile('posts/index.json', index, 'Update post index engagement', indexFile.sha);
  }

  return json(200, {
    likes: post.likes,
    comments: Array.isArray(post.comments) ? post.comments : [],
    alreadyLiked: false
  }, { 'Set-Cookie': deviceCookie(device) });
}

function sanitizeContent(value) {
  let html = String(value ?? '');

  html = html.replace(/<\/?(?:script|style|object|embed|form|input|button|meta|link|base|textarea|select|option)[^>]*>/gi, '');
  html = html.replace(/<iframe\b([^>]*)>/gi, (full, attrs) => {
    const src = attrs.match(/\bsrc\s*=\s*(["'])(.*?)\1/i);
    if (!src || !/^https:\/\//i.test(src[2])) return '';
    const safeAttrs = attrs
      .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/\s+srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    return `<iframe${safeAttrs}>`;
  });
  html = html.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  html = html.replace(/\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  html = html.replace(/\s+srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  html = html.replace(/\s+(href|src|poster)\s*=\s*(["'])(.*?)\2/gi, (full, attr, quote, url) => {
    const u = String(url).trim();
    const allowedImageData = attr.toLowerCase() === 'src' && /^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(u);
    const safe = /^(?:https?:\/\/|\/|\.\/|\.\.\/)/i.test(u) || allowedImageData;
    if (!safe || /^(?:javascript|vbscript|data:text|data:application):/i.test(u)) return '';
    return ` ${attr}=${quote}${u}${quote}`;
  });

  return html;
}

function sanitizeSaveBody(event) {
  const body = event.body ? JSON.parse(event.body) : {};
  if (body && Object.prototype.hasOwnProperty.call(body, 'content')) body.content = sanitizeContent(body.content);
  return { ...event, body: JSON.stringify(body) };
}

function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };
}

exports.handler = async (event) => {
  cleanup();

  if (methodOf(event) === 'OPTIONS') {
    return json(204, null, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      ...securityHeaders()
    });
  }

  const action = actionOf(event);
  const method = methodOf(event);

  if (bodyBytes(event) > MAX_REQUEST_BYTES) return json(413, { error: 'Request धेरै ठूलो छ' });

  const limits = {
    login: [5, 10 * 60_000],
    posts: [30, 60_000],
    like: [6, 60_000],
    comment: [3, 60_000],
    upload: [6, 10 * 60_000],
    save: [20, 60_000],
    delete: [10, 60_000],
    analytics: [20, 60_000]
  };

  const [limit, windowMs] = limits[action] || [20, 60_000];
  if (!allow(event, `api:${action || 'unknown'}`, limit, windowMs)) {
    return json(429, { error: 'धेरै requests पठाइयो। केही बेरपछि फेरि प्रयास गर्नुहोस्।' }, { 'Retry-After': '60' });
  }

  if (action === 'like' || action === 'comment' || action === 'save' || action === 'delete' || action === 'upload' || action === 'login') {
    if (method !== 'POST') return json(405, { error: 'POST आवश्यक छ' });
  }

  if (action === 'like') {
    try {
      return await handleUniqueLike(event);
    } catch (error) {
      console.error('LIKE ERROR:', error);
      return json(500, { error: 'Like सुरक्षित रूपमा save गर्न सकिएन' });
    }
  }

  if (action === 'comment') {
    let body;
    try { body = event.body ? JSON.parse(event.body) : {}; } catch { return json(400, { error: 'Invalid JSON' }); }
    if (!body.id || !/^[A-Za-z0-9_-]{1,100}$/.test(String(body.id))) return json(400, { error: 'Invalid post id' });
    const author = String(body.author || '').trim();
    const text = String(body.text || '').trim();
    if (!author || !text || author.length > 80 || text.length > 2000) return json(400, { error: 'नाम/टिप्पणीको आकार मान्य छैन' });
  }

  if (action === 'upload') {
    let body;
    try { body = event.body ? JSON.parse(event.body) : {}; } catch { return json(400, { error: 'Invalid JSON' }); }
    const error = validateUpload(body);
    if (error) return json(400, { error });
  }

  let forwardedEvent = event;
  if (action === 'save') {
    try {
      forwardedEvent = sanitizeSaveBody(event);
    } catch {
      return json(400, { error: 'Invalid JSON' });
    }
  }

  try {
    const result = await apiHandler(forwardedEvent);
    const headers = { ...(result?.headers || {}), ...securityHeaders() };
    if (result?.statusCode === 500) {
      return {
        ...result,
        headers,
        body: JSON.stringify({ error: 'Server-side request पूरा हुन सकेन' })
      };
    }
    return { ...result, headers };
  } catch (error) {
    console.error('API ERROR:', error);
    return json(500, { error: 'Server-side request पूरा हुन सकेन' });
  }
};
