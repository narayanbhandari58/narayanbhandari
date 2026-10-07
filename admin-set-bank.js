(()=>{'use strict';
const API='/.netlify/functions/set-api?action=';
const $=s=>document.querySelector(s);
const token=()=>localStorage.getItem('nb_admin_token')||'';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let exams=[],set=null,editId=null,initPromise=null;

async function api(action,opt={}){
  const r=await fetch(API+action,{...opt,headers:{'Content-Type':'application/json','Authorization':'Bearer '+token(),...(opt.headers||{})}});
  const d=await r.json().catch(()=>({}));
  if(r.status===401){localStorage.removeItem('nb_admin_token');location.href='/admin';throw Error('Admin login आवश्यक छ');}
  if(!r.ok)throw Error(d.error||'Request failed');
  return d;
}

function setMsg(message,ok=false){
  const m=$('#sbMsg');
  if(!m)return;
  m.className=ok?'nb-set-ok':'nb-set-error';
  m.textContent=message||'';
}

function addStyle(){
  if($('#nbSetBankStyle'))return;
  const st=document.createElement('style');
  st.id='nbSetBankStyle';
  st.textContent=`
#dashboard.nb-set-bank-open>.dashboard-summary,#dashboard.nb-set-bank-open>.admin-main,#dashboard.nb-set-bank-open>.account-card{display:none!important}
#cmsSetBank .nb-set-editor{padding-top:4px}
#cmsSetBank .nb-set-toolbar{display:grid;grid-template-columns:minmax(170px,1fr) minmax(150px,.8fr) minmax(180px,1.5fr) auto;gap:9px;margin:16px 0 12px}
#cmsSetBank .nb-set-toolbar select,#cmsSetBank .nb-set-toolbar input,#cmsSetBank .nb-set-form input,#cmsSetBank .nb-set-form select,#cmsSetBank .nb-set-form textarea{width:100%;box-sizing:border-box;border:1px solid #dccbc7;border-radius:10px;padding:10px 11px;background:#fff;font:inherit;outline:none}
#cmsSetBank .nb-set-toolbar select:focus,#cmsSetBank .nb-set-toolbar input:focus,#cmsSetBank .nb-set-form input:focus,#cmsSetBank .nb-set-form select:focus,#cmsSetBank .nb-set-form textarea:focus{border-color:var(--cms-red,#8f0e04);box-shadow:0 0 0 3px rgba(143,14,4,.08)}
#cmsSetBank .nb-set-count{font-size:.82rem;color:var(--cms-muted,#766967);font-weight:700;margin:4px 2px 10px}
#cmsSetBank .nb-set-list{display:grid;gap:9px;max-height:680px;overflow:auto;padding-right:2px}
#cmsSetBank .nb-set-q{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;padding:14px 15px;border:1px solid var(--cms-line,#eadbd7);border-radius:13px;background:#fff}
#cmsSetBank .nb-set-q strong{display:block;color:var(--cms-dark,#650a03);line-height:1.55}
#cmsSetBank .nb-set-q small{display:block;color:var(--cms-muted,#766967);margin-top:6px;line-height:1.5}
#cmsSetBank .nb-set-actions{display:flex;gap:7px;align-items:flex-start;white-space:nowrap}
#cmsSetBank .nb-set-form{display:grid;gap:12px;margin-top:15px;padding:17px;border:1px solid var(--cms-line,#eadbd7);border-radius:14px;background:#fff}
#cmsSetBank .nb-set-form h3{margin:0;color:var(--cms-dark,#650a03)}
#cmsSetBank .nb-set-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
#cmsSetBank .nb-set-grid4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
#cmsSetBank .nb-set-field{display:grid;gap:5px;font-size:.82rem;font-weight:800;color:#5d4d4a}
#cmsSetBank .nb-set-form textarea{min-height:88px;resize:vertical}
#cmsSetBank .nb-set-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
#cmsSetBank .nb-set-actions-row{display:flex;gap:8px;flex-wrap:wrap}
#cmsSetBank .nb-set-status{min-height:20px;margin:0;font-size:.84rem}
#cmsSetBank .nb-set-ok{color:#28733b}.nb-set-error{color:#a00}
#cmsSetBank .nb-set-note{padding:10px 12px;border-radius:10px;background:#fff8e1;border:1px solid #f1df9a;color:#5d4b00;font-size:.82rem}
@media(max-width:800px){#cmsSetBank .nb-set-toolbar{grid-template-columns:1fr 1fr}#cmsSetBank .nb-set-toolbar input{grid-column:1/-1}#cmsSetBank .nb-set-toolbar #sbNew{grid-column:1/-1}#cmsSetBank .nb-set-grid4{grid-template-columns:1fr 1fr}}
@media(max-width:620px){#cmsSetBank .nb-set-toolbar,#cmsSetBank .nb-set-grid,#cmsSetBank .nb-set-grid4,#cmsSetBank .nb-set-options{grid-template-columns:1fr}#cmsSetBank .nb-set-toolbar input,#cmsSetBank .nb-set-toolbar #sbNew{grid-column:auto}#cmsSetBank .nb-set-q{grid-template-columns:1fr}#cmsSetBank .nb-set-actions{width:100%}#cmsSetBank .nb-set-actions .btn{flex:1}}
`;
  document.head.appendChild(st);
}

function ui(){
  const m=$('#setQuestionBankMount');
  if(!m)return false;
  addStyle();
  m.innerHTML=`<div class="nb-set-editor">
    <div class="nb-set-toolbar">
      <select id="sbExam"><option value="">परीक्षा छान्नुहोस्</option></select>
      <select id="sbSet" disabled><option value="">पहिले परीक्षा छान्नुहोस्</option></select>
      <input id="sbSearch" type="search" placeholder="🔎 प्रश्न, विषय वा topic खोज्नुहोस्..." autocomplete="off">
      <button class="btn btn-primary" id="sbNew" type="button">+ नयाँ प्रश्न</button>
    </div>
    <div id="sbCount" class="nb-set-count"></div>
    <div id="sbList" class="nb-set-list"></div>
    <section id="sbForm" class="nb-set-form" hidden>
      <h3 id="sbTitle">नयाँ प्रश्न थप्नुहोस्</h3>
      <div class="nb-set-note">यो workspace Stable Set का प्रश्नका लागि मात्र हो। Main Question Bank मा परिवर्तन हुँदैन।</div>
      <div class="nb-set-grid">
        <label class="nb-set-field">विषय<input id="sbSubject"></label>
        <label class="nb-set-field">Topic / उपविषय<input id="sbTopic"></label>
        <label class="nb-set-field">Section<input id="sbSection"></label>
        <label class="nb-set-field">Unit<input id="sbUnit"></label>
      </div>
      <label class="nb-set-field">पूर्ण प्रश्न<textarea id="sbQ" rows="4"></textarea></label>
      <div class="nb-set-options">
        <label class="nb-set-field">A विकल्प<input id="sb0"></label>
        <label class="nb-set-field">B विकल्प<input id="sb1"></label>
        <label class="nb-set-field">C विकल्प<input id="sb2"></label>
        <label class="nb-set-field">D विकल्प<input id="sb3"></label>
      </div>
      <div class="nb-set-grid">
        <label class="nb-set-field">सही विकल्प<select id="sbCorrect"><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></select></label>
        <label class="nb-set-field">प्रकार<select id="sbType"><option value="gk">GK / विषयगत</option><option value="iq">IQ</option><option value="pictorial">Pictorial</option><option value="table">Table</option><option value="bar-chart">Bar Chart</option><option value="line-graph">Line Graph</option><option value="pie-chart">Pie Chart</option></select></label>
        <label class="nb-set-field">Level<select id="sbLevel"><option value="i">i</option><option value="ii">ii</option></select></label>
        <label class="nb-set-field">Image URL<input id="sbImage" placeholder="https://..."></label>
        <label class="nb-set-field">Image Alt<input id="sbImageAlt"></label>
        <label class="nb-set-field">Format<input id="sbFormat" placeholder="आवश्यक भएमा"></label>
      </div>
      <div class="nb-set-grid">
        <label class="nb-set-field">व्याख्या<textarea id="sbExplain"></textarea></label>
        <label class="nb-set-field">Solution<textarea id="sbSolution"></textarea></label>
        <label class="nb-set-field">Passage / Stimulus<textarea id="sbPassage"></textarea></label>
        <label class="nb-set-field">Figure / Data<textarea id="sbFigure"></textarea></label>
      </div>
      <div class="nb-set-actions-row">
        <button class="btn btn-primary" id="sbSave" type="button">💾 सुरक्षित गर्नुहोस्</button>
        <button class="btn btn-outline" id="sbCancel" type="button">रद्द</button>
        <button class="btn btn-danger" id="sbDelete" type="button" hidden>हटाउनुहोस्</button>
      </div>
      <p id="sbMsg" class="nb-set-status"></p>
    </section>
  </div>`;
  bind();
  return true;
}

function bind(){
  const e=$('#sbExam'),s=$('#sbSet');
  $('#sbNew').onclick=()=>{
    if(!set)return alert('पहिले परीक्षा र Set छान्नुहोस्।');
    editId=null;fill({});$('#sbTitle').textContent='नयाँ प्रश्न थप्नुहोस्';$('#sbDelete').hidden=true;$('#sbForm').hidden=false;setMsg('');
    $('#sbQ').focus();
  };
  e.onchange=()=>{
    const x=exams.find(v=>v.exam.id===e.value);
    s.innerHTML=x?'<option value="">Set छान्नुहोस्</option>'+x.sets.map(z=>'<option value="'+esc(z.setId)+'">Set '+Number(z.setId)+' ('+Number(z.questionCount||0)+' प्रश्न)</option>').join(''):'<option value="">पहिले परीक्षा छान्नुहोस्</option>';
    s.disabled=!x;set=null;editId=null;$('#sbList').innerHTML='';$('#sbCount').textContent='';$('#sbForm').hidden=true;
  };
  s.onchange=loadSet;
  $('#sbSearch').oninput=render;
  $('#sbCancel').onclick=()=>{editId=null;$('#sbForm').hidden=true;setMsg('')};
  $('#sbSave').onclick=save;
  $('#sbDelete').onclick=()=>editId&&removeQ(editId);
}

function fill(q={}){
  $('#sbSubject').value=q.subject||'';
  $('#sbTopic').value=q.topic||'';
  $('#sbSection').value=q.section||'';
  $('#sbUnit').value=q.unit||'';
  $('#sbQ').value=q.q||q.question||'';
  [0,1,2,3].forEach(i=>$('#sb'+i).value=q.options?.[i]||'');
  $('#sbCorrect').value=String(q.correct??0);
  $('#sbType').value=q.type||'gk';
  $('#sbLevel').value=(q.level==='ii'||q.level==='level2'||q.level==='L2'||q.level==='2')?'ii':'i';
  $('#sbImage').value=q.image||q.imageUrl||q.image_url||'';
  $('#sbImageAlt').value=q.imageAlt||q.image_alt||'';
  $('#sbFormat').value=q.format||'';
  $('#sbExplain').value=q.explanation||'';
  $('#sbSolution').value=q.solution||'';
  $('#sbPassage').value=q.passage||'';
  $('#sbFigure').value=q.figure||q.data||'';
}

function render(){
  const term=$('#sbSearch').value.trim().toLowerCase();
  const qs=(set?.questions||[]).filter(q=>{
    if(!term)return true;
    return [q.q,q.question,q.subject,q.topic,q.section,q.unit,q.type].some(v=>String(v||'').toLowerCase().includes(term));
  });
  $('#sbCount').textContent=set?'Set '+Number(set.setId)+' · '+qs.length+' / '+set.questions.length+' प्रश्न':'';
  $('#sbList').innerHTML=qs.map((q,i)=>`<article class="nb-set-q"><div><strong>${esc((i+1)+'. '+(q.q||q.question||''))}</strong><small>${esc(q.subject||'')} · ${esc(q.topic||'')} · ${esc(q.type||'')} · सही: ${esc(q.options?.[q.correct]||'—')}</small></div><div class="nb-set-actions"><button class="btn btn-outline" type="button" data-edit="${esc(q.id)}">सम्पादन</button><button class="btn btn-danger" type="button" data-del="${esc(q.id)}">हटाउनुहोस्</button></div></article>`).join('')||'<p class="muted">यो Set मा प्रश्न भेटिएन।</p>';
  $('#sbList').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{
    const q=set.questions.find(x=>String(x.id)===String(b.dataset.edit));if(!q)return;
    editId=q.id;fill(q);$('#sbTitle').textContent='प्रश्न सम्पादन';$('#sbDelete').hidden=false;$('#sbForm').hidden=false;setMsg('');$('#sbQ').focus();
  });
  $('#sbList').querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>removeQ(b.dataset.del));
}

