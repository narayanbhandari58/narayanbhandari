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

async function getCredentialsForKey(key = KEY) {
  return store().get(key, { type: "json", consistency: "strong" });
}

async function getCredentials() {
  return getCredentialsForKey(KEY);
}

async function setPasswordForKey(password, key = KEY) {
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = await hashPassword(password, salt);
  await store().setJSON(key, {
    passwordHash,
    salt,
    updatedAt: new Date().toISOString()
  });
}

async function setPassword(password) {
  return setPasswordForKey(password, KEY);
}

async function verifyPasswordForKey(password, fallbackPassword = "", key = KEY) {
  let credentials = await getCredentialsForKey(key);

  // First successful login after deployment migrates the configured
  // environment password into the dedicated Blob credential record.
  if (!credentials?.passwordHash || !credentials?.salt) {
    if (!fallbackPassword || String(password) !== String(fallbackPassword)) return false;
    await setPasswordForKey(fallbackPassword, key);
    credentials = await getCredentialsForKey(key);
  }

  const actual = await hashPassword(password, credentials.salt);
  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(credentials.passwordHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function verifyPassword(password, fallbackPassword = "") {
  return verifyPasswordForKey(password, fallbackPassword, KEY);
}

module.exports = { getCredentials, setPassword, verifyPassword, verifyPasswordForKey };
