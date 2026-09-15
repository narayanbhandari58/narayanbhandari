/* Preserve hidden question metadata during Admin edits.
   A second edit in the same session must use the latest saved snapshot, not the
   first snapshot taken when the page opened.
*/
(function(){
  if(window.__nbExamManagementPreserveV2)return;
  window.__nbExamManagementPreserveV2=true;
  const API='/.netlify/functions/exam-api?action=';
  const original=window.fetch.bind(window);
  const token=()=>localStorage.getItem('nb_admin_token');
  const saveUrl=u=>typeof u==='string'&&u.includes('exam-api')&&u.includes('action=save-data');
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input?.url||'');
    const method=String(init?.method||input?.method||'GET').toUpperCase();
    if(method==='POST'&&saveUrl(url)){
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
        const response=await original(input,init);
        if(response.ok&&body?.data?.questions&&Array.isArray(body.data.questions)){
          // Keep the in-memory snapshot synchronized so a second edit cannot
          // resurrect metadata from an older version.
          window.__nbExamManagementPreviousQuestions=body.data.questions.map(q=>({...q}));
        }
        return response;
      }catch(e){console.warn('Question metadata preservation skipped:',e.message)}
    }
    return original(input,init);
  };
  async function snapshot(){
    try{
      const t=token();if(!t)return;
      const r=await original(API+'admin-data',{headers:{Authorization:'Bearer '+t}});
      const d=await r.json();
      if(r.ok&&Array.isArray(d?.data?.questions))window.__nbExamManagementPreviousQuestions=d.data.questions.map(q=>({...q}));
    }catch(e){console.warn('Question metadata snapshot unavailable:',e.message)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',snapshot);else snapshot();
})();