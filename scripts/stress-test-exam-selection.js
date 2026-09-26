const fs = require('fs');

const data = JSON.parse(fs.readFileSync('exam-data.json','utf8'));
const seedPaths = [
  'exam-question-seed/branch-officer-2.2-nonverbal-pictorial.json',
  'exam-question-seed/branch-officer-2.2-triangle-counting.json',
  'exam-question-seed/branch-officer-2.5-data-interpretation.json',
  'exam-question-seed/cross-exam-transfer.json'
];
const byId = new Map((data.questions || []).map(q => [String(q.id), q]));
for (const path of seedPaths) {
  if (!fs.existsSync(path)) continue;
  let seed; try { seed = JSON.parse(fs.readFileSync(path,'utf8')); } catch { continue; }
  for (const s of (Array.isArray(seed) ? seed : [])) {
    const id = String(s?.id || ''); if (!id) continue;
    const cur = byId.get(id);
    if (!cur) { byId.set(id, {...s}); continue; }
    for (const k of ['image','imageUrl','image_url','imageAlt','image_alt','figure']) {
      if ((cur[k] == null || String(cur[k]).trim()==='') && s[k] != null && String(s[k]).trim()!=='') cur[k]=s[k];
    }
    if (Array.isArray(s.examIds)) cur.examIds=[...new Set([...(cur.examIds||[]),...s.examIds])];
    if (s.examMappings && typeof s.examMappings==='object') cur.examMappings={...(cur.examMappings||{}),...s.examMappings};
  }
}
const questions=[...byId.values()];
const exams=Object.fromEntries((data.exams||[]).map(e=>[e.id,e]));

function placed(q,id){ const m=(q.examMappings||{})[id]; return m ? {...q,...m} : q; }
function bank(id){ return questions.filter(q=>id in (q.examMappings||{}) || (q.examIds||[]).includes(id)).map(q=>placed(q,id)); }
function level(q){const v=String(q.level??'').toLowerCase(); return ['level1','l1','i','1'].includes(v)?'level1':['level2','l2','ii','2'].includes(v)?'level2':v;}
function unitMatches(q,u){const a=String(q.unit??''),b=String(u??'');return a===b||a.startsWith(b+'.');}
function image(q){return q.image||q.imageUrl||q.image_url||(/^bo-2\.2-\d{3}$/.test(String(q.id))&&q.type==='pictorial'?'/image/exam/branch-officer-2.2/'+q.id+'.png':'');}
function usable(q){return q.type!=='pictorial'||!!image(q);}
function shuffle(a){const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;}
function chooseLevelCounts(units,target){
  const dp=new Map([[0,[]]]);
  for(const u of units){const next=new Map();for(const [sum,p] of dp){const lo=Math.max(0,u.need-u.l2),hi=Math.min(u.need,u.l1);for(let x=lo;x<=hi;x++){const ns=sum+x;if(ns<=target&&!next.has(ns))next.set(ns,[...p,x]);}}dp.clear();for(const [k,v] of next)dp.set(k,v);}
  return dp.get(Number(target))||null;
}
function selectPaper(exam, input){
  const usableBank=input.filter(usable), selected=[], used=new Set();
  const plan=(exam.blueprint?.sections||[]).flatMap(s=>(s.units||[]).map(u=>({s,u})));
  if(!plan.length)return shuffle(usableBank).slice(0,Number(exam.questionCount||0));
  const add=q=>{if(!q||used.has(q.id))return false;used.add(q.id);selected.push(q);return true;};
  const choose=(pool,count,forcePictorial)=>{
    if(count<=0)return [];
    const x=shuffle(pool);
    if(!forcePictorial)return x.slice(0,count);
    const p=x.find(q=>q.type==='pictorial'); if(!p)return null;
    return [p,...x.filter(q=>q.id!==p.id).slice(0,count-1)];
  };
  for(const section of (exam.blueprint?.sections||[])){
    const units=(section.units||[]).map(u=>{
      const pool=usableBank.filter(q=>q.section===section.id&&unitMatches(q,u.id)&&!used.has(q.id));
      return{id:u.id,need:Number(u.questionCount||0),pool,l1:pool.filter(q=>level(q)==='level1').length,l2:pool.filter(q=>level(q)==='level2').length,hasPictorial:pool.some(q=>q.type==='pictorial')};
    });
    const d=section.levelDistribution;const counts=d?chooseLevelCounts(units,Number(d.level1||0)):null;if(d&&!counts)return null;
    for(let i=0;i<units.length;i++){
      const u=units[i]; if(u.pool.length<u.need)return null;
      const n1=d?counts[i]:0,n2=d?u.need-n1:0;
      const l1=shuffle(u.pool.filter(q=>level(q)==='level1')),l2=shuffle(u.pool.filter(q=>level(q)==='level2'));
      let chosen=[];
      if(d){
        if(l1.length<n1||l2.length<n2)return null;
        const p1=l1.some(q=>q.type==='pictorial'),p2=l2.some(q=>q.type==='pictorial');
        if(u.hasPictorial&&!((n1>0&&p1)||(n2>0&&p2)))return null;
        const c1=choose(l1,n1,u.hasPictorial&&n1>0&&p1);
        const c2=choose(l2,n2,!c1?.some(q=>q.type==='pictorial')&&u.hasPictorial&&n2>0&&p2);
        if(c1===null||c2===null)return null; chosen=[...c1,...c2];
      }else{
        chosen=choose(u.pool,u.need,u.hasPictorial); if(chosen===null)return null;
      }
      if(chosen.length!==u.need||chosen.some(q=>!add(q)))return null;
    }
  }
  return selected;
}
function validate(exam,paper){
  if(!paper||paper.length!==Number(exam.questionCount)||new Set(paper.map(q=>q.id)).size!==paper.length)return false;
  for(const s of exam.blueprint.sections||[])for(const u of s.units||[]){const n=paper.filter(q=>q.section===s.id&&unitMatches(q,u.id)).length;if(n!==Number(u.questionCount||0))return false;}
  for(const s of exam.blueprint.sections||[]){const d=s.levelDistribution;if(!d)continue;const p=paper.filter(q=>q.section===s.id);if(p.filter(q=>level(q)==='level1').length!==Number(d.level1||0)||p.filter(q=>level(q)==='level2').length!==Number(d.level2||0))return false;}
  return true;
}
function englishLike(q){const s=String(q.q||q.question||''),dev=[...s].filter(c=>c>='\u0900'&&c<='\u097f').length,lat=[...s].filter(c=>/[A-Za-z]/.test(c)).length;return lat>dev+2;}

