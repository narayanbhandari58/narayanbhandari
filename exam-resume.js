/* Resume an unfinished Loksewa exam after browser refresh. */
(function(){
  const KEY='nb_loksewa_exam_resume_v1';
  const meta={kharidar:'खरिदार',nasu:'नायब सुब्बा','sakha-adhikrit':'शाखा अधिकृत'};
  const $=s=>document.querySelector(s);
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){return null}};
  const write=s=>{try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}};
  let state=read(), restoring=false;
  function saveInputs(){if(!state)state={};state.name=$('#candidateName')?.value||state.name||'';state.email=$('#candidateEmail')?.value||state.email||'';state.whatsapp=$('#candidateWhatsapp')?.value||state.whatsapp||'';write(state)}
  function questionIndex(){const h=$('#questionCard h2');if(!h)return null;const m=String(h.textContent||'').match(/^\s*(\d+)\s*[.)]/);return m?Number(m[1])-1:null}
  function saveAnswer(){if(!state)return;const c=$('#questionCard');const checked=c?.querySelector('input[type="radio"]:checked, input[type="checkbox"]:checked');if(checked){state.answerValue=checked.value||checked.getAttribute('data-value')||checked.id||'';state.answerIndex=[...c.querySelectorAll('input[type="radio"],input[type="checkbox"]')].indexOf(checked)}else{state.answerValue='';state.answerIndex=null}state.questionIndex=questionIndex();write(state)}
  function detectExam(){const t=$('#candidateTitle')?.textContent?.trim()||$('#examTitle')?.textContent?.trim()||'';for(const id in meta)if(t.includes(meta[id]))return id;return state?.examId||null}
  function capture(){const ex=detectExam();const qi=questionIndex();if(ex)state={...(state||{}),examId:ex};if(qi!==null)state.questionIndex=qi;saveInputs();saveAnswer()}
  function fillCandidate(){if(!state)return;const vals=[['candidateName',state.name],['candidateEmail',state.email],['candidateWhatsapp',state.whatsapp]];vals.forEach(([id,v])=>{const el=document.getElementById(id);if(el&&v&&!el.value)el.value=v})}
  function restoreAnswer(){if(!state||state.questionIndex==null)return;const c=$('#questionCard');if(!c)return;let el=null;const inputs=[...c.querySelectorAll('input[type="radio"],input[type="checkbox"]')];if(Number.isInteger(state.answerIndex))el=inputs[state.answerIndex];if(!el&&state.answerValue)el=inputs.find(x=>String(x.value)===String(state.answerValue)||String(x.dataset.value||'')===String(state.answerValue)||x.id===state.answerValue);if(el&&!el.checked){restoring=true;el.click();setTimeout(()=>restoring=false,0)}}
  function navToSaved(){if(!state||state.questionIndex==null)return;const nav=$('#questionNav');if(!nav)return;const buttons=[...nav.querySelectorAll('button')];const b=buttons[state.questionIndex];if(b){b.click();return}const fallback=buttons.find(x=>String(x.textContent||'').trim()===String(state.questionIndex+1));if(fallback)fallback.click()}
  function resume(){if(!state?.examId)return;const chooser=$('#chooser'),candidate=$('#candidate'),exam=$('#exam');if(exam&&!exam.hidden){navToSaved();setTimeout(restoreAnswer,150);return}if(candidate&&!candidate.hidden){fillCandidate();const start=$('#startBtn');if(start&&!start.disabled){start.click();setTimeout(navToSaved,500);setTimeout(restoreAnswer,750)}return}if(chooser&&!chooser.hidden){const b=chooser.querySelector(`.exam-card[data-id="${state.examId}"]`);if(b&&!b.classList.contains('disabled')){b.click();setTimeout(()=>{fillCandidate();const start=$('#startBtn');if(start&&!start.disabled){start.click();setTimeout(navToSaved,600);setTimeout(restoreAnswer,850)}},450)}}}
  document.addEventListener('input',()=>{if(!restoring){if(!state)state={};saveInputs()},true);
  document.addEventListener('change',()=>{if(!restoring){capture()}},true);
  document.addEventListener('click',e=>{if(e.target.closest('#questionNav button')||e.target.closest('#questionCard input'))setTimeout(capture,30)},true);
  const obs=new MutationObserver(()=>{if(!restoring)setTimeout(()=>{capture();restoreAnswer()},40)});
  window.addEventListener('beforeunload',capture);
  window.addEventListener('load',()=>{setTimeout(resume,900);setTimeout(resume,1800)});
  obs.observe(document.body,{childList:true,subtree:true});
})();