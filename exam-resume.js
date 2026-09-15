/* Exact exam resume v11
   - Keeps one exact paper per active session.
   - Restores candidate details, question index, answers and timer display.
   - Installs the centralized stimulus renderer before an exam can start.
*/
(function(){
  const KEY='nb_loksewa_exact_resume_v11';
  const OLD=['nb_loksewa_exact_resume_v10','nb_loksewa_exact_resume_v9','nb_loksewa_exact_resume_v8','nb_loksewa_exact_resume_v7','nb_loksewa_exact_resume_v6','nb_loksewa_exact_resume_v5'];
  const ALL=[KEY,...OLD],SESSION='nb_loksewa_exam_session_active_v11';
  const $=s=>document.querySelector(s);let state=null,resuming=false,restoring=false,pendingExamId=null;
  const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
  const activeSession=()=>{try{return sessionStorage.getItem(SESSION)==='1'}catch(e){return false}};
  const setSession=v=>{try{if(v)sessionStorage.setItem(SESSION,'1');else sessionStorage.removeItem(SESSION)}catch(e){}};
  const read=()=>{try{for(const k of ALL){const x=JSON.parse(localStorage.getItem(k)||'null');if(x?.examId&&Array.isArray(x.paper)&&x.paper.length)return x}}catch(e){}return null};
  const write=()=>{try{if(state)localStorage.setItem(KEY,JSON.stringify({...state,version:11,savedAt:Date.now()}))}catch(e){}};
  const clear=()=>{try{ALL.forEach(k=>localStorage.removeItem(k))}catch(e){}setSession(false);state=null;resuming=false;restoring=false;pendingExamId=null};
  const resultVisible=()=>{const e=$('#result');return !!(e&&!e.hidden&&getComputedStyle(e).display!=='none')};
  const examVisible=()=>!!($('#exam')&&!$('#exam').hidden),candidateVisible=()=>!!($('#candidate')&&!$('#candidate').hidden),chooserVisible=()=>!!($('#chooser')&&!$('#chooser').hidden);
  function index(){const h=$('#questionCard h2');const m=h&&clean(h.textContent).match(/^(\d+)\s*[.)]/);if(m)return Number(m[1])-1;const bs=[...document.querySelectorAll('#questionNav button')];const i=bs.findIndex(b=>b.classList.contains('active')||b.getAttribute('aria-current')==='true');return i>=0?i:null}
  function capture(){if(!state||resuming||restoring||resultVisible())return;const i=index(),c=$('#questionCard');if(i==null||!c)return;state.started=true;state.questionIndex=i;state.answers=state.answers||{};const els=[...c.querySelectorAll('input[type=radio],input[type=checkbox]')],checked=els.filter(e=>e.checked).map(e=>({value:String(e.value||e.dataset.value||e.id||''),index:els.indexOf(e)}));if(checked.length)state.answers[i]=checked;else delete state.answers[i];const timer=$('#timer');if(timer&&!timer.hidden)state.timerText=clean(timer.textContent);write();setSession(true)}
  function candidate(){if(!state)return;[['candidateName','name'],['candidateEmail','email'],['candidateWhatsapp','whatsapp']].forEach(([id,k])=>{const e=document.getElementById(id);if(e)state[k]=e.value||''});write()}
  function fill(){if(!state)return;[['candidateName','name'],['candidateEmail','email'],['candidateWhatsapp','whatsapp']].forEach(([id,k])=>{const e=document.getElementById(id);if(e&&state[k]!=null)e.value=state[k]})}
  function installStimulus(){if(window.__NBStimulusCoreRequested)return;window.__NBStimulusCoreRequested=true;const s=document.createElement('script');s.src='exam-stimulus-core.js?v=1.0.0';s.async=false;document.head.appendChild(s)}
  function patchFetch(){if(window.__NBResumeV11Fetch)return;window.__NBResumeV11Fetch=true;const original=window.fetch.bind(window);window.fetch=async function(input,init){const url=typeof input==='string'?input:(input?.url||'');const m=url.match(/[?&]exam=([^&]+)/),id=m?decodeURIComponent(m[1]):null;const config=/exam-api\?action=config(?:&|$)/.test(url);if(config&&id&&state?.started&&activeSession()&&state.examId===id){return new Response(JSON.stringify({exam:state.exam,ready:true,questions:state.paper}),{status:200,headers:{'Content-Type':'application/json'}})}const r=await original(input,init);if(config&&id&&pendingExamId===id){try{const d=await r.clone().json();if(Array.isArray(d.questions)&&d.questions.length){state=state||{};state.examId=id;state.exam=d.exam;state.paper=d.questions;state.questionCount=d.questions.length;state.answers=state.answers||{};state.started=false;state.questionIndex=0;write()}}catch(e){}}return r}}
  function chooseSaved(){if(!state?.started||!activeSession())return false;const b=[...document.querySelectorAll('#examList .exam-card')].find(x=>x.dataset.id===state.examId);if(!b||b.classList.contains('disabled'))return false;pendingExamId=state.examId;b.click();return true}
  function restoreAnswers(){const c=$('#questionCard');if(!c||!state)return;const els=[...c.querySelectorAll('input[type=radio],input[type=checkbox]')],list=Array.isArray(state.answers?.[state.questionIndex])?state.answers[state.questionIndex]:[];list.forEach(a=>{let e=Number.isInteger(a?.index)?els[a.index]:null;if(!e&&a?.value)e=els.find(x=>String(x.value)===String(a.value)||String(x.dataset.value||'')===String(a.value)||String(x.id)===String(a.value));if(e)e.checked=true})}
  function restoreQuestion(){const b=[...document.querySelectorAll('#questionNav button')][state?.questionIndex];if(!b)return false;restoring=true;b.click();setTimeout(()=>{restoreAnswers();restoring=false;capture()},120);return true}
  function resume(){if(!state?.started||!activeSession()||resuming)return;resuming=true;const target=state.questionIndex||0,started=Date.now();const tick=()=>{if(resultVisible()){clear();return}if(Date.now()-started>15000){resuming=false;return}if(examVisible()){state.questionIndex=target;restoreQuestion();setTimeout(()=>{restoreAnswers();resuming=false;capture()},300);return}if(candidateVisible()){fill();const b=$('#startBtn');if(b){b.click();setTimeout(tick,300)}return}if(chooserVisible()){chooseSaved();setTimeout(tick,400);return}setTimeout(tick,200)};tick()}
  state=read();if(!(activeSession()&&state?.started)){setSession(false);if(state)state.started=false}patchFetch();installStimulus();
  document.addEventListener('click',e=>{const b=e.target.closest?.('#examList .exam-card');if(b&&!b.classList.contains('disabled'))pendingExamId=b.dataset.id||null},true);
  document.addEventListener('click',e=>{const b=e.target.closest?.('#startBtn');if(!b||!state||resuming)return;const n=$('#candidateName')?.value.trim()||'',em=$('#candidateEmail')?.value.trim()||'';if(n&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){state.started=true;state.questionIndex=0;setSession(true);candidate();write()}},true);
  document.addEventListener('input',()=>{if(state&&!resuming)candidate()},true);
  document.addEventListener('change',()=>{if(state&&!resuming){candidate();capture()}},true);
  document.addEventListener('click',e=>{if(!state||resuming)return;if(e.target.closest?.('#questionNav button')){capture();return}if(e.target.closest?.('#questionCard input'))setTimeout(capture,20)},true);
  document.addEventListener('visibilitychange',()=>{if(resultVisible()){clear();return}if(document.visibilityState==='hidden'){candidate();capture()}else if(state?.started)setTimeout(resume,100)});
  window.addEventListener('pagehide',()=>{if(resultVisible())clear();else{candidate();capture()}});
  window.addEventListener('beforeunload',()=>{if(resultVisible())clear();else{candidate();capture()}});
  [600,1500,3000,6000].forEach(ms=>setTimeout(()=>{if(resultVisible()){clear();return}state=read()||state;if(state?.started&&activeSession())resume()},ms));
})();