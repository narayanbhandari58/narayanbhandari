/* Exam PDF v2.3 - visible capture surface for mobile html2canvas */
(function(){
  const $=s=>document.querySelector(s);
  let busy=false,pdfBlob=null;
  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));

  async function loadLib(){
    if(window.html2pdf)return;
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    document.head.appendChild(s);
    await new Promise((ok,no)=>{s.onload=ok;s.onerror=()=>no(Error('PDF library load भएन।'));});
  }
  function name(){return 'loksewa-feedback.pdf';}
  function makeSurface(){
    const summary=$('#resultSummary'),review=$('#review');
    if(!summary||!review||!summary.innerHTML.trim()||!review.innerHTML.trim())throw Error('Feedback result भेटिएन।');
    const el=document.createElement('div');
    el.id='nbPdfSurface';
    el.innerHTML=`<style>
      #nbPdfSurface{display:block!important;visibility:visible!important;opacity:1!important;position:fixed!important;left:0!important;top:0!important;width:760px!important;min-height:100px!important;height:auto!important;z-index:2147483647!important;overflow:visible!important;background:#fff!important;color:#111!important;padding:26px 28px!important;font-family:"Noto Sans Devanagari","Noto Sans",Arial,sans-serif!important;font-size:13px!important;line-height:1.55!important;box-sizing:border-box!important}
      #nbPdfSurface *{box-sizing:border-box!important;visibility:visible!important}
      #nbPdfSurface .nb-head{border-bottom:3px solid #8f0e04;padding-bottom:14px;margin-bottom:18px}
      #nbPdfSurface .nb-title{font-size:24px;font-weight:900;margin:3px 0}
      #nbPdfSurface .nb-sub{font-size:12px;color:#475569}
      #nbPdfSurface .nb-card{break-inside:avoid;page-break-inside:avoid}
      #nbPdfSurface img{max-width:100%!important;height:auto!important;object-fit:contain}
      #nbPdfSurface .result-actions{display:none!important}
      #nbPdfSurface .nb-foot{margin-top:20px;padding-top:10px;border-top:1px solid #d9dee7;text-align:center;font-size:10px;color:#64748b}
    </style>
    <div class="nb-head"><div>नारायण भण्डारी · लोकसेवा अनलाइन परीक्षा</div><div class="nb-title">परीक्षा Feedback Report</div><div class="nb-sub">Generated: ${esc(new Date().toLocaleString('ne-NP'))}</div></div>
    <div>${summary.innerHTML}</div><div>${review.innerHTML}</div>
    <div class="nb-foot">narayan-bhandari.com.np · Feedback Report</div>`;
    document.body.appendChild(el);
    // Force a real, visible layout before capture.
    el.getBoundingClientRect();
    return el;
  }
  async function images(el){
    await Promise.all([...el.images].map(im=>new Promise(r=>{
      if(im.complete&&im.naturalWidth) return r();
      im.onload=r;im.onerror=r;setTimeout(r,6000);
    })));
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  }
  async function generate(){
    await loadLib();
    const el=makeSurface();
    try{
      await images(el);
      if(el.getBoundingClientRect().width<100||el.scrollHeight<100)throw Error('Feedback content layout तयार भएन।');
      return await html2pdf().set({
        margin:[8,8,10,8],filename:name(),
        image:{type:'jpeg',quality:.95},
        html2canvas:{scale:1.5,useCORS:true,allowTaint:false,backgroundColor:'#fff',logging:true,width:760,windowWidth:760,scrollX:0,scrollY:0},
        jsPDF:{unit:'mm',format:'a4',orientation:'portrait',compress:true},
        pagebreak:{mode:['css','legacy'],avoid:['.review-card','.question-image-wrap','.exam-stimulus','.data-stimulus','.passage-stimulus']}
      }).from(el).save().then(()=>null);
    }finally{if(el.parentNode)el.remove();}
  }
  async function download(){
    if(busy)return;busy=true;const b=$('#pdfBtn');if(b)b.disabled=true;
    try{await generate();}catch(e){alert('PDF बनाउन सकिएन: '+e.message);}finally{if(b)b.disabled=false;busy=false;}
  }
  function bind(){
    const b=$('#pdfBtn');if(b){const n=b.cloneNode(true);b.replaceWith(n);n.addEventListener('click',download);}
    const s=$('#shareBtn');if(s){const n=s.cloneNode(true);s.replaceWith(n);n.addEventListener('click',async()=>{alert('पहिले PDF बनाउनुहोस्। त्यसपछि Files बाट Share गर्न सकिन्छ।');});}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();