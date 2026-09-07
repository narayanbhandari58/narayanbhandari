/* =========================================
   ADMIN PANEL
========================================= */

let posts = [];
let editing = null;
let imageRemoved = false;

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

  const d = await r.json().catch(() => ({}));

  if (!r.ok) {
    throw Error(d.error || "Request failed");
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
  setTimeout(() => t.style.display = "none", 2500);
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

function renderTags() {
  const box = $("#tagBox");
  const input = $("#tags");

  box.querySelectorAll(".tag-item").forEach(x => x.remove());

  tagList.forEach((tag, index) => {
    const item = document.createElement("span");
    item.className = "tag-item";

    item.innerHTML = `
      <span>${esc(tag)}</span>
      <button type="button" data-index="${index}" aria-label="Remove tag">×</button>
    `;

    item.querySelector("button").onclick = () => {
      tagList.splice(index, 1);
      renderTags();
      input.focus();
    };

    box.insertBefore(item, input);
  });
}


/* =========================================
   ADD TAG
========================================= */

function addTag(value) {
  value = String(value || "").replace(/,/g, "").trim();

  if (!value) return;

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
  const current = $("#tags").value.trim();

  if (current) {
    addTag(current);
  }

  return tagList.join(", ");
}


/* =========================================
   SET TAGS
   EDIT गर्दा पुराना tags ल्याउने
========================================= */

function setTags(value) {
  tagList = String(value || "")
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);

  $("#tags").value = "";
  renderTags();
}


/* =========================================
   IMAGE PREVIEW
========================================= */

function clearImagePreview() {
  const preview = $("#imagePreview");
  if (preview) preview.innerHTML = "";
}

function showImagePreview(src, label = "Featured Image preview") {
  const preview = $("#imagePreview");
  if (!preview || !src) return;

  preview.innerHTML = `
    <div class="image-preview-card">
      <img src="${esc(src)}" alt="${esc(label)}">
      <div class="image-preview-info">
        <small>${esc(label)}</small>
        <button type="button" class="btn btn-danger image-remove-btn" id="removeImage">🗑 हटाउनुहोस्</button>
      </div>
    </div>
  `;

  const removeBtn = $("#removeImage");
  if (removeBtn) {
    removeBtn.onclick = () => {
      const input = $("#image");
      if (input) input.value = "";

      imageRemoved = true;
      clearImagePreview();
      msg("Featured Image हटाइयो");
    };
  }
}

function setupImagePreview() {
  const input = $("#image");
  if (!input) return;

  input.addEventListener("change", () => {
    const file = input.files && input.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      clearImagePreview();
      msg("कृपया image file मात्र छान्नुहोस्");
      input.value = "";
      return;
    }

    imageRemoved = false;
    const url = URL.createObjectURL(file);
    showImagePreview(url, file.name);
  });
}


/* =========================================
   RESET FORM
========================================= */

function reset() {
  editing = null;
  imageRemoved = false;
  $("#postForm").reset();
  $("#postId").value = "";
  $("#formHeading").textContent = "नयाँ पोस्ट";
  clearImagePreview();
  tagList = [];
  renderTags();
}


/* =========================================
   RENDER POSTS
========================================= */

function render() {
  if (!posts.length) {
    $("#table").innerHTML = "<p>कुनै पोस्ट छैन।</p>";
    return;
  }

  $("#table").innerHTML = posts.map(p => {
    const status = String(p.status || "").toLowerCase();
    const statusLabel = status === "published" ? "प्रकाशित" : status === "draft" ? "ड्राफ्ट" : (p.status || "स्थिति छैन");
    const statusClass = status === "published" ? "published" : status === "draft" ? "draft" : "other";

    return `
      <article class="post-row">
        <div class="post-row-main">
          <div class="post-row-title-wrap">
            <b>${esc(p.title)}</b>
            <span class="status status-${statusClass}">${esc(statusLabel)}</span>
          </div>
          <small>
            ${esc(p.category)} · ${new Date(p.created || p.date).toLocaleDateString("ne-NP")}
          </small>
        </div>
        <div class="post-actions">
          <button class="btn btn-outline" onclick="editPost('${esc(p.id)}')" type="button">सम्पादन</button>
          <button class="btn btn-danger" onclick="deletePost('${esc(p.id)}')" type="button">मेटाउनुहोस्</button>
        </div>
      </article>
    `;
  }).join("");
}


/* =========================================
   LOAD POSTS
========================================= */

async function load() {
  try {
    const d = await api("posts");
    posts = d.posts || [];
    render();
  } catch (e) {
    msg(e.message);
  }
}


/* =========================================
   EDIT POST
========================================= */

