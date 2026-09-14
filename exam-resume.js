/* Mobile-safe resume for an unfinished Loksewa exam. */
(function(){
  const KEY='nb_loksewa_exam_resume_v2';
  const OLD='nb_loksewa_exam_resume_v1';
  const META={kharidar:'खरिदार',nasu:'नायब सुब्बा','sakha-adhikrit':'शाखा अधिकृत'};
  const $=s=>document.querySelector(s);
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(OLD)||'null')}catch(e){return null}};
  const write=s=>{try{localStorage.setItem(KEY,JSON.stringify({...s,savedAt:Date.now()}))}catch(e){}};
  let state=read(),lastIndex=null,saving=false,resuming=false;
  function getIndex(){const h=$('#questionCard h2');if(!h)return null;const m=String(h.textContent||'').match(/^\s*(\d+)\s*[.)]/);return m?Number(m[1])-1:null}
  function detect(){const t=String($('#examTitle')?.textContent||$('#candidateTitle')?.textContent||'').trim();for(const id in META)if(t.includes(META[id]))return id;return state?.examId||null}
  function save(){if(saving)return;saving=true;try{const ex=detect();const qi=getIndex();const s={...(state||{})};if(ex)s.examId=ex;if(qi!==null){s.questionIndex=qi;lastIndex=qi}const n=$('#candidateName')?.value;if(n)s.name=n;const e=$('#candidateEmail')?.value;if(e)s.email=e;const w=$('#candidateWhatsapp')?.value;if(w)s.whatsapp=w;const c=$('#questionCard');const checked=c?.querySelector('input[type="radio"]:checked,input[type="checkbox"]:checked');if(checked){s.answerValue=checked.value||checked.dataset.value||checked.id||'';s.answerIndex=[...c.querySelectorAll('input[type="radio"],input[type="checkbox"]')].indexOf(checked)}else{s.answerValue='';s.answerIndex=null}state=s;write(s)}finally{setTimeout(()=>saving=false,0)}}
  function fill(){if(!state)return;[['candidateName',state.name],['candidateEmail',state.email],['candidateWhatsapp',state.whatsapp]].forEach(([id,v])=>{const el=document.getElementById(id);if(el&&v&&!el.value)el.value=v})}
  function answer(){if(!state||state.questionIndex==null)return;const c=$('#questionCard');if(!c)return;const a=[...c.querySelectorAll('input[type="radio"],input[type="checkbox"]')];let el=Number.isInteger(state.answerIndex)?a[state.answerIndex]:null;if(!el&&state.answerValue)el=a.find(x=>String(x.value)===String(state.answerValue)||String(x.dataset.value||'')===String(state.answerValue)||x.id===state.answerValue);if(el&&!el.checked)el.click()}
  function nav(){if(!state||state.questionIndex==null)return false;const bs=[...document.querySelectorAll('#questionNav button')];const b=bs[state.questionIndex]||bs.find(x=>String(x.textContent||'').trim()===String(state.questionIndex+1));if(b){b.click();return true}return false}
  function active(){return !!($('#exam')&&!$('#exam').hidden)}
  function candidate(){return !!($('#candidate')&&!$('#candidate').hidden)}
  function chooser(){return !!($('#chooser')&&!$('#chooser').hidden)}
  function clickExam(){if(!state?.examId)return false;const b=document.querySelector(`#examList .exam-card[data-id="${state.examId}"]`);if(b&&!b.classList.contains('disabled')){b.click();return true}return false}
  function clickStart(){fill();const b=$('#startBtn');if(!b||b.disabled)return false;const name=$('#candidateName');if(name&&!name.value&&state?.name)name.value=state.name;try{if(name&&!name.checkValidity())return false}catch(e){}b.click();return true}
  function resume(){if(resuming||!state?.examId)return;resuming=true;const began=Date.now();let phase='';const tick=()=>{if(Date.now()-began>15000){resuming=false;return}if(active()){if(phase!=='exam'){phase='exam';setTimeout(()=>{nav();setTimeout(answer,180)},80)}else{nav();setTimeout(answer,120)}resuming=false;return}if(candidate()){if(phase!=='candidate'){phase='candidate';fill();setTimeout(()=>{clickStart()},80)}else clickStart();setTimeout(tick,250);return}if(chooser()){phase='chooser';if(clickExam())setTimeout(tick,250);else setTimeout(tick,300);return}setTimeout(tick,250)};tick()}
  document.addEventListener('input',save,true);
  document.addEventListener('change',save,true);
  document.addEventListener('click',e=>{if(e.target.closest('#questionNav button,#questionCard input,#startBtn'))setTimeout(save,50)},true);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save();else setTimeout(resume,250)},true);
  window.addEventListener('pagehide',save);
  window.addEventListener('beforeunload',save);
  const obs=new MutationObserver(()=>{setTimeout(()=>{save();if(state?.examId&&!active())resume()},60)});
  obs.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{state=read()||state;resume()},300);
  setTimeout(()=>{state=read()||state;resume()},900);
  setTimeout(()=>{state=read()||state;resume()},1800);
  setTimeout(()=>{state=read()||state;resume()},3500);
})();