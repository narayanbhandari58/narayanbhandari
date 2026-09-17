/* Exam answer/resume integrity fix v1.1
   - Bridges resume's index-based answer state to the submit API's question-ID map.
   - Captures the current answer synchronously before submit.
   - Restores only the active saved question; avoids racing through every question.
   - Supplements live submit answers only when an ID is missing, so cleared/changed answers are not overwritten.
   - Works with all three dynamic exams because it reads the active paper from resume state.
*/
(function(){
  const RESUME_KEY='nb_loksewa_exact_resume_v12';
  const clean=s=>String(s??'').trim();
  const read=()=>{try{return JSON.parse(localStorage.getItem(RESUME_KEY)||'null')}catch(e){return null}};
  const write=s=>{try{localStorage.setItem(RESUME_KEY,JSON.stringify({...s,savedAt:Date.now()}))}catch(e){}};

  function currentIndex(){
    const h=document.querySelector('#questionCard h2');
    const m=h&&clean(h.textContent).match(/^(\d+)\s*[.)]/);
    if(m)return Number(m[1])-1;
    const bs=[...document.querySelectorAll('#questionNav button')];
    const b=bs.find(x=>x.classList.contains('active')||x.getAttribute('aria-current')==='true');
    return b?bs.indexOf(b):null;
  }

  function captureCurrent(){
    const s=read();
    if(!s||!Array.isArray(s.paper)||!s.paper.length)return;
    const i=currentIndex();
    if(!Number.isInteger(i)||!s.paper[i])return;
    s.answers=s.answers||{};
    const selected=document.querySelector('#questionCard .option.selected');
    if(selected)s.answers[i]={index:Number(selected.dataset.i),value:String(selected.dataset.i??'')};
    else delete s.answers[i];
    s.questionIndex=i;
    write(s);
  }

  function restoreActive(){
    const s=read();
    if(!s||!Array.isArray(s.paper)||!s.answers)return;
    const i=Number.isInteger(s.questionIndex)?s.questionIndex:0;
    const a=s.answers[i];
    if(!a)return;
    const cards=[...document.querySelectorAll('#questionNav button')];
    const b=cards[i];
    if(!b)return;
    b.click();
    setTimeout(()=>{
      const opt=[...document.querySelectorAll('#questionCard .option')].find(x=>Number(x.dataset.i)===Number(a.index));
      if(opt&&!opt.classList.contains('selected'))opt.click();
    },80);
  }

  function patchSubmit(){
    if(window.__NBAnswerResumeSubmitFix)return;
    window.__NBAnswerResumeSubmitFix=true;
    const original=window.fetch.bind(window);
    window.fetch=async function(input,init){
      const url=typeof input==='string'?input:(input?.url||'');
      if(/exam-api\?action=submit(?:&|$)/.test(url)&&init?.body){
        try{
          const body=JSON.parse(init.body);
          const s=read();
          if(s&&Array.isArray(s.paper)&&s.paper.length&&body&&Array.isArray(body.questionIds)){
            const merged={...(body.answers||{})};
            Object.entries(s.answers||{}).forEach(([idx,a])=>{
              const i=Number(idx),q=s.paper[i];
              if(q&&a&&Number.isInteger(Number(a.index)) && !Object.prototype.hasOwnProperty.call(merged,q.id)){
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

  document.addEventListener('click',e=>{
    if(e.target.closest?.('#finishBtn'))captureCurrent();
  },true);
  document.addEventListener('click',e=>{
    if(e.target.closest?.('#questionCard .option'))setTimeout(captureCurrent,25);
  },true);
  document.addEventListener('click',e=>{
    if(e.target.closest?.('#questionNav button'))setTimeout(captureCurrent,60);
  },true);
  document.addEventListener('change',e=>{
    if(e.target.closest?.('#questionCard'))setTimeout(captureCurrent,25);
  },true);
  patchSubmit();
  [900,2200,4200].forEach(ms=>setTimeout(restoreActive,ms));
})();
