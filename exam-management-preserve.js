/* Preserve hidden question metadata during Admin edits.
   A second edit in the same session must use the latest saved snapshot, not the
   first snapshot taken when the page opened.

   Important: explicit blank values from the editor are intentional.  In
   particular, clearing an image must NOT be resurrected from the old snapshot.
*/
(function(){
  if(window.__nbExamManagementPreserveV3)return;
  window.__nbExamManagementPreserveV3=true;
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
            if(!old)return q;
            /* The editor sends its editable fields explicitly.  Only restore
               metadata that the legacy editor may omit; never overwrite an
               explicitly supplied empty value. */
            const merged={...old,...q};
            const metadata=['passage','figure','data','groupId'];
            metadata.forEach(k=>{
              if(Object.prototype.hasOwnProperty.call(q,k))merged[k]=q[k];
              else if(Object.prototype.hasOwnProperty.call(old,k))merged[k]=old[k];
            });
            return merged;
          });
          init={...init,body:JSON.stringify(body)};
        }
        const response=await original(input,init);
        if(response.ok&&body?.data?.questions&&Array.isArray(body.data.questions)){
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

  /* Add a real remove-image control to the existing question editor without
     replacing the management UI. The editor already saves fImage explicitly,
     so an empty value is preserved as an intentional deletion. */
  function installImageClear(){
    const input=document.querySelector('#fImage');
    if(!input||document.querySelector('#clearQuestionImage'))return;
    const button=document.createElement('button');
    button.type='button';
    button.id='clearQuestionImage';
    button.className='btn btn-outline';
    button.textContent='चित्र हटाउनुहोस्';
    button.style.marginTop='6px';
    button.onclick=()=>{
      input.value='';
      input.dispatchEvent(new Event('input',{bubbles:true}));
      const file=document.querySelector('#fImageFile');
      if(file)file.value='';
      const preview=document.querySelector('#fImagePreview');
      if(preview){preview.removeAttribute('src');preview.style.display='none';}
      const status=document.querySelector('#imageUploadStatus');
      if(status)status.textContent='चित्र हटाइएको छ — सुरक्षित गर्नुहोस्।';
    };
    input.insertAdjacentElement('afterend',button);
  }
  const observer=new MutationObserver(installImageClear);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{snapshot();observer.observe(document.body,{childList:true,subtree:true});installImageClear()});
  else {snapshot();observer.observe(document.body,{childList:true,subtree:true});installImageClear()}
})();
