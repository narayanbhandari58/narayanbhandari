/* Exact exam resume v8: resume only an actually-started exam; preserve paper, position, answers and candidate data. */
(function(){
  const KEY='nb_loksewa_exact_resume_v8';
  const OLD=['nb_loksewa_exact_resume_v7','nb_loksewa_exact_resume_v6','nb_loksewa_exact_resume_v5','nb_loksewa_exact_resume_v4','nb_loksewa_exam_resume_v3','nb_loksewa_exam_resume_v2'];
  const ALL=[KEY,...OLD];
  const $=s=>document.querySelector(s);
  let state=null,resuming=false,restoring=false,restoreClick=false;
  const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
  function read(){try{for(const k of ALL){const v=localStorage.getItem(k);if(!v)continue;const x=JSON.parse(v);if(x&&x.examId&&Array.isArray(x.paper)&&x.paper.length)return x}}catch(e){}return null}
  function write(){try{if(state)localStorage.setItem(KEY,JSON.stringify({...state,savedAt:Date.now(),version:8}))}catch(e){}}
  function clearSaved(){try{ALL.forEach(k=>localStorage.removeItem(k))}catch(e){}state=null;resuming=false;restoring=false;restoreClick=false}
  function resultVisible(){const e=$('#result');return !!(e&&!e.hidden&&getComputedStyle(e).display!=='none')}
  function currentIndex(){const h=$('#questionCard h2');if(!h)return null;const m=clean(h.textContent).match(/^(\d+)\s*[.)]/);return m?Number(m[1])-1:null}
  function captureCurrent(){
    if(!state||restoring||resultVisible())return;
    const i=currentIndex();const c=$('#questionCard');if(i==null||!c)return;
    state.started=true;
    state.questionIndex=i;state.answers=state.answers||{};
    const els=[...c.querySelectorAll('input[type="radio"],input[type="checkbox"]')];
    const checked=els.filter(e=>e.checked).map((e,index)=>({value:String(e.value||e.dataset.value||e.id||''),index:els.indexOf(e)}));
    if(checked.length)state.answers[i]=checked;else if(Object.prototype.hasOwnProperty.call(state.answers,i))delete state.answers[i];
    write();
  }
  function captureCandidate(){if(!state||resultVisible())return;[['candidateName','name'],['candidateEmail','email'],['candidateWhatsapp','whatsapp']].forEach(([id,key])=>{const e=document.getElementById(id);if(e)state[key]=e.value||''});write()}
  function patchFetch(){
    if(window.__nbResumeV8Fetch)return;window.__nbResumeV8Fetch=true;
    const original=window.fetch.bind(window);
    window.fetch=async function(input,init){
      const url=typeof input==='string'?input:(input?.url||'');
      const cfg=/exam-api\?action=config(?:&|$)/.test(url);const m=url.match(/[?&]exam=([^&]+)/);const id=m?decodeURIComponent(m[1]):null;
      if(cfg&&restoreClick&&state?.started&&state?.examId===id&&Array.isArray(state.paper)&&state.paper.length){return new Response(JSON.stringify({exam:state.exam,ready:true,questions:state.paper}),{status:200,headers:{'Content-Type':'application/json'}})}
      const r=await original(input,init);
      if(cfg&&id){try{const d=await r.clone().json();if(Array.isArray(d.questions)&&d.questions.length&&(!state||state.examId!==id||!Array.isArray(state.paper)||!state.paper.length)){state=state||{};state.examId=id;state.exam=d.exam;state.paper=d.questions;state.questionCount=d.questions.length;state.answers=state.answers||{};state.started=false;write()}}catch(e){}}
      return r;
    };
  }
  function fillCandidate(){if(!state)return;[['candidateName','name'],['candidateEmail','email'],['candidateWhatsapp','whatsapp']].forEach(([id,key])=>{const e=document.getElementById(id);if(e&&state[key]!=null)e.value=state[key]})}
  const active=()=>!!($('#exam')&&!$('#exam').hidden),cand=()=>!!($('#candidate')&&!$('#candidate').hidden),chooser=()=>!!($('#chooser')&&!$('#chooser').hidden);
  function chooseSaved(){const id=state?.examId;if(!state?.started||!id)return false;const b=[...document.querySelectorAll('#examList .exam-card')].find(x=>x.dataset.id===id);if(!b||b.classList.contains('disabled'))return false;restoreClick=true;b.click();return true}
  function startSaved(){fillCandidate();const b=$('#startBtn');if(!b||b.disabled)return false;restoreClick=false;b.click();return true}
  function restoreAnswers(){
    const c=$('#questionCard');if(!c||!state)return;
    const els=[...c.querySelectorAll('input[type="radio"],input[type="checkbox"]')];
    const list=Array.isArray(state.answers?.[state.questionIndex])?state.answers[state.questionIndex]:[];
    list.forEach(a=>{let e=Number.isInteger(a?.index)?els[a.index]:null;if(!e&&a?.value)e=els.find(x=>String(x.value)===String(a.value)||String(x.dataset.value||'')===String(a.value)||String(x.id)===String(a.value));if(e)e.checked=true});
  }
  function restoreQuestion(){const i=state?.questionIndex;if(!Number.isInteger(i))return false;const bs=[...document.querySelectorAll('#questionNav button')];const b=bs[i];if(!b)return false;restoring=true;b.click();setTimeout(()=>{restoreAnswers();setTimeout(()=>{restoring=false;write()},100)},220);return true}
  function resume(){
    if(!state?.started||!state?.examId||resuming)return;resuming=true;const target=state.questionIndex;const started=Date.now();
    const tick=()=>{if(resultVisible()){clearSaved();return}if(Date.now()-started>20000){resuming=false;restoring=false;restoreClick=false;return}
      if(active()){state.questionIndex=target;restoreQuestion();setTimeout(()=>{state.questionIndex=target;restoreAnswers();restoring=false;write();resuming=false},500);return}
      if(cand()){fillCandidate();startSaved();setTimeout(tick,350);return}
      if(chooser()){chooseSaved();setTimeout(tick,500);return}
      setTimeout(tick,250);
    };tick();
  }
  state=read();patchFetch();
  document.addEventListener('input',()=>{if(state&&!resuming)captureCandidate()},true);
  document.addEventListener('change',()=>{if(state&&!resuming){captureCandidate();captureCurrent()}},true);
  document.addEventListener('click',e=>{if(!state)return;const nav=e.target.closest('#questionNav button');if(nav&&!resuming){captureCurrent();return}if(e.target.closest('#questionCard input')&&!resuming)setTimeout(captureCurrent,40)},true);
  document.addEventListener('visibilitychange',()=>{if(resultVisible()){clearSaved();return}if(document.visibilityState==='hidden'){captureCandidate();captureCurrent()}else if(state?.started)setTimeout(resume,200)});
  window.addEventListener('pagehide',()=>{if(resultVisible())clearSaved();else{captureCandidate();captureCurrent()}});
  window.addEventListener('beforeunload',()=>{if(resultVisible())clearSaved();else{captureCandidate();captureCurrent()}});
  const obs=new MutationObserver(()=>{if(resultVisible()){clearSaved();return}if(state&&!resuming&&!restoring)setTimeout(()=>{if(resultVisible()){clearSaved();return}if(active())captureCurrent();else if(state.started)captureCandidate()},80)});
  obs.observe(document.body,{childList:true,subtree:true});
  [500,1500,3000,5000].forEach(ms=>setTimeout(()=>{if(resultVisible()){clearSaved();return}state=read()||state;if(state?.started)resume()},ms));
})();