async function loadSet(){
  if(!$('#sbExam').value||!$('#sbSet').value){set=null;return}
  try{
    set=(await api('admin-get&exam='+encodeURIComponent($('#sbExam').value)+'&set='+encodeURIComponent($('#sbSet').value))).set;
    editId=null;$('#sbForm').hidden=true;setMsg('');render();
  }catch(e){setMsg(e.message);$('#sbList').innerHTML='<p class="nb-empty">'+esc(e.message)+'</p>'}
}

async function save(){
  if(!set)return;
  const q={id:editId||'',examIds:[set.examId],setOnly:true,subject:$('#sbSubject').value.trim(),topic:$('#sbTopic').value.trim(),section:$('#sbSection').value.trim(),unit:$('#sbUnit').value.trim(),q:$('#sbQ').value.trim(),options:[0,1,2,3].map(i=>$('#sb'+i).value.trim()),correct:Number($('#sbCorrect').value),type:$('#sbType').value,level:$('#sbLevel').value.trim(),image:$('#sbImage').value.trim(),imageAlt:$('#sbImageAlt').value.trim(),format:$('#sbFormat').value.trim(),explanation:$('#sbExplain').value.trim(),solution:$('#sbSolution').value.trim(),passage:$('#sbPassage').value.trim(),figure:$('#sbFigure').value.trim()};
  if(!q.q||q.options.some(x=>!x)){setMsg('प्रश्न र चारवटै विकल्प आवश्यक छन्।');return}
  const b=$('#sbSave');b.disabled=true;b.textContent='सुरक्षित हुँदैछ...';setMsg('');
  try{
    const d=await api('admin-save',{method:'POST',body:JSON.stringify({examId:set.examId,setId:set.setId,question:q})});
    set=d.set;editId=null;$('#sbForm').hidden=true;render();setMsg(d.message||'Set प्रश्न सुरक्षित भयो।',true);
  }catch(e){setMsg(e.message)}finally{b.disabled=false;b.textContent='💾 सुरक्षित गर्नुहोस्'}
}

