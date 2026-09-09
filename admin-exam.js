/* =========================================
   MAIN ADMIN — LOKSEWA QUESTION BANK
   Category → Subject → Topic
========================================= */
(()=>{
  const API='/.netlify/functions/exam-api?action=';
  const $=s=>document.querySelector(s);
  const token=()=>localStorage.getItem('nb_admin_token');
  let data=null, editing=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const toast=m=>{const t=$('#examAdminToast');if(!t)return;t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500)};
  async function api(action,opt={}){const r=await fetch(API+action,{...opt,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token(),...(opt.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Request failed');return d}

  function inject(){
    if($('#mainQuestionBank'))return true;
    const anchor=$('#accountCard'); if(!anchor)return false;
    const sec=document.createElement('section');sec.className='admin-card';sec.id='mainQuestionBank';
    sec.innerHTML=`<div class="row"><div><h2>📚 Online Exam — Question Bank</h2><p class="exam-bank-note">Category → Subject → Topic अनुसार प्रश्न व्यवस्थापन</p></div><button class="btn btn-primary" id="mainNewQ" type="button">+ नयाँ प्रश्न</button></div>
      <div class="exam-bank-filters">
        <select id="mainCat"><option value="">सबै Category</option></select>
        <select id="mainSub"><option value="">सबै Subject</option></select>
        <select id="mainTopic"><option value="">सबै Topic</option></select>
        <select id="mainType"><option value="">सबै प्रकार</option><option value="gk">GK/विषयगत</option><option value="iq">IQ</option></select>
        <input id="mainSearch" type="search" placeholder="🔎 प्रश्न/विषय/Topic खोज्नुहोस्..." autocomplete="off">
      </div><div id="mainQCount" class="filter-result-count"></div><div id="mainQForm" hidden></div><div id="mainQuestions"></div>`;
    anchor.parentNode.insertBefore(sec,anchor);
    const toastEl=document.createElement('div');toastEl.id='examAdminToast';toastEl.className='exam-admin-toast';document.body.appendChild(toastEl);
    $('#mainNewQ').onclick=()=>form();
    ['mainCat','mainSub','mainTopic','mainType'].forEach(id=>$( '#'+id).onchange=render);
    $('#mainSearch').oninput=render;
    return true;
  }
  async function init(){
    if(!inject())return setTimeout(init,500);
    if(!token())return setTimeout(init,700);
    try{data=(await api('admin-data')).data;buildCategories();render()}catch(e){toast(e.message)}}
  function buildCategories(){const c=$('#mainCat'),cur=c.value;c.innerHTML='<option value="">सबै Category</option>'+data.exams.map(e=>`<option value="${esc(e.id)}">${esc(e.title)}</option>`).join('');if(cur)c.value=cur;buildSubjects();}
  function buildSubjects(){const cat=$('#mainCat').value,cur=$('#mainSub').value;const qs=data.questions.filter(q=>!cat||q.examIds.includes(cat));const vals=[...new Set(qs.map(q=>String(q.subject||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ne'));$('#mainSub').innerHTML='<option value="">सबै Subject</option>'+vals.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');if(vals.includes(cur))$('#mainSub').value=cur;buildTopics()}
  function buildTopics(){const cat=$('#mainCat').value,sub=$('#mainSub').value,cur=$('#mainTopic').value;const qs=data.questions.filter(q=>(!cat||q.examIds.includes(cat))&&(!sub||q.subject===sub));const vals=[...new Set(qs.map(q=>String(q.topic||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ne'));$('#mainTopic').innerHTML='<option value="">सबै Topic</option>'+vals.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');if(vals.includes(cur))$('#mainTopic').value=cur}
  function render(){if(!data)return;const cat=$('#mainCat').value,sub=$('#mainSub').value,topic=$('#mainTopic').value,type=$('#mainType').value,search=$('#mainSearch').value.trim().toLowerCase();if(document.activeElement?.id==='mainCat')buildSubjects();else if(document.activeElement?.id==='mainSub')buildTopics();const qs=data.questions.filter(q=>(!cat||q.examIds.includes(cat))&&(!sub||q.subject===sub)&&(!topic||q.topic===topic)&&(!type||q.type===type)&&(!search||`${q.q} ${q.subject} ${q.topic}`.toLowerCase().includes(search)));$('#mainQCount').textContent=`${qs.length} प्रश्न / कुल ${data.questions.length}`;$('#mainQuestions').innerHTML=qs.map(q=>`<article class="qrow"><div><b>${esc(q.q)}</b><small>${esc((data.exams.filter(e=>q.examIds.includes(e.id)).map(e=>e.title).join(', ')))} · ${esc(q.subject)} · ${esc(q.topic)} · ${q.type.toUpperCase()}</small><p>सही उत्तर: ${esc(q.options[q.correct])}</p></div><div class="qactions"><button class="btn btn-outline" type="button" data-edit="${esc(q.id)}">सम्पादन</button><button class="btn btn-danger" type="button" data-del="${esc(q.id)}">मेटाउनुहोस्</button></div></article>`).join('')||'<p>यो Filter अनुसार प्रश्न भेटिएन।</p>';document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>form(data.questions.find(q=>q.id===b.dataset.edit)));document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>del(b.dataset.del))}
  function form(q={id:'',examIds:[data.exams[0]?.id],subject:'',topic:'',type:'gk',q:'',options:['','','',''],correct:0,explanation:'',solution:''}){editing=q.id||null;const f=$('#mainQForm');f.hidden=false;f.innerHTML=`<div class="exam-qform"><h3>${q.id?'प्रश्न सम्पादन':'नयाँ प्रश्न थप्नुहोस्'}</h3><label>Category / परीक्षा<select id="mfCat" multiple>${data.exams.map(e=>`<option value="${esc(e.id)}" ${q.examIds.includes(e.id)?'selected':''}>${esc(e.title)}</option>`).join('')}</select><small>एकभन्दा बढी परीक्षा Category मा एउटै प्रश्न प्रयोग गर्न सकिन्छ।</small></label><div class="two"><label>Subject / विषय<input id="mfSub" value="${esc(q.subject)}" placeholder="जस्तै: संविधान"></label><label>Topic / पाठ्यक्रम इकाइ<input id="mfTopic" value="${esc(q.topic)}" placeholder="जस्तै: मौलिक हक"></label></div><label>प्रकार<select id="mfType"><option value="gk" ${q.type==='gk'?'selected':''}>GK / विषयगत</option><option value="iq" ${q.type==='iq'?'selected':''}>IQ</option></select></label><label>प्रश्न<textarea id="mfQ" rows="3">${esc(q.q)}</textarea></label>${q.options.map((o,i)=>`<label>विकल्प ${String.fromCharCode(65+i)}<input id="mfo${i}" value="${esc(o)}"></label>`).join('')}<label>सही विकल्प<select id="mfCorrect">${q.options.map((o,i)=>`<option value="${i}" ${q.correct===i?'selected':''}>${String.fromCharCode(65+i)}</option>`).join('')}</select></label><label>व्याख्या<textarea id="mfExp">${esc(q.explanation)}</textarea></label><label>IQ Solution<textarea id="mfSol">${esc(q.solution)}</textarea></label><div><button class="btn btn-primary" id="mfSave" type="button">प्रश्न सुरक्षित गर्नुहोस्</button> <button class="btn" id="mfCancel" type="button">रद्द</button></div></div>`;$('#mfSave').onclick=saveQ;$('#mfCancel').onclick=()=>f.hidden=true;f.scrollIntoView({behavior:'smooth',block:'start'})}
  function saveQ(){const q={id:editing||`q-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,examIds:[...$('#mfCat').selectedOptions].map(x=>x.value),subject:$('#mfSub').value.trim(),topic:$('#mfTopic').value.trim(),type:$('#mfType').value,q:$('#mfQ').value.trim(),options:[0,1,2,3].map(i=>$('#mfo'+i).value.trim()),correct:Number($('#mfCorrect').value),explanation:$('#mfExp').value.trim(),solution:$('#mfSol').value.trim()};if(!q.examIds.length||!q.subject||!q.topic||!q.q||q.options.some(x=>!x)){toast('Category, Subject, Topic, प्रश्न र चारवटै विकल्प आवश्यक छन्।');return}const i=data.questions.findIndex(x=>x.id===q.id);if(i>=0)data.questions[i]=q;else data.questions.unshift(q);$('#mainQForm').hidden=true;buildCategories();render();toast('प्रश्न तयार भयो — माथिको Save पछि स्थायी हुन्छ।')}
  function del(id){if(!confirm('यो प्रश्न मेटाउने?'))return;data.questions=data.questions.filter(q=>q.id!==id);buildCategories();render();toast('प्रश्न हटाइयो — माथिको Save पछि स्थायी हुन्छ।')}
  async function saveAll(){try{const btn=document.querySelector('#save');if(btn)btn.disabled=true;await api('save-data',{method:'POST',body:JSON.stringify({data})});toast('Exam/Question Bank सुरक्षित भयो।')}catch(e){toast(e.message)}finally{const btn=document.querySelector('#save');if(btn)btn.disabled=false}}
  function watch(){const d=$('#dashboard');if(d&&d.style.display!=='none'&&token()&&!data)init();}
  document.addEventListener('DOMContentLoaded',()=>{const old=document.querySelector('#save');if(old){const orig=old.onclick;old.onclick=async e=>{if(orig)await orig.call(old,e);if(data)try{await api('save-data',{method:'POST',body:JSON.stringify({data})})}catch(err){toast(err.message)}}}setInterval(watch,800);watch()});
})();
