/* Global Nepali date bar */
(function(){
  const MONTHS=['बैशाख','जेठ','असार','साउन','भदौ','असोज','कार्तिक','मंसिर','पुस','माघ','फागुन','चैत'];
  const DAYS=['आइतबार','सोमबार','मङ्गलबार','बुधबार','बिहीबार','शुक्रबार','शनिबार'];
  const NP='०१२३४५६७८९';
  function np(n){return String(n).replace(/\d/g,d=>NP[d]);}
  function show(bs){
    const el=document.querySelector('[data-nepali-date]');
    if(!el)return;
    const parts=String(bs).split('-').map(Number);
    if(parts.length!==3 || parts.some(Number.isNaN)) throw Error('Invalid BS date');
    const d=new Date();
    el.textContent='📅 '+DAYS[d.getDay()]+', '+np(parts[2])+' '+MONTHS[parts[1]-1]+' '+np(parts[0]);
  }
  function load(){
    const el=document.querySelector('[data-nepali-date]');
    if(!el)return;
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/@remotemerge/nepali-date-converter@1/dist/ndc-browser.js';
    s.onload=function(){
      try{
        if(typeof DateConverter!=='function') throw Error('DateConverter unavailable');
        const now=new Date();
        const pad=n=>String(n).padStart(2,'0');
        const ad=now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate());
        const bs=new DateConverter(ad).toBs();
        show(bs.year+'-'+String(bs.month).padStart(2,'0')+'-'+String(bs.date).padStart(2,'0'));
      }catch(e){el.textContent='मिति उपलब्ध हुन सकेन';console.error(e);}
    };
    s.onerror=function(){el.textContent='मिति उपलब्ध हुन सकेन';};
    document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();