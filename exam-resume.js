/* Exact-paper resume: saves the generated 100-question paper and restores it instead of generating a new paper. */
(function(){
  const KEY='nb_loksewa_exact_resume_v4';
  const OLD=['nb_loksewa_exam_resume_v3','nb_loksewa_exam_resume_v2','nb_loksewa_exam_resume_v1'];
  const $=s=>document.querySelector(s);
  let state=null,resuming=false,restoreClick=false;
  const read=()=>{try{let v=localStorage.getItem(KEY);if(v)return JSON.parse(v);for(const k of OLD){v=localStorage.getItem(k);if(v)return JSON.parse(v)}}catch(e){}return null};
  const write=()=>{try{if(state)localStorage.setItem(KEY,JSON.stringify({...state,savedAt:Date.now()}))}catch(e){}};
  const qIndex=()=>{const h=$('#questionCard h2');if(!h)return null;const m=String(h.textContent||'').match(/^\s*(\d+)\s*[.)]/);return m?Number(m[1])-1:null};
  const examId=()=>state?.examId||null;
  function rememberQuestion(){const i=qIndex();if(i==null)return;state.questionIndex=i;const c=$('#questionCard');const checked=c?.querySelector('input[type="radio"]:checked,input[type="checkbox"]:checked');state.answers=state.answers||{};if(checked)state.answers[i]={value:checked.value||checked.dataset.value||checked.id||'',index:[...c.querySelectorAll('input[type="radio"],input[type="checkbox"]')].indexOf(checked)};write()}
  function rememberCandidate(){for(const [id,key] of [['candidateName','name'],['candidateEmail','email'],['candidateWhatsapp','whatsapp']]){const e=document.getElementById(id);if(e?.value)state[key]=e.value}write()}
  function patchFetch(){if(window.__nbExactFetchPatched)return;window.__nbExactFetchPatched=true;const original=window.fetch.bind(window);window.fetch=async function(input,init){const url=typeof input==='string'?input:(input?.url||'');const isConfig=/exam-api\?action=config(?:&|$)/.test(url);const m=url.match(/[?&]exam=([^&]+)/);const id=m?decodeURIComponent(m[1]):null;
      if(isConfig&&resuming&&restoreClick&&state?.examId===id&&Array.isArray(state.paper)&&state.paper.length){const saved={exam:{...state.exam,questionCount:state.paper.length},ready:true,questions:state.paper};return new Response(JSON.stringify(saved),{status:200,headers:{'Content-Type':'application/json'}})}
      const r=await original(input,init);if(isConfig&&id){try{const d=await r.clone().json();if(Array.isArray(d.questions)&&d.questions.length){state=state||{};state.examId=id;state.exam=d.exam;state.paper=d.questions;state.questionCount=d.questions.length;state.answers=state.answers||{};write()}}catch(e){}}return r;};}
  function fill(){if(!state)return;[['candidateName','name'],['candidateEmail','email'],['candidateWhatsapp','whatsapp']].forEach(([id,k])=>{const e=document.getElementById(id);if(e&&state[k]&&!e.value)e.value=state[k]})}
  function active(){return !!($('#exam')&&!$('#exam').hidden)}
  function candidate(){return !!($('#candidate')&&!$('#candidate').hidden)}
  function chooser(){return !!($('#chooser')&&!$('#chooser').hidden)}
  function chooseSaved(){if(!state?.examId)return false;const b=document.querySelector(`#examList .exam-card[data-id="${CSS.escape(state.examId)}"]`);if(!b||b.classList.contains('disabled'))return false;restoreClick=true;b.click();return true}
  function startSaved(){fill();rememberCandidate();const b=$('#startBtn');if(!b||b.disabled)return false;restoreClick=false;b.click();return true}
  function restoreAnswer(){const i=state?.questionIndex;if(!Number.isInteger(i))return;const a=state.answers?.[i];if(!a)return;const c=$('#questionCard');const els=[...c.querySelectorAll('input[type="radio"],input[type="checkbox"]')];let e=Number.isInteger(a.index)?els[a.index]:null;if(!e&&a.value)e=els.find(x=>String(x.value)===String(a.value)||String(x.dataset.value||'')===String(a.value)||x.id===a.value);if(e&&!e.checked)e.click()}
  function restoreQuestion(){const i=state?.questionIndex;if(!Number.isInteger(i))return false;const bs=[...document.querySelectorAll('#questionNav button')];const b=bs[i]||bs.find(x=>String(x.textContent||'').trim()===String(i+1));if(b){b.click();setTimeout(restoreAnswer,120);return true}return false}
  function resume(){if(!state?.examId||resuming)return;resuming=true;const started=Date.now();const tick=()=>{if(Date.now()-started>20000){resuming=false;restoreClick=false;return}
      if(active()){setTimeout(()=>{restoreQuestion();setTimeout(()=>{resuming=false;},180)},100);return}
      if(candidate()){fill();startSaved();setTimeout(tick,250);return}
      if(chooser()){chooseSaved();setTimeout(tick,350);return}
      setTimeout(tick,250);
    };tick()}
  state=read();patchFetch();
  document.addEventListener('input',()=>{if(state){rememberCandidate()}},true);
  document.addEventListener('change',()=>{if(state){rememberCandidate();rememberQuestion()}},true);
  document.addEventListener('click',e=>{if(e.target.closest('#questionNav button,#questionCard input'))setTimeout(rememberQuestion,80)},true);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){rememberCandidate();rememberQuestion()}else if(state)setTimeout(resume,150)});
  window.addEventListener('pagehide',()=>{rememberCandidate();rememberQuestion()});
  window.addEventListener('beforeunload',()=>{rememberCandidate();rememberQuestion()});
  const obs=new MutationObserver(()=>{if(state)setTimeout(()=>{rememberCandidate();if(active())rememberQuestion()},60)});
  obs.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{state=read()||state;if(state?.examId)resume()},250);
  setTimeout(()=>{state=read()||state;if(state?.examId)resume()},1000);
  setTimeout(()=>{state=read()||state;if(state?.examId)resume()},2500);
  setTimeout(()=>{state=read()||state;if(state?.examId)resume()},5000);
})();