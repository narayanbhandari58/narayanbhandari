const crypto = require("crypto");
const { getStore } = require("@netlify/blobs");

const STORE_NAME = "admin-auth";
const KEY = "credentials";

function store() {
  const siteID = process.env.SITE_ID;
  const token = process.env.NETLIFY_AUTH_TOKEN;
  if (!siteID || !token) {
    throw Error("Netlify Blobs setup पूरा भएको छैन: SITE_ID र NETLIFY_AUTH_TOKEN आवश्यक छन्");
  }
  return getStore({ name: STORE_NAME, siteID, token });
}

function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(String(password), salt, 64, { N: 16384, r: 8, p: 1 }, (err, derived) => {
      if (err) return reject(err);
      resolve(derived.toString("hex"));
    });
  });
}

async function getCredentials() {
  return store().get(KEY, { type: "json", consistency: "strong" });
}

async function setPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = await hashPassword(password, salt);
  await store().setJSON(KEY, {
    passwordHash,
    salt,
    updatedAt: new Date().toISOString()
  });
}

async function verifyPassword(password, fallbackPassword = "") {
  let credentials = await getCredentials();

  // First successful login/change after deployment migrates the old
  // Netlify environment password into the Blob store as a hash.
  if (!credentials?.passwordHash || !credentials?.salt) {
    if (!fallbackPassword || String(password) !== String(fallbackPassword)) return false;
    await setPassword(fallbackPassword);
    credentials = await getCredentials();
  }

  const actual = await hashPassword(password, credentials.salt);
  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(credentials.passwordHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { getCredentials, setPassword, verifyPassword };
