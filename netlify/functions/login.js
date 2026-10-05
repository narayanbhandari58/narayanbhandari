const crypto = require("crypto");
const { verifyPassword } = require("./auth-store");
const { allow, cleanup } = require("./security-rate-limit");

const USER = process.env.ADMIN_USERNAME || "Narayan";
const PASS = process.env.ADMIN_PASSWORD;
const SECRET = process.env.ADMIN_JWT_SECRET;
const TOKEN = process.env.GITHUB_TOKEN;
const MODERATOR_USER = process.env.MODERATOR_USERNAME;
const MODERATOR_PASS = process.env.MODERATOR_PASSWORD;

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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    },
    body: JSON.stringify(body)
  };
}

exports.handler = async event => {
  cleanup();
  if (!allow(event, "admin-login", 5, 10 * 60_000)) return json(429, { error: "धेरै login प्रयास भयो। केही बेरपछि फेरि प्रयास गर्नुहोस्।" });
  if (event.httpMethod === "OPTIONS") return json(204, {});
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  try {
    if (!USER || !PASS || !SECRET || !TOKEN) {
      return json(500, { error: "Netlify environment variables are not configured" });
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const username = String(body.username || "");
    const password = String(body.password || "");

    let role = "";
    let matchedUser = "";

    if (username === USER) {
      const valid = await verifyPassword(password, PASS);
      if (valid) {
        role = "admin";
        matchedUser = USER;
      }
    } else if (MODERATOR_USER && MODERATOR_PASS && username === MODERATOR_USER) {
      const valid = await verifyPassword(password, MODERATOR_PASS);
      if (valid) {
        role = "moderator";
        matchedUser = MODERATOR_USER;
      }
    }

    if (!role) return json(401, { error: "गलत username वा password" });

    return json(200, {
      token: sign({
        sub: matchedUser,
        role,
        exp: Math.floor(Date.now() / 1000) + 86400
      }),
      role,
      username: matchedUser
    });
  } catch (e) {
    console.error(e);
    return json(500, { error: e.message || "Login failed" });
  }
};
