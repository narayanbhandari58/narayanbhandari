/* Central exam stimulus renderer v1.
   Runs synchronously with questionCard.innerHTML so DI/paragraph content is
   present before the browser paints. Uses the exact active paper saved by
   exam-resume.js; it never searches another question by text and never
   carries stimulus from a previous question.
*/
(function(){
  if(window.__NB_STIMULUS_CORE_V1)return;
  window.__NB_STIMULUS_CORE_V1=true;
  const KEY='nb_loksewa_exact_resume_v11';
  const OLD=['nb_loksewa_exact_resume_v10','nb_loksewa_exact_resume_v9','nb_loksewa_exact_resume_v8','nb_loksewa_exact_resume_v7','nb_loksewa_exact_resume_v6'];
  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  const readState=()=>{try{for(const k of [KEY,...OLD]){const x=JSON.parse(localStorage.getItem(k)||'null');if(x?.started&&Array.isArray(x.paper)&&x.paper.length)return x}}catch(e){}return null};
  const card=()=>document.getElementById('questionCard');
  const qIndex=el=>{const h=el?.querySelector('h2');const m=h?.textContent?.match(/^\s*(\d+)\s*[.)]/);return m?Number(m[1])-1:null};
  const pict=q=>{const t=String([q?.type,q?.format,q?.topic,q?.subject,q?.q].filter(Boolean).join(' ')).toLowerCase();return /pictorial|non-verbal|figure-count|triangle-count|आकृति|रेखा क्रम|घुमाइ|भुजा क्रम|भर्ने क्रम|दर्पण प्रतिबिम्ब|प्रतिबिम्ब/.test(t)};
  const di=q=>{if(!q||pict(q))return false;const t=String([q.type,q.category,q.topic,q.subject,q.unit].filter(Boolean).join(' ')).toLowerCase();return /data.?interpretation|डेटा व्याख्या/.test(t)||['pie-chart','bar-chart','line-graph'].includes(String(q.type||'').toLowerCase())};
  function parse(q){const raw=String(q?.data||'').trim();if(!raw)return null;const type=String(q.type||'').toLowerCase();const parts=raw.split(/\s*;\s*/).map(x=>x.trim()).filter(Boolean);let title='',rows=[];
    if(type==='pie-chart'){
      let body=raw;const c=raw.indexOf(':');if(c>0){title=raw.slice(0,c).trim();body=raw.slice(c+1)}
      const re=/([A-Za-z][A-Za-z0-9 +&/_-]*?)\s*(\d+(?:\.\d+)?)%/g;let m;while((m=re.exec(body)))rows.push([m[1].trim(),m[2]+'%']);
    }else{
      parts.forEach((p,i)=>{const c=p.indexOf(':');let body=p;if(c>0){if(i===0)title=p.slice(0,c).trim();body=p.slice(c+1).trim()}
        let m=body.match(/^([A-Za-z][A-Za-z0-9_-]*)\s+(.+)$/);if(m)rows.push([m[1],...m[2].split(/\s*[,|]\s*/).filter(Boolean)]);else rows.push(body.split(/\s*[,|]\s*/).filter(Boolean));});
    }
    return {type,title,rows};
  }
  function box(body){return `<div class="exam-stimulus central-stimulus" data-central-stimulus="1">${body}</div>`}
  function render(q){const d=parse(q);if(!d)return'';if(d.type==='pie-chart'){
      const colors=['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316'];let a=0,total=d.rows.reduce((s,r)=>s+(parseFloat(r[1])||0),0);if(!total)return'';const stops=d.rows.map((r,i)=>{const v=parseFloat(r[1])||0,deg=v/total*360,z=`${colors[i%colors.length]} ${a}deg ${a+deg}deg`;a+=deg;return z}).join(',');const legend=d.rows.map((r,i)=>`<div class="central-legend"><i style="background:${colors[i%colors.length]}"></i><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join('');return box(`${d.title?`<div class="central-title">${esc(d.title)}</div>`:''}<div class="central-pie"><div class="central-pie-chart" style="background:conic-gradient(${stops})"></div><div>${legend}</div></div>`);
    }
    const rows=d.rows.filter(r=>r.length);if(!rows.length)return'';const n=Math.max(...rows.map(r=>r.length));const heads=Array.from({length:n},(_,i)=>i?'मान '+i:'विवरण');return box(`${d.title?`<div class="central-title">${esc(d.title)}</div>`:''}<div class="central-scroll"><table class="central-table"><thead><tr>${heads.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${heads.map((_,i)=>`<td>${esc(r[i]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
  }
  function apply(el){if(!el||el.id!=='questionCard')return;const old=el.querySelectorAll('.data-stimulus:not([data-central-stimulus]),.live-di-stimulus');old.forEach(x=>x.remove());const st=readState(),i=qIndex(el),q=st?.paper?.[i];el.querySelectorAll('[data-central-stimulus]').forEach(x=>x.remove());if(!q)return;const h=el.querySelector('h2');if(!h)return;if(q.passage){h.insertAdjacentHTML('beforebegin',box(`<div class="central-title">अनुच्छेद</div><div class="central-passage">${esc(q.passage)}</div>`))}if(di(q)){const html=render(q);if(html)h.insertAdjacentHTML('beforebegin',html)}}
  const desc=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');if(!desc?.set)return;Object.defineProperty(Element.prototype,'innerHTML',{configurable:desc.configurable,enumerable:desc.enumerable,get:desc.get,set:function(v){desc.set.call(this,v);if(this.id==='questionCard')apply(this)}});
  const style=document.createElement('style');style.textContent='.central-stimulus{margin:14px 0;padding:14px;border:1px solid #d7dee8;border-radius:14px;background:linear-gradient(145deg,#fff,#f7f9fc);box-shadow:0 6px 18px rgba(15,23,42,.06)}.central-title{font-weight:850;color:#8f0e04;margin-bottom:12px}.central-passage{line-height:1.75}.central-scroll{overflow-x:auto}.central-table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid #d7dee8;border-radius:10px;overflow:hidden}.central-table th{padding:10px;background:#8f0e04;color:#fff;white-space:nowrap}.central-table td{padding:9px;border-bottom:1px solid #edf0f4;text-align:center}.central-table td:first-child{text-align:left;font-weight:650}.central-pie{display:grid;grid-template-columns:minmax(170px,260px) 1fr;gap:22px;align-items:center;max-width:720px;margin:auto}.central-pie-chart{width:min(260px,70vw);aspect-ratio:1;border-radius:50%;box-shadow:inset 0 0 0 16px #fff,0 8px 22px rgba(0,0,0,.12);margin:auto}.central-legend{display:flex;align-items:center;gap:8px;margin:7px 0}.central-legend i{width:13px;height:13px;border-radius:4px;display:block;flex:0 0 13px}.central-legend b{margin-left:auto}@media(max-width:600px){.central-pie{grid-template-columns:1fr;gap:14px}.central-pie-chart{width:min(230px,70vw)}}';document.head.appendChild(style);
  window.NB_applyExamStimulus=()=>apply(card());
})();