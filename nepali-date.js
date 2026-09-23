/* Global Nepali date bar — robust browser converter */
(function(){
  const MONTHS=['बैशाख','जेठ','असार','साउन','भदौ','असोज','कार्तिक','मंसिर','पुस','माघ','फागुन','चैत'];
  const DAYS=['आइतबार','सोमबार','मङ्गलबार','बुधबार','बिहीबार','शुक्रबार','शनिबार'];
  const NP='०१२३४५६७८९';
  const np=v=>String(v).replace(/\\d/g,d=>NP[d]);
  const el=()=>document.querySelector('[data-nepali-date]');
  function render(bs){
    const node=el();
    if(!node||!bs)return;
    node.textContent='📅 '+DAYS[new Date().getDay()]+', '+np(bs.date)+' '+MONTHS[bs.month-1]+' '+np(bs.year);
  }
  function load(){
    const node=el();
    if(!node)return;
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/@remotemerge/nepali-date-converter@1/dist/ndc-browser.js';
    s.onload=function(){
      try{
        if(typeof window.DateConverter!=='function')throw new Error('DateConverter global not found');
        const d=new Date();
        const ad=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
        const bs=new window.DateConverter(ad).toBs();
        if(!bs||!bs.year||!bs.month||!bs.date)throw new Error('Invalid BS result');
        render(bs);
      }catch(err){
        console.error('Nepali date conversion failed:',err);
        node.textContent='मिति उपलब्ध हुन सकेन';
      }
    };
    s.onerror=function(){
      console.error('Nepali date converter failed to load');
      node.textContent='मिति उपलब्ध हुन सकेन';
    };
    document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
