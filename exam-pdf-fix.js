/* Exam PDF v3.1 - stable canvas PDF + native mobile share */
(function(){
  const $=s=>document.querySelector(s);
  let busy=false;
  let lastBlob=null;
  const LIBS={canvas:'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',pdf:'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'};
  function load(src,test){if(test())return Promise.resolve();return new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(Error('PDF library load भएन।'));document.head.appendChild(s);});}
  async function libs(){await load(LIBS.canvas,()=>!!window.html2canvas);await load(LIBS.pdf,()=>!!window.jspdf?.jsPDF);}
  function fileName(){
    const t=($('#resultSummary h2')?.textContent||'लोकसेवा परीक्षा').replace(/[^\u0900-\u097F\w\- ]+/g,'').trim().replace(/\s+/g,'-').slice(0,55);
    return `${t||'loksewa-exam'}-feedback.pdf`;
  }
  function source(){
    const r=$('#result'),s=$('#resultSummary'),v=$('#review');
    if(!r||!s||!v||r.hidden||!s.innerText.trim()||!v.innerText.trim())throw Error('Feedback result भेटिएन।');
    return r;
  }
  async function generate(){
    await libs();
    const target=source();
    const actions=target.querySelector('.result-actions');
    const old={width:target.style.width,maxWidth:target.style.maxWidth,background:target.style.backgroundColor,boxSizing:target.style.boxSizing,overflow:target.style.overflow};
    const oldAction=actions?actions.style.display:'';
    try{
      target.style.width='760px';target.style.maxWidth='760px';target.style.backgroundColor='#fff';target.style.boxSizing='border-box';target.style.overflow='visible';
      if(actions)actions.style.display='none';
      target.scrollIntoView({block:'start',behavior:'auto'});
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const canvas=await html2canvas(target,{
        scale:Math.min(2,Math.max(1.5,window.devicePixelRatio||1.5)),
        useCORS:true,allowTaint:false,backgroundColor:'#fff',logging:false,
        windowWidth:760,scrollX:0,scrollY:0,
        imageTimeout:15000,
        onclone:(doc)=>{
          const c=doc.querySelector('#result');
          if(c){c.hidden=false;c.style.display='block';c.style.visibility='visible';c.style.opacity='1';c.style.position='relative';c.style.width='760px';c.style.maxWidth='760px';c.style.overflow='visible';}
          doc.querySelectorAll('.result-actions').forEach(x=>x.style.display='none');
          doc.querySelectorAll('img').forEach(img=>{img.style.maxWidth='100%';img.style.height='auto';});
        }
      });
      if(!canvas||canvas.width<100||canvas.height<100)throw Error('Feedback को canvas तयार भएन।');
      const {jsPDF}=window.jspdf;
      const pdf=new jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true});
      const margin=8,pageW=210,pageH=297,usableW=pageW-margin*2,usableH=pageH-margin*2;
      const pxPerPage=Math.max(1,Math.floor(canvas.width*(usableH/usableW)));
      let y=0,page=0;
      while(y<canvas.height){
        const sliceH=Math.min(pxPerPage,canvas.height-y);
        const slice=document.createElement('canvas');slice.width=canvas.width;slice.height=Math.max(1,Math.ceil(sliceH));
        const ctx=slice.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,slice.width,slice.height);ctx.drawImage(canvas,0,y,canvas.width,sliceH,0,0,canvas.width,slice.height);
        if(page)pdf.addPage();
        const img=slice.toDataURL('image/jpeg',.95);const h=usableW*(slice.height/slice.width);
        pdf.addImage(img,'JPEG',margin,margin,usableW,Math.min(usableH,h),undefined,'FAST');
        y+=sliceH;page++;
      }
      const blob=pdf.output('blob');
      if(!blob||blob.size<1000)throw Error('PDF file खाली बनेको छ।');
      lastBlob=blob;
      return blob;
    }finally{
      target.style.width=old.width;target.style.maxWidth=old.maxWidth;target.style.backgroundColor=old.background;target.style.boxSizing=old.boxSizing;target.style.overflow=old.overflow;
      if(actions)actions.style.display=oldAction;
    }
  }
  function download(blob){
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=fileName();document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
  }
  async function sharePDF(){
    if(!lastBlob)lastBlob=await generate();
    const file=new File([lastBlob],fileName(),{type:'application/pdf'});
    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({title:'लोकसेवा Feedback PDF',text:'लोकसेवा परीक्षाको Feedback PDF',files:[file]});return true;}catch(e){if(e?.name==='AbortError')return true;}
    }
    download(lastBlob);
    alert('यस device/browser मा direct PDF Share उपलब्ध नभएकाले PDF डाउनलोड गरियो। डाउनलोड भएको PDF लाई Files/Chrome बाट Share गर्न सकिन्छ।');
    return false;
  }
  function bind(){
    const b=$('#pdfBtn');
    if(b){const n=b.cloneNode(true);b.replaceWith(n);n.addEventListener('click',async()=>{if(busy)return;busy=true;n.disabled=true;try{const blob=await generate();download(blob)}catch(e){alert('PDF बनाउन सकिएन: '+e.message)}finally{n.disabled=false;busy=false}})}
    const s=$('#shareBtn');
    if(s){const n=s.cloneNode(true);s.replaceWith(n);n.addEventListener('click',async()=>{if(busy)return;busy=true;n.disabled=true;try{await sharePDF()}catch(e){alert('PDF Share गर्न सकिएन: '+e.message)}finally{n.disabled=false;busy=false}})}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();