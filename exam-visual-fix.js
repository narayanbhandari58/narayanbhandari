/* Visual layer v2: complete responsive figures for non-verbal/pictorial and triangle-count questions. */
(function(){
 const card=()=>document.getElementById('questionCard');
 const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const norm=s=>String(s??'').replace(/\s+/g,' ').trim().toLowerCase();
 function line(a,b,extra=''){return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#263238" stroke-width="6" stroke-linecap="round" ${extra}/>`}
 function circle(x,y,r,fill='#fff'){return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="#263238" stroke-width="6"/>`}
 function label(x,y,t){return `<text x="${x}" y="${y}" text-anchor="middle" font-family="Noto Sans,Arial,sans-serif" font-size="28" font-weight="800" fill="#263238">${esc(t)}</text>`}
 function box(title,svg){return `<div class="exam-stimulus pictorial-stimulus" style="margin:14px 0;padding:12px;border:1px solid #d7dee8;border-radius:14px;background:#fff;overflow:hidden"><div style="font-weight:850;color:#8f0e04;margin:2px 0 10px">चित्रात्मक प्रश्न</div>${svg}</div>`}
 function arrow(x,y,deg,fill='#8f0e04'){return `<g transform="translate(${x} ${y}) rotate(${deg})"><path d="M-48 20 L20 20 L20 44 L62 0 L20 -44 L20 -20 L-48 -20 Z" fill="${fill}" stroke="#263238" stroke-width="5"/></g>`}
 function pictorialSVG(topic,q){
   const t=norm(topic+' '+q);
   let s='';
   if(t.includes('दर्पण')||t.includes('mirror')){
     s+=`<svg viewBox="0 0 900 380" role="img" aria-label="दर्पण प्रतिबिम्ब आकृति" style="width:100%;height:auto;display:block"><rect x="28" y="28" width="844" height="324" rx="18" fill="#f8fafc" stroke="#d7dee8"/><line x1="450" y1="55" x2="450" y2="325" stroke="#64748b" stroke-width="5" stroke-dasharray="14 10"/><text x="450" y="50" text-anchor="middle" font-size="22" font-weight="800" fill="#64748b">दर्पण</text>${circle(270,170,62,'#f4c400')}<path d="M220 235 L270 110 L320 235 Z" fill="#8f0e04" stroke="#263238" stroke-width="6"/><circle cx="300" cy="145" r="11" fill="#fff" stroke="#263238" stroke-width="4"/>${circle(630,170,62,'#f4c400')}<path d="M580 235 L630 110 L680 235 Z" fill="#8f0e04" stroke="#263238" stroke-width="6"/><circle cx="600" cy="145" r="11" fill="#fff" stroke="#263238" stroke-width="4"/>${label(270,310,'मूल आकृति')}${label(630,310,'प्रतिबिम्ब')}</svg>`;
   } else if(t.includes('घुमाइ')||t.includes('rotation')||t.includes('तीर')){
     s+=`<svg viewBox="0 0 900 380" role="img" aria-label="घुमाइ क्रम" style="width:100%;height:auto;display:block"><rect x="28" y="28" width="844" height="324" rx="18" fill="#f8fafc" stroke="#d7dee8"/>${[130,330,530,730].map((x,i)=>arrow(x,180,i*90)).join('')}<text x="830" y="185" font-size="52" font-weight="900" fill="#8f0e04">?</text>${label(130,300,'१')}${label(330,300,'२')}${label(530,300,'३')}${label(730,300,'४')}</svg>`;
   } else if(t.includes('भुजा')||t.includes('polygon')||t.includes('आकृति क्रम')){
     const polys=[3,4,5,6,3];s+=`<svg viewBox="0 0 900 380" role="img" aria-label="आकृति क्रम" style="width:100%;height:auto;display:block"><rect x="28" y="28" width="844" height="324" rx="18" fill="#f8fafc" stroke="#d7dee8"/>${polys.map((n,i)=>{const x=120+i*160,pts=[];for(let k=0;k<n;k++){const a=-Math.PI/2+2*Math.PI*k/n;pts.push(`${x+48*Math.cos(a)},${180+48*Math.sin(a)}`)}return `<polygon points="${pts.join(' ')}" fill="${i%2?'#f4c400':'#8f0e04'}" stroke="#263238" stroke-width="6"/>`}).join('')}<rect x="778" y="130" width="96" height="96" rx="12" fill="#fff" stroke="#8f0e04" stroke-width="7" stroke-dasharray="12 8"/><text x="826" y="195" text-anchor="middle" font-size="48" font-weight="900" fill="#8f0e04">?</text></svg>`;
   } else if(t.includes('भराइ')||t.includes('fill')){
     s+=`<svg viewBox="0 0 900 380" role="img" aria-label="भराइ क्रम" style="width:100%;height:auto;display:block"><rect x="28" y="28" width="844" height="324" rx="18" fill="#f8fafc" stroke="#d7dee8"/>${[0,1,0,1].map((v,i)=>`<rect x="90" y="120" width="105" height="105" rx="12" fill="${v?'#8f0e04':'#fff'}" stroke="#263238" stroke-width="6"/>`).join('')}<rect x="750" y="120" width="105" height="105" rx="12" fill="#fff" stroke="#8f0e04" stroke-width="7" stroke-dasharray="12 8"/><text x="802" y="190" text-anchor="middle" font-size="48" font-weight="900" fill="#8f0e04">?</text></svg>`;
   } else if(t.includes('रेखा')||t.includes('line sequence')){
     const ds=[-65,65,-65,65];s+=`<svg viewBox="0 0 900 380" role="img" aria-label="रेखा क्रम" style="width:100%;height:auto;display:block"><rect x="28" y="28" width="844" height="324" rx="18" fill="#f8fafc" stroke="#d7dee8"/>${ds.map((d,i)=>line([110+i*170,180],[190+i*170,180+d],`stroke="#8f0e04"`)).join('')}<text x="825" y="190" font-size="52" font-weight="900" fill="#8f0e04">?</text></svg>`;
   } else {
     s+=`<svg viewBox="0 0 900 380" role="img" aria-label="पिक्टोरियल आकृति" style="width:100%;height:auto;display:block"><rect x="28" y="28" width="844" height="324" rx="18" fill="#f8fafc" stroke="#d7dee8"/>${[130,300,470,640].map((x,i)=>circle(x,180,55,i%2?'#8f0e04':'#f4c400')).join('')}<rect x="750" y="125" width="110" height="110" rx="14" fill="#fff" stroke="#8f0e04" stroke-width="7" stroke-dasharray="12 8"/><text x="805" y="195" text-anchor="middle" font-size="52" font-weight="900" fill="#8f0e04">?</text></svg>`;
   }
   return box('',s);
 }
 function triangleSVG(kind){
   const A=[450,45],B=[90,510],C=[810,510];
   const ln=(a,b)=>line(a,b,'stroke="#8f0e04"');let s=ln(A,B)+ln(B,C)+ln(C,A);
   if(kind==='triangle-midpoints'){s+=ln([270,278],[630,278])+ln([270,278],[450,510])+ln([630,278],[450,510]);}
   else{const n=kind==='triangle-grid-4'?4:kind==='triangle-grid-3'?3:2;const P=(i,j)=>[A[0]+(B[0]-A[0])*i/n+(C[0]-A[0])*j/n,A[1]+(B[1]-A[1])*i/n+(C[1]-A[1])*j/n];for(let i=1;i<n;i++)s+=ln(P(i,0),P(0,n-i));for(let i=1;i<n;i++)s+=ln(P(i,0),P(i,n-i));for(let j=1;j<n;j++)s+=ln(P(0,j),P(n-j,j));}
   return `<div class="exam-stimulus triangle-stimulus" style="margin:14px 0;padding:10px;border:1px solid #d7dee8;border-radius:14px;background:#fff;overflow:hidden"><div style="font-weight:850;color:#8f0e04;margin:2px 0 10px">चित्र — त्रिभुज गणना</div><svg viewBox="0 0 900 560" role="img" aria-label="स्पष्ट त्रिभुज गणना आकृति" style="width:100%;height:auto;display:block">${s}</svg></div>`;
 }
 function repair(){
   const c=card();if(!c)return;
   const h=c.querySelector('h2');if(!h)return;
   const qText=cleanText(h.textContent).replace(/^\d+\s*[.)]\s*/,'');
   const meta=cleanText(c.querySelector('.qmeta')?.textContent||'');
   const all=norm(meta+' '+qText);
   c.querySelectorAll('.pictorial-stimulus,.triangle-stimulus').forEach(x=>x.remove());
   if(all.includes('त्रिभुज')||all.includes('triangle-count')){
     let kind='triangle-grid-2';
     if(all.includes('4x4')||all.includes('चार'))kind='triangle-grid-4';else if(all.includes('3x3')||all.includes('तीन'))kind='triangle-grid-3';else if(all.includes('मध्य')||all.includes('midpoint'))kind='triangle-midpoints';
     const x=h.parentElement?.querySelector('.triangle-stimulus');h.insertAdjacentHTML('beforebegin',triangleSVG(kind));return;
   }
   if(meta.includes('Non-verbal')||all.includes('आकृति क्रम')||all.includes('भराइ')||all.includes('दर्पण')||all.includes('घुमाइ')||all.includes('भुजा')||all.includes('रेखा क्रम')){
     c.querySelectorAll('.question-image-wrap').forEach(x=>x.remove());
     h.insertAdjacentHTML('beforebegin',pictorialSVG(meta,qText));
   }
 }
 function cleanText(s){return String(s??'').replace(/\s+/g,' ').trim()}
 const c=card();if(c){let t;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(repair,50)}).observe(c,{childList:true,subtree:true});setTimeout(repair,250);}
})();