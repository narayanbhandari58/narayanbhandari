(()=>{'use strict';
const $=s=>document.querySelector(s);
const username=()=>localStorage.getItem('nb_admin_username')||'Narayan';
function initAccount(){
  const card=$('#accountCard'),name=$('#accountUsername'),body=$('#accountBody');
  if(!card||!name||!body)return false;
  name.textContent=username();
  card.classList.add('open');
  const toggle=$('#accountToggle');
  toggle?.setAttribute('aria-expanded','true');
  const passwordToggle=$('#passwordToggle');
  passwordToggle?.setAttribute('aria-expanded','false');
  const note=card.querySelector('.account-note');
  if(note)note.textContent='यहाँबाट account session, password परिवर्तन र Recovery मार्फत password reset व्यवस्थापन गर्न सकिन्छ।';
  const logout=$('#accountLogout');
  if(logout&&!logout.dataset.bound){logout.dataset.bound='1';logout.addEventListener('click',()=>{localStorage.removeItem('nb_admin_token');localStorage.removeItem('nb_admin_username');location.href='/admin'});}
  return true;
}
function watch(){
  if(initAccount())return;
  const root=$('#dashboard')||document.body;
  const observer=new MutationObserver(()=>{if(initAccount()){observer.disconnect()}});
  observer.observe(root,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),8000);
}
document.addEventListener('DOMContentLoaded',watch);
})();
