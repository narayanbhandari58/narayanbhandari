const crypto = require("crypto");
const { verifyPassword, setPassword } = require("./auth-store");

const USER = process.env.ADMIN_USERNAME || "Narayan";
const PASS = process.env.ADMIN_PASSWORD;
const SECRET = process.env.ADMIN_JWT_SECRET;

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

exports.handler = async event => {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  try {
    if (!auth(event)) return json(401, { error: "Login आवश्यक छ" });
    if (!PASS || !SECRET) return json(500, { error: "Admin environment variables are not configured" });

    const body = event.body ? JSON.parse(event.body) : {};
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    const confirmPassword = String(body.confirmPassword || "");

    const currentValid = await verifyPassword(currentPassword, PASS);
    if (!currentValid) return json(401, { error: "हालको password गलत छ" });
    if (newPassword.length < 10) return json(400, { error: "नयाँ password कम्तीमा 10 characters हुनुपर्छ" });
    if (newPassword !== confirmPassword) return json(400, { error: "नयाँ password र confirmation मिलेन" });
    if (newPassword === currentPassword) return json(400, { error: "नयाँ password हालको password भन्दा फरक हुनुपर्छ" });

    await setPassword(newPassword);

    return json(200, { message: "Password परिवर्तन भयो। अब नयाँ password बाट login गर्नुहोस्।" });
  } catch (e) {
    console.error(e);
    return json(500, { error: e.message || "Password change failed" });
  }
};
