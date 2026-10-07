/* =========================================
   MAIN ADMIN — LOKSEWA QUESTION BANK
   Category → Subject → Topic
========================================= */
(()=>{
  const API='/.netlify/functions/exam-api?action=';
  const FILTER_KEY='nb_question_filters_v2';
  let savedFilters=(()=>{try{const x=JSON.parse(sessionStorage.getItem(FILTER_KEY)||'{}');return x&&typeof x==='object'?x:{}}catch{return {}}})();
  const $=s=>document.querySelector(s);
  const token=()=>localStorage.getItem('nb_admin_token');
  let data=null, editing=null, editingImage='', page=1;const PAGE_SIZE=25;let openHeading=null, selectedUnit=null;
  const toNe=n=>String(n??'').replace(/[0-9]/g,d=>'०१२३४५६७८९'[Number(d)]);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  function placedForExam(q,examId){const m=q?.examMappings?.[examId];return m&&typeof m==='object'?{...q,...m}:q;}
  function unitMeta(examId,q){
    const x=placedForExam(q,examId), id=String(x?.unit||'');
    const e=data?.exams?.find(v=>v.id===examId), units=(e?.blueprint?.sections||[]).flatMap(s=>s.units||[]);
    return units.filter(u=>{const uid=String(u.id||'');return id===uid||id.startsWith(uid+'.')}).sort((a,b)=>String(b.id).length-String(a.id).length)[0]||null;
  }
  function inferredSubject(q,examId){const x=placedForExam(q,examId);return String(x?.subject||'').trim()||String(unitMeta(examId,q)?.title||'').trim()||String((data?.exams||[]).find(e=>e.id===examId)?.title||'').trim();}
  function inferredTopic(q,examId){const x=placedForExam(q,examId);return String(x?.topic||'').trim()||String(unitMeta(examId,q)?.title||'').trim()||String(x?.unit||'').trim();}
  const toast=m=>{const t=$('#examAdminToast');if(!t)return;t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500)};
  async function api(action,opt={}){const r=await fetch(API+action,{...opt,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token(),...(opt.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Request failed');return d}

  function inject(){
    if($('#mainQuestionBank'))return true;
    const anchor=$('#questionBankMount')||$('#accountCard'); if(!anchor)return false;
    const sec=document.createElement('section');sec.className='admin-card';sec.id='mainQuestionBank';
    sec.innerHTML=\`<div class="nb-demo-bank">
      <header class="nb-demo-head"><div><h2>📚 Online Exam — Question Bank</h2><p>Category → Subject → Topic अनुसार प्रश्न व्यवस्थापन</p></div><button class="nb-demo-new" id="mainNewQ" type="button">＋ नयाँ प्रश्न</button></header>
      <div class="nb-demo-selects">
        <label><span>१. परीक्षा छान्नुहोस्</span><select id="mainCat"><option value="">— परीक्षा छान्नुहोस् —</option></select></label>
        <label><span>२. प्रकार छान्नुहोस्</span><select id="mainType" disabled><option value="">— प्रकार छान्नुहोस् —</option><option value="gk">GK / विषयगत</option><option value="iq">IQ</option><option value="pictorial">Pictorial</option><option value="table">Table</option><option value="bar-chart">Bar Chart</option><option value="line-graph">Line Graph</option><option value="pie-chart">Pie Chart</option></select></label>
      </div>
      <nav id="mainCrumbs" class="nb-demo-crumbs" aria-label="breadcrumb"></nav>
      <p class="nb-demo-info">ℹ️ यहाँको navigation परीक्षा Blueprint अनुसार छ। विषय/Topic मा पुगेपछि मात्र सम्बन्धित प्रश्नहरू व्यवस्थापन गर्न सकिन्छ।</p>
      <div id="mainQForm" hidden></div><div id="mainQuestions"></div>
    </div>\`;
    if(anchor.id==='questionBankMount'){anchor.innerHTML='';anchor.appendChild(sec)}else{anchor.parentNode.insertBefore(sec,anchor)}
    const toastEl=document.createElement('div');toastEl.id='examAdminToast';toastEl.className='exam-admin-toast';document.body.appendChild(toastEl);
    $('#mainNewQ').onclick=()=>{if(selectedUnit&&$('#mainType').value)form();else toast('पहिले परीक्षा, प्रकार र Topic/उपविषय छान्नुहोस्।')};
    $('#mainCat').onchange=()=>{savedFilters.cat=$('#mainCat').value;savedFilters.sub='';savedFilters.topic='';openHeading=null;selectedUnit=null;page=1;try{sessionStorage.setItem(FILTER_KEY,JSON.stringify(savedFilters))}catch{}buildCategories();render()};
    $('#mainType').onchange=()=>{savedFilters.type=$('#mainType').value;openHeading=null;selectedUnit=null;page=1;try{sessionStorage.setItem(FILTER_KEY,JSON.stringify(savedFilters))}catch{}render()};
    return true;
  }
  async function init(){
    if(!inject())return setTimeout(init,500);
    if(!token())return setTimeout(init,700);
    try{data=(await api('admin-data')).data;buildCategories();render()}catch(e){toast(e.message)}}
  function buildCategories(){
    const c=$('#mainCat'),cur=savedFilters.cat||c.value;
    c.innerHTML='<option value="">— परीक्षा छान्नुहोस् —</option>'+data.exams.map(e=>\`<option value="${esc(e.id)}">${esc(e.title)}</option>\`).join('');
    if(cur)c.value=cur;
    const type=$('#mainType');
    type.disabled=!c.value;
    if(!c.value){type.value='';return}
    const types=[...new Set(data.questions.filter(q=>Array.isArray(q.examIds)&&q.examIds.includes(c.value)).map(q=>String(q.type||'').toLowerCase()).filter(Boolean))];
    const known=['gk','iq','pictorial','table','bar-chart','line-graph','pie-chart'];
    [...type.options].forEach(o=>{if(o.value)o.hidden=types.length&&!types.includes(o.value)&&!known.includes(o.value)});
    if(savedFilters.type&&[...type.options].some(o=>o.value===savedFilters.type))type.value=savedFilters.type;
  }
  function blueprintHeadings(examId,type){
    const exam=data?.exams?.find(e=>e.id===examId);
    if(!exam)return [];
    const sections=exam.blueprint?.sections||[];
    const qs=data.questions.filter(q=>Array.isArray(q.examIds)&&q.examIds.includes(examId)&&(!type||String(q.type||'').toLowerCase()===type));
    return sections.map(sec=>({
      code:String(sec.id||''),title:String(sec.title||sec.name||sec.id||''),
      children:(sec.units||[]).map(u=>({code:String(u.id||''),title:String(u.title||u.name||u.id||''),count:qs.filter(q=>{const x=placedForExam(q,examId);return String(x.section||'')===String(sec.id||'')&&(String(x.unit||'')===String(u.id||'')||String(x.unit||'').startsWith(String(u.id||'')+'.'))}).length}))
    })).filter(h=>h.children.length);
  }
  function countForUnit(examId,type,code){
    return data.questions.filter(q=>Array.isArray(q.examIds)&&q.examIds.includes(examId)&&(!type||String(q.type||'').toLowerCase()===type)&&(()=>{const x=placedForExam(q,examId);return String(x.unit||'')===String(code)||String(x.unit||'').startsWith(String(code)+'.')})()).length;
  }
  function countForHeading(examId,type,code){return data.questions.filter(q=>Array.isArray(q.examIds)&&q.examIds.includes(examId)&&(!type||String(q.type||'').toLowerCase()===type)&&String(placedForExam(q,examId).section||'')===String(code)).length}
  function render(){
    if(!data)return;
    const cat=$('#mainCat').value,type=$('#mainType').value,search=(selectedUnit?$('#mainSearch')?.value:'')?.trim().toLowerCase()||'';
    const exam=data.exams.find(e=>e.id===cat);
    const crumbs=$('#mainCrumbs');
    const parts=[{label:'प्रश्न बैंक',click:()=>{openHeading=null;selectedUnit=null;page=1;render()}}];
    if(exam)parts.push({label:exam.title,click:type?()=>{openHeading=null;selectedUnit=null;page=1;render()}:null});
    if(type)parts.push({label:type,click:selectedUnit?()=>{selectedUnit=null;page=1;render()}:null});
    if(selectedUnit){const h=blueprintHeadings(cat,type).find(x=>x.code===selectedUnit.section);const u=h?.children.find(x=>x.code===selectedUnit.code);if(h)parts.push({label:h.code+' '+h.title});if(u)parts.push({label:u.code+' '+u.title})}
    crumbs.innerHTML=parts.map((p,i)=>\`<span>${i?'› ':''}${p.click?\`<button type="button" data-crumb="${i}">${esc(p.label)}</button>\`:\`<span>${esc(p.label)}</span>\`}</span>\`).join('');
    crumbs.querySelectorAll('[data-crumb]').forEach((b,i)=>b.onclick=()=>parts[i].click());
    const root=$('#mainQuestions');
    if(!cat){
      root.innerHTML='<div class="nb-demo-empty">सुरु गर्न माथिबाट परीक्षा छान्नुहोस्।</div>';return;
    }
    if(!type){
      root.innerHTML='<div class="nb-demo-empty">अब प्रश्नको प्रकार (GK / IQ) छान्नुहोस्।</div>';return;
    }
    if(!selectedUnit){
      const headings=blueprintHeadings(cat,type);
      root.innerHTML=\`<section class="nb-demo-blueprint"><h3>३. Blueprint शीर्षक</h3>${headings.map(h=>{const open=openHeading===h.code;return \`<div class="nb-demo-heading"><button class="nb-demo-heading-btn" type="button" data-heading="${esc(h.code)}"><b>${esc(h.code)}</b><strong>${esc(h.title)}</strong><span>${toNe(countForHeading(cat,type,h.code))} प्रश्न</span><em class="${open?'open':''}">›</em></button>${open?\`<ul class="nb-demo-children">${h.children.map(c=>\`<li><button type="button" data-unit="${esc(h.code)}||${esc(c.code)}"><b>${esc(c.code)}</b><span>${esc(c.title)}</span><small>${toNe(c.count)}</small></button></li>\`).join('')}</ul>\`:''}</div>\`}).join('')}</section>\`;
      root.querySelectorAll('[data-heading]').forEach(b=>b.onclick=()=>{openHeading=openHeading===b.dataset.heading?null:b.dataset.heading;render()});
      root.querySelectorAll('[data-unit]').forEach(b=>b.onclick=()=>{const [section,code]=b.dataset.unit.split('||');selectedUnit={section,code};page=1;render()});
      return;
    }
    const h=blueprintHeadings(cat,type).find(x=>x.code===selectedUnit.section),u=h?.children.find(x=>x.code===selectedUnit.code);
    const all=data.questions.filter(q=>{if(!Array.isArray(q.examIds)||!q.examIds.includes(cat)||String(q.type||'').toLowerCase()!==type)return false;const x=placedForExam(q,cat);const ok=String(x.section||'')===selectedUnit.section&&(String(x.unit||'')===selectedUnit.code||String(x.unit||'').startsWith(selectedUnit.code+'.'));return ok&&(!search||\`${x.q||x.question||''} ${x.subject||''} ${x.topic||''}\`.toLowerCase().includes(search))});
    const totalPages=Math.max(1,Math.ceil(all.length/PAGE_SIZE));if(page>totalPages)page=totalPages;const start=(page-1)*PAGE_SIZE,visible=all.slice(start,start+PAGE_SIZE);
    root.innerHTML=\`<section class="nb-demo-list"><div class="nb-demo-list-head"><div><button class="nb-demo-back" type="button" id="nbBack">← Blueprint मा फर्कनुहोस्</button><h3>${esc(selectedUnit.code)} ${esc(u?.title||'')}</h3><p>जम्मा ${toNe(all.length)} प्रश्न</p></div><button class="nb-demo-new" type="button" id="nbUnitNew">＋ नयाँ प्रश्न</button></div><input id="mainSearch" class="nb-demo-search" type="search" placeholder="🔍 प्रश्न, विकल्प वा व्याख्या खोज्नुहोस्…" autocomplete="off" value="${esc($('#mainSearch')?.value||'')}"><ul class="nb-demo-question-list">${visible.map((q,i)=>{const x=placedForExam(q,cat);return \`<li class="nb-demo-question"><div class="nb-demo-meta"><b>प्रश्न ${toNe(start+i+1)}</b><span>Level ${esc(x.level||'')}</span></div><p class="nb-demo-qtext">${esc(x.q||x.question)}</p><ol>${(x.options||[]).map((o,k)=>\`<li class="${k===x.correct?'correct':''}">${String.fromCharCode(65+k)}) ${esc(o)} ${k===x.correct?'✓':''}</li>\`).join('')}</ol>${x.explanation?\`<p class="nb-demo-exp"><b>व्याख्या:</b> ${esc(x.explanation)}</p>\`:''}<div class="nb-demo-actions"><button class="btn btn-outline" type="button" data-edit="${esc(x.id)}">✏️ सम्पादन</button><button class="btn btn-danger" type="button" data-del="${esc(x.id)}">🗑️ हटाउने</button></div></li>\`}).join('')||\`<li class="nb-demo-empty">${search?'“'+esc(search)+'” सँग मिल्ने प्रश्न भेटिएन।':'यस Blueprint मा अहिलेसम्म प्रश्न छैन।'}</li>\`}</ul><div class="nb-demo-pager"><button class="btn btn-outline" id="qPrev" ${page<=1?'disabled':''}>← अघिल्लो</button><span>पृष्ठ ${page} / ${totalPages}</span><button class="btn btn-outline" id="qNext" ${page>=totalPages?'disabled':''}>अर्को →</button></div></section>\`;
    $('#nbBack').onclick=()=>{selectedUnit=null;page=1;render()};
    $('#nbUnitNew').onclick=()=>form();
    $('#mainSearch').oninput=()=>{page=1;render()};
    $('#qPrev').onclick=()=>{if(page>1){page--;render()}};$('#qNext').onclick=()=>{if(page<totalPages){page++;render()}};
    root.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>form(data.questions.find(q=>q.id===b.dataset.edit)));
    root.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>del(b.dataset.del));
  }
  async function uploadQuestionImage(file){if(!file)return '';if(!/^image\/(jpeg|png|webp|gif)$/i.test(file.type))throw Error('JPG, PNG, WEBP वा GIF मात्र');if(file.size>4*1024*1024)throw Error('चित्रको अधिकतम आकार 4 MB हो');const data=await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=rej;fr.readAsDataURL(file)});const d=await api('upload-image',{method:'POST',body:JSON.stringify({name:file.name,type:file.type,data})});return d.url||d.path||''}
  function form(q=null){
    if(!q){
      const cat=$('#mainCat')?.value||savedFilters.cat||data.exams[0]?.id||'';
      const x=selectedUnit||{};
      const type=$('#mainType')?.value||'gk';
      q={id:'',examIds:cat?[cat]:[],section:x.section||'',unit:x.code||'',subject:'',topic:'',level:'i',type,q:'',options:['','','',''],correct:0,explanation:'',solution:'',image:'',imageAlt:''};
    }
    editing=q.id||null;editingImage=String(q.image||q.imageUrl||q.image_url||'').trim();
    const editExam=$('#mainCat')?.value||q.examIds?.[0]||savedFilters.cat||data.exams[0]?.id||'';
    const x=placedForExam(q,editExam);q={...q,...x};
    const f=$('#mainQForm');f.hidden=false;
    f.innerHTML=\`<div class="nb-demo-modal-wrap"><div class="nb-demo-modal" role="dialog" aria-modal="true">
      <div class="nb-demo-modal-head"><h3>${q.id?'✏️ प्रश्न सम्पादन':'＋ नयाँ प्रश्न'}</h3><button type="button" id="mfClose">×</button></div>
      <div class="nb-demo-path"><p><b>परीक्षा:</b> ${esc(data.exams.find(e=>e.id===editExam)?.title||'')}</p><p><b>प्रकार:</b> ${esc(q.type||'')}</p><p><b>Blueprint:</b> ${esc(q.section||'')} › ${esc(q.unit||'')}</p></div>
      <div class="nb-demo-form-grid"><label>Subject / विषय<input id="mfSub" value="${esc(q.subject||'')}"></label><label>Topic / पाठ्यक्रम इकाइ<input id="mfTopic" value="${esc(q.topic||'')}"></label><label>Section<input id="mfSection" value="${esc(q.section||'')}"></label><label>Unit / Syllabus<input id="mfUnit" value="${esc(q.unit||'')}"></label></div>
      <label>Level<select id="mfLevel"><option value="i" ${['i','1','l1','level1','level i'].includes(String(q.level||'').toLowerCase())?'selected':''}>Level i</option><option value="ii" ${['ii','2','l2','level2','level ii'].includes(String(q.level||'').toLowerCase())?'selected':''}>Level ii</option></select></label>
      <label>प्रकार<select id="mfType"><option value="gk" ${q.type==='gk'?'selected':''}>GK / विषयगत</option><option value="iq" ${q.type==='iq'?'selected':''}>IQ</option><option value="pictorial" ${q.type==='pictorial'?'selected':''}>Pictorial / चित्रात्मक</option><option value="table" ${q.type==='table'?'selected':''}>Table</option><option value="bar-chart" ${q.type==='bar-chart'?'selected':''}>Bar Chart</option><option value="line-graph" ${q.type==='line-graph'?'selected':''}>Line Graph</option><option value="pie-chart" ${q.type==='pie-chart'?'selected':''}>Pie Chart</option></select></label>
      <label>प्रश्न *<textarea id="mfQ" rows="3">${esc(q.q||q.question||'')}</textarea></label>
      <label>प्रश्न चित्र / Chart image <input id="mfImage" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><small>चित्रात्मक वा आवश्यक chart/table का लागि JPG/PNG/WebP/GIF, अधिकतम 4 MB।</small>${q.image?\`<div id="mfCurrentImage"><img src="${esc(q.image)}" alt="${esc(q.imageAlt||q.topic||'प्रश्नचित्र')}"><button class="btn btn-outline" id="mfClearImage" type="button">चित्र हटाउनुहोस्</button></div>\`:''}<div id="mfImageStatus">${q.image?'हालको चित्र सुरक्षित छ। नयाँ चित्र छानेमा यो प्रतिस्थापन हुन्छ।':''}</div></label>
      <div class="nb-demo-options">${q.options.map((o,i)=>\`<label>विकल्प ${String.fromCharCode(65+i)} *<input id="mfo${i}" value="${esc(o)}"></label>\`).join('')}</div>
      <label>सही विकल्प<select id="mfCorrect">${q.options.map((o,i)=>\`<option value="${i}" ${q.correct===i?'selected':''}>${String.fromCharCode(65+i)}</option>\`).join('')}</select></label>
      <label>व्याख्या<textarea id="mfExp" rows="2">${esc(q.explanation||'')}</textarea></label><label>IQ Solution<textarea id="mfSol" rows="2">${esc(q.solution||'')}</textarea></label>
      <div class="nb-demo-form-actions"><button class="btn" id="mfCancel" type="button">रद्द गर्नुहोस्</button><button class="btn btn-primary" id="mfSave" type="button">सुरक्षित गर्नुहोस्</button></div>
    </div></div>\`;
    $('#mfSave').onclick=saveQ;$('#mfCancel').onclick=()=>{f.hidden=true;f.innerHTML=''};$('#mfClose').onclick=()=>{f.hidden=true;f.innerHTML=''};
    requestAnimationFrame(()=>{$('#mfQ')?.focus()});
  }
  async function saveQ(){const b=$('#mfSave');try{b.disabled=true;b.textContent='सुरक्षित हुँदैछ...';const old=data.questions.find(x=>x.id===editing)||{};const file=$('#mfImage')?.files?.[0];const image=file?await uploadQuestionImage(file):editingImage;const q={...old,id:editing||`q-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,examIds:(old.examIds&&old.examIds.length?old.examIds:[$('#mainCat').value]),section:$('#mfSection').value.trim(),unit:$('#mfUnit').value.trim(),level:$('#mfLevel').value,type:$('#mfType').value,subject:$('#mfSub').value.trim(),topic:$('#mfTopic').value.trim(),q:$('#mfQ').value.trim(),options:[0,1,2,3].map(i=>$('#mfo'+i).value.trim()),correct:Number($('#mfCorrect').value),explanation:$('#mfExp').value.trim(),solution:$('#mfSol').value.trim(),image,imageAlt:old.imageAlt||$('#mfTopic').value.trim()};if(!q.examIds.length||!q.subject||!q.topic||!q.q||q.options.some(x=>!x)){toast('Category, Subject, Topic, प्रश्न र चारवटै विकल्प आवश्यक छन्।');return}if((q.type==='pictorial'||q.type==='bar-chart'||q.type==='line-graph'||q.type==='pie-chart')&&!q.image&&!q.figure&&!q.data){toast('यो प्रश्न प्रकारका लागि चित्र वा data/figure आवश्यक छ।');return}const saved=await api('save-question',{method:'POST',body:JSON.stringify({question:q})});if(!saved?.verified)throw new Error('प्रश्न backend मा सुरक्षित भएको पुष्टि हुन सकेन।');const i=data.questions.findIndex(x=>x.id===q.id);if(i>=0)data.questions[i]=q;else data.questions.unshift(q);editingImage=image;$('#mainQForm').hidden=true;$('#mainQForm').innerHTML='';buildCategories();render();toast(saved?.verified?(editing?'प्रश्न backend मा स्थायी रूपमा सुरक्षित भयो।':'नयाँ प्रश्न backend मा स्थायी रूपमा सुरक्षित भयो।'):(editing?'प्रश्न स्थायी रूपमा सुरक्षित भयो।':'नयाँ प्रश्न स्थायी रूपमा सुरक्षित भयो।'))}catch(e){toast(e.message)}finally{if(b){b.disabled=false;b.textContent='प्रश्न सुरक्षित गर्नुहोस्'}}}
  async function del(id){if(!confirm('यो प्रश्न मेटाउने?'))return;try{const saved=await api('delete-question',{method:'POST',body:JSON.stringify({id})});if(!saved?.ok)throw new Error('प्रश्न backend बाट हटेको पुष्टि हुन सकेन।');data.questions=data.questions.filter(q=>q.id!==id);buildCategories();render();toast('प्रश्न स्थायी रूपमा हटाइयो।')}catch(e){toast(e.message)}}
  async function saveAll(){try{const btn=document.querySelector('#save');if(btn)btn.disabled=true;await api('save-data',{method:'POST',body:JSON.stringify({data})});toast('Exam/Question Bank सुरक्षित भयो।')}catch(e){toast(e.message)}finally{const btn=document.querySelector('#save');if(btn)btn.disabled=false}}
  function watch(){const d=$('#dashboard'),ws=$('#cmsQuestionBank');if(d&&d.style.display!=='none'&&token()&&ws?.classList.contains('active')&&!data)init();}
  window.__NB_INIT_EXAM_BANK=init;
  document.addEventListener('click',e=>{if(e.target?.id==='mfClearImage'){e.preventDefault();editingImage='';const s=$('#mfImageStatus');if(s)s.textContent='चित्र हटाइएको छ — प्रश्न सुरक्षित गर्दा यो image पनि हट्छ।';const p=$('#mfCurrentImage');if(p)p.remove();}});
  document.addEventListener('change',e=>{if(e.target?.id==='mfImage'&&e.target.files?.[0]){const f=e.target.files[0];const s=$('#mfImageStatus');if(s)s.textContent='नयाँ चित्र चयन भयो — '+f.name+' — सुरक्षित गर्दा यही चित्र प्रश्नसँग जोडिन्छ।';}});
  document.addEventListener('DOMContentLoaded',()=>{setInterval(watch,800);watch()});
})();
