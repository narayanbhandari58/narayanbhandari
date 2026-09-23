/* Global Nepali date bar */
(function(){
  const MONTHS=['बैशाख','जेठ','असार','साउन','भदौ','असोज','कार्तिक','मंसिर','पुस','माघ','फागुन','चैत'];
  const WEEKDAYS=['आइतबार','सोमबार','मङ्गलबार','बुधबार','बिहीबार','शुक्रबार','शनिबार'];
  const np=n=>String(n).replace(/\d/g,d=>'०१२३४५६७८९'[d]);
  function render(bs){
    const el=document.querySelector('[data-nepali-date]'); if(!el||!bs)return;
    const p=String(bs).split('-').map(Number); if(p.length!==3||p.some(Number.isNaN))return;
    const d=new Date();
    el.textContent='📅 '+WEEKDAYS[d.getDay()]+', '+np(p[2])+' '+MONTHS[p[1]-1]+' '+np(p[0]);
  }
  function load(){
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/nepali-date-converter/dist/nepali-date-converter.umd.js';
    s.onload=function(){
      try{
        const C=window.NepaliDate||window.NepaliDateConverter||window.default;
        if(!C)throw Error('converter unavailable');
        const x=new C(new Date());
        render(x.format('YYYY-MM-DD'));
      }catch(e){console.error('Nepali date:',e);}
    };
    s.onerror=function(){console.error('Nepali date converter failed to load');};
    document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();