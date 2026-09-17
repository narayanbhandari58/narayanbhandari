(()=>{'use strict';
const $=s=>document.querySelector(s);
const path=location.pathname.replace(/\/+$/,'')||'/admin';
const routes={'/admin':null,'/admin/posts':'posts','/admin/analytics':'analytics','/admin/exams':'exam','/admin/history':'history','/admin/users':'users','/admin/account':'account'};
const active=Object.prototype.hasOwnProperty.call(routes,path)?routes[path]:null;
function cards(){return [...document.querySelectorAll('#dashboard .v4-card')]} 
function sectionByTitle(text){return cards().find(x=>x.querySelector('h2')?.textContent?.includes(text))}
function topStats(){return document.querySelector('#dashboard .v4-shell > .v4-grid')}
function addNav(){
  const h=document.querySelector('.v4-head'); if(!h||$('#adminNav'))return;
  const nav=document.createElement('nav'); nav.id='adminNav'; nav.className='admin-nav';
  const links=[
    ['/admin','⌂','ड्यासबोर्ड',!active],
    ['/admin/posts','✍️','पोस्ट व्यवस्थापन',active==='posts'],
    ['/admin/analytics','📊','Google Analytics',active==='analytics'],
    ['/admin/exams','📝','परीक्षा व्यवस्थापन',active==='exam'],
    ['/admin/history','🧾','परीक्षा इतिहास',active==='history'],
    ['/admin/users','👥','प्रयोगकर्ता व्यवस्थापन',active==='users'],
    ['/admin/account','⚙️','खाता व्यवस्थापन',active==='account']
  ];
  nav.innerHTML=links.map(([href,ico,label,on])=>`<a class="admin-nav-link${on?' active':''}" href="${href}"><span>${ico}</span><b>${label}</b></a>`).join('');
  const logout=h.querySelector('#logout'); h.insertBefore(nav,logout||null);
}
function addBack(){const h=document.querySelector('.v4-head');if(!h||$('#sectionBack')||!active)return;const b=document.createElement('a');b.id='sectionBack';b.href='/admin';b.className='btn btn-outline section-back';b.textContent='← Dashboard';h.insertBefore(b,h.querySelector('#logout')||null)}
function setVisible(){
  const post=sectionByTitle('Post Editor')?.parentElement;
  const library=sectionByTitle('Post Library');
  const analytics=sectionByTitle('Google Analytics');
  const exam=sectionByTitle('परीक्षा व्यवस्थापन');
  const history=sectionByTitle('Exam History');
  const users=sectionByTitle('User Management');
  const account=sectionByTitle('Account');
  const all=[post,library,analytics,exam,history,users,account].filter(Boolean);
  const stats=topStats();
  if(stats)stats.hidden=!!active;
  all.forEach(x=>x.hidden=true);
  if(!active){
    // Dashboard stays intentionally minimal: only summary cards + navbar.
    return;
  }
  const show=active==='posts'?[post,library]:active==='analytics'?[analytics]:active==='exam'?[exam]:active==='history'?[history]:active==='users'?[users]:[account];
  show.filter(Boolean).forEach(x=>x.hidden=false);
  addBack();
  if(active==='posts')setupPostPanels();
}
function setupPostPanels(){
  const recent=$('#recentPanel'),all=$('#allPanel'),rm=$('#recentMenu'),am=$('#allMenu');
  const toggle=(panel,other)=>{if(!panel)return;const open=panel.hidden;if(other)other.hidden=true;panel.hidden=!open;if(open)panel.scrollIntoView({behavior:'smooth',block:'start'})};
  if(rm&&!rm.dataset.bound){rm.dataset.bound='1';rm.addEventListener('click',()=>toggle(recent,all))}
  if(am&&!am.dataset.bound){am.dataset.bound='1';am.addEventListener('click',()=>toggle(all,recent))}
  document.querySelectorAll('[data-close]').forEach(b=>{if(b.dataset.bound)return;b.dataset.bound='1';b.addEventListener('click',()=>{const p=$('#'+b.dataset.close);if(p)p.hidden=true})});
  syncRecent();
}
function syncRecent(){
  const src=$('#allPostsList'),list=$('#recentList');if(!src||!list)return;
  const items=[...src.querySelectorAll('.item')].filter(x=>/प्रकाशित/.test(x.textContent));
  if(!items.length){list.innerHTML='<div class="empty">हालका प्रकाशित पोस्ट छैनन्।</div>';return}
  list.innerHTML=items.slice(0,8).map(x=>{const b=x.querySelector('[data-edit]'),title=x.querySelector('b')?.textContent||'',meta=x.querySelector('small')?.textContent||'';return `<div class="item"><div><b>${escapeHtml(title)}</b><small>${escapeHtml(meta)}</small></div><button class="btn btn-outline" data-recent-edit="${escapeAttr(b?.dataset.edit||'')}">खोल्नुहोस्</button></div>`}).join('');
  list.querySelectorAll('[data-recent-edit]').forEach(b=>b.onclick=()=>window.editPost?.(b.dataset.recentEdit));
}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function escapeAttr(v){return escapeHtml(v).replace(/`/g,'&#096;')}
function init(){
  if(!$('#dashboard'))return;
  addNav();
  setVisible();
  const obs=new MutationObserver(()=>{if(active==='posts'){setupPostPanels();syncRecent()}});
  obs.observe($('#dashboard'),{childList:true,subtree:true});
}
window.addEventListener('load',init);
})();
