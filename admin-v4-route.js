(()=>{'use strict';
const $=s=>document.querySelector(s);
const path=location.pathname.replace(/\/+$/,'')||'/admin';
const routes={
  '/admin':null,
  '/admin/posts':'posts',
  '/admin/exams':'exam',
  '/admin/history':'history',
  '/admin/users':'users',
  '/admin/account':'account'
};
const active=Object.prototype.hasOwnProperty.call(routes,path)?routes[path]:null;
function cards(){return [...document.querySelectorAll('#dashboard .v4-card')];}
function sectionByTitle(text){return cards().find(x=>x.querySelector('h2')?.textContent?.includes(text));}
function addBack(){const head=document.querySelector('.v4-head');if(!head||document.querySelector('#sectionBack'))return;const b=document.createElement('a');b.id='sectionBack';b.href='/admin';b.className='btn btn-outline';b.textContent='← Dashboard';head.insertBefore(b,head.querySelector('#logout')||null)}
function setVisible(){
 const post=sectionByTitle('Post Editor')?.parentElement;
 const library=sectionByTitle('Post Library');
 const analytics=sectionByTitle('Google Analytics');
 const exam=sectionByTitle('परीक्षा व्यवस्थापन');
 const history=sectionByTitle('Exam History');
 const users=sectionByTitle('User Management');
 const account=sectionByTitle('Account');
 const all=[post,library,analytics,exam,history,users,account].filter(Boolean);
 if(!active){
   [exam,history,users,account].forEach(x=>{if(x)x.hidden=true});
   addMenu();
   return;
 }
   all.forEach(x=>x.hidden=true);
   const show=active==='posts'?[post,library]:active==='exam'?[exam]:active==='history'?[history]:active==='users'?[users]:[account];
   show.filter(Boolean).forEach(x=>x.hidden=false);
   addBack();
   if(active==='posts')setupPostPanels();
}
function addMenu(){
 const dash=document.querySelector('#dashboard .v4-shell');
 if(!dash||document.querySelector('#sectionMenu'))return;
 const analytics=sectionByTitle('Google Analytics');
 const box=document.createElement('section');box.id='sectionMenu';box.className='v4-card section-menu';
 box.innerHTML='<div class="section-head"><div><h2>🧩 व्यवस्थापनका अन्य खण्ड</h2><p class="muted">आवश्यक खण्डमा क्लिक गरेर त्यसको छुट्टै workspace खोल्नुहोस्।</p></div></div><div class="menu-grid"><a class="menu-card" href="/admin/exams"><span class="ico">📝</span><strong>परीक्षा व्यवस्थापन</strong><small>Exam settings र question management</small><span class="menu-arrow">→</span></a><a class="menu-card" href="/admin/history"><span class="ico">🧾</span><strong>Exam History</strong><small>User खोजेर मात्र history हेर्नुहोस्</small><span class="menu-arrow">→</span></a><a class="menu-card" href="/admin/users"><span class="ico">👥</span><strong>User Management</strong><small>Exam users हेर्नुहोस् र व्यवस्थापन गर्नुहोस्</small><span class="menu-arrow">→</span></a><a class="menu-card" href="/admin/account"><span class="ico">⚙️</span><strong>Account</strong><small>Password, recovery र session settings</small><span class="menu-arrow">→</span></a></div>';
 if(analytics)analytics.after(box);else dash.appendChild(box);
}
function setupPostPanels(){
 const recent=$('#recentPanel'),all=$('#allPanel');
 const rm=$('#recentMenu'),am=$('#allMenu');
 const toggle=(panel,other)=>{if(!panel)return;const open=panel.hidden; if(other)other.hidden=true; panel.hidden=!open; if(open)panel.scrollIntoView({behavior:'smooth',block:'start'})};
 if(rm&&!rm.dataset.bound){rm.dataset.bound='1';rm.addEventListener('click',()=>toggle(recent,all))}
 if(am&&!am.dataset.bound){am.dataset.bound='1';am.addEventListener('click',()=>toggle(all,recent))}
 document.querySelectorAll('[data-close]').forEach(b=>{if(b.dataset.bound)return;b.dataset.bound='1';b.addEventListener('click',()=>{const p=$('#'+b.dataset.close);if(p)p.hidden=true})});
 renderRecent();
}
function renderRecent(){
 const list=$('#recentList');if(!list||list.dataset.rendered)return;
 const src=window.__NB_ADMIN_POSTS||[];
 if(!src.length){list.innerHTML='<div class="empty">हालका पोस्ट छैनन्।';return}
 list.innerHTML=src.filter(p=>p.status==='published').sort((a,b)=>new Date(b.created||b.date)-new Date(a.created||a.date)).slice(0,8).map(p=>`<div class="item"><div><b>${escapeHtml(p.title)}</b><small>${escapeHtml(p.category||'')} · प्रकाशित</small></div><button class="btn btn-outline" data-recent-edit="${escapeAttr(p.id)}">खोल्नुहोस्</button></div>`).join('')||'<div class="empty">हालका प्रकाशित पोस्ट छैनन्।</div>';
 list.querySelectorAll('[data-recent-edit]').forEach(b=>b.onclick=()=>window.editPost?.(b.dataset.recentEdit));
 list.dataset.rendered='1';
}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function escapeAttr(v){return escapeHtml(v).replace(/`/g,'&#096;')}
function init(){
 if(!$('#dashboard'))return;
 const oldShow=window.__NB_ROUTE_READY;
 setVisible();
 const observer=new MutationObserver(()=>{if($('#allPostsList')&&!$('#recentList')?.dataset.rendered){window.__NB_ADMIN_POSTS=window.__NB_ADMIN_POSTS||[];setupPostPanels()}});
 observer.observe($('#dashboard'),{childList:true,subtree:true});
 setTimeout(()=>{const cards=window.__NB_ADMIN_POSTS;if(cards)renderRecent()},300);
}
window.addEventListener('load',init);
})();
