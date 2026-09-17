/* Exam PDF v2.2
   - Fixes blank PDF on mobile/Chrome by keeping the render node in the document's real layout.
   - Waits for question images before rendering.
   - Keeps Nepali text rendered by browser/html2canvas.
   - Avoids splitting review cards/stimuli where possible.
   - Separates Generate/Download from Share so mobile Share does not trigger a duplicate download.
   - Cleans the temporary render node even when PDF generation fails.
*/
(function(){
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  let pdfBlob=null;
  let busy=false;

  async function loadLib(){
    if(window.html2pdf)return;
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    document.head.appendChild(s);
    await new Promise((resolve,reject)=>{
      s.onload=resolve;
      s.onerror=()=>reject(Error('PDF library load भएन।'));
    });
  }

  function resultData(){
    const summary=$('#resultSummary'),review=$('#review');
    if(!summary||!review||!summary.innerHTML.trim()||!review.innerHTML.trim())return null;
    return {summary:summary.innerHTML,review:review.innerHTML};
  }

  function buildDocument(){
    const d=resultData();
    if(!d)throw Error('Feedback result भेटिएन। पहिले परीक्षा पूरा गरेर Result/Feedback देखाउनुहोस्।');

    const el=document.createElement('div');
    el.className='nb-pdf-document';
    el.innerHTML=`<style>
      *{box-sizing:border-box}
      .nb-pdf-document{width:760px;min-height:100px;background:#fff;color:#111;font-family:"Noto Sans Devanagari","Noto Sans",Arial,sans-serif;padding:26px 28px;font-size:13px;line-height:1.55;position:relative}
      .nb-pdf-head{border-bottom:3px solid #8f0e04;padding-bottom:14px;margin-bottom:18px}
      .nb-pdf-brand{font-size:12px;font-weight:800;color:#8f0e04;letter-spacing:.2px}
      .nb-pdf-title{font-size:24px;font-weight:900;margin:3px 0 2px}
      .nb-pdf-sub{font-size:12px;color:#475569}
      .nb-pdf-summary{margin-bottom:18px}
      .nb-pdf-review h2{font-size:19px;margin:18px 0 12px;color:#650a03}
      .review-card{break-inside:avoid;page-break-inside:avoid;border:1px solid #d9dee7;border-radius:10px;padding:13px;margin:0 0 12px;background:#fff}
      .question-image-wrap{break-inside:avoid;page-break-inside:avoid;text-align:center;margin:10px 0}
      .question-image{max-width:100%!important;max-height:300px!important;width:auto!important;height:auto!important;object-fit:contain}
      .exam-stimulus,.data-stimulus,.passage-stimulus{break-inside:avoid;page-break-inside:avoid}
      .nb-pdf-footer{margin-top:20px;padding-top:10px;border-top:1px solid #d9dee7;color:#64748b;font-size:10px;text-align:center}
      .result-actions{display:none!important}
    </style>
    <div class="nb-pdf-head"><div class="nb-pdf-brand">नारायण भण्डारी · लोकसेवा अनलाइन परीक्षा</div><div class="nb-pdf-title">परीक्षा Feedback Report</div><div class="nb-pdf-sub">Generated: ${esc(new Date().toLocaleString('ne-NP'))}</div></div>
    <div class="nb-pdf-summary">${d.summary}</div>
    <div class="nb-pdf-review">${d.review}</div>
    <div class="nb-pdf-footer">narayan-bhandari.com.np · यो Feedback Report अभ्यास परीक्षाको नतिजाका लागि हो।</div>`;

    // IMPORTANT: Do not move this node far off-screen or behind the page.
    // html2canvas can return a blank canvas on mobile when the source is at
    // left:-100000px / z-index:-1. Keep it in the normal document viewport
    // so the browser lays out Nepali text and images before capture.
    el.style.position='absolute';
    el.style.left='0';
    el.style.top=(window.scrollY||0)+'px';
    el.style.zIndex='2147483647';
    el.style.backgroundColor='#fff';
    el.style.pointerEvents='none';
    el.style.boxShadow='none';
    document.body.appendChild(el);

    // Force layout before html2canvas starts measuring the element.
    void el.offsetWidth;
    void el.offsetHeight;
    return el;
  }

  async function waitImages(el){
    const imgs=[...el.querySelectorAll('img')];
    await Promise.all(imgs.map(img=>new Promise(resolve=>{
      if(img.complete&&img.naturalWidth>0)return resolve();
      const done=()=>resolve();
      img.addEventListener('load',done,{once:true});
      img.addEventListener('error',done,{once:true});
      setTimeout(done,5000);
    })));
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  }

  function fileName(){
    const title=($('#resultSummary h2')?.textContent||'लोकसेवा परीक्षा').replace(/[^\u0900-\u097F\w\- ]+/g,'').trim().replace(/\s+/g,'-').slice(0,55)||'loksewa-exam';
    return `${title}-feedback.pdf`;
  }

  async function generatePDF(){
    await loadLib();
    const el=buildDocument();
    try{
      await waitImages(el);
      const width=el.scrollWidth||760;
      const height=el.scrollHeight||el.offsetHeight||1000;
      if(width<100||height<100)throw Error('Feedback content को layout तयार भएन।');

      return await html2pdf().set({
        margin:[8,8,10,8],
        filename:fileName(),
        image:{type:'jpeg',quality:.96},
        html2canvas:{
          scale:Math.min(2,Math.max(1,window.devicePixelRatio||1)),
          useCORS:true,
          allowTaint:false,
          backgroundColor:'#ffffff',
          logging:false,
          width:760,
          windowWidth:760,
          windowHeight:Math.max(height,1000),
          scrollX:0,
          scrollY:-(window.scrollY||0)
        },
        jsPDF:{unit:'mm',format:'a4',orientation:'portrait',compress:true},
        pagebreak:{mode:['css','legacy'],avoid:['.review-card','.question-image-wrap','.exam-stimulus','.data-stimulus','.passage-stimulus']}
      }).from(el).outputPdf('blob');
    }finally{
      if(el.parentNode)el.parentNode.removeChild(el);
    }
  }

  async function makePDF(){
    if(busy)return;
    busy=true;
    const btn=$('#pdfBtn');
    if(btn)btn.disabled=true;
    try{
      pdfBlob=await generatePDF();
      if(!pdfBlob||pdfBlob.size<1000)throw Error('PDF file खाली बनेको छ।');
      const name=fileName();
      const url=URL.createObjectURL(pdfBlob),a=document.createElement('a');
      a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),5000);
    }finally{
      if(btn)btn.disabled=false;
      busy=false;
    }
  }

  async function sharePDF(){
    if(busy)return;
    busy=true;
    const btn=$('#shareBtn');
    if(btn)btn.disabled=true;
    try{
      if(!pdfBlob)pdfBlob=await generatePDF();
      if(!pdfBlob||pdfBlob.size<1000)throw Error('PDF file खाली बनेको छ।');
      const file=new File([pdfBlob],fileName(),{type:'application/pdf'});
      if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
        try{await navigator.share({title:'लोकसेवा परीक्षा Feedback',text:'परीक्षा Feedback PDF',files:[file]});return}catch(e){if(e.name==='AbortError')return}
      }
      alert('यो browser मा direct PDF Share उपलब्ध छैन। पहिले PDF बनाउनुहोस्, त्यसपछि मोबाइलको Files/Share विकल्पबाट पठाउन सकिन्छ।');
    }finally{
      if(btn)btn.disabled=false;
      busy=false;
    }
  }

  function bind(){
    const pdf=$('#pdfBtn'),share=$('#shareBtn');
    if(pdf){const n=pdf.cloneNode(true);pdf.replaceWith(n);n.addEventListener('click',()=>makePDF().catch(e=>alert('PDF बनाउन सकिएन: '+e.message)))}
    if(share){const n=share.cloneNode(true);share.replaceWith(n);n.addEventListener('click',()=>sharePDF().catch(e=>alert('PDF Share गर्न सकिएन: '+e.message)))}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
