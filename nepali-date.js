/* Global Nepali date bar — no external conversion API dependency */
(function(){
  const MONTHS=['बैशाख','जेठ','असार','साउन','भदौ','असोज','कार्तिक','मंसिर','पुस','माघ','फागुन','चैत'];
  const DAYS=['आइतबार','सोमबार','मङ्गलबार','बुधबार','बिहीबार','शुक्रबार','शनिबार'];
  const NP='०१२३४५६७८९';
  function np(v){return String(v).replace(/\d/g,d=>NP[d]);}
  function render(bs){
    const el=document.querySelector('[data-nepali-date]');
    if(!el)return;
    el.textContent='📅 '+DAYS[bs.day]+', '+np(bs.date)+' '+MONTHS[bs.month-1]+' '+np(bs.year);
  }
  function start(){
    const el=document.querySelector('[data-nepali-date]');
    if(!el)return;
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/nepali-date-converter@3.4.0/dist/nepali-date-converter.umd.js';
    s.onload=function(){
      try{
        const C=window.NepaliDate || window.nepaliDateConverter || window.default;
        if(typeof C!=='function')throw new Error('NepaliDate converter not found');
        const bs=new C(new Date());
        render({year:bs.BS.year,month:bs.BS.month,date:bs.BS.date,day:bs.BS.day});
      }catch(e){
        console.error('Nepali date conversion failed:',e);
        el.textContent='मिति उपलब्ध हुन सकेन';
      }
    };
    s.onerror=function(){console.error('Nepali date script failed to load');el.textContent='मिति उपलब्ध हुन सकेन';};
    document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();