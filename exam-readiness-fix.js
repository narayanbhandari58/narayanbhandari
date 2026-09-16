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
  function shortageText(r) {
    const parts = [];
    (r?.shortages || []).slice(0, 4).forEach(x => {
      parts.push(`${x.unit || '—'} मा ${x.missing} प्रश्न कम`);
    });
    (r?.levelShortages || []).slice(0, 2).forEach(x => {
      if (x.missingLevel1) parts.push(`${x.sectionTitle || x.section} मा Level 1 का ${x.missingLevel1} कम`);
      if (x.missingLevel2) parts.push(`${x.sectionTitle || x.section} मा Level 2 का ${x.missingLevel2} कम`);
    });
    return parts.length ? ` (${parts.join(' · ')})` : '';
  }
  function paint(rows) {
    const box = $('#examList');
    if (!box) return;
    const byId = new Map(rows.map(x => [x.exam?.id, x]));
    box.innerHTML = META.map(m => {
      const x = byId.get(m.id), e = x?.exam || m, ready = !!x?.ready;
      const count = e.questionCount ?? '—', duration = e.durationMinutes ?? '—';
      const status = !x ? 'जाँच हुँदैछ…' : ready ? 'पाठ्यक्रमअनुसार परीक्षा उपलब्ध' : `पाठ्यक्रमका सबै Unit/Level अझै पूरा छैनन्${shortageText(x.readiness)}`;
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
            ? 'Syllabus अनुसार प्रश्न उपलब्ध छन्, तर प्रश्नपत्र निर्माणमा समस्या आयो। फेरि प्रयास गर्नुहोस्।'
            : `यस परीक्षाको आवश्यक Unit/Section/Level संयोजन अझै पूरा भएको छैन।${shortageText(r)}\n\nQuestion Bank को कुल संख्या आधार मानेर परीक्षा रोकिएको होइन।`;
          alert(msg);
          return;
        }
      } catch (e) {
        alert(e.message || 'परीक्षा configuration लोड भएन।');
        return;
      }
      return original.call(this, id);
    };
    wrapped.__syllabusPatched = true;
    window.chooseExam = wrapped;
  }
  function boot() {
    patchChoose();
    refresh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