window.editPost = id => {
  const p = posts.find(x => x.id === id);

  if (!p) return;

  editing = p;
  imageRemoved = false;
  $("#postId").value = p.id;
  $("#title").value = p.title || "";
  $("#category").value = p.category || "";
  setTags(p.tags || "");
  $("#content").value = p.content || "";
  $("#formHeading").textContent = "पोस्ट सम्पादन";

  if (p.featuredImage) {
    showImagePreview(p.featuredImage, "हालको Featured Image");
  } else {
    clearImagePreview();
  }

  if (window.tinymce && tinymce.get("content")) {
    tinymce.get("content").setContent(p.content || "");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
};


/* =========================================
   DELETE POST
========================================= */

window.deletePost = async id => {
  if (!confirm("यो पोस्ट मेटाउने?")) return;

  try {
    await api("delete", {
      method: "POST",
      body: JSON.stringify({ id })
    });

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
  const title = $("#title").value.trim();
  const category = $("#category").value;
  const tags = getTags();
  const content = tinymce.get("content").getContent();

  if (!title || !content) {
    msg("शीर्षक र सामग्री आवश्यक छ");
    return;
  }

  try {
    let featuredImage = editing?.featuredImage || "";
    const file = $("#image").files[0];

    if (file) {
      const b = await file.arrayBuffer();
      let binary = "";

      new Uint8Array(b).forEach(x => binary += String.fromCharCode(x));

      const d = await api("upload", {
        method: "POST",
        body: JSON.stringify({
          name: file.name,
          mime: file.type,
          data: btoa(binary)
        })
      });

      featuredImage = d.url;
    } else if (imageRemoved) {
      featuredImage = "";
    }

    const d = await api("save", {
      method: "POST",
      body: JSON.stringify({
        id: editing?.id,
        title,
        category,
        tags,
        content,
        featuredImage,
        status
      })
    });

    msg(d.message || "सेभ भयो");
    reset();
    await load();
  } catch (e) {
    msg(e.message);
  }
}


/* =========================================
   TAG KEYBOARD HANDLING
========================================= */

function setupTagInput() {
  const input = $("#tags");

  input.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " " || e.key === ",") {
      e.preventDefault();
      addTag(input.value);
    }
  });

  input.addEventListener("input", () => {
    const value = input.value;

    if (value.includes(",")) {
      const parts = value.split(",");
      const last = parts.pop();

      parts.forEach(part => addTag(part));
      input.value = last.trim();
    }
  });
}


/* =========================================
   TINYMCE CONFIG
========================================= */

function initEditor() {
  if (window.tinymce && tinymce.get("content")) return;

  tinymce.init({
    selector: "#content",
    height: 420,
    plugins: "lists link image media code table",
    toolbar: "undo redo | blocks | fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media table | lineheight removeformat | code",
    line_height_formats: "1 1.15 1.2 1.3 1.5 1.75 2 2.5 3",
    image_caption: true,
    image_advtab: true,
    media_live_embeds: true,
    toolbar_mode: "sliding",
    contextmenu: "link image table",
    quickbars_selection_toolbar: "bold italic | quicklink h2 h3 blockquote",
    content_style: "body { font-family: Arial, 'Noto Sans Devanagari', sans-serif; font-size: 16px; line-height: 1.7; } figure.image { display: inline-block; } figure.image figcaption { text-align: center; font-size: 0.9em; opacity: 0.8; padding: 4px; }",
    images_upload_handler: async blobInfo => {
      const b = await blobInfo.blob().arrayBuffer();
      let binary = "";

      new Uint8Array(b).forEach(x => binary += String.fromCharCode(x));

      const d = await api("upload", {
        method: "POST",
        body: JSON.stringify({
          name: blobInfo.filename(),
          mime: blobInfo.blob().type,
          data: btoa(binary)
        })
      });

      return d.url;
    }
  });
}


/* =========================================
   DOM READY
========================================= */

document.addEventListener("DOMContentLoaded", () => {
  setupTagInput();
  setupImagePreview();

  $("#loginForm").onsubmit = async e => {
    e.preventDefault();

    try {
      const r = await fetch("/.netlify/functions/api?action=login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: $("#username").value,
          password: $("#password").value
        })
      });

      const d = await r.json();

      if (!r.ok) {
        throw Error(d.error || "Login failed");
      }

      localStorage.setItem("nb_admin_token", d.token);
      $("#login").style.display = "none";
      $("#dashboard").style.display = "block";

      initEditor();
      await load();
    } catch (e) {
      $("#loginMsg").textContent = e.message;
    }
  };

  $("#logout").onclick = () => {
    localStorage.removeItem("nb_admin_token");
    location.reload();
  };

  $("#newPost").onclick = () => {
    reset();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  $("#cancel").onclick = () => {
    reset();
  };

  $("#publish").onclick = e => {
    e.preventDefault();
    save("published");
  };

  $("#draft").onclick = e => {
    e.preventDefault();
    save("draft");
  };

  if (token()) {
    $("#login").style.display = "none";
    $("#dashboard").style.display = "block";
    initEditor();
    load();
  }
});
