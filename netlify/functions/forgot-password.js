const crypto = require("crypto");

const USER = process.env.ADMIN_USERNAME || "Narayan";
const RECOVERY = process.env.ADMIN_RECOVERY_CODE;
const NETLIFY_TOKEN = process.env.NETLIFY_AUTH_TOKEN;
const NETLIFY_ACCOUNT_ID = process.env.NETLIFY_ACCOUNT_ID;
const SITE_ID = process.env.SITE_ID;

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"Content-Type", "Access-Control-Allow-Methods":"POST, OPTIONS" }, body: JSON.stringify(body) };
}
function sameSecret(a,b){const aa=Buffer.from(String(a||"")),bb=Buffer.from(String(b||""));return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb)}
function signRecovery(username){const exp=Math.floor(Date.now()/1000)+600;const payload=Buffer.from(JSON.stringify({sub:username,exp})).toString("base64url");const sig=crypto.createHmac("sha256",RECOVERY).update(payload).digest("base64url");return `${payload}.${sig}`}
function verifyRecoveryToken(token,username){try{const [payload,sig]=String(token||"").split(".");if(!payload||!sig)return false;const good=crypto.createHmac("sha256",RECOVERY).update(payload).digest("base64url")===sig;const o=JSON.parse(Buffer.from(payload,"base64url").toString());return good&&o.sub===username&&o.exp>Date.now()/1000}catch{return false}}
async function netlify(path,options={}){const r=await fetch(`https://api.netlify.com/api/v1${path}`,{...options,headers:{Authorization:`Bearer ${NETLIFY_TOKEN}`,"Content-Type":"application/json",...(options.headers||{})}});const text=await r.text();let data={};try{data=text?JSON.parse(text):{}}catch{data={message:text}}if(!r.ok)throw Error(data.message||data.error||`Netlify API error (${r.status})`);return data}
async function updateEnv(key,value){return netlify(`/accounts/${encodeURIComponent(NETLIFY_ACCOUNT_ID)}/env/${encodeURIComponent(key)}?site_id=${encodeURIComponent(SITE_ID)}`,{method:"PUT",body:JSON.stringify({key,values:[{value,context:"all"}],is_secret:true})})}
async function triggerDeploy(){const hook=await netlify(`/sites/${encodeURIComponent(SITE_ID)}/build_hooks`,{method:"POST",body:JSON.stringify({title:"Admin password recovery",branch:"main"})});if(!hook.url)throw Error("Netlify build hook बनाउन सकिएन");const r=await fetch(hook.url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason:"admin-password-recovery"})});if(!r.ok)throw Error("नयाँ password लागू गर्न Netlify deploy सुरु हुन सकेन")}

exports.handler=async event=>{
  if(event.httpMethod==="OPTIONS")return json(204,{});
  if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
  try{
    if(!RECOVERY)return json(500,{error:"Password recovery setup पूरा भएको छैन: ADMIN_RECOVERY_CODE आवश्यक छ"});
    if(!NETLIFY_TOKEN||!NETLIFY_ACCOUNT_ID||!SITE_ID)return json(500,{error:"Password recovery setup पूरा भएको छैन: Netlify environment variables आवश्यक छन्"});
    const body=event.body?JSON.parse(event.body):{};
    const mode=String(body.mode||"reset");
    const suppliedUsername=String(body.username||"").trim();
    const username=suppliedUsername==="Admin"?USER:suppliedUsername;
    const recoveryKey=String(body.recoveryKey||"");
    if(!sameSecret(username,USER)||!sameSecret(recoveryKey,RECOVERY))return json(401,{error:"Username वा Recovery Key गलत छ"});

    if(mode==="verify") return json(200,{verified:true,recoveryToken:signRecovery(username),message:"Recovery Key verified भयो। अब नयाँ password राख्नुहोस्।"});
    if(mode!=="reset")return json(400,{error:"Invalid recovery mode"});

    const recoveryToken=String(body.recoveryToken||"");
    const newPassword=String(body.newPassword||"");
    const confirmPassword=String(body.confirmPassword||"");
    if(!verifyRecoveryToken(recoveryToken,username))return json(401,{error:"Recovery verification expired वा invalid भयो। फेरि verify गर्नुहोस्।"});
    if(newPassword.length<10)return json(400,{error:"नयाँ password कम्तीमा 10 characters हुनुपर्छ"});
    if(newPassword!==confirmPassword)return json(400,{error:"नयाँ password र confirmation मिलेन"});
    if(sameSecret(newPassword,RECOVERY))return json(400,{error:"Recovery Key लाई password को रूपमा प्रयोग नगर्नुहोस्"});

    const newSecret=crypto.randomBytes(48).toString("base64url");
    await updateEnv("ADMIN_PASSWORD",newPassword);
    await updateEnv("ADMIN_JWT_SECRET",newSecret);
    await triggerDeploy();
    return json(200,{message:"Password reset भयो। नयाँ deploy सुरु गरिएको छ। अब नयाँ password बाट login गर्नुहोस्।"});
  }catch(e){console.error(e);return json(500,{error:e.message||"Password recovery failed"})}
};
