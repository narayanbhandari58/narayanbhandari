/* Exam PDF v3.0 - direct canvas -> jsPDF renderer */
(function(){
  const $=s=>document.querySelector(s);
  let busy=false;
  const LIBS={canvas:'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',pdf:'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'};
  function load(src,test){if(test())return Promise.resolve();return new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(Error('PDF library load भएन।'));document.head.appendChild(s);});}
  async function libs(){await load(LIBS.canvas,()=>!!window.html2canvas);await load(LIBS.pdf,()=>!!window.jspdf?.jsPDF);}
  function filename(){return 'loksewa-feedback.pdf';}
  function source(){const r=$('#result'),s=$('#resultSummary'),v=$('#review');if(!r||!s||!v||r.hidden||!s.innerText.trim()||!v.innerText.trim())throw Error('Feedback result भेटिएन।');return r;}
  async function generate(){
    await libs();
    const target=source();
    const actions=target.querySelector('.result-actions');
    const old={width:target.style.width,maxWidth:target.style.maxWidth,background:target.style.backgroundColor,boxSizing:target.style.boxSizing};
    const oldAction=actions?actions.style.display:'';
    try{
      target.style.width='760px';target.style.maxWidth='760px';target.style.backgroundColor='#fff';target.style.boxSizing='border-box';
      if(actions)actions.style.display='none';
      target.scrollIntoView({block:'start',behavior:'auto'});
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const canvas=await html2canvas(target,{scale:1.5,useCORS:true,allowTaint:false,backgroundColor:'#fff',logging:false,windowWidth:760,scrollX:0,scrollY:0});
      if(!canvas||canvas.width<50||canvas.height<50)throw Error('Feedback को canvas तयार भएन।');
      const {jsPDF}=window.jspdf;
      const pdf=new jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true});
      const margin=8,pageW=210,pageH=297,usableW=pageW-margin*2,usableH=pageH-margin*2;
      const pxPerPage=canvas.width*(usableH/usableW);
      let y=0,page=0;
      while(y<canvas.height){
        const sliceH=Math.min(pxPerPage,canvas.height-y);
        const slice=document.createElement('canvas');slice.width=canvas.width;slice.height=Math.ceil(sliceH);
        const ctx=slice.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,slice.width,slice.height);ctx.drawImage(canvas,0,y,canvas.width,sliceH,0,0,canvas.width,sliceH);
        if(page)pdf.addPage();
        const img=slice.toDataURL('image/jpeg',.94);const h=usableW*(slice.height/slice.width);
        pdf.addImage(img,'JPEG',margin,margin,usableW,h,undefined,'FAST');
        y+=sliceH;page++;
      }
      const blob=pdf.output('blob');
      if(!blob||blob.size<1000)throw Error('PDF file खाली बनेको छ।');
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename();document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
    }finally{
      target.style.width=old.width;target.style.maxWidth=old.maxWidth;target.style.backgroundColor=old.background;target.style.boxSizing=old.boxSizing;
      if(actions)actions.style.display=oldAction;
    }
  }
  function bind(){
    const b=$('#pdfBtn');if(b){const n=b.cloneNode(true);b.replaceWith(n);n.addEventListener('click',async()=>{if(busy)return;busy=true;n.disabled=true;try{await generate()}catch(e){alert('PDF बनाउन सकिएन: '+e.message)}finally{n.disabled=false;busy=false}})}
    const s=$('#shareBtn');if(s){const n=s.cloneNode(true);s.replaceWith(n);n.addEventListener('click',()=>alert('पहिले PDF बनाउनुहोस्। त्यसपछि डाउनलोड भएको PDF लाई Chrome/Files बाट Share गर्न सकिन्छ।'))}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();