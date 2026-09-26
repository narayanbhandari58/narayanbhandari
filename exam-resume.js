/* Exact exam resume v13.2
   - Keeps one exact paper per active session.
   - Restores candidate details, exact question, selected answer and countdown.
   - Preserves the original countdown deadline instead of extending it on every save.
*/
(function(){
  const KEY='nb_loksewa_exact_resume_v13';
  const OLD=['nb_loksewa_exact_resume_v12','nb_loksewa_exact_resume_v11','nb_loksewa_exact_resume_v10','nb_loksewa_exact_resume_v9','nb_loksewa_exact_resume_v8','nb_loksewa_exact_resume_v7','nb_loksewa_exact_resume_v6','nb_loksewa_exact_resume_v5'];
  const ALL=[KEY,...OLD],SESSION='nb_loksewa_exam_session_active_v13',RESUME_ARMED='nb_loksewa_resume_armed_v13';
  const $=s=>document.querySelector(s);let state=null,resuming=false,restoring=false,pendingExamId=null;
  const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
  const activeSession=()=>{try{return localStorage.getItem(SESSION)==='1'}catch(e){return false}};
  const setSession=v=>{try{if(v)localStorage.setItem(SESSION,'1');else localStorage.removeItem(SESSION)}catch(e){}};
  const resumeArmed=()=>{try{return localStorage.getItem(RESUME_ARMED)==='1'}catch(e){return false}};
  const armResume=()=>{try{localStorage.setItem(RESUME_ARMED,'1')}catch(e){}};
  const disarmResume=()=>{try{localStorage.removeItem(RESUME_ARMED)}catch(e){}};
  const read=()=>{try{for(const k of ALL){const x=JSON.parse(localStorage.getItem(k)||'null');if(x?.examId&&Array.isArray(x.paper)&&x.paper.length)return x}}catch(e){}return null};
  const write=()=>{try{if(state)localStorage.setItem(KEY,JSON.stringify({...state,version:13,savedAt:Date.now()}))}catch(e){}};
  const clear=()=>{try{ALL.forEach(k=>localStorage.removeItem(k))}catch(e){}setSession(false);disarmResume();state=null;resuming=false;restoring=false;pendingExamId=null};
  window.__nbClearExamResume=()=>clear();
  const resultVisible=()=>{const e=$('#result');return !!(e&&!e.hidden&&getComputedStyle(e).display!=='none')};
  const examVisible=()=>!!($('#exam')&&!$('#exam').hidden),candidateVisible=()=>!!($('#candidate')&&!$('#candidate').hidden),chooserVisible=()=>!!($('#chooser')&&!$('#chooser').hidden);
  function index(){const h=$('#questionCard h2');const m=h&&clean(h.textContent).match(/^(\d+)\s*[.)]/);if(m)return Number(m[1])-1;const bs=[...document.querySelectorAll('#questionNav button')];const i=bs.findIndex(b=>b.classList.contains('active')||b.getAttribute('aria-current')==='true');return i>=0?i:null}
  function timerSecondsFromState(){if(!state)return null;const end=Number(state.timerEndsAt);if(Number.isFinite(end)&&end>0)return Math.max(0,Math.floor((end-Date.now())/1000));let base=Number(state.timerSeconds);if(!Number.isFinite(base)||base<0){const m=clean(state.timerText||'').match(/^(\d+):([0-5]\d)$/);if(!m)return null;base=Number(m[1])*60+Number(m[2])}const savedAt=Number(state.savedAt);if(Number.isFinite(savedAt)&&savedAt>0)base-=Math.max(0,(Date.now()-savedAt)/1000);return Math.max(0,Math.floor(base))}
  function applySavedTimer(){const left=timerSecondsFromState();if(left==null)return;try{if(typeof seconds!=='undefined')seconds=left;if(typeof updateTimer==='function')updateTimer()}catch(e){}}
  function capture(){if(!state||resuming||restoring||resultVisible())return;const i=index(),c=$('#questionCard');if(i==null||!c)return;state.started=true;state.questionIndex=i;state.answers=state.answers||{};const buttons=[...c.querySelectorAll('.option')];const selected=buttons.find(b=>b.classList.contains('selected'));if(selected)state.answers[i]={index:Number(selected.dataset.i),value:String(selected.dataset.i??'')};else delete state.answers[i];const timer=$('#timer');if(timer&&!timer.hidden){state.timerText=clean(timer.textContent);const m=state.timerText.match(/^(\d+):([0-5]\d)$/);if(m){state.timerSeconds=Number(m[1])*60+Number(m[2]);const end=Number(state.timerEndsAt);if(!Number.isFinite(end)||end<=0)state.timerEndsAt=Date.now()+state.timerSeconds*1000}}write();setSession(true)}
  function candidate(){if(!state)return;[['candidateName','name'],['candidateEmail','email'],['candidateWhatsapp','whatsapp']].forEach(([id,k])=>{const e=document.getElementById(id);if(e)state[k]=e.value||''});write()}
  function fill(){if(!state)return;[['candidateName','name'],['candidateEmail','email'],['candidateWhatsapp','whatsapp']].forEach(([id,k])=>{const e=document.getElementById(id);if(e&&state[k]!=null)e.value=state[k]})}
  function patchFetch(){if(window.__NBResumeV12Fetch)return;window.__NBResumeV12Fetch=true;const original=window.fetch.bind(window);window.fetch=async function(input,init){const url=typeof input==='string'?input:(input?.url||'');const m=url.match(/[?&]exam=([^&]+)/),id=m?decodeURIComponent(m[1]):null;const config=/exam-api\?action=config(?:&|$)/.test(url);if(config&&id&&state?.started&&activeSession()&&state.examId===id)return new Response(JSON.stringify({exam:state.exam,ready:true,questions:state.paper}),{status:200,headers:{'Content-Type':'application/json'}});const r=await original(input,init);if(config&&id&&pendingExamId===id){try{const d=await r.clone().json();if(Array.isArray(d.questions)&&d.questions.length){state=state||{};state.examId=id;state.exam=d.exam;state.paper=d.questions;state.questionCount=d.questions.length;state.answers=state.answers||{};state.started=false;state.questionIndex=0;state.timerEndsAt=0;write()}}catch(e){}}return r}}
  function chooseSaved(){if(!state?.started||!activeSession())return false;const b=[...document.querySelectorAll('#examList .exam-card')].find(x=>x.dataset.id===state.examId);if(!b||b.classList.contains('disabled'))return false;pendingExamId=state.examId;b.click();return true}
  function restoreAnswers(){const c=$('#questionCard');if(!c||!state)return;const list=state.answers?.[state.questionIndex];if(!list)return;const idx=Number(list.index);const b=[...c.querySelectorAll('.option')].find(x=>Number(x.dataset.i)===idx);if(b){try{b.click()}catch(e){b.classList.add('selected')}}}
  function restoreQuestion(){const b=[...document.querySelectorAll('#questionNav button')][state?.questionIndex];if(!b)return false;restoring=true;b.click();setTimeout(()=>{restoreAnswers();restoring=false;capture()},120);return true}
  function resume(){if(!resumeArmed()||!state?.started||!activeSession()||resuming)return;resuming=true;const target=Number.isInteger(state.questionIndex)?state.questionIndex:0,started=Date.now();const tick=()=>{if(resultVisible()){clear();return}if(Date.now()-started>15000){resuming=false;return}if(examVisible()){lockNavigation();state.questionIndex=target;restoreQuestion();setTimeout(()=>{restoreAnswers();applySavedTimer();resuming=false;capture()},300);return}if(candidateVisible()){fill();const n=$('#candidateName')?.value.trim()||'',em=$('#candidateEmail')?.value.trim()||'',wa=$('#candidateWhatsapp')?.value.trim()||'';if(n&&(em||wa)){const b=$('#startBtn');if(b){b.click();setTimeout(()=>{applySavedTimer();tick()},300)}}else{resuming=false;return}return}if(chooserVisible()){chooseSaved();setTimeout(tick,400);return}setTimeout(tick,200)};tick()}
  state=read();if(!(activeSession()&&state?.started)){setSession(false);state=null}function patchSubmitAnswers(){
  if(window.__NBAnswerResumeSubmitFix)return;
  window.__NBAnswerResumeSubmitFix=true;
  const original=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input?.url||'');
    if(/exam-api\?action=submit(?:&|$)/.test(url)&&init?.body){
      try{
        const body=JSON.parse(init.body), saved=read();
        if(saved&&Array.isArray(saved.paper)&&saved.paper.length&&body&&Array.isArray(body.questionIds)){
          const merged={...(body.answers||{})};
          Object.entries(saved.answers||{}).forEach(([idx,a])=>{
            const i=Number(idx), q=saved.paper[i];
            if(q&&a&&Number.isInteger(Number(a.index))&&!Object.prototype.hasOwnProperty.call(merged,q.id)){
              merged[q.id]=Number(a.index);
            }
          });
          body.answers=merged;
          init={...init,body:JSON.stringify(body)};
        }
      }catch(e){}
    }
    return original(input,init);
  };
}
patchFetch();patchSubmitAnswers();
  document.addEventListener('click',e=>{const b=e.target.closest?.('#examList .exam-card');if(b&&!b.classList.contains('disabled')){pendingExamId=b.dataset.id||null;armResume()}},true);
  document.addEventListener('click',e=>{const b=e.target.closest?.('#startBtn');if(!b||!state||resuming)return;const n=$('#candidateName')?.value.trim()||'',em=$('#candidateEmail')?.value.trim()||'';if(n&&(em||wa)){state.started=true;state.questionIndex=0;state.timerEndsAt=0;setSession(true);candidate();write();setTimeout(lockNavigation,80)}},true);
  document.addEventListener('input',()=>{if(state&&!resuming)candidate()},true);
  document.addEventListener('change',()=>{if(state&&!resuming){candidate();capture()}},true);
  document.addEventListener('click',e=>{if(!state||resuming)return;if(e.target.closest?.('#questionNav button')){setTimeout(capture,20);return}if(e.target.closest?.('#questionCard .option'))setTimeout(capture,20)},true);
  document.addEventListener('visibilitychange',()=>{if(resultVisible()){clear();return}if(document.visibilityState==='hidden'){candidate();capture()}else if(state?.started)setTimeout(resume,100)});
  window.addEventListener('pagehide',()=>{if(resultVisible())clear();else{candidate();capture()}});
  window.addEventListener('beforeunload',()=>{if(resultVisible())clear();else{candidate();capture()}});
  [600,1500,3000,6000].forEach(ms=>setTimeout(()=>{if(resultVisible()){clear();return}state=read()||state;if(examVisible())lockNavigation();if(resumeArmed()&&state?.started&&activeSession())resume()},ms));
})();