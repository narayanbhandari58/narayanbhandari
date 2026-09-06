/* =========================================
   ADMIN PANEL
========================================= */

let posts = [];
let editing = null;

const $ = s => document.querySelector(s);

const token = () =>
  localStorage.getItem("nb_admin_token");


/* =========================================
   API
========================================= */

async function api(action, opt = {}) {

  const r = await fetch(
    `/.netlify/functions/api?action=${action}`,
    {
      ...opt,

      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token()}`,
        ...(opt.headers || {})
      }
    }
  );

  const d =
    await r.json().catch(() => ({}));

  if (!r.ok) {

    throw Error(
      d.error || "Request failed"
    );

  }

  return d;
}


/* =========================================
   MESSAGE / TOAST
========================================= */

function msg(m) {

  const t = $("#toast");

  t.textContent = m;

  t.style.display = "block";

  setTimeout(
    () => t.style.display = "none",
    2500
  );

}


/* =========================================
   ESCAPE HTML
========================================= */

const esc = s =>
  String(s ?? "").replace(
    /[&<>"']/g,
    m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m])
  );


/* =========================================
   TAG SYSTEM
========================================= */

let tagList = [];


/* Render tags */

function renderTags() {

  const box = $("#tagBox");

  const input = $("#tags");


  /* पुराना tag हटाउने */

  box
    .querySelectorAll(".tag-item")
    .forEach(x => x.remove());


  /* नयाँ tag देखाउने */

  tagList.forEach(
    (tag, index) => {

      const item =
        document.createElement("span");

      item.className =
        "tag-item";


      item.innerHTML = `
        <span>
          ${esc(tag)}
        </span>

        <button
          type="button"
          data-index="${index}"
          aria-label="Remove tag"
        >
          ×
        </button>
      `;


      /* Remove tag */

      item
        .querySelector("button")
        .onclick = () => {

          tagList.splice(index, 1);

          renderTags();

          input.focus();

        };


      box.insertBefore(
        item,
        input
      );

    }
  );

}


/* =========================================
   ADD TAG
========================================= */

function addTag(value) {

  value =
    String(value || "")
      .replace(/,/g, "")
      .trim();


  if (!value) {
    return;
  }


  /* duplicate tag रोक्ने */

  if (!tagList.includes(value)) {

    tagList.push(value);

  }


  $("#tags").value = "";


  renderTags();

}


/* =========================================
   GET TAGS
========================================= */

function getTags() {

  const current =
    $("#tags").value.trim();


  /*
    यदि अन्तिम tag लेखेर
    Enter/Space नथिची
    Publish गरियो भने पनि
    त्यसलाई tag बनाउने।
  */

  if (current) {

    addTag(current);

  }


  /*
    Backend मा पहिले जस्तै
    comma separated string पठाउने।
  */

  return tagList.join(", ");

}


/* =========================================
   SET TAGS
   EDIT गर्दा पुराना tags ल्याउने
========================================= */

function setTags(value) {

  tagList =
    String(value || "")
      .split(",")
      .map(x => x.trim())
      .filter(Boolean);


  $("#tags").value = "";


  renderTags();

}


/* =========================================
   RESET FORM
========================================= */

function reset() {

  editing = null;


  $("#postForm").reset();


  $("#postId").value = "";


  $("#formHeading").textContent =
    "नयाँ पोस्ट";


  $("#imagePreview").innerHTML =
    "";


  /* Tags reset */

  tagList = [];

  renderTags();

}


/* =========================================
   RENDER POSTS
========================================= */

function render() {

  if (!posts.length) {

    $("#table").innerHTML =
      "<p>कुनै पोस्ट छैन।</p>";

    return;

  }


  $("#table").innerHTML =
    posts.map(
      p => `

        <div class="post-row">

          <b>
            ${esc(p.title)}
          </b>

          <br>

          <small>
            ${esc(p.category)}
            ·
            ${p.status}
            ·
            ${new Date(
              p.created || p.date
            ).toLocaleDateString("ne-NP")}
          </small>

          <div class="post-actions">

            <button
              class="btn btn-outline"
              onclick="editPost('${esc(p.id)}')"
              type="button"
            >
              सम्पादन
            </button>

            <button
              class="btn btn-danger"
              onclick="deletePost('${esc(p.id)}')"
              type="button"
            >
              मेटाउनुहोस्
            </button>

          </div>

        </div>

      `
    ).join("");

}


/* =========================================
   LOAD POSTS
========================================= */

async function load() {

  try {

    const d =
      await api("posts");

    posts =
      d.posts || [];

    render();

  } catch (e) {

    msg(e.message);

  }

}


/* =========================================
   EDIT POST
========================================= */

window.editPost = id => {

  const p =
    posts.find(
      x => x.id === id
    );


  if (!p) {
    return;
  }


  editing = p;


  $("#postId").value =
    p.id;


  $("#title").value =
    p.title || "";


  $("#category").value =
    p.category || "";


  /* Tags */

  setTags(
    p.tags || ""
  );


  /* Content */

  $("#content").value =
    p.content || "";


  $("#formHeading").textContent =
    "पोस्ट सम्पादन";


  /*
    TinyMCE loaded छ भने
    content पनि सेट गर्ने।
  */

  if (
    window.tinymce &&
    tinymce.get("content")
  ) {

    tinymce
      .get("content")
      .setContent(
        p.content || ""
      );

  }


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

};


/* =========================================
   DELETE POST
========================================= */

window.deletePost = async id => {

  if (
    !confirm(
      "यो पोस्ट मेटाउने?"
    )
  ) {

    return;

  }


  try {

    await api(
      "delete",
      {
        method: "POST",

        body: JSON.stringify({
          id
        })
      }
    );


    msg("पोस्ट मेटाइयो");


    await load();


  } catch (e) {

    msg(e.message);

  }

};


/* =========================================
   SAVE POST
========================================= */

async function save(status) {

  const title =
    $("#title")
      .value
      .trim();


  const category =
    $("#category")
      .value;


  /*
    Tags निकाल्ने
  */

  const tags =
    getTags();


  /*
    TinyMCE content
  */

  const content =
    tinymce
      .get("content")
      .getContent();


  /* Validation */

  if (!title || !content) {

    msg(
      "शीर्षक र सामग्री आवश्यक छ"
    );

    return;

  }


  try {

    /* =====================================
       FEATURED IMAGE
    ===================================== */

    let featuredImage =
      editing?.featuredImage || "";


    const file =
      $("#image").files[0];


    if (file) {

      const b =
        await file.arrayBuffer();


      let binary = "";


      new Uint8Array(b)
        .forEach(
          x =>
            binary +=
              String.fromCharCode(x)
        );


      const d =
        await api(
          "upload",
          {
            method: "POST",

            body: JSON.stringify({
              name: file.name,
              mime: file.type,
              data: btoa(binary)
            })
          }
        );


      featuredImage =
        d.url;

    }


    /* =====================================
       SAVE TO BACKEND
    ===================================== */

    const d =
      await api(
        "save",
        {
          method: "POST",

          body: JSON.stringify({

            id:
              editing?.id,

            title,

            category,

            tags,

            content,

            featuredImage,

            status

          })
        }
      );


    msg(
      d.message ||
      "सेभ भयो"
    );


    /* Reset */

    reset();


    /* Reload */

    await load();


  } catch (e) {

    msg(
      e.message
    );

  }

}


/* =========================================
   TAG KEYBOARD HANDLING
========================================= */

function setupTagInput() {

  const input =
    $("#tags");


  input.addEventListener(
    "keydown",
    e => {

      /*
        Enter
        Space
        Comma
        थिच्दा tag बनाउने।
      */

      if (
        e.key === "Enter" ||
        e.key === " " ||
        e.key === ","
      ) {

        e.preventDefault();


        addTag(
          input.value
        );

      }

    }
  );


  /*
    यदि comma paste गरियो भने
    पनि छुट्टाछुट्टै tag बनाउने।
  */

  input.addEventListener(
    "input",
    () => {

      const value =
        input.value;


      if (
        value.includes(",")
      ) {

        const parts =
          value.split(",");


        /*
          अन्तिम भाग input मा
          राख्ने।
        */

        const last =
          parts.pop();


        parts.forEach(
          part =>
            addTag(part)
        );


        input.value =
          last.trim();

      }

    }
  );

}


/* =========================================
   DOM READY
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {


    /* =====================================
       TAG INPUT
    ===================================== */

    setupTagInput();


    /* =====================================
       LOGIN
    ===================================== */

    $("#loginForm").onsubmit =
      async e => {

        e.preventDefault();


        try {

          const r =
            await fetch(
              "/.netlify/functions/api?action=login",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body:
                  JSON.stringify({

                    username:
                      $("#username").value,

                    password:
                      $("#password").value

                  })

              }
            );


          const d =
            await r.json();


          if (!r.ok) {

            throw Error(
              d.error ||
              "Login failed"
            );

          }


          /*
            Token save
          */

          localStorage.setItem(
            "nb_admin_token",
            d.token
          );


          /*
            Login hide
          */

          $("#login")
            .style
            .display = "none";


          /*
            Dashboard show
          */

          $("#dashboard")
            .style
            .display = "block";


          /* =================================
             TINYMCE
          ================================= */

          tinymce.init({

            selector:
              "#content",

            height:
              420,

            plugins:
              "lists link image code table",

            toolbar:
              "undo redo | blocks | bold italic | bullist numlist | link image | code",

            images_upload_handler:
              async blobInfo => {

                const b =
                  await blobInfo
                    .blob()
                    .arrayBuffer();


                let binary = "";


                new Uint8Array(b)
                  .forEach(
                    x =>
                      binary +=
                        String.fromCharCode(x)
                  );


                const d =
                  await api(
                    "upload",
                    {
                      method:
                        "POST",

                      body:
                        JSON.stringify({

                          name:
                            blobInfo.filename(),

                          mime:
                            blobInfo
                              .blob()
                              .type,

                          data:
                            btoa(binary)

                        })

                    }
                  );


                return d.url;

              }

          });


          await load();


        } catch (e) {

          $("#loginMsg")
            .textContent =
              e.message;

        }

      };


    /* =====================================
       LOGOUT
    ===================================== */

    $("#logout").onclick =
      () => {

        localStorage.removeItem(
          "nb_admin_token"
        );

        location.reload();

      };


    /* =====================================
       NEW POST
    ===================================== */

    $("#newPost").onclick =
      () => {

        reset();

        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });

      };


    /* =====================================
       CANCEL
    ===================================== */

    $("#cancel").onclick =
      () => {

        reset();

      };


    /* =====================================
       PUBLISH
    ===================================== */

    $("#publish").onclick =
      e => {

        e.preventDefault();

        save("published");

      };


    /* =====================================
       DRAFT
    ===================================== */

    $("#draft").onclick =
      e => {

        e.preventDefault();

        save("draft");

      };


    /* =====================================
       AUTO LOGIN
    ===================================== */

    if (token()) {

      $("#login")
        .style
        .display = "none";


      $("#dashboard")
        .style
        .display = "block";


      /*
        Auto-login हुँदा पनि
        TinyMCE पूर्ण configuration सहित
        load गर्ने।
      */

      tinymce.init({

        selector:
          "#content",

        height:
          420,

        plugins:
          "lists link image code table",

        toolbar:
          "undo redo | blocks | bold italic | bullist numlist | link image | code",

        images_upload_handler:
          async blobInfo => {

            const b =
              await blobInfo
                .blob()
                .arrayBuffer();


            let binary = "";


            new Uint8Array(b)
              .forEach(
                x =>
                  binary +=
                    String.fromCharCode(x)
              );


            const d =
              await api(
                "upload",
                {
                  method: "POST",

                  body:
                    JSON.stringify({

                      name:
                        blobInfo.filename(),

                      mime:
                        blobInfo
                          .blob()
                          .type,

                      data:
                        btoa(binary)

                    })

                }
              );


            return d.url;

          }

      });


      load();

    }


  }
);
