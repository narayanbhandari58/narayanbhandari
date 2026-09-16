/* Exam answer/resume integrity fix
   - Bridges resume's index-based answer state to the submit API's question-ID map.
   - Captures the current answer immediately before submit.
   - Restores saved answers into the live exam UI without changing exam.js globals.
   - Works with all three dynamic exams because it reads the active paper from resume state.
*/
(function(){
  const RESUME_KEY='nb_loksewa_exact_resume_v12';
  const clean=s=>String(s??'').trim();
  const read=()=>{try{return JSON.parse(localStorage.getItem(RESUME_KEY)||'null')}catch(e){return null}};
  const write=s=>{try{localStorage.setItem(RESUME_KEY,JSON.stringify({...s,savedAt:Date.now()}))}catch(e){}};

  function captureCurrent(){
    const s=read();
    if(!s||!Array.isArray(s.paper)||!s.paper.length)return;
    const h=document.querySelector('#questionCard h2');
    const m=h&&clean(h.textContent).match(/^(\d+)\s*[.)]/);
    let i=m?Number(m[1])-1:null;
    if(i==null){
      const bs=[...document.querySelectorAll('#questionNav button')];
      const b=bs.find(x=>x.classList.contains('active')||x.getAttribute('aria-current')==='true');
      i=b?bs.indexOf(b):null;
    }
    if(!Number.isInteger(i)||!s.paper[i])return;
    s.answers=s.answers||{};
    const selected=document.querySelector('#questionCard .option.selected');
    if(selected)s.answers[i]={index:Number(selected.dataset.i),value:String(selected.dataset.i??'')};
    else delete s.answers[i];
    s.questionIndex=i;
    write(s);
  }

  function restoreAll(){
    const s=read();
    if(!s||!Array.isArray(s.paper)||!s.answers)return;
    const cards=[...document.querySelectorAll('#questionNav button')];
    if(!cards.length)return;
    const target=Number.isInteger(s.questionIndex)?s.questionIndex:0;
    cards.forEach((b,i)=>{
      const a=s.answers[i];
      if(!a) return;
      b.click();
      setTimeout(()=>{
        const opt=[...document.querySelectorAll('#questionCard .option')].find(x=>Number(x.dataset.i)===Number(a.index));
        if(opt)opt.click();
      },20);
    });
    setTimeout(()=>{
      const b=cards[target];
      if(b)b.click();
    },Math.min(120,cards.length*25+30));
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
              if(q&&a&&Number.isInteger(Number(a.index)))merged[q.id]=Number(a.index);
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
    if(e.target.closest?.('#finishBtn'))setTimeout(captureCurrent,0);
  },true);
  document.addEventListener('click',e=>{
    if(e.target.closest?.('#questionCard .option'))setTimeout(captureCurrent,25);
  },true);
  document.addEventListener('change',e=>{
    if(e.target.closest?.('#questionCard'))setTimeout(captureCurrent,25);
  },true);
  patchSubmit();
  [800,1800,3500].forEach(ms=>setTimeout(restoreAll,ms));
})();
