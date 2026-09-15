(()=>{
  function add(){
    if(document.querySelector('#onlineExamManagementCard')) return true;

    const anchor=document.querySelector('.admin-main');
    const summary=document.querySelector('.dashboard-summary');
    if(!anchor || !summary) return false;

    const s=document.createElement('section');
    s.className='admin-card online-exam-management-card';
    s.id='onlineExamManagementCard';
    s.innerHTML=`
      <div class="online-exam-management-inner">
        <div class="online-exam-management-copy">
          <div class="online-exam-management-icon" aria-hidden="true">📝</div>
          <div>
            <h2>Online Exam Management</h2>
            <p class="exam-bank-note">प्रश्न व्यवस्थापन, Question Bank, Level, परीक्षा सेटिङ, History र User Management</p>
          </div>
        </div>
        <a class="btn btn-primary online-exam-management-btn" href="exam-management.html">
          Open Exam Management <span aria-hidden="true">→</span>
        </a>
      </div>`;

    anchor.parentNode.insertBefore(s,anchor);
    return true;
  }

  function wait(){
    if(!add()) setTimeout(wait,300);
  }

  document.addEventListener('DOMContentLoaded',wait);
})();