async function removeQ(id){
  if(!set||!id||!confirm('यो Set प्रश्न स्थायी रूपमा हटाउने हो?'))return;
  try{
    const d=await api('admin-delete',{method:'POST',body:JSON.stringify({examId:set.examId,setId:set.setId,questionId:id})});
    set=d.set;editId=null;$('#sbForm').hidden=true;render();setMsg(d.message||'Set प्रश्न हटाइयो।',true);
  }catch(e){setMsg(e.message)}
}

async function init(){
  if(initPromise)return initPromise;
  const mount=$('#setQuestionBankMount');
  if(!mount)return;
  initPromise=(async()=>{
    if(!ui())throw Error('Set Question Bank workspace भेटिएन।');
    const loading=document.createElement('p');loading.id='sbLoading';loading.className='muted';loading.textContent='Set Question Bank लोड हुँदैछ...';mount.prepend(loading);
    try{
      exams=(await api('admin-list')).exams||[];
      $('#sbExam').innerHTML='<option value="">परीक्षा छान्नुहोस्</option>'+exams.map(x=>'<option value="'+esc(x.exam.id)+'">'+esc(x.exam.title)+'</option>').join('');
    }catch(e){
      mount.innerHTML='<div class="nb-empty"><strong>Set Question Bank लोड भएन।</strong><p>'+esc(e.message)+'</p><button class="btn btn-outline" id="sbRetry" type="button">↻ फेरि प्रयास गर्नुहोस्</button></div>';const retry=$("#sbRetry");if(retry)retry.onclick=()=>{initPromise=null;init().catch(()=>{})};
      throw e;
    }finally{loading.remove()}
  })();
  try{return await initPromise}catch(e){initPromise=null;throw e}
}

window.__NB_INIT_SET_BANK=init;
function syncSetWorkspace(){
  const d=$('#dashboard'),open=$('#cmsSetBank')?.classList.contains('active');
  if(d)d.classList.toggle('nb-set-bank-open',!!open);
  if(open)init().catch(()=>{});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(syncSetWorkspace,0));else setTimeout(syncSetWorkspace,0);
new MutationObserver(syncSetWorkspace).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
})();