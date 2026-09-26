const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');
const { allow, cleanup } = require('./security-rate-limit');
const REPO = process.env.GITHUB_REPO || 'narayanbhandari58/narayanbhandari';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN;
const SECRET = process.env.ADMIN_JWT_SECRET;
const GH = 'https://api.github.com';
const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/exam-data.json`;
const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }, body: JSON.stringify(body) });
function b64(s) { return Buffer.from(s).toString('base64url') }
function unb(s) { return Buffer.from(s, 'base64url').toString() }
function verify(t) {
  if (!t || !SECRET) return null;
  try {
    const [h, p, s] = String(t).split('.');
    if (!h || !p || !s) return null;
    const expected = b64(crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest());
    const good = expected.length === s.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(s));
    const o = JSON.parse(unb(p));
    return good && o.sub && o.exp >= Date.now() / 1000 ? o : null;
  } catch { return null }
}
function isAdmin(e) { return verify((e.headers?.authorization || '').replace(/^Bearer\s+/i, '')) }
function signAttempt(payload) {
  if (!SECRET) throw Error('ADMIN_JWT_SECRET is not configured');
  const h = b64(JSON.stringify({ alg: 'HS256', typ: 'NB-EXAM' }));
  const p = b64(JSON.stringify(payload));
  const s = b64(crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest());
  return `${h}.${p}.${s}`;
}
function verifyAttempt(t) {
  if (!t || !SECRET) return null;
  try {
    const [h, p, s] = String(t).split('.');
    if (!h || !p || !s) return null;
    const expected = b64(crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest());
    if (expected.length !== s.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(s))) return null;
    const o = JSON.parse(unb(p));
    return o.type === 'exam-attempt' && o.attemptId && o.examId && Array.isArray(o.questionIds) && Number(o.expiresAt) + 5000 > Date.now() ? o : null;
  } catch { return null }
}

async function gh(path, opt = {}) { if (!TOKEN) throw Error('GITHUB_TOKEN is not configured'); const r = await fetch(`${GH}/repos/${REPO}/contents/${path}`, { ...opt, headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json', ...(opt.headers || {}) } }); const d = await r.json(); if (!r.ok) throw Error(d.message || 'GitHub request failed'); return d }
async function readData() {
  // Public exam configuration must not depend on the admin GitHub token.
  // The published exam-data.json and maintained seed files are public inputs.
  const rawRes = await fetch(RAW, { cache: 'no-store' });
  if (!rawRes.ok) throw Error(`Question bank load failed (${rawRes.status})`);
  const data = await rawRes.json();

  // Keep the maintained visual/data question pools available to the live exam.
  // If an ID already exists in exam-data.json, the CMS version wins.
  const seedPaths = [
    'exam-question-seed/branch-officer-2.2-nonverbal-pictorial.json',
    'exam-question-seed/branch-officer-2.2-triangle-counting.json',
    'exam-question-seed/branch-officer-2.5-data-interpretation.json',
    'exam-question-seed/cross-exam-transfer.json'
  ];
  const existing = new Set((data.questions || []).map(q => String(q.id || '')));
  const seedResults = await Promise.all(seedPaths.map(async path => {
    try {
      const r = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/${path}`, { cache: 'no-store' });
      return r.ok ? await r.json() : [];
    } catch (_) { return []; }
  }));
  for (const seed of seedResults.flat()) {
    const id = String(seed?.id || '');
    if (!id) continue;
    if (!existing.has(id)) {
      data.questions.push(seed);
      existing.add(id);
      continue;
    }

    // Maintained seed metadata can extend an existing CMS question without
    // overwriting explicitly edited content. Cross-exam placement is merged
    // separately so one question can legally belong to different syllabus
    // units in different exams while retaining a single question ID.
    const current = data.questions.find(q => String(q?.id || '') === id);
    if (!current) continue;
    for (const key of ['image', 'imageUrl', 'image_url', 'imageAlt', 'image_alt', 'figure']) {
      if ((current[key] == null || String(current[key]).trim() === '') && seed[key] != null && String(seed[key]).trim() !== '') {
        current[key] = seed[key];
      }
    }
    if (seed.examIds && Array.isArray(seed.examIds)) {
      current.examIds = [...new Set([...(current.examIds || []), ...seed.examIds])];
    }
    if (seed.examMappings && typeof seed.examMappings === 'object') {
      current.examMappings = { ...(current.examMappings || {}), ...seed.examMappings };
    }
  }
  return { sha: null, data };
}
async function writeData(data, sha) { return gh('exam-data.json', { method: 'PUT', body: JSON.stringify({ message: 'Update Loksewa exam question bank', content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'), branch: BRANCH, sha }) }) }
function groupIdOf(q) { if (q?.groupId) return String(q.groupId); const raw = String(q?.passage || q?.data || q?.figure || '').trim(); if (!raw) return ''; const basis = `${q?.unit || ''}|${q?.type || ''}|${raw}`; return `g-${crypto.createHash('sha1').update(basis).digest('hex').slice(0, 10)}` }
function questionImage(q) {
  const raw = q?.image || q?.imageUrl || q?.image_url || '';
  if (raw) return raw;
  const id = String(q?.id || '').trim();
  if (q?.type === 'pictorial' && /^bo-2\.2-\d{3}$/.test(id)) {
    // Static raw asset is the first fallback; the image function remains available
    // for deployments where repository assets are not directly served.
    return `https://raw.githubusercontent.com/${REPO}/${BRANCH}/image/exam/branch-officer-2.2/${id}.png?v=5`;
  }
  return '';
}
function repairedQuestion(q) {
  const x = { ...q };
  const text = String(x.q || x.question || '').trim().toLowerCase();
  if (!String(x.data || x.figure || '').trim() && text === 'weighted average annual return?') {
    x.data = 'Investment: A40 at10%; B35 at8%; C25 at7%.';
    x.solution = 'Weighted average = (40×10 + 35×8 + 25×7) ÷ 100 = 8.75%, which rounds to 8.8%.';
    x.correct = 0;
    x.type = 'table';
    x.topic = x.topic || 'Weighted Average';
  }
  return x;
}
function stimulusForQuestion(q, bank) {
  const x = repairedQuestion(q);
  const gid = groupIdOf(x);
  const sameGroup = gid && Array.isArray(bank)
    ? bank.find(item => String(groupIdOf(item)) === String(gid) && item !== q)
    : null;
  const source = sameGroup || {};
  return {
    ...x,
    image: String(x.image || x.imageUrl || x.image_url || '').trim() || String(source.image || source.imageUrl || source.image_url || '').trim(),
    imageAlt: x.imageAlt || x.image_alt || source.imageAlt || source.image_alt || x.topic || source.topic || 'प्रश्नचित्र',
    passage: x.passage || source.passage || '',
    figure: x.figure || source.figure || '',
    data: x.data || source.data || ''
  };
}
function publicQuestion(q, bank) {
  const x = stimulusForQuestion(q, bank);
  return { id: x.id, examIds: x.examIds, section: x.section, unit: x.unit, subject: x.subject, topic: x.topic, category: x.category, level: x.level, type: x.type, format: x.format, q: x.q || x.question, options: x.options, image: questionImage(x), imageAlt: x.imageAlt || x.image_alt || x.topic || 'प्रश्नचित्र', passage: x.passage || '', figure: x.figure || '', data: x.data || '', groupId: groupIdOf(x) }
}
function shuffle(a) { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]] } return x }
function userQuery(p) { return String(p.get('user') || p.get('q') || '').trim().toLowerCase(); }
function matchesUser(x, query) {
  if (!query) return true;
  const c = x?.candidate || {};
  return [c.name, c.email, c.whatsapp, x?.userId, x?.username].some(v => String(v || '').toLowerCase().includes(query));
}
function blobStore() { const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID; const token = process.env.NETLIFY_API_TOKEN || process.env.NETLIFY_AUTH_TOKEN || process.env.NETLIFY_TOKEN; return siteID && token ? getStore('exam-attempts', { siteID, token }) : getStore('exam-attempts') }
async function attempts() { const store = blobStore(), out = []; let cursor; do { const r = await store.list(cursor ? { cursor } : {}); for (const b of (r.blobs || [])) { try { const x = await store.get(b.key, { type: 'json' }); if (x?.submittedAt && x?.examId && Array.isArray(x?.review)) out.push(x) } catch {} } cursor = r.cursor } while (cursor); return out.sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt))) }
function levelOf(q) { const v = String(q.level ?? '').toLowerCase(); if (v === 'level1' || v === 'l1' || v === 'i' || v === '1') return 'level1'; if (v === 'level2' || v === 'l2' || v === 'ii' || v === '2') return 'level2'; return v }
function unitMatches(q, u) { const a = String(q.unit ?? ''); const b = String(u ?? ''); return a === b || a.startsWith(b + '.') }
function stimulusKey(q) { if (q.groupId) return `group:${q.groupId}`; if (q.passage) return `passage:${q.passage}`; if (q.figure) return `figure:${q.figure}`; if (q.data) return `data:${q.data}`; return '' }
function hasRequiredPictorialImage(q) { return q.type !== 'pictorial' || !!questionImage(q) }
function eligibleQuestions(exam, questions) {
  return questions.filter(q => {
    const mapped = q?.examMappings?.[exam.id];
    return (Array.isArray(q.examIds) && q.examIds.includes(exam.id)) || !!mapped;
  }).map(q => {
    const mapped = q?.examMappings?.[exam.id];
    return mapped ? { ...q, ...mapped, examIds: q.examIds || [] } : q;
  });
}
function unitPlan(exam) { return (exam.blueprint?.sections || []).flatMap(s => (s.units || []).map(u => ({ ...u, sectionId: s.id, sectionTitle: s.title }))) }
function readinessReport(exam, bank) {
  const usable = bank.filter(hasRequiredPictorialImage), plan = unitPlan(exam), shortages = [], levelShortages = [];
  const requiredPaperCount = Number(exam.questionCount || 0);
  if (!plan.length) {
    const missing = Math.max(0, requiredPaperCount - usable.length);
    return { ready: missing === 0, requiredPaperCount, mappedQuestions: bank.length, usableQuestions: usable.length, shortages: missing ? [{ section: '', unit: '', required: requiredPaperCount, available: usable.length, missing }] : [], levelShortages: [] };
  }
  for (const u of plan) {
    const pool = usable.filter(q => q.section === u.sectionId && unitMatches(q, u.id));
    const required = Number(u.questionCount || 0), available = pool.length;
    if (available < required) shortages.push({ section: u.sectionId, sectionTitle: u.sectionTitle, unit: u.id, required, available, missing: required - available });
  }
  for (const s of (exam.blueprint?.sections || [])) {
    const d = s.levelDistribution; if (!d) continue;
    const q = usable.filter(x => x.section === s.id), a1 = q.filter(x => levelOf(x) === 'level1').length, a2 = q.filter(x => levelOf(x) === 'level2').length;
    const r1 = Number(d.level1 || 0), r2 = Number(d.level2 || 0);
    if (a1 < r1 || a2 < r2) levelShortages.push({ section: s.id, sectionTitle: s.title, requiredLevel1: r1, availableLevel1: a1, missingLevel1: Math.max(0, r1 - a1), requiredLevel2: r2, availableLevel2: a2, missingLevel2: Math.max(0, r2 - a2) });
  }
  return { ready: shortages.length === 0 && levelShortages.length === 0, requiredPaperCount, mappedQuestions: bank.length, usableQuestions: usable.length, shortages, levelShortages };
}
function blueprintReady(exam, bank) { return readinessReport(exam, bank).ready }
function chooseLevelCounts(units, targetL1) {
  const dp = new Map([[0, []]]);
  for (let i = 0; i < units.length; i++) {
    const next = new Map();
    for (const [sum, picks] of dp) {
      const u = units[i], lo = Math.max(0, u.need - u.l2), hi = Math.min(u.need, u.l1);
      for (let x = lo; x <= hi; x++) { const ns = sum + x; if (ns <= targetL1 && !next.has(ns)) next.set(ns, [...picks, x]); }
    }
    dp.clear(); for (const [k, v] of next) dp.set(k, v);
  }
  return dp.get(Number(targetL1)) || null;
}
function validateSelectedPaper(exam, paper) {
  const expectedTotal = Number(exam.questionCount || 0);
  if (!Array.isArray(paper) || paper.length !== expectedTotal || new Set(paper.map(q => q.id)).size !== paper.length) return false;
  const plan = unitPlan(exam);
  if (!plan.length) return true;
  for (const u of plan) {
    const n = paper.filter(q => q.section === u.sectionId && unitMatches(q, u.id)).length;
    if (n !== Number(u.questionCount || 0)) return false;
  }
  for (const section of (exam.blueprint?.sections || [])) {
    const d = section.levelDistribution;
    if (!d) continue;
    const sb = paper.filter(q => q.section === section.id);
    const l1 = sb.filter(q => levelOf(q) === 'level1').length;
    const l2 = sb.filter(q => levelOf(q) === 'level2').length;
    if (l1 !== Number(d.level1 || 0) || l2 !== Number(d.level2 || 0)) return false;
  }
  return true;
}
function selectPaper(exam, bank) {
  const usableBank = bank.filter(hasRequiredPictorialImage), plan = unitPlan(exam);
  if (!plan.length) {
    const paper = orderByStimulus(shuffle(usableBank).slice(0, Number(exam.questionCount || 0)));
    return validateSelectedPaper(exam, paper) ? paper : null;
  }

  const selected = [], used = new Set(), add = q => {
    if (!q || used.has(q.id)) return false;
    used.add(q.id); selected.push(q); return true;
  };

  // When a blueprint unit contains image-backed pictorial questions, make sure
  // the generated paper actually contains at least one of them. This is
  // especially important for Branch Officer B/2.2: having pictorial questions
  // in the pool is not enough; a candidate must be able to see one in the paper.
  function chooseFromLevel(pool, count, forcePictorial) {
    if (count <= 0) return [];
    const shuffled = shuffle(pool);
    if (!forcePictorial) return shuffled.slice(0, count);
    const pictorial = shuffled.filter(q => q.type === 'pictorial');
    if (!pictorial.length) return null;
    const first = pictorial[0];
    const rest = shuffled.filter(q => q.id !== first.id);
    return [first, ...rest.slice(0, count - 1)];
  }

  for (const section of (exam.blueprint?.sections || [])) {
    const units = (section.units || []).map(u => {
      const pool = usableBank.filter(q => q.section === section.id && unitMatches(q, u.id) && !used.has(q.id));
      return {
        id: u.id,
        need: Number(u.questionCount || 0),
        pool,
        l1: pool.filter(q => levelOf(q) === 'level1').length,
        l2: pool.filter(q => levelOf(q) === 'level2').length,
        hasPictorial: pool.some(q => q.type === 'pictorial')
      };
    });
    const d = section.levelDistribution;
    let counts = null;
    if (d) counts = chooseLevelCounts(units, Number(d.level1 || 0));
    if (d && !counts) return null;

    for (let i = 0; i < units.length; i++) {
      const u = units[i], need = u.need;
      if (u.pool.length < need) return null;

      let n1 = d ? counts[i] : 0, n2 = d ? need - n1 : 0;
      const l1 = shuffle(u.pool.filter(q => levelOf(q) === 'level1'));
      const l2 = shuffle(u.pool.filter(q => levelOf(q) === 'level2'));
      let chosen = [];

      if (d) {
        if (l1.length < n1 || l2.length < n2) return null;

        // Prefer a pictorial item inside the exact level quota whenever this
        // unit has pictorial questions. If no pictorial exists in either
        // selected level, fail rather than silently producing a non-pictorial
        // paper for a unit that is meant to contain visual questions.
        const pictorialL1 = l1.some(q => q.type === 'pictorial');
        const pictorialL2 = l2.some(q => q.type === 'pictorial');
        if (u.hasPictorial && !((n1 > 0 && pictorialL1) || (n2 > 0 && pictorialL2))) return null;

        const c1 = chooseFromLevel(l1, n1, u.hasPictorial && n1 > 0 && pictorialL1);
        const c2 = chooseFromLevel(l2, n2, !c1?.some(q => q.type === 'pictorial') && u.hasPictorial && n2 > 0 && pictorialL2);
        if (c1 === null || c2 === null) return null;
        chosen = [...c1, ...c2];
      } else {
        chosen = chooseFromLevel(u.pool, need, u.hasPictorial);
        if (chosen === null) return null;
      }

      chosen = shuffle(chosen);
      if (chosen.length !== need || chosen.some(q => !add(q))) return null;
    }
  }

  if (!validateSelectedPaper(exam, selected)) return null;
  return orderByStimulus(selected);
}
function orderByStimulus(items) { const groups = new Map(), singles = []; for (const q of items) { const key = stimulusKey(q); if (!key) { singles.push(q); continue } if (!groups.has(key)) groups.set(key, []); groups.get(key).push(q) } return shuffle([...groups.values()]).flatMap(g => g).concat(shuffle(singles)) }
function safeImageName(name) { return String(name || 'question-image').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'question-image' }
async function uploadImage(body) { const allowed = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }; const mime = String(body.type || '').toLowerCase(); if (!allowed[mime]) throw Error('JPG, PNG, WEBP वा GIF चित्र मात्र अपलोड गर्न मिल्छ।'); let raw = String(body.data || ''); if (raw.includes(',')) raw = raw.slice(raw.indexOf(',') + 1); raw = raw.replace(/\s/g, ''); const bytes = Buffer.from(raw, 'base64'); if (!bytes.length) throw Error('चित्र खाली छ।'); if (bytes.length > 4 * 1024 * 1024) throw Error('चित्रको अधिकतम आकार 4 MB हो।'); const base = safeImageName(body.name).replace(/\.[a-z0-9]{1,5}$/, ''); const path = `image/uploads/exam-${Date.now()}-${base}.${allowed[mime]}`; await gh(path, { method: 'PUT', body: JSON.stringify({ message: `Upload exam question image: ${path.split('/').pop()}`, content: bytes.toString('base64'), branch: BRANCH }) }); return { path, url: `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${path}` } }
exports.handler = async event => {
  cleanup();
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  try {
    const actionForLimit = new URLSearchParams(event.rawQuery || '').get('action') || 'config';
    const limits = { config: [30, 60_000], submit: [8, 10 * 60_000], 'upload-image': [10, 10 * 60_000], 'admin-data': [20, 60_000], 'admin-history': [20, 60_000], 'admin-users': [20, 60_000], 'delete-user': [10, 10 * 60_000], 'save-data': [10, 60_000] };
    const [limit, windowMs] = limits[actionForLimit] || [20, 60_000];
    if (!allow(event, `exam-api:${actionForLimit}`, limit, windowMs)) return json(429, { error: 'धेरै requests पठाइयो। केही बेरपछि फेरि प्रयास गर्नुहोस्।' });
    const p = new URLSearchParams(event.rawQuery || '');
    const action = p.get('action') || 'config';
    const body = event.body ? JSON.parse(event.body) : {};
    if (action === 'upload-image') { if (!isAdmin(event)) return json(401, { error: 'Admin login आवश्यक छ' }); return json(200, { ok: true, ...await uploadImage(body) }) }
    const { data } = await readData();
    if (action === 'config') {
      const exam = data.exams.find(x => x.id === (p.get('exam') || body.examId) && x.enabled !== false);
      if (!exam) return json(404, { error: 'परीक्षा भेटिएन' });
      const bank = eligibleQuestions(exam, data.questions), readiness = readinessReport(exam, bank);
      const paper = readiness.ready ? selectPaper(exam, bank) : null;
      const finalReady = !!paper;
      return json(200, { exam, blueprint: exam.blueprint || null, availableQuestions: readiness.usableQuestions, readiness: { ...readiness, ready: finalReady || readiness.ready }, ready: finalReady, questions: (paper || []).map(q => publicQuestion(q, bank)) });
    }
    if (action === 'start') {
      if (typeof body !== 'object' || !body) return json(400, { error: 'Invalid request' });
      const exam = data.exams.find(x => x.id === body.examId && x.enabled !== false);
      if (!exam) return json(404, { error: 'परीक्षा भेटिएन' });
      // The server is authoritative for the paper. Never trust the client's
      // questionIds to decide which questions an attempt contains.
      const eligible = eligibleQuestions(exam, data.questions);
      const paper = selectPaper(exam, eligible);
      if (!paper || paper.length !== Number(exam.questionCount || 0) || !paper.every(hasRequiredPictorialImage) || !validateSelectedPaper(exam, paper)) {
        return json(409, { error: 'परीक्षाको मान्य प्रश्नपत्र तयार हुन सकेन। केही बेरपछि फेरि प्रयास गर्नुहोस्।' });
      }
      const ids = paper.map(q => String(q.id));
      const now = Date.now(), durationMs = Number(exam.durationMinutes || 0) * 60_000;
      if (!durationMs) return json(500, { error: 'परीक्षाको समय configuration गलत छ।' });
      const attemptId = `attempt-${now}-${crypto.randomBytes(5).toString('hex')}`;
      const payload = {
        type: 'exam-attempt', attemptId, examId: exam.id, questionIds: ids,
        startedAt: now, expiresAt: now + durationMs
      };
      await blobStore().set(`active:${attemptId}`, JSON.stringify(payload), { metadata: { examId: exam.id, expiresAt: String(payload.expiresAt) } });
      return json(200, {
        ok: true, attemptId, attemptToken: signAttempt(payload), startedAt: now, expiresAt: payload.expiresAt,
        exam, questions: paper.map(q => publicQuestion(q, eligible))
      });
    }
    if (action === 'submit') {
      if (typeof body !== 'object' || !body) return json(400, { error: 'Invalid request' });
      const exam = data.exams.find(x => x.id === body.examId && x.enabled !== false);
      if (!exam) return json(404, { error: 'परीक्षा भेटिएन' });
      const attempt = verifyAttempt(body.attemptToken);
      if (!attempt || attempt.examId !== exam.id) return json(401, { error: 'Exam session मान्य छैन वा समय सकिएको छ। परीक्षा फेरि सुरु गर्नुहोस्।' });
      const activeKey = `active:${attempt.attemptId}`;
      const active = await blobStore().get(activeKey, { type: 'json' }).catch(() => null);
      if (!active) return json(409, { error: 'यो exam session पहिले नै बुझाइएको वा समाप्त भएको छ।' });
      if (Number(active.expiresAt) + 5000 <= Date.now()) { await blobStore().delete(activeKey).catch(() => {}); return json(409, { error: 'परीक्षाको समय सकिएको छ।' }); }
      const eligible = eligibleQuestions(exam, data.questions), bank = new Map(eligible.map(q => [String(q.id), q]));
      const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
      const ids = attempt.questionIds.map(String);
      if (ids.length !== Number(exam.questionCount || 0)) return json(409, { error: `यस परीक्षाका लागि ${exam.questionCount} प्रश्न चाहिन्छ।` });
      if (new Set(ids).size !== ids.length) return json(409, { error: 'प्रश्नपत्रमा दोहोरिएका प्रश्न भेटिए। फेरि परीक्षा सुरु गर्नुहोस्।' });
      let correct = 0, wrong = 0, skipped = 0; const review = [];
      for (const id of ids) {
        const q = bank.get(id); if (!q) continue;
        const raw = answers[id], selected = Number.isInteger(raw) ? raw : null;
        if (selected !== null && (selected < 0 || selected >= (Array.isArray(q.options) ? q.options.length : 0))) return json(400, { error: 'Invalid answer option' });
        if (selected === null) skipped++; else if (selected === q.correct) correct++; else wrong++;
        const rq = stimulusForQuestion(q, eligible);
        review.push({ id: rq.id, q: rq.q || rq.question, options: rq.options, selected, correct: rq.correct, type: rq.type, format: rq.format || '', section: rq.section || '', unit: rq.unit || '', subject: rq.subject, topic: rq.topic, level: rq.level || '', image: questionImage(rq), imageAlt: rq.imageAlt || rq.image_alt || rq.topic || 'प्रश्नचित्र', passage: rq.passage || '', figure: rq.figure || '', data: rq.data || '', groupId: groupIdOf(rq), explanation: rq.explanation || '', solution: rq.solution || '' });
      }
      if (review.length !== Number(exam.questionCount || 0)) return json(409, { error: 'Question Bank मा आवश्यक सबै प्रश्न उपलब्ध छैनन्।' });
      const score = Number((correct * Number(exam.positiveMark || 1) - wrong * Number(exam.negativeMark || .2)).toFixed(2)), maxScore = review.length * Number(exam.positiveMark || 1), percent = maxScore ? Number((score / maxScore * 100).toFixed(2)) : 0;
      const result = { attemptId: `attempt-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`, examId: exam.id, examTitle: exam.title, stage: exam.stage || 'Stage-I', candidate: { name: String(body.name || '').slice(0, 100), email: String(body.email || '').slice(0, 160), whatsapp: String(body.whatsapp || '').slice(0, 30) }, submittedAt: new Date().toISOString(), correct, wrong, skipped, score, maxScore, percent, passed: percent >= Number(exam.passPercent || 45), review };
      await blobStore().set(result.attemptId, JSON.stringify(result), { metadata: { examId: exam.id, startedAt: String(attempt.startedAt) } });
      await blobStore().delete(activeKey).catch(() => {});
      return json(200, { result });
    }
    if (action === 'admin-data') { if (!isAdmin(event)) return json(401, { error: 'Admin login आवश्यक छ' }); const examReadiness = (data.exams || []).map(exam => ({ examId: exam.id, title: exam.title, ...readinessReport(exam, eligibleQuestions(exam, data.questions)) })); return json(200, { data, examReadiness }) }
    if (action === 'admin-history' || action === 'history' || action === 'admin-users' || action === 'users') {
      if (!isAdmin(event)) return json(401, { error: 'Admin login आवश्यक छ' });
      const a = await attempts();
      const query = userQuery(p);
      if (action === 'admin-users' || action === 'users') {
        const m = {};
        a.forEach(x => {
          const c = x.candidate || {}, k = c.email || c.whatsapp || c.name || x.attemptId;
          if (!m[k]) m[k] = { ...c, userId: k, attempts: 0, last: x.submittedAt };
          m[k].attempts++;
          if (x.submittedAt > m[k].last) m[k].last = x.submittedAt;
        });
        const users = Object.values(m).filter(x => !query || [x.userId, x.name, x.email, x.whatsapp].some(v => String(v || '').toLowerCase().includes(query)));
        return json(200, { users });
      }
      return json(200, { attempts: a.filter(x => matchesUser(x, query)) });
    }
    if (action === 'delete-user') {
      if (!isAdmin(event)) return json(401, { error: 'Admin login आवश्यक छ' });
      const key = String(body.userId || body.id || body.key || '').trim();
      if (!key || key.length > 200) return json(400, { error: 'User identifier आवश्यक छ' });
      const store = blobStore();
      let deleted = 0;
      const cursorState = { cursor: undefined };
      do {
        const page = await store.list(cursorState.cursor ? { cursor: cursorState.cursor } : {});
        for (const b of (page.blobs || [])) {
          try {
            const x = await store.get(b.key, { type: 'json' });
            const c = x?.candidate || {};
            const k = c.email || c.whatsapp || c.name || x?.attemptId;
            if (String(k) === key) { await store.delete(b.key); deleted++; }
          } catch {}
        }
        cursorState.cursor = page.cursor;
      } while (cursorState.cursor);
      return json(200, { ok: true, deleted, message: deleted ? 'User र सम्बन्धित history हटाइयो।' : 'यो user को history भेटिएन।' });
    }
    if (action === 'save-data') { if (!isAdmin(event)) return json(401, { error: 'Admin login आवश्यक छ' }); if (!body.data || !Array.isArray(body.data.exams) || !Array.isArray(body.data.questions)) return json(400, { error: 'Exam data format गलत छ' }); const ids = body.data.questions.map(q => String(q.id || '').trim()).filter(Boolean), unique = new Set(ids); if (ids.length !== unique.size) return json(400, { error: 'Question ID दोहोरिएको छ। प्रत्येक प्रश्नको unique ID हुनुपर्छ।' }); const current = await gh('exam-data.json'); await writeData(body.data, current.sha); return json(200, { ok: true, message: 'Exam data सुरक्षित भयो' }) }
    return json(400, { error: 'Unknown action' });
  } catch (e) { console.error(e); return json(500, { error: e.message || 'Exam API error' }) }
};