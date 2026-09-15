/* Render pictorial-question answer choices as actual graphics instead of text. */
(function(){
  const card=()=>document.getElementById('questionCard');
  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  function svgFor(label){
    const t=String(label||'').trim();
    const common='viewBox="0 0 180 120" role="img" aria-label="'+esc(t)+'" style="width:100%;height:110px;display:block"';
    if(/वृत्त|circle/i.test(t)) return `<svg ${common}><circle cx="90" cy="60" r="35" fill="none" stroke="#8f0e04" stroke-width="7"/></svg>`;
    if(/वर्ग|square/i.test(t)) return `<svg ${common}><rect x="52" y="22" width="76" height="76" rx="3" fill="none" stroke="#8f0e04" stroke-width="7"/></svg>`;
    if(/त्रिभुज|triangle/i.test(t)) return `<svg ${common}><polygon points="90,18 132,96 48,96" fill="none" stroke="#8f0e04" stroke-width="7" stroke-linejoin="round"/></svg>`;
    if(/हीरा|diamond/i.test(t)) return `<svg ${common}><polygon points="90,16 137,60 90,104 43,60" fill="none" stroke="#8f0e04" stroke-width="7" stroke-linejoin="round"/></svg>`;
    const n=t.match(/(\d+)\s*भुजा/);
    if(n){
      const sides=Math.max(3,Math.min(20,Number(n[1]))), pts=[];
      for(let i=0;i<sides;i++){const a=-Math.PI/2+i*2*Math.PI/sides;pts.push(`${(90+38*Math.cos(a)).toFixed(1)},${(60+38*Math.sin(a)).toFixed(1)}`)}
      return `<svg ${common}><polygon points="${pts.join(' ')}" fill="none" stroke="#8f0e04" stroke-width="6" stroke-linejoin="round"/></svg>`;
    }
    const dir=t.match(/माथि|दायाँ|तल|बायाँ/);
    if(dir){
      const a={माथि:-90,दायाँ:0,तल:90,बायाँ:180}[dir[0]], rad=a*Math.PI/180;
      const x=90+35*Math.cos(rad), y=60+35*Math.sin(rad), bx=90-18*Math.cos(rad), by=60-18*Math.sin(rad);
      const px=-Math.sin(rad)*13, py=Math.cos(rad)*13;
      return `<svg ${common}><line x1="${bx}" y1="${by}" x2="${x}" y2="${y}" stroke="#8f0e04" stroke-width="9" stroke-linecap="round"/><polygon points="${x},${y} ${x-px-10*Math.cos(rad)},${y-py-10*Math.sin(rad)} ${x+px-10*Math.cos(rad)},${y+py-10*Math.sin(rad)}" fill="#8f0e04"/></svg>`;
    }
    const pos=t.match(/(माथिल्लो|तल्लो)\s*(बायाँ|दायाँ)/);
    if(pos){
      const x=pos[2]==='बायाँ'?55:125, y=pos[1]==='माथिल्लो'?35:85;
      return `<svg ${common}><rect x="28" y="18" width="124" height="84" rx="8" fill="none" stroke="#94a3b8" stroke-width="3" stroke-dasharray="5 5"/><circle cx="${x}" cy="${y}" r="18" fill="none" stroke="#8f0e04" stroke-width="6"/></svg>`;
    }
    return `<svg ${common}><path d="M50 88 L90 24 L130 88 Z" fill="none" stroke="#8f0e04" stroke-width="6"/><circle cx="90" cy="68" r="5" fill="#8f0e04"/></svg>`;
  }
  function apply(){
    const c=card(); if(!c || !c.querySelector('.question-image-wrap')) return;
    c.querySelectorAll('.options .option').forEach(btn=>{
      if(btn.dataset.pictorialRendered==='1') return;
      const raw=btn.textContent.trim();
      const m=raw.match(/^\s*([A-D])(?:[.)]|\s+)\s*(.*)$/i);
      const letter=m?m[1].toUpperCase():'';
      const label=m?m[2].trim():raw;
      btn.dataset.pictorialRendered='1';
      btn.setAttribute('aria-label',`${letter?letter+'. ':''}${label}`);
      btn.innerHTML=`<span class="pictorial-option-letter">${esc(letter)}</span><span class="pictorial-option-image">${svgFor(label)}</span>`;
      btn.style.display='grid';btn.style.gridTemplateColumns='32px 1fr';btn.style.alignItems='center';btn.style.gap='8px';btn.style.minHeight='135px';btn.style.padding='8px 12px';
    });
  }
  const c=card();
  if(c){new MutationObserver(()=>requestAnimationFrame(apply)).observe(c,{childList:true,subtree:true});apply();}
})();
