/* Exact-paper resume: restores the same generated question set after mobile refresh. */
(function(){
  const KEY='nb_loksewa_exam_resume_v3';
  const OLD=['nb_loksewa_exam_resume_v2','nb_loksewa_exam_resume_v1'];
  const META={kharidar:'खरिदार',nasu:'नायब सुब्बा','sakha-adhikrit':'शाखा अधिकृत'};
  const $=s=>document.querySelector(s);
  const read=()=>{try{let x=localStorage.getItem(KEY);if(x)return JSON.parse(x);for(const k of OLD){x=localStorage.getItem(k);if(x)return JSON.parse(x)}return null}catch(e){return null}};
  const write=s=>{try{localStorage.setItem(KEY,JSON.stringify({...s,savedAt:Date.now()}))}catch(e){}};
  let state=read(),saving=false,resuming=false,originalFetch=window.fetch;
  function qIndex(){const h=$('#questionCard h2');if(!h)return null;const m=String(h.textContent||'').match(/^\s*(\d+)\s*[.)]/);return m?Number(m[1])-1:null}
  function detect(){const t=String($('#examTitle')?.textContent||$('#candidateTitle')?.textContent||'').trim();for(const id in META)if(t.includes(META[id]))return id;return state?.examId||null}
  function save(){if(saving)return;saving=true;try{const ex=detect(),qi=qIndex(),s={...(state||{})};if(ex)s.examId=ex;if(qi!==null)s.questionIndex=qi;const n=$('#candidateName')?.value,e=$('#candidateEmail')?.value,w=$('#candidateWhatsapp')?.value;if(n)s.name=n;if(e)s.email=e;if(w)s.whatsapp=w;s.answers={...(s.answers||{})};const c=$('#questionCard');if(qi!==null&&c){const checked=c.querySelector('input[type="radio"]:checked,input[type="checkbox"]:checked');if(checked)s.answers[qi]={value:checked.value||checked.dataset.value||checked.id||'',index:[...c.querySelectorAll('input[type="radio"],input[type="checkbox"]')].indexOf(checked)};else delete s.answers[qi]}state=s;write(s)}finally{setTimeout(()=>saving=false,0)}}
  function fill(){if(!state)return;[['candidateName',state.name],['candidateEmail',state.email],['candidateWhatsapp',state.whatsapp]].forEach(([id,v])=>{const el=document.getElementById(id);if(el&&v&&!el.value)el.value=v})}
  function restoreAnswer(){const qi=qIndex(),saved=state?.answers?.[qi];if(qi==null||!saved)return;const c=$('#questionCard');if(!c)return;const a=[...c.querySelectorAll('input[type="radio"],input[type="checkbox"]')];let el=Number.isInteger(saved.index)?a[saved.index]:null;if(!el)el=a.find(x=>String(x.value)===String(saved.value)||String(x.dataset.value||'')===String(saved.value)||x.id===saved.value);if(el&&!el.checked)el.click()}
  function nav(){if(state?.questionIndex==null)return false;const bs=[...document.querySelectorAll('#questionNav button')];const b=bs[state.questionIndex]||bs.find(x=>String(x.textContent||'').trim()===String(state.questionIndex+1));if(b){b.click();setTimeout(restoreAnswer,120);return true}return false}
  function active(){return !!($('#exam')&&!$('#exam').hidden)}
  function candidate(){return !!($('#candidate')&&!$('#candidate').hidden)}
  function chooser(){return !!($('#chooser')&&!$('#chooser').hidden)}
  function start(){fill();const b=$('#startBtn');if(!b||b.disabled)return false;const n=$('#candidateName');if(n&&!n.value&&state?.name)n.value=state.name;try{if(n&&!n.checkValidity())return false}catch(e){}b.click();return true}
  function resume(){if(resuming||!state?.examId||!state.paper?.questions?.length)return;resuming=true;const began=Date.now();const tick=()=>{if(Date.now()-began>20000){resuming=false;return}if(active()){setTimeout(()=>{nav();setTimeout(restoreAnswer,220)},100);resuming=false;return}if(candidate()){fill();start();setTimeout(tick,300);return}if(chooser()){const b=document.querySelector(`#examList .exam-card[data-id="${state.examId}"]`);if(b&&!b.classList.contains('disabled')){b.click();setTimeout(tick,300);return}}setTimeout(tick,250)};tick()}
  /* Capture the exact config response used when a paper is generated. On resume, return that same response instead of generating a new paper. */
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input?.url||'');
    const m=url.match(/[?&]action=config(?:&|$)[^#]*[?&]exam=([^&#]+)/)||url.match(/[?&]exam=([^&#]+)[^#]*[?&]action=config/);
    const examId=m?decodeURIComponent(m[1]):null;
    if(examId&&state?.examId===examId&&state.paper?.questions?.length){
      return new Response(JSON.stringify(state.paper),{status:200,headers:{'Content-Type':'application/json'}});
    }
    const response=await originalFetch.apply(this,arguments);
    if(examId){try{const clone=response.clone();const d=await clone.json();if(d?.ready&&Array.isArray(d.questions)&&d.questions.length){state={...(state||{}),examId,paper:d};write(state)}}catch(e){}}
    return response;
  };
  document.addEventListener('input',save,true);
  document.addEventListener('change',save,true);
  document.addEventListener('click',e=>{if(e.target.closest('#questionNav button,#questionCard input,#startBtn,#finishBtn'))setTimeout(save,60)},true);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save();else setTimeout(resume,250)},true);
  window.addEventListener('pagehide',save);
  window.addEventListener('beforeunload',save);
  const obs=new MutationObserver(()=>{setTimeout(()=>{save();if(state?.examId&&!active())resume()},80)});
  obs.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{state=read()||state;resume()},300);
  setTimeout(()=>{state=read()||state;resume()},900);
  setTimeout(()=>{state=read()||state;resume()},1800);
  setTimeout(()=>{state=read()||state;resume()},3500);
})();