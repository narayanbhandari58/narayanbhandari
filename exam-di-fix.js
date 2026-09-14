/* DI renderer patch: supports compact rows such as X Jan120 Feb132 Mar150 Apr168 */
(function(){
  const oldDataRows=window.dataRows;
  window.dataRows=function(q){
    const raw=String(q.data||q.figure||'').trim();
    if(!raw)return oldDataRows(q);
    const type=String(q.type||'').toLowerCase();
    if(type!=='table')return oldDataRows(q);
    const parts=raw.split(/\s*;\s*/).map(s=>s.trim().replace(/[.]$/,'')).filter(Boolean);
    let title='',body=raw,headers=null,parsed=[];
    const c=raw.indexOf(':');
    if(c>0){title=raw.slice(0,c).trim();body=raw.slice(c+1).trim();}
    const rows=body.split(/\s*;\s*/).map(s=>s.trim().replace(/[.]$/,'')).filter(Boolean);
    /* Month/period pairs: X Jan120 Feb132 Mar150 Apr168 */
    const compact=rows.map(row=>{
      const m=row.match(/^([A-Za-z]+)\s+(.+)$/);
      if(!m)return null;
      const pairs=[...m[2].matchAll(/([A-Za-z]+)\s*(\d+(?:\.\d+)?)/g)];
      if(pairs.length>=2&&pairs.map(x=>x[0]).join('').length===m[2].replace(/\s+/g,'').length){
        return {label:m[1],pairs:pairs.map(x=>[x[1],x[2]])};
      }
      return null;
    });
    if(compact.every(Boolean)&&compact.length){
      headers=['विवरण',...compact[0].pairs.map(x=>x[0])];
      parsed=compact.map(r=>[r.label,...r.pairs.map(x=>x[1])]);
      return {title,type,parsed,headers};
    }
    /* Arrow rows: N 48→60 */
    const arrow=rows.map(row=>row.match(/^(.+?)\s+(\d+(?:\.\d+)?%?)\s*→\s*(\d+(?:\.\d+)?%?)$/));
    if(arrow.every(Boolean)&&arrow.length){
      const years=title.match(/(\d{4})\s*→\s*(\d{4})/);
      headers=['विवरण',years?years[1]:'मान १',years?years[2]:'मान २'];
      parsed=arrow.map(m=>[m[1].trim(),m[2],m[3]]);
      return {title,type,parsed,headers};
    }
    /* Comma/pipe separated rows: Y 150,135,162,180 */
    parsed=rows.map(row=>{
      const m=row.match(/^([A-Za-z][A-Za-z0-9_-]*)\s+(.+)$/);
      if(m){const vals=m[2].split(/\s*[,|]\s*/).filter(Boolean);return [m[1],...vals];}
      return row.split(/\s*[,|]\s*/).filter(Boolean);
    });
    return {title,type,parsed};
  };
  const oldTable=window.tableDataHTML;
  window.tableDataHTML=function(d,showTitle=true){
    if(!d||!d.parsed||!d.parsed.length)return oldTable(d,showTitle);
    let headers=d.headers||[];
    if(!headers.length){
      const max=Math.max(1,...d.parsed.map(r=>r.length));
      headers=Array.from({length:max},(_,i)=>i===0?'विवरण':`मान ${i}`);
    }
    const rows=d.parsed;
    const table=`<div class="data-table-scroll" style="overflow-x:auto;-webkit-overflow-scrolling:touch;width:100%"><table class="data-stimulus-table" style="width:100%;min-width:0;border-collapse:separate;border-spacing:0;background:#fff;border:1px solid #d7dee8;border-radius:10px;overflow:hidden;table-layout:fixed"><thead><tr>${headers.map((h,i)=>`<th style="padding:11px 9px;border-bottom:1px solid #d7dee8;background:${i?'#8f0e04':'#650a03'};color:#fff;text-align:center;font-weight:800;white-space:nowrap;word-break:break-word">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r,ri)=>`<tr>${headers.map((_,i)=>`<td style="padding:10px 8px;border-bottom:1px solid #edf0f4;text-align:${i?'center':'left'};font-weight:${i?'700':'650'};background:${ri%2?'#fff':'#fff8f6'};white-space:normal;word-break:break-word">${esc(r[i]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    return chartBox('',table,showTitle);
  };
})();