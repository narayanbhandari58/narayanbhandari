/* Global Nepali date bar — reliable local date table for 2026-2027 */
(function(){
  const MONTHS=['बैशाख','जेठ','असार','साउन','भदौ','असोज','कार्तिक','मंसिर','पुस','माघ','फागुन','चैत'];
  const DAYS=['आइतबार','सोमबार','मङ्गलबार','बुधबार','बिहीबार','शुक्रबार','शनिबार'];
  const NP='०१२३४५६७८९';
  const np=v=>String(v).replace(/\\d/g,d=>NP[d]);
  /* AD 2026-04-14 = BS 2083-01-01; month lengths for BS 2083/2084. */
  const year2083=[31,31,32,31,31,30,30,30,29,29,30,30];
  const year2084=[31,32,31,32,31,30,30,30,29,30,29,31];
  function daysInYear(y){return y===2083?year2083.reduce((a,b)=>a+b,0):year2084.reduce((a,b)=>a+b,0);}
  function daysToBs(target){
    const base=new Date(2026,3,14);
    let diff=Math.floor((target-base)/86400000);
    let by=2083, bm=1, bd=1;
    while(diff>0){
      bd++;
      if(bd> (by===2083?year2083:year2084)[bm-1]){bd=1;bm++;if(bm>12){by++;bm=1;}}
      diff--;
    }
    while(diff<0){
      bd--;
      if(bd<1){bm--;if(bm<1){by--;bm=12;}bd=(by===2083?year2083:year2084)[bm-1];}
      diff++;
    }
    return {year:by,month:bm,date:bd};
  }
  function render(){
    const node=document.querySelector('[data-nepali-date]'); if(!node)return;
    const d=new Date(); const bs=daysToBs(new Date(d.getFullYear(),d.getMonth(),d.getDate()));
    node.textContent=DAYS[d.getDay()]+', '+np(bs.date)+' '+MONTHS[bs.month-1]+' '+np(bs.year);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();