const API='/.netlify/functions/set-api?action=';const $=s=>document.querySelector(s);let set=null,editing=-1,isNew=false,sets=[];
const names={kharidar:'खरिदार',nasu:'नायब सुब्बा','sakha-adhikrit':'शाखा अधिकृत'};const examInfo={kharidar:{icon:'📘',count:50,time:45},nasu:{icon:'📗',count:50,time:45},'sakha-adhikrit':{icon:'📕',count:100,time:90}};const token=()=>localStorage.getItem('nb_admin_token')||'';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
async function api(a,opt={}){const r=await fetch(API+a,{...opt,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token(),...(opt.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Request failed');return d}
function auth(){if(!token()){location.href='admin.html?returnTo='+encodeURIComponent('set-admin.html');return false}return true}
function renderExamCards(){
 const holder=$('#examCards');
 holder.innerHTML=Object.entries(names).map(([id,title])=>{const m=examInfo[id];return '<button type="button" class="exam-card '+(id===$('#exam').value?'active':'')+'" data-exam="'+id+'"><span class="exam-icon">'+m.icon+'</span><span><b>'+title+'</b><small>'+m.count+' प्रश्न · '+m.time+' मिनेट</small></span></button>'}).join('');
 holder.querySelectorAll('[data-exam]').forEach(b=>b.onclick=()=>{$('#exam').value=b.dataset.exam;renderExamCards();loadSets()});
}
async function loadSets(){
 $('#setCards').innerHTML='<div class="loading">Set सूची लोड हुँदैछ…</div>';
 const d=await api('admin-list');sets=d.sets.filter(x=>x.examId===$('#exam').value);
 if(!sets.length){$('#setCards').innerHTML='<div class="error">यस परीक्षाका Set भेटिएनन्।</div>';return}
 $('#set').innerHTML=sets.map(x=>'<option value="'+esc(x.setId)+'">Set '+Number(x.setId)+' — '+x.questionCount+' प्रश्न</option>').join('');
 renderSetCards();await loadSet();
}
function renderSetCards(){
 const current=$('#set').value||'01';
 $('#setCards').innerHTML=sets.map(x=>'<button type="button" class="set-card '+(String(x.setId).padStart(2,'0')===String(current).padStart(2,'0')?'active':'')+'" data-set="'+esc(x.setId)+'"><strong>Set '+Number(x.setId)+'</strong><span>'+x.questionCount+' प्रश्न</span><small>स्थिर प्रश्नपत्र</small></button>').join('');
 document.querySelectorAll('[data-set]').forEach(b=>b.onclick=()=>{$('#set').value=b.dataset.set;renderSetCards();loadSet()});
}
async function loadSet(){
 const id=$('#exam').value,n=$('#set').value;
 if(!id||!n)return;
 $('#questions').innerHTML='<div class="loading">Set का प्रश्नहरू लोड हुँदैछन्…</div>';
 try{const d=await api('admin-get',{method:'POST',body:JSON.stringify({examId:id,setId:n})});set=d.set;editing=-1;isNew=false;$('#editor').hidden=true;$('#setHeading').textContent=names[id]+' — Set '+Number(n);$('#setSummary').innerHTML='<b>'+set.questions.length+'</b> प्रश्न · '+set.durationMinutes+' मिनेट · मुख्य Question Bank बाट पूर्ण रूपमा अलग';render()}
 catch(e){$('#questions').innerHTML='<div class="error">'+esc(e.message)+'</div>'}
}
function render(){
 const term=$('#search').value.trim().toLowerCase();
 const qs=set.questions.map((q,i)=>({q,i})).filter(x=>!term||[x.q.q,x.q.question,x.q.subject,x.q.topic,x.q.id].some(v=>String(v||'').toLowerCase().includes(term)));
 $('#questionCount').textContent=qs.length+'/'+set.questions.length+' प्रश्न';
 $('#questions').innerHTML=qs.map(({q,i})=>'<article class="q-card"><div class="q-top"><span class="q-no">प्रश्न '+(i+1)+'</span><span class="q-meta">'+esc(q.subject||'')+' · '+esc(q.topic||'')+' · '+esc(q.level||'')+'</span></div><h3>'+esc(q.q||q.question)+'</h3><div class="opts">'+(q.options||[]).map((o,j)=>'<div class="'+(j===Number(q.correct)?'correct':'')+'"><b>'+String.fromCharCode(65+j)+'.</b> '+esc(o)+'</div>').join('')+'</div><div class="q-actions"><button class="btn btn-outline" onclick="editQ('+i+')">✏️ सम्पादन</button><button class="btn btn-outline" onclick="replaceQ('+i+')">↻ प्रश्न बदल्नुहोस्</button></div></article>').join('')||'<div class="empty">खोजिएको प्रश्न भेटिएन।</div>';
}
function form(q,title,replaceIndex){
 $('#editor').hidden=false;
 $('#editor').innerHTML='<div class="editor-head"><div><h2>'+title+'</h2><p>यो परिवर्तन <b>'+names[$('#exam').value]+' — Set '+Number($('#set').value)+'</b> मा मात्र लागू हुन्छ। मुख्य Question Bank मा असर पर्दैन।</p></div><button class="btn btn-outline" id="cancel">बन्द गर्नुहोस्</button></div>'+
 '<label>प्रश्न<textarea id="q" rows="4">'+esc(q.q||q.question||'')+'</textarea></label>'+
 '<div class="grid"><label>Subject<input id="subject" value="'+esc(q.subject||'')+'"></label><label>Topic<input id="topic" value="'+esc(q.topic||'')+'"></label><label>Unit<input id="unit" value="'+esc(q.unit||'')+'"></label><label>Level<select id="level"><option value="level1">Level 1</option><option value="level2">Level 2</option></select></label></div>'+
 '<div class="options-editor"><h3>चार विकल्प</h3>'+[0,1,2,3].map(i=>'<label>'+String.fromCharCode(65+i)+'<input id="o'+i+'" value="'+esc((q.options||[])[i]||'')+'"></label>').join('')+'</div>'+
 '<label>सही विकल्प<select id="correct">'+[0,1,2,3].map(i=>'<option value="'+i+'" '+(Number(q.correct)===i?'selected':'')+'>'+String.fromCharCode(65+i)+'</option>').join('')+'</select></label>'+
 '<label>व्याख्या<textarea id="explanation" rows="3">'+esc(q.explanation||'')+'</textarea></label><label>Solution<textarea id="solution" rows="2">'+esc(q.solution||'')+'</textarea></label>'+
 '<div class="editor-actions"><button class="btn btn-primary" id="save">💾 Set मा सुरक्षित गर्नुहोस्</button><button class="btn btn-outline" id="cancel2">रद्द गर्नुहोस्</button></div>';
 $('#level').value=q.level||'level1';$('#cancel').onclick=()=>$('#editor').hidden=true;$('#cancel2').onclick=()=>$('#editor').hidden=true;
 $('#save').onclick=()=>saveForm(q,replaceIndex);
 window.scrollTo({top:0,behavior:'smooth'});
}
function editQ(i){editing=i;isNew=false;form(set.questions[i],'प्रश्न सम्पादन गर्नुहोस्',i)}
function replaceQ(i){editing=i;isNew=true;const old=set.questions[i];form({...old,id:old.id,q:'',options:['','','',''],correct:0,explanation:'',solution:''},'Set को प्रश्न बदल्नुहोस् — Q'+(i+1),i)}
function newQ(){const i=Number(prompt('कुन प्रश्नको ठाउँमा नयाँ प्रश्न राख्ने? 1 देखि '+set.questions.length+' सम्म लेख्नुहोस्:'));if(!Number.isInteger(i)||i<1||i>set.questions.length)return;replaceQ(i-1)}
async function saveForm(old,idx){
 const options=[0,1,2,3].map(i=>$('#o'+i).value.trim()),q={...old,id:old.id,q:$('#q').value.trim(),options,correct:Number($('#correct').value),subject:$('#subject').value.trim(),topic:$('#topic').value.trim(),unit:$('#unit').value.trim(),level:$('#level').value,explanation:$('#explanation').value.trim(),solution:$('#solution').value.trim()};
 if(!q.q||options.some(x=>!x)){alert('प्रश्न र चारवटै विकल्प अनिवार्य छन्।');return}
 const before=set.questions[idx];set.questions[idx]=q;const btn=$('#save');btn.disabled=true;
 try{await api('admin-save',{method:'POST',body:JSON.stringify({examId:$('#exam').value,setId:$('#set').value,set})});alert(isNew?'Set मा नयाँ प्रश्न सुरक्षित भयो। मुख्य Question Bank परिवर्तन भएको छैन।':'Set को प्रश्न सुरक्षित भयो। मुख्य Question Bank परिवर्तन भएको छैन।');$('#editor').hidden=true;isNew=false;editing=-1;render()}
 catch(e){set.questions[idx]=before;alert(e.message)}
 finally{btn.disabled=false}
}
$('#exam').onchange=loadSets;$('#set').onchange=()=>{renderSetCards();loadSet()};$('#search').oninput=render;$('#newQuestion').onclick=newQ;renderExamCards();
$('#logout').onclick=()=>{localStorage.removeItem('nb_admin_token');location.href='admin.html'};
if(auth())loadSets().catch(e=>alert(e.message));