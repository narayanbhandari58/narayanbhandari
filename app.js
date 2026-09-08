/* =========================================
   PUBLIC WEBSITE APP
========================================= */

const state = { posts: [], filter: "all", current: null };
const $ = s => document.querySelector(s);

const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

function cleanText(value){
  return String(value ?? "").replace(/&nbsp;/gi, " ").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}
function cleanContent(value){
  return String(value ?? "").replace(/&nbsp;/gi, " ").replace(/\u00a0/g, " ");
}

function postUrl(id){
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("post", id);
  return url.toString();
}

// Server-rendered URL used specifically for Facebook/WhatsApp link previews.
function socialShareUrl(id){
  return `${window.location.origin}/post/${encodeURIComponent(id)}`;
}

function toast(message){
  const t = $("#toast");
  if(!t) return;
  t.textContent = message;
  t.style.display = "block";
  setTimeout(() => { t.style.display = "none"; }, 3000);
}

async function api(action, options = {}){
  const r = await fetch(`/.netlify/functions/api?action=${encodeURIComponent(action)}`, {
    ...options,
    headers:{"Content-Type":"application/json", ...(options.headers || {})}
  });
  let d = {};
  try{ d = await r.json(); }catch{}
  if(!r.ok) throw Error(d.error || "Request failed");
  return d;
}

function card(p){
  const image = p.featuredImage ? `<img src="${esc(p.featuredImage)}" alt="${esc(p.title)}" loading="lazy">` : `<span>📝</span>`;
  const plain = cleanText(String(p.content || "").replace(/<[^>]*>/g, " "));
  const date = new Date(p.created || p.date).toLocaleDateString("ne-NP");
  const comments = Array.isArray(p.comments) ? p.comments.length : 0;
  return `<article class="card" data-id="${esc(p.id)}" tabindex="0" role="button" aria-label="${esc(p.title)} पढ्नुहोस्"><div class="card-img">${image}</div><div class="card-body"><span class="badge">${esc(p.category)}</span><h3>${esc(p.title)}</h3><div class="excerpt">${esc(plain.slice(0,160))}${plain.length > 160 ? "…" : ""}</div><div class="meta"><span>${date}</span><span>👍 ${p.likes || 0} · 💬 ${comments}</span></div></div></article>`;
}

function render(){
  const filtered = state.filter === "all" ? state.posts : state.posts.filter(p => p.category === state.filter);
  $("#posts").innerHTML = filtered.length ? filtered.map(card).join("") : `<div class="empty">कुनै सामग्री भेटिएन।</div>`;
  const lok = state.posts.filter(p => p.category === "लोकसेवा").slice(0,3);
  $("#loksewaPosts").innerHTML = lok.length ? lok.map(card).join("") : `<div class="empty">लोकसेवा सामग्री छिट्टै थपिनेछ।</div>`;
  const lit = state.posts.filter(p => p.category === "साहित्य").slice(0,3);
  $("#literaturePosts").innerHTML = lit.length ? lit.map(card).join("") : `<div class="empty">साहित्यिक सामग्री छिट्टै थपिनेछ।</div>`;
}

async function load(){
  try{
    const d = await api("posts");
    state.posts = (d.posts || []).filter(p => p.status !== "draft");
    render();
    openPostFromUrl();
  }catch(e){
    $("#posts").innerHTML = `<div class="empty">सामग्री लोड हुन सकेन। केही समयपछि पुनः प्रयास गर्नुहोस्।</div>`;
    console.error(e);
  }
}

function ensureShareButton(){
  const actions = $(".post-actions");
  if(!actions || $("#shareBtn")) return;
  const button = document.createElement("button");
  button.className = "share-button";
  button.id = "shareBtn";
  button.type = "button";
  button.setAttribute("aria-label", "पोस्ट शेयर गर्नुहोस्");
  button.innerHTML = "<span>🔗</span><span>Share</span>";
  actions.appendChild(button);
  button.onclick = shareCurrentPost;
}

