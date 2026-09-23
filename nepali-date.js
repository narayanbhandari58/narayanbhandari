/* Global Nepali date bar */
(function(){
  function load(){
    const el=document.querySelector('[data-nepali-date]');
    if(!el)return;
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/nepali-date-converter@3.4.0/dist/nepali-date-converter.umd.js';
    s.onload=function(){
      try{
        const NepaliDate=window.NepaliDate;
        if(!NepaliDate)throw new Error('NepaliDate unavailable');
        const today=new NepaliDate(new Date());
        el.textContent='📅 '+today.format('ddd, D MMMM YYYY','np');
      }catch(e){
        el.textContent='मिति उपलब्ध हुन सकेन';
        console.error('Nepali date:',e);
      }
    };
    s.onerror=function(){el.textContent='मिति उपलब्ध हुन सकेन';};
    document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();