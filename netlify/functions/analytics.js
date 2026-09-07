const crypto = require("crypto");

const GA_PROPERTY_ID = process.env.GA_PROPERTY_ID;
const GA_SERVICE_ACCOUNT_JSON = process.env.GA_SERVICE_ACCOUNT_JSON;

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createJWT(serviceAccount) {
  const header = base64url(
    JSON.stringify({
      alg: "RS256",
      typ: "JWT"
    })
  );

  const now = Math.floor(Date.now() / 1000);

  const payload = base64url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600
    })
  );

  const unsignedToken = `${header}.${payload}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();

  const signature = signer
    .sign(serviceAccount.private_key)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${unsignedToken}.${signature}`;
}

async function getAccessToken(serviceAccount) {
  const jwt = createJWT(serviceAccount);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body:
      "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer" +
      `&assertion=${encodeURIComponent(jwt)}`
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Google OAuth failed: ${data.error_description || data.error || "Unknown error"}`
    );
  }

  return data.access_token;
}

async function getAnalytics() {
  if (!GA_PROPERTY_ID) {
    throw new Error("GA_PROPERTY_ID is not configured");
  }

  if (!GA_SERVICE_ACCOUNT_JSON) {
    throw new Error("GA_SERVICE_ACCOUNT_JSON is not configured");
  }

  let serviceAccount;

  try {
    serviceAccount = JSON.parse(GA_SERVICE_ACCOUNT_JSON);
  } catch {
    throw new Error("GA_SERVICE_ACCOUNT_JSON is not valid JSON");
  }

  const accessToken = await getAccessToken(serviceAccount);

  const today = new Date();
  const endDate = today.toISOString().slice(0, 10);

  const start = new Date(today);
  start.setDate(start.getDate() - 29);

  const startDate = start.toISOString().slice(0, 10);

  const url =
    `https://analyticsdata.googleapis.com/v1beta/properties/` +
    `${GA_PROPERTY_ID}:runReport`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      dateRanges: [
        {
          startDate,
          endDate
        }
      ],
      dimensions: [
        {
          name: "date"
        }
      ],
      metrics: [
        {
          name: "activeUsers"
        },
        {
          name: "sessions"
        },
        {
          name: "screenPageViews"
        }
      ],
      orderBys: [
        {
          dimension: {
            dimensionName: "date"
          }
        }
      ]
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Google Analytics API failed: ${
        data.error?.message || "Unknown error"
      }`
    );
  }

  return {
    propertyId: GA_PROPERTY_ID,
    startDate,
    endDate,
    rows: data.rows || []
  };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      };
    }

    const result = await getAnalytics();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error("Analytics error:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        error: error.message || "Analytics error"
      })
    };
  }
};