async function shareCurrentPost(){
  const p = state.posts.find(x => String(x.id) === String(state.current));
  if(!p) return;

  // Always share the server-rendered /post/<id> URL so social crawlers receive
  // the individual post title, description and featured image.
  const shareUrl = socialShareUrl(p.id);
  const shareData = {
    title: p.title,
    text: cleanText(String(p.content || "").replace(/<[^>]*>/g, " ")).slice(0, 180),
    url: shareUrl
  };

  try{
    if(navigator.share){
      await navigator.share(shareData);
      return;
    }
  }catch(e){
    if(e && e.name === "AbortError") return;
  }

  try{
    await navigator.clipboard.writeText(shareUrl);
    toast("Facebook/WhatsApp का लागि post link copy भयो।");
  }catch{
    window.prompt("पोस्ट link copy गर्नुहोस्:", shareUrl);
  }
}

function showPostModal(id){
  const p = state.posts.find(x => String(x.id) === String(id));
  if(!p) return false;
  state.current = p.id;
  $("#modalTitle").textContent = p.title;
  $("#modalCategory").textContent = p.category;
  $("#modalDate").textContent = new Date(p.created || p.date).toLocaleDateString("ne-NP");
  const image = p.featuredImage ? `<img src="${esc(p.featuredImage)}" alt="${esc(p.title)}">` : "";
  $("#modalContent").innerHTML = image + cleanContent(p.content || "");
  $("#likeCount").textContent = p.likes || 0;
  const comments = Array.isArray(p.comments) ? p.comments : [];
  $("#comments").innerHTML = comments.length ? comments.map(c => `<div class="comment"><b>${esc(c.author)}</b><div>${esc(c.text)}</div></div>`).join("") : `<p>अहिलेसम्म टिप्पणी छैन।</p>`;
  ensureShareButton();
  $("#postModal").classList.add("show");
  $("#postModal").setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  return true;
}

function openPost(id){
  if(!showPostModal(id)) return;
  history.pushState({ postModal: id }, "", postUrl(id));
}

function openPostFromUrl(){
  const id = new URLSearchParams(window.location.search).get("post");
  if(!id) return;
  if(showPostModal(id)) history.replaceState({ postModal: id }, "", postUrl(id));
}

function hidePostModal(){
  state.current = null;
  $("#postModal").classList.remove("show");
  $("#postModal").setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function closePostModal(){
  if(history.state && history.state.postModal){
    history.back();
  }else{
    const url = new URL(window.location.href);
    url.searchParams.delete("post");
    history.replaceState(null, "", url);
    hidePostModal();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  load();

  window.addEventListener("popstate", () => {
    const id = new URLSearchParams(window.location.search).get("post");
    if(id){
      if(!showPostModal(id)) hidePostModal();
    }else{
      hidePostModal();
    }
  });

  $("#hamburger").onclick = () => $("#navMenu").classList.toggle("open");
  document.querySelectorAll(".nav-link").forEach(a => a.onclick = () => $("#navMenu").classList.remove("open"));

  $("#filters").onclick = e => {
    const b = e.target.closest(".filter");
    if(!b) return;
    document.querySelectorAll(".filter").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    state.filter = b.dataset.filter;
    render();
  };

  document.body.onclick = e => {
    const c = e.target.closest(".card");
    if(c) openPost(c.dataset.id);
  };

  document.body.onkeydown = e => {
    if(e.key !== "Enter" && e.key !== " ") return;
    const c = e.target.closest(".card");
    if(c){ e.preventDefault(); openPost(c.dataset.id); }
  };

  $("#closeModal").onclick = () => closePostModal();
  $("#postModal").onclick = e => { if(e.target.id === "postModal") closePostModal(); };

  $("#likeBtn").onclick = async () => {
    try{
      const d = await api("like", { method:"POST", body: JSON.stringify({ id: state.current }) });
      $("#likeCount").textContent = d.likes;
      const p = state.posts.find(x => x.id === state.current);
      if(p) p.likes = d.likes;
      render();
    }catch(e){ toast(e.message); }
  };

  $("#commentForm").onsubmit = async e => {
    e.preventDefault();
    try{
      const d = await api("comment", { method:"POST", body: JSON.stringify({ id: state.current, author: $("#commentAuthor").value.trim(), text: $("#commentText").value.trim() }) });
      const p = state.posts.find(x => x.id === state.current);
      if(p) p.comments = d.comments || p.comments || [];
      $("#commentText").value = "";
      showPostModal(state.current);
      render();
    }catch(e){ toast(e.message); }
  };
});
