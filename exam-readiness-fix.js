(() => {
  const API = '/.netlify/functions/exam-api?action=';
  const $ = s => document.querySelector(s);
  const META = [
    { id: 'kharidar', title: 'खरिदार', description: 'खरिदार पदको लोकसेवा तयारी परीक्षा' },
    { id: 'nasu', title: 'नायब सुब्बा', description: 'नायब सुब्बा पदको लोकसेवा तयारी परीक्षा' },
    { id: 'sakha-adhikrit', title: 'शाखा अधिकृत', description: 'शाखा अधिकृत पदको लोकसेवा तयारी परीक्षा' }
  ];
  const esc = s => String(s ?? '').replace(/[&<>\"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[m]));
  async function config(id) {
    const r = await fetch(`${API}config&exam=${encodeURIComponent(id)}&_=${Date.now()}`, { cache:'no-store' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Error(d.error || 'Configuration load failed');
    return d;
  }
  function paint(rows) {
    const box = $('#examList');
    if (!box) return;
    const byId = new Map(rows.map(x => [x.exam?.id, x]));
    box.innerHTML = META.map(m => {
      const x = byId.get(m.id), e = x?.exam || m, ready = !!x?.ready;
      const count = e.questionCount ?? '—', duration = e.durationMinutes ?? '—';
      const status = !x ? 'जाँच हुँदैछ…' : ready ? 'पाठ्यक्रमअनुसार परीक्षा उपलब्ध' : 'परीक्षा तयारी हुँदैछ';
      return `<button class="exam-card ${x && !ready ? 'disabled' : ''}" data-id="${esc(m.id)}" type="button"><span>📚</span><h3>${esc(e.title || m.title)}</h3><p>${esc(e.description || m.description)}</p><b>${count} प्रश्न · ${duration} मिनेट</b><small>${esc(status)}</small></button>`;
    }).join('');
    box.querySelectorAll('.exam-card').forEach(b => b.onclick = () => window.chooseExam(b.dataset.id));
  }
  async function refresh() {
    const rows = [];
    await Promise.all(META.map(async m => { try { rows.push(await config(m.id)); } catch {} }));
    if (rows.length) paint(rows);
  }
  function patchChoose() {
    const original = window.chooseExam;
    if (typeof original !== 'function' || original.__syllabusPatched) return;
    const wrapped = async function(id) {
      try {
        const d = await config(id);
        if (!d.ready) {
          const r = d.readiness || {};
          const msg = r.ready && !d.ready
            ? 'पाठ्यक्रमअनुसार प्रश्न उपलब्ध छन्, तर अहिले प्रश्नपत्र तयार हुन सकेन। केही समयपछि फेरि प्रयास गर्नुहोस्।'
            : 'यो परीक्षा अहिले तयारी हुँदैछ। प्रश्नपत्र तयार भएपछि परीक्षा सञ्चालन हुनेछ।';
          alert(msg);
          return;
        }
      } catch (e) {
        alert('परीक्षा configuration लोड हुन सकेन। फेरि प्रयास गर्नुहोस्।');
        return;
      }
      return original.call(this, id);
    };
    wrapped.__syllabusPatched = true;
    window.chooseExam = wrapped;
  }
  function boot() { patchChoose(); refresh(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
