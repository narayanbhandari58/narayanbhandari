/* Resume v5: preserve the exact paper, current question and all marked answers across mobile refresh. */
(function(){
  const KEY='nb_loksewa_exact_resume_v5';
  const OLD=['nb_loksewa_exact_resume_v4','nb_loksewa_exam_resume_v3','nb_loksewa_exam_resume_v2'];
  const $=s=>document.querySelector(s);
  let state=null,resuming=false,restoring=false,restoreClick=false;
  const read=()=>{try{for(const k of [KEY,...OLD]){const v=localStorage.getItem(k);if(v){const x=JSON.parse(v);if(x&&x.examId&&Array.isArray(x.paper)&&x.paper.length)return x}}}catch(e){}return null};
  const write=()=>{try{if(state)localStorage.setItem(KEY,JSON.stringify({...state,savedAt:Date.now()}))}catch(e){}};
  function currentIndex(){const h=$('#questionCard h2');if(!h)return null;const m=String(h.textContent||'').match(/^\s*(\d+)\s*[.)]/);return m?Number(m[1])-1:null}
  function saveCurrent(){if(!state||restoring)return;const i=currentIndex();if(i==null)return;state.questionIndex=i;state.answers=state.answers||{};const c=$('#questionCard');const checked=[...(c?.querySelectorAll('input[type="radio"]:checked,input[type="checkbox"]:checked')||[])];if(checked.length){state.answers[i]=checked.map(e=>({value:e.value||e.dataset.value||e.id||'',index:[...c.querySelectorAll('input[type="radio"],input[type="checkbox"]')].indexOf(e)}));}else if(state.answers[i])delete state.answers[i];write()}
  function saveCandidate(){if(!state)return;for(const [id,key] of [['candidateName','name'],['candidateEmail','email'],['candidateWhatsapp','whatsapp']]){const e=document.getElementById(id);if(e&&e.value)state[key]=e.value}write()}
  function patchFetch(){if(window.__nbResumeV5Fetch)return;window.__nbResumeV5Fetch=true;const original=window.fetch.bind(window);window.fetch=async function(input,init){const url=typeof input==='string'?input:(input?.url||'');const cfg=/exam-api\?action=config(?:&|$)/.test(url);const m=url.match(/[?&]exam=([^&]+)/);const id=m?decodeURIComponent(m[1]):null;
      if(cfg&&restoreClick&&state?.examId===id&&Array.isArray(state.paper)&&state.paper.length){return new Response(JSON.stringify({exam:state.exam,ready:true,questions:state.paper}),{status:200,headers:{'Content-Type':'application/json'}})}
      const r=await original(input,init);
      /* Never overwrite an existing resumed paper with the page's background config requests. */
      if(cfg&&id){try{const d=await r.clone().json();if(Array.isArray(d.questions)&&d.questions.length){if(!state||state.examId!==id||!Array.isArray(state.paper)||!state.paper.length){state=state||{};state.examId=id;state.exam=d.exam;state.paper=d.questions;state.questionCount=d.questions.length;state.answers=state.answers||{};write()}}}catch(e){}}
      return r;
    }}
  function fillCandidate(){if(!state)return;[['candidateName','name'],['candidateEmail','email'],['candidateWhatsapp','whatsapp']].forEach(([id,k])=>{const e=document.getElementById(id);if(e&&state[k])e.value=state[k]})}
  const active=()=>!!($('#exam')&&!$('#exam').hidden), cand=()=>!!($('#candidate')&&!$('#candidate').hidden), chooser=()=>!!($('#chooser')&&!$('#chooser').hidden);
  function chooseSaved(){const id=state?.examId;if(!id)return false;const b=document.querySelector(`#examList .exam-card[data-id="${CSS.escape(id)}"]`);if(!b||b.classList.contains('disabled'))return false;restoreClick=true;b.click();return true}
  function startSaved(){fillCandidate();const b=$('#startBtn');if(!b||b.disabled)return false;restoreClick=false;b.click();return true}
  function restoreAnswers(){const map=state?.answers||{};const c=$('#questionCard');if(!c)return;const els=[...c.querySelectorAll('input[type="radio"],input[type="checkbox"]')];const list=Array.isArray(map[state.questionIndex])?map[state.questionIndex]:(map[state.questionIndex]?[map[state.questionIndex]]:[]);list.forEach(a=>{let e=Number.isInteger(a?.index)?els[a.index]:null;if(!e&&a?.value)e=els.find(x=>String(x.value)===String(a.value)||String(x.dataset.value||'')===String(a.value)||x.id===a.value);if(e&&!e.checked)e.click()})}
  function restoreQuestion(){const i=state?.questionIndex;if(!Number.isInteger(i))return false;const bs=[...document.querySelectorAll('#questionNav button')];const b=bs[i];if(!b)return false;restoring=true;b.click();setTimeout(()=>{restoreAnswers();setTimeout(()=>{restoring=false;write()},80)},180);return true}
  function resume(){if(!state?.examId||resuming)return;resuming=true;const target=state.questionIndex;const started=Date.now();const tick=()=>{if(Date.now()-started>20000){resuming=false;restoring=false;restoreClick=false;return}
      if(active()){state.questionIndex=target;setTimeout(()=>{restoreQuestion();setTimeout(()=>{state.questionIndex=target;restoreAnswers();restoring=false;write();resuming=false},450)},100);return}
      if(cand()){fillCandidate();startSaved();setTimeout(tick,300);return}
      if(chooser()){chooseSaved();setTimeout(tick,450);return}
      setTimeout(tick,250);
    };tick()}
  state=read();patchFetch();
  document.addEventListener('input',()=>{if(state&&!resuming)saveCandidate()},true);
  document.addEventListener('change',()=>{if(state&&!resuming){saveCandidate();saveCurrent()}},true);
  document.addEventListener('click',e=>{if(!state)return;const nav=e.target.closest('#questionNav button');if(nav&&!resuming){saveCurrent();return}if(e.target.closest('#questionCard input')&&!resuming)setTimeout(saveCurrent,80)},true);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){saveCandidate();saveCurrent()}else if(state)setTimeout(resume,200)});
  window.addEventListener('pagehide',()=>{saveCandidate();saveCurrent()});
  window.addEventListener('beforeunload',()=>{saveCandidate();saveCurrent()});
  const obs=new MutationObserver(()=>{if(state&&!resuming&&!restoring)setTimeout(()=>{if(active())saveCurrent();else saveCandidate()},80)});
  obs.observe(document.body,{childList:true,subtree:true});
  [300,1000,2000,4000,7000].forEach(ms=>setTimeout(()=>{state=read()||state;if(state?.examId)resume()},ms));
})();