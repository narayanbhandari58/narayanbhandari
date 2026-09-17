/* Lightweight in-memory abuse guard for public Netlify Functions.
   This is intentionally fail-open across cold starts: it slows repeated bursts
   on a warm function instance without pretending to be a durable global rate limit.
*/
const buckets = new Map();

function clientKey(event, scope) {
  const headers = event?.headers || {};
  const forwarded = headers['x-forwarded-for'] || headers['X-Forwarded-For'] || '';
  const ip = String(forwarded).split(',')[0].trim() || String(headers['client-ip'] || 'unknown');
  return `${scope}:${ip}`;
}

function allow(event, scope, limit = 12, windowMs = 60_000) {
  const now = Date.now();
  const key = clientKey(event, scope);
  const old = buckets.get(key);
  if (!old || now - old.start >= windowMs) {
    buckets.set(key, { start: now, count: 1 });
    return true;
  }
  old.count += 1;
  return old.count <= limit;
}

function cleanup(maxAgeMs = 10 * 60_000) {
  const now = Date.now();
  for (const [key, item] of buckets) {
    if (now - item.start > maxAgeMs) buckets.delete(key);
  }
}

module.exports = { allow, cleanup };
