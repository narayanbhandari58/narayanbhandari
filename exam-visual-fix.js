/* Pictorial display layer: show the question-specific PNG and simple A/B/C/D answer choices. */
(function(){
  const card=()=>document.getElementById('questionCard');
  function style(){
    const c=card(); if(!c) return;
    c.querySelectorAll('.question-image-wrap img').forEach(img=>{
      img.loading='eager';img.decoding='async';img.style.display='block';img.style.width='100%';img.style.height='auto';img.style.maxWidth='1100px';img.style.margin='10px auto';img.style.objectFit='contain';img.style.borderRadius='14px';
    });
    c.querySelectorAll('.question-image-wrap').forEach(w=>{w.style.width='100%';w.style.maxWidth='1100px';w.style.margin='12px auto';w.style.overflow='hidden';});
  }
  function pictorialOptions(){
    const c=card();if(!c||!c.querySelector('.question-image-wrap'))return;
    c.querySelectorAll('.options .option').forEach((btn,index)=>{
      if(btn.dataset.pictorialLabelOnly==='1')return;
      const letter=String.fromCharCode(65+index);
      btn.dataset.pictorialLabelOnly='1';
      btn.setAttribute('aria-label',letter);
      btn.innerHTML=`<span class="pictorial-option-letter-only">${letter}</span>`;
      btn.style.display='flex';
      btn.style.alignItems='center';
      btn.style.justifyContent='flex-start';
      btn.style.gap='12px';
      btn.style.minHeight='58px';
      btn.style.padding='14px 18px';
      btn.style.fontSize='1.05rem';
      btn.style.fontWeight='800';
    });
  }
  const c=card();
  if(c){new MutationObserver(()=>requestAnimationFrame(()=>{style();pictorialOptions();})).observe(c,{childList:true,subtree:true});style();pictorialOptions();}
})();
