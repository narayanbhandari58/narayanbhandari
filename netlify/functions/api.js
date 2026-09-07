```js
const crypto = require("crypto");

/* =========================================
   CONFIG
========================================= */

const REPO =
  process.env.GITHUB_REPO ||
  "narayanbhandari58/narayanbhandari";

const BRANCH =
  process.env.GITHUB_BRANCH ||
  "main";

const TOKEN =
  process.env.GITHUB_TOKEN;

const USER =
  process.env.ADMIN_USERNAME ||
  "Narayan";

const PASS =
  process.env.ADMIN_PASSWORD;

const SECRET =
  process.env.ADMIN_JWT_SECRET;

const GA_PROPERTY_ID =
  process.env.GA_PROPERTY_ID;

const GA_SERVICE_ACCOUNT_JSON =
  process.env.GA_SERVICE_ACCOUNT_JSON;

const GH =
  "https://api.github.com";


/* =========================================
   GITHUB
========================================= */

const headers = () => ({
  "Authorization": `Bearer ${TOKEN}`,
  "Accept": "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json"
});


/* =========================================
   BASE64URL
========================================= */

function b64(s) {
  return Buffer
    .from(s)
    .toString("base64url");
}


function unb(s) {
  return Buffer
    .from(s, "base64url")
    .toString();
}


/* =========================================
   ADMIN JWT
========================================= */

function sign(obj) {

  const h =
    b64(
      JSON.stringify({
        alg: "HS256",
        typ: "JWT"
      })
    );

  const p =
    b64(
      JSON.stringify(obj)
    );

  return `${h}.${p}.${b64(
    crypto
      .createHmac(
        "sha256",
        SECRET
      )
      .update(`${h}.${p}`)
      .digest()
  )}`;

}


function verify(t) {

  try {

    const [
      h,
      p,
      s
    ] = t.split(".");


    const good =
      b64(
        crypto
          .createHmac(
            "sha256",
            SECRET
          )
          .update(`${h}.${p}`)
          .digest()
      ) === s;


    const o =
      JSON.parse(
        unb(p)
      );


    if (
      !good ||
      o.exp <
        Date.now() / 1000
    ) {
      throw 0;
    }


    return o;

  } catch {

    return null;

  }

}


function auth(e) {

  const t =
    (
      e.headers?.authorization ||
      ""
    )
      .replace(
        /^Bearer\s+/i,
        ""
      );

  return t && verify(t);

}


/* =========================================
   GITHUB API
========================================= */

async function gh(
  path,
  opt = {}
) {

  const r =
    await fetch(
      `${GH}/repos/${REPO}/contents/${path}`,
      {
        ...opt,

        headers: {
          ...headers(),
          ...(opt.headers || {})
        }
      }
    );


  const d =
    await r.json();


  if (!r.ok) {

    throw Error(
      d.message ||
      "GitHub request failed"
    );

  }


  return d;

}


/* =========================================
   READ FILE
========================================= */

async function readFile(path) {

  const d =
    await gh(path);


  return {

    sha: d.sha,

    content:
      Buffer
        .from(
          d.content
            .replace(/\n/g, ""),
          "base64"
        )
        .toString("utf8")

  };

}


/* =========================================
   WRITE FILE
========================================= */

async function writeFile(
  path,
  content,
  message,
  sha
) {

  const body = {

    message,

    content:
      Buffer
        .from(content)
        .toString("base64"),

    branch:
      BRANCH

  };


  if (sha) {

    body.sha = sha;

  }


  return gh(
    path,
    {
      method: "PUT",

      body:
        JSON.stringify(body)
    }
  );

}


/* =========================================
   POSTS
========================================= */

async function posts() {

  try {

    return JSON.parse(
      (
        await readFile(
          "posts/index.json"
        )
      ).content
    );

  } catch {

    return [];

  }

}


/* =========================================
   SAVE INDEX
========================================= */

async function saveIndex(arr) {

  let sha;


  try {

    sha =
      (
        await readFile(
          "posts/index.json"
        )
      ).sha;

  } catch {}


  await writeFile(
    "posts/index.json",
    JSON.stringify(
      arr,
      null,
      2
    ),
    "Update post index",
    sha
  );

}


/* =========================================
   GOOGLE ANALYTICS
========================================= */

/*
   Service Account JSON बाट
   Google OAuth access token बनाउने।
*/

async function getGoogleAccessToken() {

  if (
    !GA_SERVICE_ACCOUNT_JSON
  ) {

    throw Error(
      "GA_SERVICE_ACCOUNT_JSON is not configured"
    );

  }


  const credentials =
    JSON.parse(
      GA_SERVICE_ACCOUNT_JSON
    );


  if (
    !credentials.client_email ||
    !credentials.private_key
  ) {

    throw Error(
      "Invalid Google Service Account JSON"
    );

  }


  const now =
    Math.floor(
      Date.now() / 1000
    );


  const header =
    b64(
      JSON.stringify({
        alg: "RS256",
        typ: "JWT"
      })
    );


  const payload =
    b64(
      JSON.stringify({

        iss:
          credentials.client_email,

        scope:
          "https://www.googleapis.com/auth/analytics.readonly",

        aud:
          "https://oauth2.googleapis.com/token",

        iat:
          now,

        exp:
          now + 3600

      })
    );


  const unsigned =
    `${header}.${payload}`;


  const signer =
    crypto.createSign(
      "RSA-SHA256"
    );


  signer.update(
    unsigned
  );


  const signature =
    signer.sign(
      credentials.private_key,
      "base64url"
    );


  const assertion =
    `${unsigned}.${signature}`;


  const tokenResponse =
    await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded"
        },

        body:
          new URLSearchParams({

            grant_type:
              "urn:ietf:params:oauth:grant-type:jwt-bearer",

            assertion

          }).toString()

      }
    );


  const tokenData =
    await tokenResponse.json();


  if (
    !tokenResponse.ok
  ) {

    throw Error(
      tokenData.error_description ||
      tokenData.error ||
      "Google OAuth failed"
    );

  }


  return tokenData.access_token;

}


/* =========================================
   GA4 REPORT
========================================= */

async function getAnalyticsReport() {

  if (!GA_PROPERTY_ID) {

    throw Error(
      "GA_PROPERTY_ID is not configured"
    );

  }


  const accessToken =
    await getGoogleAccessToken();


  const url =
    `https://analyticsdata.googleapis.com/v1beta/properties/${GA_PROPERTY_ID}:runReport`;


  const response =
    await fetch(
      url,
      {
        method: "POST",

        headers: {

          "Authorization":
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json"

        },

        body:
          JSON.stringify({

            dateRanges: [

              {
                startDate:
                  "30daysAgo",

                endDate:
                  "today"
              }

            ],

            dimensions: [

              {
                name:
                  "date"
              }

            ],

            metrics: [

              {
                name:
                  "activeUsers"
              },

              {
                name:
                  "screenPageViews"
              },

              {
                name:
                  "sessions"
              }

            ],

            orderBys: [

              {
                dimension: {

                  dimensionName:
                    "date"

                }

              }

            ]

          })

      }
    );


  const data =
    await response.json();


  if (
    !response.ok
  ) {

    throw Error(
      data.error?.message ||
      "Google Analytics API request failed"
    );

  }


  return data;

}


