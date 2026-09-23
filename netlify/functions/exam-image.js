const REPO='narayanbhandari58/narayanbhandari';
const BRANCH=process.env.GITHUB_BRANCH||'main';
const TOKEN=process.env.GITHUB_TOKEN||'';
const ALLOWED=/^bo-2\.2-\d{3}$/;

exports.handler=async event=>{
  try{
    const id=String(event.queryStringParameters?.id||new URLSearchParams(event.rawQuery||'').get('id')||'').trim();
    if(!ALLOWED.test(id)) return {statusCode:400,headers:{'Cache-Control':'no-store'},body:'Invalid image id'};
    const path='image/exam/branch-officer-2.2/'+id+'.png';
    const headers={Accept:'application/vnd.github.raw'};
    if(TOKEN) headers.Authorization='Bearer '+TOKEN;
    const r=await fetch('https://api.github.com/repos/'+REPO+'/contents/'+path+'?ref='+encodeURIComponent(BRANCH),{headers});
    if(!r.ok) return {statusCode:r.status===404?404:502,headers:{'Cache-Control':'no-store'},body:'Image not found'};
    const bytes=Buffer.from(await r.arrayBuffer());
    return {statusCode:200,isBase64Encoded:true,headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=86400, s-maxage=86400'},body:bytes.toString('base64')};
  }catch(e){return {statusCode:500,headers:{'Cache-Control':'no-store'},body:'Image service error'};}
};