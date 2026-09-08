const crypto = require("crypto");
const { verifyPassword } = require("./auth-store");

const USER = process.env.ADMIN_USERNAME || "Narayan";
const PASS = process.env.ADMIN_PASSWORD;
const SECRET = process.env.ADMIN_JWT_SECRET;
const TOKEN = process.env.GITHUB_TOKEN;

function b64(s) {
  return Buffer.from(s).toString("base64url");
}

function sign(obj) {
  const h = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64(JSON.stringify(obj));
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(`${h}.${p}`)
    .digest();
  return `${h}.${p}.${b64(signature)}`;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    },
    body: JSON.stringify(body)
  };
}

exports.handler = async event => {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  try {
    if (!USER || !PASS || !SECRET || !TOKEN) {
      return json(500, { error: "Netlify environment variables are not configured" });
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const username = String(body.username || "");
    const password = String(body.password || "");

    if (username !== USER) return json(401, { error: "गलत username वा password" });

    const valid = await verifyPassword(password, PASS);
    if (!valid) return json(401, { error: "गलत username वा password" });

    return json(200, {
      token: sign({
        sub: USER,
        exp: Math.floor(Date.now() / 1000) + 86400
      })
    });
  } catch (e) {
    console.error(e);
    return json(500, { error: e.message || "Login failed" });
  }
};