/* =========================================
   MAIN HANDLER
========================================= */

exports.handler =
  async (event) => {

    /* =====================================
       CORS
    ===================================== */

    if (
      event.httpMethod ===
      "OPTIONS"
    ) {

      return {

        statusCode: 204,

        headers: {

          "Access-Control-Allow-Origin":
            "*",

          "Access-Control-Allow-Headers":
            "Content-Type, Authorization",

          "Access-Control-Allow-Methods":
            "GET, POST, OPTIONS"

        }

      };

    }


    try {

      const q =
        new URLSearchParams(
          event.rawQuery || ""
        );


      const action =
        q.get("action");


      const body =
        event.body
          ? JSON.parse(event.body)
          : {};


      /* ===================================
         LOGIN
      =================================== */

      if (
        action === "login"
      ) {

        if (
          !PASS ||
          !SECRET ||
          !TOKEN
        ) {

          return {

            statusCode: 500,

            body:
              JSON.stringify({

                error:
                  "Netlify environment variables are not configured"

              })

          };

        }


        if (
          body.username !== USER ||
          body.password !== PASS
        ) {

          return {

            statusCode: 401,

            body:
              JSON.stringify({

                error:
                  "गलत username वा password"

              })

          };

        }


        return {

          statusCode: 200,

          body:
            JSON.stringify({

              token:
                sign({

                  sub:
                    USER,

                  exp:
                    Math.floor(
                      Date.now() / 1000
                    ) + 86400

                })

            })

        };

      }


      /* ===================================
         PUBLIC POSTS
      =================================== */

      if (
        action === "posts"
      ) {

        return {

          statusCode: 200,

          body:
            JSON.stringify({

              posts:
                await posts()

            })

        };

      }


      /* ===================================
         LIKE / COMMENT
      =================================== */

      if (
        action === "like" ||
        action === "comment"
      ) {

        const arr =
          await posts();


        const p =
          arr.find(
            x =>
              x.id === body.id
          );


        if (!p) {

          throw Error(
            "Post not found"
          );

        }


        if (
          action === "like"
        ) {

          p.likes =
            (p.likes || 0) + 1;

        }


        if (
          action === "comment"
        ) {

          if (
            !body.author ||
            !body.text
          ) {

            return {

              statusCode: 400,

              body:
                JSON.stringify({

                  error:
                    "नाम र टिप्पणी आवश्यक छ"

                })

            };

          }


          p.comments =
            p.comments || [];


          p.comments.push({

            author:
              String(
                body.author
              ).slice(
                0,
                80
              ),

            text:
              String(
                body.text
              ).slice(
                0,
                2000
              ),

            date:
              new Date()
                .toISOString()

          });

        }


        const f =
          await readFile(
            `posts/${p.id}.json`
          );


        await writeFile(

          `posts/${p.id}.json`,

          JSON.stringify(
            p,
            null,
            2
          ),

          `Update engagement: ${p.title}`,

          f.sha

        );


        const i =
          arr.findIndex(
            x =>
              x.id === p.id
          );


        arr[i] = p;


        await saveIndex(
          arr
        );


        return {

          statusCode: 200,

          body:
            JSON.stringify({

              likes:
                p.likes || 0,

              comments:
                p.comments || []

            })

        };

      }


      /* ===================================
         ADMIN AUTHENTICATION
      =================================== */

      if (
        !auth(event)
      ) {

        return {

          statusCode: 401,

          body:
            JSON.stringify({

              error:
                "Login आवश्यक छ"

            })

        };

      }


      /* ===================================
         GOOGLE ANALYTICS
      =================================== */

      if (
        action === "analytics"
      ) {

        try {

          const data =
            await getAnalyticsReport();


          return {

            statusCode: 200,

            headers: {

              "Content-Type":
                "application/json",

              "Access-Control-Allow-Origin":
                "*"

            },

            body:
              JSON.stringify(
                data
              )

          };

        } catch (e) {

          console.error(
            "GA4 ERROR:",
            e
          );


          return {

            statusCode: 500,

            body:
              JSON.stringify({

                error:
                  "Google Analytics data ल्याउन सकिएन",

                details:
                  e.message

              })

          };

        }

      }


      /* ===================================
         SAVE POST
      =================================== */

      if (
        action === "save"
      ) {

        if (
          !body.title ||
          !body.content
        ) {

          return {

            statusCode: 400,

            body:
              JSON.stringify({

                error:
                  "Title/content required"

              })

          };

        }


        const arr =
          await posts();


        const id =
          body.id ||
          `post-${Date.now()}`;


        const existing =
          arr.find(
            x =>
              x.id === id
          );


        const p = {

          id,

          title:
            body.title,

          category:
            body.category ||
            "विचार",

          tags:
            body.tags ||
            "",

          content:
            body.content,

          featuredImage:
            body.featuredImage ||
            "",

          created:
            body.id
              ? (
                  existing?.created ||
                  new Date()
                    .toISOString()
                )
              : new Date()
                  .toISOString(),

          updated:
            new Date()
              .toISOString(),

          status:
            body.status ||
            "published",

          likes:
            body.id
              ? (
                  existing?.likes ||
                  0
                )
              : 0,

          comments:
            body.id
              ? (
                  existing?.comments ||
                  []
                )
              : []

        };


        let oldSha;


        try {

          oldSha =
            (
              await readFile(
                `posts/${id}.json`
              )
            ).sha;

        } catch {}


        await writeFile(

          `posts/${id}.json`,

          JSON.stringify(
            p,
            null,
            2
          ),

          `${
            body.id
              ? "Update"
              : "Add"
          } post: ${body.title}`,

          oldSha

        );


        const i =
          arr.findIndex(
            x =>
              x.id === id
          );


        if (i >= 0) {

          arr[i] = p;

        } else {

          arr.unshift(p);

        }


        await saveIndex(
          arr
        );


        return {

          statusCode: 200,

          body:
            JSON.stringify({

              message:
                "पोस्ट सफलतापूर्वक सेभ भयो",

              post:
                p

            })

        };

      }


      /* ===================================
         DELETE POST
      =================================== */

      if (
        action === "delete"
      ) {

        const arr =
          await posts();


        const p =
          arr.find(
            x =>
              x.id === body.id
          );


        if (!p) {

          throw Error(
            "Post not found"
          );

        }


        const f =
          await readFile(
            `posts/${p.id}.json`
          );


        await gh(
          `posts/${p.id}.json`,
          {

            method:
              "DELETE",

            body:
              JSON.stringify({

                message:
                  `Delete post: ${p.title}`,

                sha:
                  f.sha,

                branch:
                  BRANCH

              })

          }
        );


        await saveIndex(
          arr.filter(
            x =>
              x.id !== p.id
          )
        );


        return {

          statusCode: 200,

          body:
            JSON.stringify({

              message:
                "पोस्ट मेटाइयो"

            })

        };

      }


      /* ===================================
         UPLOAD
      =================================== */

      if (
        action === "upload"
      ) {

        if (
          !body.data ||
          !body.name
        ) {

          return {

            statusCode: 400,

            body:
              JSON.stringify({

                error:
                  "File required"

              })

          };

        }


        const safe =
          body.name.replace(
            /[^a-zA-Z0-9._-]/g,
            "-"
          );


        const path =
          `image/uploads/${Date.now()}-${safe}`;


        await writeFile(

          path,

          Buffer.from(
            body.data,
            "base64"
          ),

          `Upload media: ${safe}`

        );


        return {

          statusCode: 200,

          body:
            JSON.stringify({

              url:
                `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${path}`

            })

        };

      }


      /* ===================================
         UNKNOWN ACTION
      =================================== */

      return {

        statusCode: 404,

        body:
          JSON.stringify({

            error:
              "Unknown action"

          })

      };


    } catch (e) {

      console.error(
        e
      );


      return {

        statusCode: 500,

        body:
          JSON.stringify({

            error:
              e.message ||
              "Server error"

          })

      };

    }

  };
```
