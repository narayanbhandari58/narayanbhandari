(()=>{'use strict';
const $=s=>document.querySelector(s);
const token=()=>localStorage.getItem('nb_admin_token')||'';
const api=async(action,opt={})=>{const r=await fetch(`/.netlify/functions/api?action=${encodeURIComponent(action)}`,{...opt,headers:{'Content-Type':'application/json','Authorization':`Bearer ${token()}`,...(opt.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Request failed');return d};
const toast=m=>{const t=$('#toast');if(t){t.textContent=m;t.style.display='block';clearTimeout(window.__nbToast);setTimeout(()=>t.style.display='none',3000)}};
function ensureAccountWorkspace(){
 const dashboard=$('#dashboard');
 if(!dashboard)return null;
 let ws=document.getElementById('cmsAccount');
 if(!ws){ws=document.createElement('section');ws.id='cmsAccount';ws.className='cms-workspace';dashboard.appendChild(ws)}
 const account=document.getElementById('accountCard');
 if(account && account.parentElement!==ws)ws.appendChild(account);
 return ws;
}
function buildAccount(){
 const ws=ensureAccountWorkspace();if(!ws)return;
 let card=document.getElementById('accountCard');
 if(!card){card=document.createElement('section');card.id='accountCard';card.className='admin-card';ws.appendChild(card)}
 card.innerHTML=`<div class="row"><div><h2>⚙️ Account Management</h2><p class="muted">Admin account, password र recovery व्यवस्थापन</p></div><button id="accountLogout" class="btn btn-outline" type="button">Logout</button></div>
 <div class="account-management-grid">
  <section class="account-box"><h3>Admin Account</h3><p>Username: <strong id="accountUsername">${localStorage.getItem('nb_admin_username')||'Narayan'}</strong></p><p class="muted">तपाईं अहिले admin session मा हुनुहुन्छ।</p></section>
  <section class="account-box"><h3>Password परिवर्तन</h3><div class="form-group"><label for="currentPassword">हालको Password</label><input id="currentPassword" type="password" autocomplete="current-password"></div><div class="form-group"><label for="newPassword">नयाँ Password</label><input id="newPassword" type="password" minlength="10" autocomplete="new-password"></div><div class="form-group"><label for="confirmPassword">नयाँ Password फेरि</label><input id="confirmPassword" type="password" minlength="10" autocomplete="new-password"></div><button id="changePasswordBtn" class="btn btn-primary" type="button">Password परिवर्तन गर्नुहोस्</button><p id="accountPasswordMsg" class="muted"></p></section>
  <section class="account-box"><h3>Password Recovery</h3><p class="muted">हालको password थाहा नभए Recovery Key प्रयोग गरेर नयाँ password सेट गर्न सकिन्छ।</p><button id="dontKnowCurrent" class="btn btn-outline" type="button">Current password थाहा छैन</button><div id="adminRecoveryStep" hidden><div class="form-group"><label for="adminRecoveryKey">Admin Recovery Key</label><input id="adminRecoveryKey" type="password" autocomplete="off"></div><button id="verifyAdminRecoveryBtn" class="btn btn-outline" type="button">Recovery Key Verify</button><p id="adminRecoveryMsg" class="muted"></p><div id="adminNewPasswordWrap" hidden><div class="form-group"><label for="adminNewPassword">नयाँ Password</label><input id="adminNewPassword" type="password" minlength="10" autocomplete="new-password"></div><div class="form-group"><label for="adminConfirmPassword">नयाँ Password फेरि</label><input id="adminConfirmPassword" type="password" minlength="10" autocomplete="new-password"></div><button id="adminRecoveryResetBtn" class="btn btn-primary" type="button">नयाँ Password सेट गर्नुहोस्</button></div></div></section>
 </div>`;
 const logout=$('#accountLogout');if(logout)logout.onclick=()=>{localStorage.removeItem('nb_admin_token');localStorage.removeItem('nb_admin_username');location.href='/admin'};
 const current=$('#currentPassword'),nw=$('#newPassword'),cf=$('#confirmPassword'),cb=$('#changePasswordBtn');
 if(cb)cb.onclick=async()=>{const c=current?.value||'',n=nw?.value||'',v=cf?.value||'';const m=$('#accountPasswordMsg');if(!c){if(m)m.textContent='हालको password राख्नुहोस्';return}if(n.length<10){if(m)m.textContent='नयाँ password कम्तीमा 10 characters हुनुपर्छ';return}if(n!==v){if(m)m.textContent='नयाँ password र confirmation मिलेन';return}try{cb.disabled=true;cb.textContent='परिवर्तन हुँदैछ...';const r=await fetch('/.netlify/functions/change-password',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token()}`},body:JSON.stringify({currentPassword:c,newPassword:n,confirmPassword:v})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Password परिवर्तन हुन सकेन');localStorage.removeItem('nb_admin_token');alert(d.message||'Password परिवर्तन भयो। अब नयाँ password बाट login गर्नुहोस्।');location.href='/admin'}catch(e){if(m)m.textContent=e.message}finally{cb.disabled=false;cb.textContent='Password परिवर्तन गर्नुहोस्'}};
 const dk=$('#dontKnowCurrent'),step=$('#adminRecoveryStep');if(dk&&step)dk.onclick=()=>{step.hidden=!step.hidden;dk.textContent=step.hidden?'Current password थाहा छैन':'Recovery form बन्द गर्नुहोस्';if(!step.hidden)$('#adminRecoveryKey')?.focus()};
 let recoveryToken='',recoveryKey='';
 $('#verifyAdminRecoveryBtn')?.addEventListener('click',async()=>{const key=$('#adminRecoveryKey')?.value||'',username=localStorage.getItem('nb_admin_username')||'Narayan',m=$('#adminRecoveryMsg');if(!key){if(m)m.textContent='Admin Recovery Key राख्नुहोस्';return}try{const b=$('#verifyAdminRecoveryBtn');b.disabled=true;b.textContent='Verifying...';const r=await fetch('/.netlify/functions/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'verify',username,recoveryKey:key})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Recovery verification failed');recoveryToken=d.recoveryToken;recoveryKey=key;if(m)m.textContent='✓ Recovery Key verified भयो।';const wrap=$('#adminNewPasswordWrap');if(wrap)wrap.hidden=false;b.style.display='none';$('#adminRecoveryKey').readOnly=true;$('#adminNewPassword')?.focus()}catch(e){if(m)m.textContent=e.message}finally{const b=$('#verifyAdminRecoveryBtn');if(b&&b.style.display!=='none'){b.disabled=false;b.textContent='Recovery Key Verify'}}});
 $('#adminRecoveryResetBtn')?.addEventListener('click',async()=>{const username=localStorage.getItem('nb_admin_username')||'Narayan',n=$('#adminNewPassword')?.value||'',v=$('#adminConfirmPassword')?.value||'',m=$('#adminRecoveryMsg');if(!recoveryToken){if(m)m.textContent='पहिले Recovery Key verify गर्नुहोस्';return}if(n.length<10){if(m)m.textContent='नयाँ password कम्तीमा 10 characters हुनुपर्छ';return}if(n!==v){if(m)m.textContent='नयाँ password र confirmation मिलेन';return}try{const b=$('#adminRecoveryResetBtn');b.disabled=true;b.textContent='Reset हुँदैछ...';const r=await fetch('/.netlify/functions/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'reset',username,recoveryKey,recoveryToken,newPassword:n,confirmPassword:v})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Password reset failed');localStorage.removeItem('nb_admin_token');alert(d.message||'Password reset भयो। अब नयाँ password बाट login गर्नुहोस्।');location.href='/admin'}catch(e){if(m)m.textContent=e.message}finally{const b=$('#adminRecoveryResetBtn');if(b){b.disabled=false;b.textContent='नयाँ Password सेट गर्नुहोस्'}}});
}
function buildNav(){
 const dashboard=$('#dashboard');if(!dashboard)return;
 document.querySelectorAll('.cms-nav,.nb-admin-nav').forEach(x=>x.remove());
 const oldMain=document.querySelector('.admin-main');
 let shell=document.querySelector('.cms-shell');if(!shell){shell=document.createElement('div');shell.className='cms-shell ready';dashboard.prepend(shell)}else shell.classList.add('ready');
 const nav=document.createElement('nav');nav.className='cms-nav';nav.innerHTML=`<div class="cms-brand">नारायण भण्डारी CMS</div><button class="cms-nav-btn active" data-ws="dashboard">ड्यासबोर्ड</button><button class="cms-nav-btn" data-ws="posts">पोस्ट व्यवस्थापन</button><button class="cms-nav-btn" data-ws="analytics">Google Analytics</button><button class="cms-nav-btn" data-ws="exams">Online Exam</button><button class="cms-nav-btn" data-ws="history">परीक्षा इतिहास</button><button class="cms-nav-btn" data-ws="users">Users</button><button class="cms-nav-btn" data-ws="account">Account</button><button class="cms-nav-btn" data-action="logout">Logout</button>`;shell.appendChild(nav);
 let content=document.querySelector('.cms-content');if(!content){content=document.createElement('div');content.className='cms-content';shell.appendChild(content)}
 const dash=document.createElement('section');dash.id='cmsDashboard';dash.className='cms-workspace active';dash.innerHTML='<div class="cms-panel"><h2>ड्यासबोर्ड</h2><div class="cms-grid"><div class="cms-metric"><strong id="cmsTotal">0</strong><span>कुल पोस्ट</span></div><div class="cms-metric"><strong id="cmsPublished">0</strong><span>प्रकाशित</span></div><div class="cms-metric"><strong id="cmsDraft">0</strong><span>ड्राफ्ट</span></div><div class="cms-metric"><strong id="cmsCategories">0</strong><span>श्रेणी</span></div></div></div>';
 content.appendChild(dash);
 const posts=document.createElement('section');posts.id='cmsPosts';posts.className='cms-workspace';content.appendChild(posts);if(oldMain)posts.appendChild(oldMain);
 ['analytics','exams','history','users'].forEach(id=>{const s=document.createElement('section');s.id='cms'+id.charAt(0).toUpperCase()+id.slice(1);s.className='cms-workspace';content.appendChild(s)});
 ensureAccountWorkspace();
 nav.querySelectorAll('[data-ws]').forEach(btn=>btn.addEventListener('click',()=>openWorkspace(btn.dataset.ws)));
 nav.querySelector('[data-action="logout"]').addEventListener('click',()=>{localStorage.removeItem('nb_admin_token');localStorage.removeItem('nb_admin_username');location.href='/admin'});
 buildAccount();
}
function openWorkspace(name){
 const map={dashboard:'cmsDashboard',posts:'cmsPosts',analytics:'cmsAnalytics',exams:'cmsExams',history:'cmsHistory',users:'cmsUsers',account:'cmsAccount'};
 const id=map[name];if(!id){console.error('Unknown workspace:',name);return}
 document.querySelectorAll('.cms-workspace').forEach(x=>x.classList.remove('active'));
 const ws=document.getElementById(id);if(!ws){console.error('Workspace not found:',id);return}
 ws.classList.add('active');document.querySelectorAll('.cms-nav-btn[data-ws]').forEach(b=>b.classList.toggle('active',b.dataset.ws===name));
 if(name==='account')buildAccount();
 if(name==='posts')window.__cmsApplyPostView?.(window.__cmsPostView||'all');
}
window.openWorkspace=openWorkspace;
window.__NB_BOOT_UI=()=>{try{buildNav();if(window.loadPosts)window.loadPosts()}catch(e){console.error(e)}};
document.addEventListener('DOMContentLoaded',()=>{if(localStorage.getItem('nb_admin_token'))window.__NB_BOOT_UI()});
})();