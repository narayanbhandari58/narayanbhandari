/* Exact exam resume v10
   - Never lets the exam catalogue requests overwrite the active saved paper.
   - A fresh visit opens the chooser.
   - Once an exam is actually started, refresh/re-open restores the same paper,
     question and selected answers without showing the candidate form again.
*/
(function(){
  const KEY='nb_loksewa_exact_resume_v10';
  const OLD=[
    'nb_loksewa_exact_resume_v9','nb_loksewa_exact_resume_v8',
    'nb_loksewa_exact_resume_v7','nb_loksewa_exact_resume_v6',
    'nb_loksewa_exact_resume_v5','nb_loksewa_exact_resume_v4',
    'nb_loksewa_exam_resume_v3','nb_loksewa_exam_resume_v2'
  ];
  const ALL=[KEY,...OLD];
  const SESSION='nb_loksewa_exam_session_active_v10';
  const $=s=>document.querySelector(s);
  let state=null,resuming=false,restoring=false,restoreClick=false,pendingExamId=null;

  const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
  const sessionActive=()=>{try{return sessionStorage.getItem(SESSION)==='1'}catch(e){return false}};
  const setSession=on=>{try{if(on)sessionStorage.setItem(SESSION,'1');else sessionStorage.removeItem(SESSION)}catch(e){}};
  const isActiveSaved=()=>!!(sessionActive()&&state?.started&&state?.examId&&Array.isArray(state.paper)&&state.paper.length);

  function read(){
    try{
      for(const k of ALL){
        const v=localStorage.getItem(k); if(!v)continue;
        const x=JSON.parse(v);
        if(x&&x.examId&&Array.isArray(x.paper)&&x.paper.length)return x;
      }
    }catch(e){}
    return null;
  }
  function write(){
    try{if(state)localStorage.setItem(KEY,JSON.stringify({...state,savedAt:Date.now(),version:10}))}catch(e){}
  }
  function clearSaved(){
    try{ALL.forEach(k=>localStorage.removeItem(k))}catch(e){}
    setSession(false);state=null;resuming=false;restoring=false;restoreClick=false;pendingExamId=null;
  }
  function resultVisible(){const e=$('#result');return !!(e&&!e.hidden&&getComputedStyle(e).display!=='none')}

  function currentIndex(){
    const h=$('#questionCard h2');
    if(h){const m=clean(h.textContent).match(/^(\d+)\s*[.)]/);if(m)return Number(m[1])-1;}
    const bs=[...document.querySelectorAll('#questionNav button')];
    const active=bs.findIndex(b=>b.classList.contains('active')||b.getAttribute('aria-current')==='true');
    return active>=0?active:null;
  }

  function captureCurrent(){
    if(!state||restoring||resultVisible())return;
    const i=currentIndex(),c=$('#questionCard');
    if(i==null||!c)return;
    state.started=true;setSession(true);state.questionIndex=i;state.answers=state.answers||{};
    const els=[...c.querySelectorAll('input[type="radio"],input[type="checkbox"]')];
    const checked=els.filter(e=>e.checked).map(e=>({value:String(e.value||e.dataset.value||e.id||''),index:els.indexOf(e)}));
    if(checked.length)state.answers[i]=checked;
    else if(Object.prototype.hasOwnProperty.call(state.answers,i))delete state.answers[i];
    write();
  }

  function captureCandidate(){
    if(!state||resultVisible())return;
    [['candidateName','name'],['candidateEmail','email'],['candidateWhatsapp','whatsapp']].forEach(([id,key])=>{
      const e=document.getElementById(id);if(e)state[key]=e.value||'';
    });
    write();
  }

  function patchFetch(){
    if(window.__nbResumeV10Fetch)return;window.__nbResumeV10Fetch=true;
    const original=window.fetch.bind(window);
    window.fetch=async function(input,init){
      const url=typeof input==='string'?input:(input?.url||'');
      const cfg=/exam-api\?action=config(?:&|$)/.test(url);
      const m=url.match(/[?&]exam=([^&]+)/);const id=m?decodeURIComponent(m[1]):null;
      if(cfg&&id&&isActiveSaved()&&restoreClick&&id===state.examId){
        return new Response(JSON.stringify({exam:state.exam,ready:true,questions:state.paper}),{status:200,headers:{'Content-Type':'application/json'}});
      }
      const r=await original(input,init);
      if(cfg&&id){
        try{
          const d=await r.clone().json();
          if(pendingExamId===id && Array.isArray(d.questions)&&d.questions.length){
            state=state||{};
            state.examId=id;
            state.exam=d.exam;
            state.paper=d.questions;
            state.questionCount=d.questions.length;
            state.answers=state.answers||{};
            state.started=false;
            state.questionIndex=0;
            write();
          }
        }catch(e){}
      }
      return r;
    };
  }

  function fillCandidate(){
    if(!state)return;
    [['candidateName','name'],['candidateEmail','email'],['candidateWhatsapp','whatsapp']].forEach(([id,key])=>{
      const e=document.getElementById(id);if(e&&state[key]!=null)e.value=state[key];
    });
  }
  const active=()=>!!($('#exam')&&!$('#exam').hidden);
  const cand=()=>!!($('#candidate')&&!$('#candidate').hidden);
  const chooser=()=>!!($('#chooser')&&!$('#chooser').hidden);

  function chooseSaved(){
    const id=state?.examId;
    if(!sessionActive()||!state?.started||!id)return false;
    const b=[...document.querySelectorAll('#examList .exam-card')].find(x=>x.dataset.id===id);
    if(!b||b.classList.contains('disabled'))return false;
    restoreClick=true;b.click();return true;
  }

  function startSaved(){
    fillCandidate();
    const b=$('#startBtn');if(!b||b.disabled)return false;
    restoreClick=false;b.click();return true;
  }

  function restoreAnswers(){
    const c=$('#questionCard');if(!c||!state)return;
    const els=[...c.querySelectorAll('input[type="radio"],input[type="checkbox"]')];
    const list=Array.isArray(state.answers?.[state.questionIndex])?state.answers[state.questionIndex]:[];
    list.forEach(a=>{
      let e=Number.isInteger(a?.index)?els[a.index]:null;
      if(!e&&a?.value)e=els.find(x=>String(x.value)===String(a.value)||String(x.dataset.value||'')===String(a.value)||String(x.id)===String(a.value));
      if(e)e.checked=true;
    });
  }

  function restoreQuestion(){
    const i=state?.questionIndex;if(!Number.isInteger(i))return false;
    const bs=[...document.querySelectorAll('#questionNav button')],b=bs[i];
    if(!b)return false;
    restoring=true;b.click();
    setTimeout(()=>{restoreAnswers();setTimeout(()=>{restoring=false;write()},100)},220);
    return true;
  }

  function resume(){
    if(!isActiveSaved()||resuming)return;
    resuming=true;const target=state.questionIndex,startedAt=Date.now();
    const tick=()=>{
      if(resultVisible()){clearSaved();return;}
      if(Date.now()-startedAt>20000){resuming=false;restoring=false;restoreClick=false;return;}
      if(active()){
        state.questionIndex=target;restoreQuestion();
        setTimeout(()=>{state.questionIndex=target;restoreAnswers();restoring=false;write();resuming=false},500);
        return;
      }
      if(cand()){
        fillCandidate();startSaved();setTimeout(tick,350);return;
      }
      if(chooser()){
        chooseSaved();setTimeout(tick,500);return;
      }
      setTimeout(tick,250);
    };
    tick();
  }

  state=read();
  if(!(sessionActive()&&state?.started)){
    setSession(false);
    if(state)state.started=false;
  }
  patchFetch();

  document.addEventListener('click',e=>{
    const card=e.target.closest?.('#examList .exam-card');
    if(card&&!card.classList.contains('disabled'))pendingExamId=card.dataset.id||null;
  },true);

  document.addEventListener('input',()=>{if(state&&!resuming)captureCandidate()},true);
  document.addEventListener('change',()=>{if(state&&!resuming){captureCandidate();captureCurrent()}},true);
  document.addEventListener('click',e=>{
    if(!state)return;
    const nav=e.target.closest?.('#questionNav button');
    if(nav&&!resuming){captureCurrent();return}
    if(e.target.closest?.('#questionCard .option')&&!resuming)setTimeout(captureCurrent,40);
  },true);

  document.addEventListener('click',e=>{
    const b=e.target.closest?.('#startBtn');
    if(!b||!state||resuming)return;
    const name=$('#candidateName')?.value.trim()||'';
    const email=$('#candidateEmail')?.value.trim()||'';
    if(name&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      state.started=true;setSession(true);captureCandidate();write();
      pendingExamId=null;
    }
  },true);

  document.addEventListener('visibilitychange',()=>{
    if(resultVisible()){clearSaved();return}
    if(document.visibilityState==='hidden'){captureCandidate();captureCurrent()}
    else if(isActiveSaved())setTimeout(resume,150);
  });
  window.addEventListener('pagehide',()=>{if(resultVisible())clearSaved();else{captureCandidate();captureCurrent()}});
  window.addEventListener('beforeunload',()=>{if(resultVisible())clearSaved();else{captureCandidate();captureCurrent()}});

  const obs=new MutationObserver(()=>{
    if(resultVisible()){clearSaved();return}
    if(state&&!resuming&&!restoring)setTimeout(()=>{
      if(resultVisible()){clearSaved();return}
      if(active())captureCurrent();
    },80);
  });
  obs.observe(document.body,{childList:true,subtree:true});

  [700,1800,3500,6000].forEach(ms=>setTimeout(()=>{
    if(resultVisible()){clearSaved();return}
    state=read()||state;
    if(isActiveSaved())resume();
  },ms));
})();