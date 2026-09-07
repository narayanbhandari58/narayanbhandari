const crypto = require("crypto");

const USER = process.env.ADMIN_USERNAME || "Narayan";
const PASS = process.env.ADMIN_PASSWORD;
const SECRET = process.env.ADMIN_JWT_SECRET;
const NETLIFY_TOKEN = process.env.NETLIFY_AUTH_TOKEN;
const NETLIFY_ACCOUNT_ID = process.env.NETLIFY_ACCOUNT_ID;
const SITE_ID = process.env.SITE_ID;

function b64(s) { return Buffer.from(s).toString("base64url"); }
function unb(s) { return Buffer.from(s, "base64url").toString(); }
function verify(t) {
  try {
    const [h, p, s] = String(t || "").split(".");
    if (!h || !p || !s || !SECRET) return null;
    const good = b64(crypto.createHmac("sha256", SECRET).update(`${h}.${p}`).digest()) === s;
    const o = JSON.parse(unb(p));
    if (!good || !o.exp || o.exp < Date.now() / 1000 || o.sub !== USER) return null;
    return o;
  } catch { return null; }
}
function auth(event) {
  const t = (event.headers?.authorization || "").replace(/^Bearer\s+/i, "");
  return verify(t);
}
function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    },
    body: JSON.stringify(body)
  };
}

async function netlify(path, options = {}) {
  const r = await fetch(`https://api.netlify.com/api/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${NETLIFY_TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await r.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!r.ok) throw Error(data.message || data.error || `Netlify API error (${r.status})`);
  return data;
}

async function updateEnv(key, value) {
  return netlify(`/accounts/${encodeURIComponent(NETLIFY_ACCOUNT_ID)}/env/${encodeURIComponent(key)}?site_id=${encodeURIComponent(SITE_ID)}`, {
    method: "PUT",
    body: JSON.stringify({ key, values: [{ value, context: "all" }], is_secret: true })
  });
}

async function triggerDeploy() {
  const hook = await netlify(`/sites/${encodeURIComponent(SITE_ID)}/build_hooks`, {
    method: "POST",
    body: JSON.stringify({ title: "Admin password change", branch: "main" })
  });
  if (!hook.url) throw Error("Netlify build hook बनाउन सकिएन");
  const r = await fetch(hook.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: "admin-password-change" })
  });
  if (!r.ok) throw Error("नयाँ password लागू गर्न Netlify deploy सुरु हुन सकेन");
  return hook.id;
}

exports.handler = async event => {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  try {
    if (!auth(event)) return json(401, { error: "Login आवश्यक छ" });
    if (!PASS || !SECRET) return json(500, { error: "Admin environment variables are not configured" });
    if (!NETLIFY_TOKEN || !NETLIFY_ACCOUNT_ID || !SITE_ID) {
      return json(500, { error: "Password change setup पूरा भएको छैन: NETLIFY_AUTH_TOKEN, NETLIFY_ACCOUNT_ID आवश्यक छन्" });
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    const confirmPassword = String(body.confirmPassword || "");

    if (currentPassword !== PASS) return json(401, { error: "हालको password गलत छ" });
    if (newPassword.length < 10) return json(400, { error: "नयाँ password कम्तीमा 10 characters हुनुपर्छ" });
    if (newPassword !== confirmPassword) return json(400, { error: "नयाँ password र confirmation मिलेन" });
    if (newPassword === currentPassword) return json(400, { error: "नयाँ password हालको password भन्दा फरक हुनुपर्छ" });

    const newSecret = crypto.randomBytes(48).toString("base64url");
    await updateEnv("ADMIN_PASSWORD", newPassword);
    await updateEnv("ADMIN_JWT_SECRET", newSecret);
    await triggerDeploy();

    return json(200, { message: "Password परिवर्तन भयो। नयाँ deploy सुरु गरिएको छ। पुरानो session अब मान्य रहने छैन।" });
  } catch (e) {
    console.error(e);
    return json(500, { error: e.message || "Password change failed" });
  }
};
