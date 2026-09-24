const API='/.netlify/functions/exam-api?action=';const EXAM_META=[{id:'kharidar',title:'खरिदार',description:'खरिदार पदको लोकसेवा तयारी परीक्षा'},{id:'nasu',title:'नायब सुब्बा',description:'नायब सुब्बा पदको लोकसेवा तयारी परीक्षा'},{id:'sakha-adhikrit',title:'शाखा अधिकृत',description:'शाखा अधिकृत पदको लोकसेवा तयारी परीक्षा'}];const $=s=>document.querySelector(s);let selectedExam=null,examQuestions=[],answers={},current=0,timerId=null,seconds=0,finalResult=null,pdfBlob=null;const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));async function getJSON(url,opt){const isGet=!opt||!opt.method||String(opt.method).toUpperCase()==='GET';const fresh=isGet?`${url}${url.includes('?')?'&':'?'}_=${Date.now()}`:url;const r=await fetch(fresh,{...(opt||{}),...(isGet?{cache:'no-store'}:{})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Request failed');return d}
function renderExams(rows){const byId=new Map(rows.map(x=>[x.exam?.id,x]));$('#examList').innerHTML=EXAM_META.map(meta=>{const x=byId.get(meta.id);const e=x?.exam||meta;const ready=!!x?.ready;const available=x?.availableQuestions??null;const count=e.questionCount??(meta.id==='sakha-adhikrit'?100:'—');const duration=e.durationMinutes??(meta.id==='sakha-adhikrit'?90:'—');let status;if(!x)status='जाँच हुँदैछ…';else status=ready?'परीक्षा उपलब्ध':`Question Bank: ${available}/${count} — तयारी हुँदैछ`;return `<button class="exam-card ${x&&!ready?'disabled':''}" data-id="${esc(meta.id)}" type="button"><span>📚</span><h3>${esc(e.title||meta.title)}</h3><p>${esc(e.description||meta.description)}</p><b>${count} प्रश्न · ${duration} मिनेट</b><small>${status}</small></button>`}).join('');document.querySelectorAll('.exam-card').forEach(b=>b.onclick=()=>chooseExam(b.dataset.id))}
async function loadExams(){renderExams([]);const rows=[];await Promise.all(EXAM_META.map(async meta=>{try{const x=await getJSON(API+'config&exam='+encodeURIComponent(meta.id));rows.push(x)}catch(e){}}));renderExams(rows);if(!rows.length){$('#examList').insertAdjacentHTML('afterend','<div class="error">परीक्षा configuration लोड हुन सकेन। कृपया केही बेरपछि फेरि प्रयास गर्नुहोस्।</div>')}}
async function chooseExam(id){try{const d=await getJSON(API+'config&exam='+encodeURIComponent(id));if(!d.ready){alert(`यस परीक्षाका लागि ${d.exam.questionCount} प्रश्न चाहिन्छ। अहिले Question Bank मा ${d.availableQuestions} प्रश्न मात्र छन्।`);return}if(!Array.isArray(d.questions)||d.questions.length!==d.exam.questionCount){alert('परीक्षाको प्रश्नपत्र पूरा लोड भएन। फेरि प्रयास गर्नुहोस्।');return}selectedExam=d.exam;$('#chooser').hidden=true;$('#candidate').hidden=false;$('#candidateTitle').textContent=selectedExam.title;$('#candidateInfo').innerHTML=`<b>${selectedExam.questionCount} प्रश्न</b> · समय ${selectedExam.durationMinutes} मिनेट · सही +${selectedExam.positiveMark} · गलत −${selectedExam.negativeMark} · उत्तीर्ण ${selectedExam.passPercent}%`;examQuestions=d.questions}catch(e){alert(e.message)}}
function dataRows(q){
  const raw=String(q.data||q.figure||'').trim();
  if(!raw)return null;
  const type=String(q.type||'').toLowerCase();
  const parts=raw.split(/\s*;\s*/).map(x=>x.trim()).filter(Boolean);
  let title='',parsed=[],headers=null;
  const colon=parts[0]?.indexOf(':');

  function valuesFrom(body){
    const cleaned=String(body||'').replace(/,/g,' ');
    let nums=cleaned.match(/\d+(?:\.\d+)?%?/g)||[];
    if(nums.length===1 && /^\d{6,}$/.test(nums[0]) && nums[0].length%3===0){
      nums=nums[0].match(/\d{3}/g)||nums;
    }
    return nums.map(v=>v.replace(/%$/,'')+(v.endsWith('%')?'%':''));
  }

  function parseRow(part){
    const text=String(part||'').trim();
    if(!text)return null;

    // Compact first token: Science240 at80%, Management300 at72%, etc.
    // Split the first token into label + first numeric value before parsing the rest.
    const compact=text.match(/^([A-Za-z][A-Za-z-]*?)(\d+(?:\.\d+)?)(?:\s+(.+))?$/);
    if(compact){
      const label=compact[1];
      const firstValue=compact[2];
      const rest=String(compact[3]||'').replace(/^at\s*/i,'').trim();
      const nums=[firstValue,...valuesFrom(rest)];
      return [label,...nums];
    }

    const m=text.match(/^([^\s]+)\s+(.+)$/);
    if(!m)return null;
    const label=m[1].trim();
    const nums=valuesFrom(m[2]);
    return nums.length?[label,...nums]:null;
  }

  if(colon>0){
    title=parts[0].slice(0,colon).trim();
    const firstBody=parts[0].slice(colon+1).trim();

    if(type==='line-graph'){
      const pairs=[...firstBody.matchAll(/([A-Za-z]+)\s*(\d+(?:\.\d+)?%?)/g)];
      if(pairs.length>=2){
        const labels=pairs.map(m=>m[1]);
        const vals=pairs.map(m=>m[2]);
        parsed=[
          ['अवधि',...labels],
          [title.replace(/\s*\([^)]*\)/,'').trim()||'मान',...vals]
        ];
        headers=parsed[0];
      }
    }else{
      const rows=[firstBody,...parts.slice(1)];
      rows.forEach(part=>{const row=parseRow(part);if(row)parsed.push(row);});
    }
  }else{
    parts.forEach(part=>{const row=parseRow(part);if(row)parsed.push(row);});
  }

  if(!parsed.length)return null;
  const max=Math.max(...parsed.map(r=>r.length));
  if(!headers){
    if(/^Applications$/i.test(title) && max>=3) headers=['विवरण','Applications','Approved'];
    else if(/^Students$/i.test(title) && max>=3) headers=['विवरण','विद्यार्थी संख्या','प्रतिशत'];
    else if(/→/.test(raw) && max>=3) headers=['विवरण','पहिलो वर्ष','दोस्रो वर्ष'];
    else headers=['विवरण',...Array.from({length:max-1},(_,i)=>'मान '+(i+1))];
  }
  if(headers.length!==max)headers=['विवरण',...Array.from({length:max-1},(_,i)=>'मान '+(i+1))];
  return {title,type,parsed,headers};
}
function chartBox(title,body,showTitle=true){
  return '<div class="exam-stimulus data-stimulus chart-box">'+(showTitle&&title?'<div class="stimulus-label">'+esc(title)+'</div>':'')+body+'</div>';
}
function pieChartHTML(d,showTitle=true){
  const rows=d.parsed.filter(r=>r.length>=2), vals=rows.map(r=>parseFloat(String(r[1]).replace(/,/g,''))||0), total=vals.reduce((a,b)=>a+b,0);
  if(!total)return '';
  const palette=['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316']; let angle=0;
  const stops=rows.map((r,i)=>{const v=vals[i]/total*360,s=palette[i%palette.length]+' '+angle+'deg '+(angle+v)+'deg';angle+=v;return s}).join(',');
  const legend=rows.map((r,i)=>'<div class="chart-legend-row"><span class="chart-dot" style="background:'+palette[i%palette.length]+'"></span><span>'+esc(r[0])+'</span><b>'+esc(r[1])+'</b></div>').join('');
  return chartBox(d.title, '<div class="pie-layout"><div class="pie-chart" style="background:conic-gradient('+stops+')"></div><div class="chart-legend">'+legend+'</div></div>',showTitle);
}
function barChartHTML(d,showTitle=true){
  const rows=d.parsed.filter(r=>r.length>=2); if(!rows.length)return '';
  const series=Math.max(...rows.map(r=>Math.max(1,r.length-1))), values=rows.flatMap(r=>r.slice(1).map(v=>parseFloat(String(v).replace(/,/g,''))||0)), max=Math.max(1,...values);
  const w=Math.max(760,rows.length*90+90),h=390,left=70,right=25,top=35,bottom=95,plotW=w-left-right,plotH=h-top-bottom,groupW=plotW/rows.length,barW=Math.min(38,(groupW-20)/series);
  const palette=['#ef4444','#3b82f6','#10b981','#f59e0b','#8b5cf6']; let svg='<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Bar Chart" preserveAspectRatio="xMidYMid meet" class="chart-svg">';
  for(let g=0;g<=5;g++){const y=top+plotH-g*plotH/5,val=max*g/5;svg+='<line x1="'+left+'" y1="'+y+'" x2="'+(w-right)+'" y2="'+y+'" stroke="#dbe2ea"/><text x="'+(left-10)+'" y="'+(y+5)+'" text-anchor="end" font-size="12">'+Math.round(val)+'</text>'}
  rows.forEach((r,i)=>{const vals=r.slice(1).map(v=>parseFloat(String(v).replace(/,/g,''))||0),start=left+i*groupW+(groupW-vals.length*barW)/2;
    vals.forEach((v,j)=>{const bh=plotH*v/max,x=start+j*barW+2,y=top+plotH-bh;svg+='<rect x="'+x+'" y="'+y+'" width="'+Math.max(8,barW-5)+'" height="'+Math.max(1,bh)+'" rx="4" fill="'+palette[j%palette.length]+'"/><text x="'+(x+barW/2)+'" y="'+Math.max(18,y-7)+'" text-anchor="middle" font-size="12" font-weight="700">'+v+'</text>'});
    svg+='<text x="'+(left+i*groupW+groupW/2)+'" y="'+(h-38)+'" text-anchor="middle" font-size="13" font-weight="700">'+esc(r[0])+'</text>';});
  svg+='</svg>'; return chartBox(d.title,'<div class="chart-scroll">'+svg+'</div>',showTitle);
}
function lineChartHTML(d,showTitle=true){
  if(d.parsed.length<2)return '';
  const labels=d.parsed[0].slice(1), series=d.parsed.slice(1).map(r=>({name:r[0],vals:r.slice(1).map(v=>parseFloat(String(v).replace(/,/g,''))||0)})).filter(s=>s.vals.length);
  if(!labels.length||!series.length)return '';
  const w=Math.max(760,labels.length*85+100),h=390,left=70,right=30,top=35,bottom=95,plotW=w-left-right,plotH=h-top-bottom,max=Math.max(1,...series.flatMap(s=>s.vals));
  const palette=['#ef4444','#3b82f6','#10b981','#f59e0b','#8b5cf6']; let svg='<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Line Graph" preserveAspectRatio="xMidYMid meet" class="chart-svg">';
  for(let g=0;g<=5;g++){const y=top+plotH-g*plotH/5,val=max*g/5;svg+='<line x1="'+left+'" y1="'+y+'" x2="'+(w-right)+'" y2="'+y+'" stroke="#dbe2ea"/><text x="'+(left-10)+'" y="'+(y+5)+'" text-anchor="end" font-size="12">'+Math.round(val)+'</text>'}
  labels.forEach((lab,i)=>{const x=left+(labels.length===1?plotW/2:i*plotW/(labels.length-1));svg+='<text x="'+x+'" y="'+(h-38)+'" text-anchor="middle" font-size="12" font-weight="700">'+esc(lab)+'</text>'});
  series.forEach((s,si)=>{const pts=s.vals.map((v,i)=>{const x=left+(labels.length===1?plotW/2:i*plotW/(labels.length-1)),y=top+plotH-plotH*v/max;return [x,y,v]});svg+='<polyline fill="none" stroke="'+palette[si%palette.length]+'" stroke-width="4" stroke-linejoin="round" points="'+pts.map(p=>p[0]+','+p[1]).join(' ')+'"/>';pts.forEach(p=>svg+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="5" fill="#fff" stroke="'+palette[si%palette.length]+'" stroke-width="3"/><text x="'+p[0]+'" y="'+(p[1]-10)+'" text-anchor="middle" font-size="11" font-weight="700">'+p[2]+'</text>')});
  svg+='</svg>'; return chartBox(d.title,'<div class="chart-scroll">'+svg+'</div>',showTitle);
}
function tableDataHTML(d,showTitle=true){
  const rows=d.parsed.map(r=>r.slice()); if(!rows.length)return '';
  const max=Math.max(...rows.map(r=>r.length));
  let headers=Array.isArray(d.headers)&&d.headers.length===max?d.headers:Array.from({length:max},(_,i)=>i===0?'विवरण':'मान '+i);
  const table='<div class="table-scroll"><table class="data-stimulus-table"><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+Array.from({length:max},(_,i)=>'<td>'+esc(r[i]??'')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
  return chartBox(d.title,table,showTitle);
}
function dataStimulusHTML(q,showTitle=true){const d=dataRows(q);if(!d)return '';if(d.type==='pie-chart')return pieChartHTML(d,showTitle);if(d.type==='bar-chart')return barChartHTML(d,showTitle);if(d.type==='line-graph')return lineChartHTML(d,showTitle);return tableDataHTML(d,showTitle);}
function passageHTML(q,showTitle=true){return q.passage?`<div class="exam-stimulus passage-stimulus">${showTitle?'<div class="stimulus-label">पाठ / Paragraph</div>':''}<div style="line-height:1.75;white-space:pre-line">${esc(q.passage)}</div></div>`:''}
function isPictorialQuestion(q){const id=String(q?.id||'').trim();const type=String(q?.type||'').toLowerCase();const hasImage=!!String(q?.image||q?.imageUrl||q?.image_url||'').trim();return type==='pictorial'||(/^bo-2\.2-\d{3}$/.test(id)&&hasImage)}
function stimulusSource(q){
  if(!q||isPictorialQuestion(q))return null;
  const qt=String(q.type||'').toLowerCase();
  const dataTypes=new Set(['table','bar-chart','line-graph','line-table','pie-chart']);
  if(q.passage)return q;
  if(dataTypes.has(qt)&&(q.data||q.figure))return q;
  if(!dataTypes.has(qt))return null;
  const gid=String(q.groupId||'').trim();
  if(gid){
    const same=examQuestions.find(x=>String(x?.groupId||'').trim()===gid&&!isPictorialQuestion(x)&&(x?.passage||x?.data||x?.figure));
    if(same)return same;
  }
  return null;
}
function stimulusKey(q){
  const s=stimulusSource(q);
  if(!s)return'';
  if(s.groupId)return'group:'+String(s.groupId);
  if(s.passage)return'passage:'+String(s.passage);
  if(s.data||s.figure)return'data:'+String(s.data||s.figure);
  return'';
}
function stimulusHTML(q,showTitle=true){
  const s=stimulusSource(q);
  if(!s)return'';
  if(s.passage)return passageHTML(s,showTitle);
  return dataStimulusHTML(s,showTitle);
}
function showStimulusTitleForIndex(i){
  if(i===0)return true;
  const a=stimulusKey(examQuestions[i]),b=stimulusKey(examQuestions[i-1]);
  return !!a&&a!==b;
}
function start(){const name=$('#candidateName').value.trim(),email=$('#candidateEmail').value.trim(),whatsapp=$('#candidateWhatsapp').value.trim();if(!name){alert('नाम लेख्नुहोस्');return}if(!email&&!whatsapp){alert('Feedback पठाउन Gmail वा WhatsApp मध्ये कम्तीमा एउटा राख्नुहोस्');return}answers={};current=0;seconds=selectedExam.durationMinutes*60;$('#candidate').hidden=true;$('#exam').hidden=false;$('#timer').hidden=false;$('#examTitle').textContent=selectedExam.title;renderQuestion();timerId=setInterval(()=>{seconds--;updateTimer();if(seconds<=0){clearInterval(timerId);submitExam(true)}},1000);updateTimer()}
function updateTimer(){const m=Math.floor(seconds/60),s=seconds%60;$('#timer').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;$('#timer').classList.toggle('danger',seconds<=60)}
function repairQuestionImages(){
  document.querySelectorAll('#questionCard img.question-image').forEach(img=>{
    if(img.dataset.fallbackBound)return;
    img.dataset.fallbackBound='1';
    img.addEventListener('error',()=>{
      const id=img.dataset.imageId||'';
      const src=String(img.getAttribute('src')||'');
      const stage=Number(img.dataset.imageStage||'0');

      // Any repository image path can fall back to the raw GitHub asset.
      // This covers uploaded JPG/PNG/SVG as well as maintained pictorial assets.
      if(stage===0 && /^\/image\//.test(src)){
        img.dataset.imageStage='1';
        img.src='https://raw.githubusercontent.com/narayanbhandari58/narayanbhandari/main'+src+'?v=5';
        return;
      }

      if(id && /^(?:bo-2\.2-\d{3})$/.test(id)){
        if(stage<=1){
          img.dataset.imageStage='2';
          img.src='/.netlify/functions/exam-image?id='+encodeURIComponent(id)+'&v=5';
          return;
        }
      }
      img.style.display='none';
    });
  });
}
function resolvedQuestionImage(q){
  const direct=String(q?.image||q?.imageUrl||q?.image_url||'').trim();
  if(direct)return direct;
  const id=String(q?.id||'').trim();
  if(/^bo-2\\.2-\\d{3}$/.test(id)) return '/.netlify/functions/exam-image?id='+encodeURIComponent(id)+'&v=5';
  return '';
}
function figureFallbackHTML(q){
  const raw=String(q?.figure||'').trim();
  if(!raw||resolvedQuestionImage(q))return '';
  if(/^triangle-grid-\\d+$|^triangle-midpoints$/.test(raw))return '';
  return '<div class="question-figure-fallback"><div class="figure-fallback-label">आकृति</div><pre>'+esc(raw)+'</pre></div>';
}
function renderQuestion(){const q=examQuestions[current];const showTitle=showStimulusTitleForIndex(current);$('#progress').textContent=`${current+1}/${examQuestions.length}`;$('#questionCard').innerHTML=`<div class="qmeta">${esc(q.subject||'')} ${q.topic?`· ${esc(q.topic)}`:''} ${q.type==='iq'?'<span>IQ</span>':''}</div>${stimulusHTML(q,showTitle)}${resolvedQuestionImage(q)?`<figure class="question-image-wrap"><img class="question-image" data-image-id="${esc(q.id||'')}" src="${esc(resolvedQuestionImage(q))}" alt="${esc(q.imageAlt||q.topic||'प्रश्नचित्र')}" loading="eager" style="display:block;max-width:100%;width:auto;height:auto;max-height:380px;object-fit:contain;margin:0 auto"><figcaption>${esc(q.imageAlt||q.topic||'प्रश्नचित्र')}</figcaption></figure>`:figureFallbackHTML(q)}<h2>${esc(q.q)}</h2><div class="options">${q.options.map((o,i)=>`<button class="option ${answers[q.id]===i?'selected':''}" data-i="${i}">${String.fromCharCode(65+i)}. ${esc(o)}</button>`).join('')}</div><div class="nav-actions"><button class="btn btn-outline" id="prev" ${current===0?'disabled':''}>← अघिल्लो</button><button class="btn btn-primary" id="next">${current===examQuestions.length-1?'अन्तिम':'अर्को'} →</button></div>`;repairQuestionImages();if(isPictorialQuestion(q) && Array.isArray(q.options) && q.options.length && q.options.every(o=>/^[A-D]$/i.test(String(o??'').trim()))){document.querySelectorAll('#questionCard .options .option').forEach((btn,index)=>{const letter=String.fromCharCode(65+index);btn.setAttribute('aria-label',letter);btn.innerHTML=`<span class="pictorial-option-letter-only">${letter}</span>`;btn.style.display='flex';btn.style.alignItems='center';btn.style.justifyContent='flex-start';btn.style.gap='12px';btn.style.minHeight='58px';btn.style.padding='14px 18px';btn.style.fontSize='1.05rem';btn.style.fontWeight='800'})};document.querySelectorAll('.option').forEach(b=>b.onclick=()=>{answers[q.id]=Number(b.dataset.i);renderQuestion()});$('#prev').onclick=()=>{if(current>0){current--;renderQuestion()}};$('#next').onclick=()=>{if(current<examQuestions.length-1){current++;renderQuestion()}else submitExam(false)}}
async function submitExam(auto){if(!auto&&!confirm('परीक्षा बुझाएपछि उत्तर परिवर्तन गर्न मिल्दैन। बुझाउने?'))return;clearInterval(timerId);$('#exam').hidden=true;$('#timer').hidden=true;const payload={examId:selectedExam.id,name:$('#candidateName').value.trim(),email:$('#candidateEmail').value.trim(),whatsapp:$('#candidateWhatsapp').value.trim(),questionIds:examQuestions.map(q=>q.id),answers};try{const d=await getJSON(API+'submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});finalResult=d.result;renderResult(auto)}catch(e){alert(e.message);$('#exam').hidden=false}}
function renderResult(auto){const r=finalResult;$('#result').hidden=false;$('#resultSummary').innerHTML=`<div class="result-hero"><div><div class="eyebrow">${auto?'समय सकिएर Auto Submit':'परीक्षा सम्पन्न'}</div><h2>${esc(r.examTitle)}</h2><p>परीक्षार्थी: <b>${esc(r.candidate.name)}</b></p></div><div class="score"><strong>${r.score}</strong><small>/${r.maxScore}</small><em>${r.passed?'उत्तीर्ण':'अनुत्तीर्ण'} · ${r.percent}%</em></div></div><div class="stats"><div><b>${r.correct}</b><span>सही</span></div><div><b>${r.wrong}</b><span>गलत</span></div><div><b>${r.skipped}</b><span>नछोएको</span></div></div>`;$('#review').innerHTML='<h2>उत्तर Feedback</h2>'+r.review.map((q,i)=>`<article class="review-card">${stimulusHTML(q,i===0||stimulusKey(q)!==stimulusKey(r.review[i-1]))}${resolvedQuestionImage(q)?`<figure class="question-image-wrap"><img class="question-image" data-image-id="${esc(q.id||'')}" src="${esc(resolvedQuestionImage(q))}" alt="${esc(q.imageAlt||q.topic||'प्रश्नचित्र')}" loading="lazy" style="display:block;max-width:100%;width:auto;height:auto;max-height:380px;object-fit:contain;margin:0 auto"><figcaption>${esc(q.imageAlt||q.topic||'प्रश्नचित्र')}</figcaption></figure>`:''}<h3>${i+1}. ${esc(q.q)}</h3><p><b>तपाईंको उत्तर:</b> ${q.selected===null?'छाडिएको':esc(q.options[q.selected])} ${q.selected===q.correct?'✅':'❌'}</p><p><b>सही उत्तर:</b> ${esc(q.options[q.correct])}</p>${q.explanation?`<p><b>व्याख्या:</b> ${esc(q.explanation)}</p>`:''}${q.type==='iq'&&q.solution?`<div class="solution"><b>IQ Solution:</b><br>${esc(q.solution)}</div>`:''}</article>`).join('');$('#gmailBtn').hidden=!r.candidate.email;$('#whatsappBtn').hidden=!r.candidate.whatsapp;$('#gmailBtn').onclick=()=>window.location.href=`mailto:${encodeURIComponent(r.candidate.email)}?subject=${encodeURIComponent('लोकसेवा परीक्षा Feedback - '+r.examTitle)}&body=${encodeURIComponent('तपाईंको Feedback PDF परीक्षा पृष्ठबाट बनाइ/Share गर्न सकिन्छ। Score: '+r.score+' ('+r.percent+'%)')}`;$('#whatsappBtn').onclick=()=>window.open('https://wa.me/'+r.candidate.whatsapp.replace(/\D/g,'')+'?text='+encodeURIComponent('लोकसेवा परीक्षा Feedback: '+r.score+' ('+r.percent+'%). PDF परीक्षा पृष्ठको Share बाट पठाउन सकिन्छ।'),'_blank')}
function feedbackHTML(){const r=finalResult;return `<div style="font-family:Arial,sans-serif;padding:28px;color:#111"><h1>लोकसेवा परीक्षा Feedback</h1><h2>${esc(r.examTitle)}</h2><p>परीक्षार्थी: <b>${esc(r.candidate.name)}</b></p><p>मिति: ${new Date(r.submittedAt).toLocaleString('ne-NP')}</p><hr><h2>परिणाम: ${r.score}/${r.maxScore} (${r.percent}%) — ${r.passed?'उत्तीर्ण':'अनुत्तीर्ण'}</h2><p>सही: ${r.correct} · गलत: ${r.wrong} · नछोएको: ${r.skipped}</p>${r.review.map((q,i)=>`<section style="border:1px solid #ddd;border-radius:10px;padding:14px;margin:12px 0">${stimulusHTML(q,i===0||stimulusKey(q)!==stimulusKey(r.review[i-1]))}${q.image?`<img src="${esc(q.image)}" alt="${esc(q.imageAlt||q.topic||'प्रश्नचित्र')}" style="display:block;max-width:100%;max-height:320px;object-fit:contain;margin:0 auto 12px">`:''}<h3>${i+1}. ${esc(q.q)}</h3><p><b>तपाईंको उत्तर:</b> ${q.selected===null?'छाडिएको':esc(q.options[q.selected])}</p><p><b>सही उत्तर:</b> ${esc(q.options[q.correct])}</p>${q.explanation?`<p><b>व्याख्या:</b> ${esc(q.explanation)}</p>`:''}${q.type==='iq'&&q.solution?`<p><b>IQ Solution:</b> ${esc(q.solution)}</p>`:''}</section>`).join('')}</div>`}
async function makePDF(){if(!window.html2canvas){const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';document.head.appendChild(s);await new Promise((res,rej)=>{s.onload=res;s.onerror=rej})}if(!window.jspdf?.jsPDF){const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';document.head.appendChild(s);await new Promise((res,rej)=>{s.onload=res;s.onerror=rej})}const target=$('#result'),summary=$('#resultSummary'),review=$('#review');if(!target||target.hidden||!summary?.innerText.trim()||!review?.innerText.trim())throw Error('Feedback result भेटिएन।');const actions=target.querySelector('.result-actions'),old={width:target.style.width,maxWidth:target.style.maxWidth,backgroundColor:target.style.backgroundColor,boxSizing:target.style.boxSizing,overflow:target.style.overflow},oldAction=actions?.style.display||'';try{target.style.width='760px';target.style.maxWidth='760px';target.style.backgroundColor='#fff';target.style.boxSizing='border-box';target.style.overflow='visible';if(actions)actions.style.display='none';target.scrollIntoView({block:'start',behavior:'auto'});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const canvas=await html2canvas(target,{scale:Math.min(2,Math.max(1.5,window.devicePixelRatio||1.5)),useCORS:true,allowTaint:false,backgroundColor:'#fff',logging:false,windowWidth:760,scrollX:0,scrollY:0,imageTimeout:15000,onclone:doc=>{const c=doc.querySelector('#result');if(c){c.hidden=false;c.style.display='block';c.style.visibility='visible';c.style.opacity='1';c.style.position='relative';c.style.width='760px';c.style.maxWidth='760px';c.style.overflow='visible'}doc.querySelectorAll('.result-actions').forEach(x=>x.style.display='none');doc.querySelectorAll('img').forEach(img=>{img.style.maxWidth='100%';img.style.height='auto'})}});if(!canvas||canvas.width<100||canvas.height<100)throw Error('Feedback को canvas तयार भएन।');const {jsPDF}=window.jspdf;const pdf=new jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true}),margin=8,pageW=210,pageH=297,usableW=pageW-margin*2,usableH=pageH-margin*2,pxPerPage=Math.max(1,Math.floor(canvas.width*(usableH/usableW)));let y=0,page=0;while(y<canvas.height){const sliceH=Math.min(pxPerPage,canvas.height-y),slice=document.createElement('canvas');slice.width=canvas.width;slice.height=Math.max(1,Math.ceil(sliceH));const ctx=slice.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,slice.width,slice.height);ctx.drawImage(canvas,0,y,canvas.width,sliceH,0,0,canvas.width,slice.height);if(page)pdf.addPage();const img=slice.toDataURL('image/jpeg',.95),h=usableW*(slice.height/slice.width);pdf.addImage(img,'JPEG',margin,margin,usableW,Math.min(usableH,h),undefined,'FAST');y+=sliceH;page++}pdfBlob=pdf.output('blob');if(!pdfBlob||pdfBlob.size<1000)throw Error('PDF file खाली बनेको छ।');const url=URL.createObjectURL(pdfBlob),a=document.createElement('a');a.href=url;a.download=`feedback-${finalResult.attemptId}.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000)}finally{target.style.width=old.width;target.style.maxWidth=old.maxWidth;target.style.backgroundColor=old.backgroundColor;target.style.boxSizing=old.boxSizing;target.style.overflow=old.overflow;if(actions)actions.style.display=oldAction}}async function sharePDF(){if(!pdfBlob)await makePDF();const file=new File([pdfBlob],`feedback-${finalResult.attemptId}.pdf`,{type:'application/pdf'});if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({title:'लोकसेवा Feedback PDF',text:`${finalResult.examTitle} — ${finalResult.score} (${finalResult.percent}%)`,files:[file]});return}catch(e){if(e?.name==='AbortError')return}}alert('PDF तयार भयो। यस device/browser मा direct Share उपलब्ध नभए डाउनलोड भएको PDF लाई Files/Chrome बाट Share गर्न सकिन्छ।')}$('#startBtn').onclick=start;$('#finishBtn').onclick=()=>submitExam(false);$('#pdfBtn').onclick=makePDF;$('#shareBtn').onclick=sharePDF;$('#chooser').hidden=false;$('#candidate').hidden=true;$('#exam').hidden=true;$('#result').hidden=true;loadExams();