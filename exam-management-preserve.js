/* Preserve all question metadata during Admin edits.
   The editor currently exposes only the common MCQ fields. This guard merges
   the existing question object into save-data payloads so DI/paragraph/
   pictorial/custom fields cannot disappear just because they are not in the form.
*/
(function(){
  if(window.__nbExamManagementPreserve)return;
  window.__nbExamManagementPreserve=true;
  const SAVE='action=save-data';
  const original=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input?.url||'');
    const method=String(init?.method||input?.method||'GET').toUpperCase();
    if(method==='POST' && url.includes('exam-api') && url.includes(SAVE)){
      try{
        const body=typeof init.body==='string'?JSON.parse(init.body):null;
        const list=body?.data?.questions;
        const previous=window.__nbExamManagementPreviousQuestions;
        if(Array.isArray(list)&&Array.isArray(previous)){
          const oldById=new Map(previous.filter(q=>q?.id).map(q=>[q.id,q]));
          body.data.questions=list.map(q=>{
            const old=oldById.get(q?.id);
            return old?{...old,...q}:q;
          });
          init={...init,body:JSON.stringify(body)};
        }
      }catch(e){console.warn('Question metadata preservation skipped:',e.message)}
    }
    return original(input,init);
  };
  // The management page's own data variable is private, so obtain a read-only
  // snapshot from the same authenticated endpoint before the editor starts.
  async function snapshot(){
    try{
      const token=localStorage.getItem('nb_admin_token');
      if(!token)return;
      const r=await original('/.netlify/functions/exam-api?action=admin-data',{headers:{Authorization:'Bearer '+token}});
      const d=await r.json();
      if(r.ok&&Array.isArray(d?.data?.questions))window.__nbExamManagementPreviousQuestions=d.data.questions;
    }catch(e){console.warn('Question metadata snapshot unavailable:',e.message)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',snapshot);else snapshot();
})();