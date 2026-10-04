const crypto=require('crypto');
const REPO=process.env.GITHUB_REPO||'narayanbhandari58/narayanbhandari';
const BRANCH=process.env.GITHUB_BRANCH||'main';
const TOKEN=process.env.GITHUB_TOKEN;
const SECRET=process.env.ADMIN_JWT_SECRET;
const GH='https://api.github.com';
const json=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, POST, OPTIONS'},body:JSON.stringify(body)});
function b64(s){return Buffer.from(s).toString('base64url')}
function verify(t){if(!t||!SECRET)return null;try{const[h,p,s]=String(t).split('.');if(!h||!p||!s)return null;const ex=b64(crypto.createHmac('sha256',SECRET).update(h+'.'+p).digest());if(ex.length!==s.length||!crypto.timingSafeEqual(Buffer.from(ex),Buffer.from(s)))return null;const o=JSON.parse(Buffer.from(p,'base64url').toString());return o.sub&&o.exp>=Date.now()/1000?o:null}catch{return null}}
function admin(e){return verify((e.headers?.authorization||'').replace(/^Bearer\\s+/i,''))}
async function gh(path,opt={}){if(!TOKEN)throw Error('GITHUB_TOKEN is not configured');const r=await fetch(GH+'/repos/'+REPO+'/contents/'+path,{...opt,headers:{Authorization:'Bearer '+TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json',...(opt.headers||{})}});const d=await r.json();if(!r.ok)throw Error(d.message||'GitHub request failed');return d}
async function read(path){const m=await gh(path);if(typeof m.content==='string'&&m.content.trim())return{data:JSON.parse(Buffer.from(m.content,'base64').toString('utf8')),sha:m.sha};const r=await fetch(GH+'/repos/'+REPO+'/git/blobs/'+m.sha,{headers:{Authorization:'Bearer '+TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}});const d=await r.json();if(!r.ok||d.encoding!=='base64')throw Error('GitHub file पढ्न सकिएन');return{data:JSON.parse(Buffer.from(d.content.replace(/\\s/g,''),'base64').toString('utf8')),sha:m.sha}}
function path(exam,set){return 'sets/'+exam+'/set-'+String(set).padStart(2,'0')+'.json'}
function safeExam(id){return /^(kharidar|nasu|sakha-adhikrit)$/.test(String(id))}
function safeSet(n){return /^(?:[1-9]|10)$/.test(String(n))}
function pub(q){const x={...q};delete x.correct;delete x.explanation;delete x.solution;return x}
function image(q){return q?.image||q?.imageUrl||q?.image_url||''}
function um(q,u){return String(q.unit||'')===String(u)||String(q.unit||'').startsWith(String(u)+'.')}
function lv(q){const v=String(q.level||'').toLowerCase();return ['level1','l1','i','1'].includes(v)?'level1':['level2','l2','ii','2'].includes(v)?'level2':v}
function validSet(exam,set){
 if(!set||set.examId!==exam.id||!Array.isArray(set.questions)||set.questions.length!==Number(exam.questionCount))return false;
 for(const q of set.questions){if(!q||!q.id||!String(q.q||q.question||'').trim()||!Array.isArray(q.options)||q.options.length!==4||q.options.some(o=>!String(o??'').trim())||!Number.isInteger(q.correct)||q.correct<0||q.correct>3)return false;}
 if(new Set(set.questions.map(q=>String(q.id))).size!==set.questions.length)return false;
 for(const sec of(exam.blueprint?.sections||[])){for(const u of(sec.units||[])){const n=set.questions.filter(q=>q.section===sec.id&&um(q,u.id)).length;if(n!==Number(u.questionCount||0))return false}const d=sec.levelDistribution;if(d){const z=set.questions.filter(q=>q.section===sec.id),a=z.filter(q=>lv(q)==='level1').length,b=z.filter(q=>lv(q)==='level2').length;if(a!==Number(d.level1||0)||b!==Number(d.level2||0))return false}}
 return true;
}
async function examData(){return (await read('exam-data.json')).data}
exports.handler=async event=>{if(event.httpMethod==='OPTIONS')return json(204,{});try{
 const p=new URLSearchParams(event.rawQuery||''),a=p.get('action')||'list',body=event.body?JSON.parse(event.body):{};
 if(a==='list'){const idx=(await read('sets/index.json')).data;const names={kharidar:'खरिदार तयारी परीक्षा',nasu:'नायब सुब्बा तयारी परीक्षा','sakha-adhikrit':'शाखा अधिकृत तयारी परीक्षा'};return json(200,{exams:['kharidar','nasu','sakha-adhikrit'].map(id=>({exam:{id,title:names[id]},sets:(idx.sets||[]).filter(x=>x.examId===id)}))})}
 if(a==='get'){const id=String(p.get('exam')||''),n=String(p.get('set')||'');if(!safeExam(id)||!safeSet(n))return json(400,{error:'Set पहिचान गलत छ'});const s=(await read(path(id,n))).data;return json(200,{set:{...s,questions:s.questions.map(pub)}})}
 if(a==='submit'){const id=String(body.examId||''),n=String(body.setId||'');if(!safeExam(id)||!safeSet(n))return json(400,{error:'Set पहिचान गलत छ'});const s=(await read(path(id,n))).data;const answers=body.answers&&typeof body.answers==='object'?body.answers:{};let correct=0,wrong=0,skipped=0;const review=s.questions.map(q=>{const v=Number.isInteger(answers[q.id])?answers[q.id]:null;if(v===null)skipped++;else if(v===q.correct)correct++;else wrong++;return{id:q.id,q:q.q||q.question,options:q.options,selected:v,correct:q.correct,type:q.type||'',format:q.format||'',section:q.section||'',unit:q.unit||'',subject:q.subject||'',topic:q.topic||'',level:q.level||'',image:image(q),imageAlt:q.imageAlt||q.image_alt||q.topic||'प्रश्नचित्र',passage:q.passage||'',figure:q.figure||'',data:q.data||'',explanation:q.explanation||'',solution:q.solution||''}});const score=Number((correct*Number(s.positiveMark||1)-wrong*Number(s.negativeMark||.2)).toFixed(2)),max=review.length*Number(s.positiveMark||1),percent=max?Number((score/max*100).toFixed(2)):0;return json(200,{result:{examId:id,setId:n,examTitle:s.title,candidate:{name:String(body.name||'').slice(0,100)},submittedAt:new Date().toISOString(),correct,wrong,skipped,score,maxScore:max,percent,passed:percent>=Number(s.passPercent||45),review}})}
  return json(400,{error:'Unknown action'});
}catch(e){console.error(e);return json(500,{error:e.message||'Set API error'})}};