let failures=[];
const knownExamIds=new Set(Object.keys(exams));
for(const q of questions){
  for(const id of (q.examIds||[])) if(!knownExamIds.has(id)) failures.push(q.id+' references unknown examId '+id);
  for(const id of Object.keys(q.examMappings||{})){
    if(!knownExamIds.has(id)) failures.push(q.id+' has mapping for unknown exam '+id);
    else {
      const m=q.examMappings[id]||{}, e=exams[id];
      const validUnits=new Set((e.blueprint?.sections||[]).flatMap(s=>(s.units||[]).map(u=>String(u.id))));
      if(m.section && !e.blueprint.sections.some(s=>s.id===m.section)) failures.push(q.id+' '+id+' invalid section '+m.section);
      if(m.unit && ![...validUnits].some(u=>String(m.unit)===u || String(m.unit).startsWith(u+'.'))) failures.push(q.id+' '+id+' invalid unit '+m.unit);
      if(m.level && !['level1','l1','i','1','level2','l2','ii','2'].includes(String(m.level).toLowerCase())) failures.push(q.id+' '+id+' invalid level '+m.level);
    }
  }
}

let totalRuns=0;
for(const id of ['sakha-adhikrit','nasu','kharidar']){
  const exam=exams[id]; if(!exam) throw new Error('Missing exam '+id);
  const b=bank(id), u=b.filter(usable);
  for(let i=0;i<500;i++){totalRuns++;const p=selectPaper(exam,b);if(!validate(exam,p)) failures.push(id+' run '+i+' blueprint mismatch'); const hasPictorialPool=b.some(q=>q.type==='pictorial'&&usable(q)); if(hasPictorialPool&&!p?.some(q=>q.type==='pictorial')) failures.push(id+' run '+i+' pictorial question missing from generated paper');}
  if(['nasu','kharidar'].includes(id)){const en=b.filter(englishLike).map(q=>q.id);if(en.length)failures.push(id+' English-like mapped questions: '+en.slice(0,20).join(','));}
  for(const q of b)if(q.type==='pictorial'&&!image(q))failures.push(id+' pictorial without image: '+q.id);
  for(const s of exam.blueprint.sections||[])for(const u0 of s.units||[]){const n=u.filter(q=>q.section===s.id&&unitMatches(q,u0.id)).length;if(n<Number(u0.questionCount||0))failures.push(id+' shortage '+s.id+'/'+u0.id+' '+n+'/'+u0.questionCount);}
  console.log(id+': mapped='+b.length+', usable='+u.length+', stress=500');
}
const shared=questions.filter(q=>Object.keys(q.examMappings||{}).length>=2);
const triple=questions.filter(q=>['sakha-adhikrit','nasu','kharidar'].every(id => id in (q.examMappings||{}) || (q.examIds||[]).includes(id)));
console.log('Shared questions mapped to >=2 exams: '+shared.length);
console.log('Questions usable across all 3 exams: '+triple.length);
if(failures.length){console.error('FAILURES\n'+failures.join('\n'));process.exit(1);}
console.log('PASS: '+totalRuns+' paper generations; mapping validity, blueprint, uniqueness, level quotas, pictorial images, and Kharidar/Na Su English exclusion verified.');