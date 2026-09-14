/* Extra visual layer for Branch Officer pictorial/triangle-count questions. */
(function(){
 const card=()=>document.getElementById('questionCard'); let bank=[];
 const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 async function load(){try{const r=await fetch('exam-data.json?visual='+Date.now(),{cache:'no-store'});const d=await r.json();bank=d.questions||[]}catch(e){}}
 function current(){const h=card()?.querySelector('h2');if(!h)return null;const t=String(h.textContent||'').replace(/^\s*\d+\.\s*/,'').trim();return bank.find(q=>String(q.q||q.question||'').replace(/\s+/g,' ').trim()===t)||null}
 function ln(a,b){return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#8f0e04" stroke-width="6" stroke-linecap="round"/>`}
 function fig(k){const A=[450,45],B=[90,510],C=[810,510];let s=ln(A,B)+ln(B,C)+ln(C,A);
  if(k==='triangle-midpoints'){const AB=[270,278],AC=[630,278],BC=[450,510];s+=ln(AB,AC)+ln(AB,BC)+ln(AC,BC)}
  else {const n=k==='triangle-grid-4'?4:k==='triangle-grid-3'?3:2;const P=(i,j)=>[A[0]+(B[0]-A[0])*i/n+(C[0]-A[0])*j/n,A[1]+(B[1]-A[1])*i/n+(C[1]-A[1])*j/n];for(let i=1;i<n;i++)s+=ln(P(i,0),P(0,n-i));for(let i=1;i<n;i++)s+=ln(P(i,0),P(i,n-i));for(let j=1;j<n;j++)s+=ln(P(0,j),P(n-j,j))}
  return `<div class="exam-stimulus triangle-stimulus" style="margin:14px 0;padding:10px;border:1px solid #d7dee8;border-radius:14px;background:#fff;overflow:hidden"><div style="font-weight:850;color:#8f0e04;margin:2px 0 10px">चित्र — त्रिभुज गणना</div><svg viewBox="0 0 900 560" role="img" aria-label="${esc('स्पष्ट त्रिभुज गणना आकृति')}" style="width:100%;height:auto;display:block">${s}</svg></div>`}
 function repair(){const c=card(),q=current();if(!c||!q)return;const old=c.querySelector('.triangle-stimulus');if(String(q.type||'').toLowerCase()==='triangle-count'){const h=c.querySelector('h2');if(!old&&h)h.insertAdjacentHTML('beforebegin',fig(q.figure));return}if(old)old.remove()}
 load().then(()=>{const c=card();if(!c)return;let t;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(repair,40)}).observe(c,{childList:true,subtree:true});setTimeout(repair,120)});
})();