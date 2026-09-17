const { allow, cleanup } = require('./security-rate-limit');
const { handler: apiHandler } = require('./api');

const MAX_REQUEST_BYTES = 5_800_000;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

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
  if (!body || !body.data || !body.name || !body.mime) {
    return 'File name, MIME type र data आवश्यक छ';
  }

  const mime = String(body.mime).toLowerCase().trim();
  const allowedExts = ALLOWED_UPLOADS.get(mime);
  if (!allowedExts) return 'यो file type upload गर्न अनुमति छैन';

  const name = String(body.name).trim();
  if (name.length > 120 || name.includes('\\') || name.includes('/') || name.includes('\0')) {
    return 'Invalid file name';
  }

  const ext = extOf(name);
  if (!allowedExts.includes(ext)) return 'File extension र MIME type मिलेन';

  const data = String(body.data).replace(/\s/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data) || data.length % 4 !== 0) {
    return 'Invalid base64 file data';
  }

  const buffer = Buffer.from(data, 'base64');
  if (!buffer.length) return 'Empty file';
  if (buffer.length > MAX_UPLOAD_BYTES) return 'File size 4 MB भन्दा बढी हुन मिल्दैन';
  if (!hasMagic(buffer, mime)) return 'File content र MIME type मिलेन';

  return null;
}

exports.handler = async (event) => {
  cleanup();

  if (methodOf(event) === 'OPTIONS') {
    return json(204, null, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    });
  }

  const action = actionOf(event);
  const method = methodOf(event);

  if (bodyBytes(event) > MAX_REQUEST_BYTES) {
    return json(413, { error: 'Request धेरै ठूलो छ' });
  }

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

  if (action === 'like' || action === 'comment') {
    let body;
    try { body = event.body ? JSON.parse(event.body) : {}; } catch { return json(400, { error: 'Invalid JSON' }); }
    if (!body.id || !/^[A-Za-z0-9_-]{1,100}$/.test(String(body.id))) {
      return json(400, { error: 'Invalid post id' });
    }
    if (action === 'comment') {
      const author = String(body.author || '').trim();
      const text = String(body.text || '').trim();
      if (!author || !text || author.length > 80 || text.length > 2000) {
        return json(400, { error: 'नाम/टिप्पणीको आकार मान्य छैन' });
      }
    }
  }

  if (action === 'upload') {
    let body;
    try { body = event.body ? JSON.parse(event.body) : {}; } catch { return json(400, { error: 'Invalid JSON' }); }
    const error = validateUpload(body);
    if (error) return json(400, { error });
  }

  return apiHandler(event);
};
