const state={posts:[],filter:"all",current:null};

const $=s=>document.querySelector(s);

const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({
  "&":"&amp;",
  "<":"&lt;",
  ">":"&gt;",
  '"':"&quot;",
  "'":"&#039;"
}[m]));

function toast(m){
  const t=$("#toast");
  t.textContent=m;
  t.style.display="block";
  setTimeout(()=>t.style.display="none",3000);
}

async function api(action,options={}){
  const r=await fetch(
    `/.netlify/functions/api?action=${encodeURIComponent(action)}`,
    {
      ...options,
      headers:{
        "Content-Type":"application/json",
        ...(options.headers||{})
      }
    }
  );

  let d={};
  try{
    d=await r.json();
  }catch{}

  if(!r.ok)throw Error(d.error||"Request failed");

  return d;
}

function card(p){
  const image=p.featuredImage
    ?`<img src="${esc(p.featuredImage)}" alt="">`
    :"<span>📝</span>";

  const plain=String(p.content||"").replace(/<[^>]*>/g," ");

  return `
    <article class="card" data-id="${esc(p.id)}">
      <div class="card-img">${image}</div>

      <div class="card-body">
        <span class="badge">${esc(p.category)}</span>

        <h3>${esc(p.title)}</h3>

        <div class="excerpt">
          ${esc(plain.slice(0,150))}${plain.length>150?"…":""}
        </div>

        <div class="meta">
          <span>
            ${new Date(p.created||p.date).toLocaleDateString("ne-NP")}
          </span>

          <span>
            👍 ${p.likes||0} · 💬 ${(p.comments||[]).length}
          </span>
        </div>
      </div>
    </article>
  `;
}

function render(){
  const filtered=
    state.filter==="all"
      ?state.posts
      :state.posts.filter(p=>p.category===state.filter);

  $("#posts").innerHTML=
    filtered.length
      ?filtered.map(card).join("")
      :`<div class="empty">कुनै सामग्री भेटिएन।</div>`;

  const lok=
    state.posts
      .filter(p=>p.category==="लोकसेवा")
      .slice(0,3);

  $("#loksewaPosts").innerHTML=
    lok.length
      ?lok.map(card).join("")
      :`<div class="empty">लोकसेवा सामग्री छिट्टै थपिनेछ।</div>`;

  const lit=
    state.posts
      .filter(p=>p.category==="साहित्य")
      .slice(0,3);

  $("#literaturePosts").innerHTML=
    lit.length
      ?lit.map(card).join("")
      :`<div class="empty">साहित्यिक सामग्री छिट्टै थपिनेछ।</div>`;
}

async function load(){
  try{
    const d=await api("posts");

    state.posts=(d.posts||[])
      .filter(p=>p.status!=="draft");

    render();

  }catch(e){

    $("#posts").innerHTML=
      `<div class="empty">
        सामग्री लोड हुन सकेन। केही समयपछि पुनः प्रयास गर्नुहोस्।
      </div>`;

    console.error(e);
  }
}


/* =========================
   POST MODAL
   ========================= */

function showPostModal(id){

  const p=state.posts.find(x=>x.id===id);

  if(!p)return;

  state.current=id;

  $("#modalTitle").textContent=p.title;

  $("#modalCategory").textContent=p.category;

  $("#modalDate").textContent=
    new Date(p.created||p.date)
      .toLocaleDateString("ne-NP");

  $("#modalContent").innerHTML=
    (
      p.featuredImage
        ?`<img src="${esc(p.featuredImage)}"
              alt=""
              style="width:100%;max-height:400px;object-fit:cover;margin:15px 0">`
        :""
    )
    +p.content;

  $("#likeCount").textContent=p.likes||0;

  $("#comments").innerHTML=
    (p.comments||[])
      .map(c=>
        `<div class="comment">
          <b>${esc(c.author)}</b>
          <div>${esc(c.text)}</div>
        </div>`
      )
      .join("")
    ||
    "<p>अहिलेसम्म टिप्पणी छैन।</p>";

  $("#postModal").classList.add("show");
}


/*
   Read More क्लिक गर्दा modal खोल्ने
   र browser history मा एउटा entry थप्ने।
*/
function openPost(id){

  if(
    state.current===id &&
    $("#postModal").classList.contains("show")
  ){
    return;
  }

  history.pushState(
    {postModal:id},
    "",
    location.href
  );

  showPostModal(id);
}


/* Modal मात्र बन्द गर्ने */
function hidePostModal(){

  state.current=null;

  $("#postModal").classList.remove("show");
}


/*
   × button वा बाहिर क्लिक गर्दा
   history entry पनि हटाएर modal बन्द गर्ने।
*/
function closePostModal(){

  if(
    history.state &&
    history.state.postModal
  ){
    history.back();
  }else{
    hidePostModal();
  }
}


/* =========================
   PAGE START
   ========================= */

document.addEventListener("DOMContentLoaded",()=>{

  load();


  /* Android / Browser Back Button */
  window.addEventListener("popstate",()=>{

    if(
      $("#postModal") &&
      $("#postModal").classList.contains("show")
    ){
      hidePostModal();
    }

  });


  /* Hamburger menu */

  $("#hamburger").onclick=()=>{
    $("#navMenu").classList.toggle("open");
  };


  /* Navigation */

  document
    .querySelectorAll(".nav-link")
    .forEach(a=>
      a.onclick=()=>
        $("#navMenu").classList.remove("open")
    );


  /* Category filters */

  $("#filters").onclick=e=>{

    const b=e.target.closest(".filter");

    if(!b)return;

    document
      .querySelectorAll(".filter")
      .forEach(x=>x.classList.remove("active"));

    b.classList.add("active");

    state.filter=b.dataset.filter;

    render();
  };


  /* Read More / Card click */

  document.body.onclick=e=>{

    const c=e.target.closest(".card");

    if(c){
      openPost(c.dataset.id);
    }

  };


  /* × Close button */

  $("#closeModal").onclick=()=>{
    closePostModal();
  };


  /* Modal बाहिर click */

  $("#postModal").onclick=e=>{

    if(e.target.id==="postModal"){
      closePostModal();
    }

  };


  /* =========================
     LIKE
     ========================= */

  $("#likeBtn").onclick=async()=>{

    try{

      const d=await api(
        "like",
        {
          method:"POST",
          body:JSON.stringify({
            id:state.current
          })
        }
      );

      $("#likeCount").textContent=d.likes;

      const p=
        state.posts.find(
          x=>x.id===state.current
        );

      if(p){
        p.likes=d.likes;
      }

      render();

    }catch(e){

      toast(e.message);

    }

  };


  /* =========================
     COMMENT
     ========================= */

  $("#commentForm").onsubmit=async e=>{

    e.preventDefault();

    try{

      const d=await api(
        "comment",
        {
          method:"POST",
          body:JSON.stringify({
            id:state.current,
            author:$("#commentAuthor").value.trim(),
            text:$("#commentText").value.trim()
          })
        }
      );

      const p=
        state.posts.find(
          x=>x.id===state.current
        );

      if(p){
        p.comments=d.comments;
      }

      /*
         पहिले modal बन्द गरेर
         नयाँ comments सहित फेरि खोल्ने।
      */
      showPostModal(state.current);

      $("#commentForm").reset();

      toast("टिप्पणी सफलतापूर्वक पेश भयो");

    }catch(e){

      toast(e.message);

    }

  };

});
