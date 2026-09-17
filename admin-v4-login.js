(()=>{
'use strict';
const $=s=>document.querySelector(s);
const tokenKey='nb_admin_token';
const show=name=>{const l=$('#login'),d=$('#dashboard');if(l)l.style.display=name==='login'?'':'none';if(d)d.style.display=name==='dashboard'?'':'none'};
const msg=m=>{const x=$('#loginMsg');if(x)x.textContent=m||''};
async function login(e){
 e.preventDefault();
 const u=$('#username')?.value.trim()||'',p=$('#password')?.value||'',b=e.submitter;
 if(!u||!p)return;
 try{
  if(b){b.disabled=true;b.textContent='Login हुँदैछ...'}
  msg('');
  /* Keep the original authentication path so the existing ADMIN_USERNAME/
     ADMIN_PASSWORD credentials and auth-store migration continue to work. */
  const r=await fetch('/.netlify/functions/login',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({username:u,password:p})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d.token)throw Error(d.error||'Login असफल भयो');
  localStorage.setItem(tokenKey,d.token);
  show('dashboard');
  if(typeof window.__NB_BOOT_UI==='function')window.__NB_BOOT_UI();
  else if(typeof window.bootUI==='function')window.bootUI();
  else window.location.reload();
 }catch(err){msg(err.message||'गलत username वा password')}finally{if(b){b.disabled=false;b.textContent='Login'}}
}
async function recovery(mode,data){
 const r=await fetch('/.netlify/functions/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,...data})});
 const d=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(d.error||'Recovery request failed');
 return d;
}
function setupForgot(){
 const toggle=$('#forgotPasswordToggle'),panel=$('#forgotPasswordPanel'),form=$('#forgotPasswordForm');
 if(!toggle||!panel||!form)return;
 toggle.onclick=()=>{const open=panel.classList.toggle('open');toggle.textContent=open?'Forgot password? ▲':'Forgot password?';};
 let recoveryToken='';
 const verifyBtn=$('#verifyRecoveryBtn');
 verifyBtn?.addEventListener('click',async()=>{
  const username=$('#forgotUsername')?.value.trim()||'',key=$('#recoveryKey')?.value||'';
  if(!username||!key){msg('Username र Admin Recovery Key राख्नुहोस्');return;}
  try{
   verifyBtn.disabled=true;verifyBtn.textContent='Verifying...';
   const d=await recovery('verify',{username,recoveryKey:key});
   recoveryToken=d.recoveryToken;
   $('#recoveryMsg').textContent='✓ Recovery Key verified भयो।';
   $('#forgotNewPasswordWrap')?.classList.add('open');
   verifyBtn.style.display='none';
   const keyInput=$('#recoveryKey');if(keyInput)keyInput.readOnly=true;
   $('#forgotNewPassword')?.focus();
  }catch(e){$('#recoveryMsg').textContent=e.message||'Recovery verification failed';}
  finally{verifyBtn.disabled=false;if(verifyBtn.style.display!=='none')verifyBtn.textContent='Verify Recovery Key';}
 });
 form.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!recoveryToken){verifyBtn?.click();return;}
  const username=$('#forgotUsername')?.value.trim()||'',n=$('#forgotNewPassword')?.value||'',c=$('#forgotConfirmPassword')?.value||'';
  if(n.length<10){msg('नयाँ password कम्तीमा 10 characters हुनुपर्छ');return}
  if(n!==c){msg('नयाँ password र confirmation मिलेन');return}
  const btn=$('#forgotPasswordBtn');
  try{
   if(btn){btn.disabled=true;btn.textContent='Reset हुँदैछ...'}
   const d=await recovery('reset',{username,recoveryToken,newPassword:n,confirmPassword:c});
   localStorage.removeItem(tokenKey);
   alert(d.message||'Password reset भयो। अब नयाँ password बाट login गर्नुहोस्।');
   location.reload();
  }catch(e){msg(e.message||'Password reset failed');}
  finally{if(btn){btn.disabled=false;btn.textContent='नयाँ Password सेट गर्नुहोस्'}}
 });
}
document.addEventListener('DOMContentLoaded',()=>{
 const f=$('#loginForm');if(f)f.addEventListener('submit',login);
 setupForgot();
 const t=localStorage.getItem(tokenKey);
 if(t){show('dashboard');setTimeout(()=>{if(typeof window.__NB_BOOT_UI==='function')window.__NB_BOOT_UI();else if(typeof window.bootUI==='function')window.bootUI();},0)}else show('login');
});
})();