import { GH_USER, GH_REPO, GH_FILE } from "./config.js";

function base64ToUtf8(b64) {
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

export async function ghGet(token){
  const r = await fetch(`https://api.github.com/repos/${GH_USER}/${GH_REPO}/contents/${GH_FILE}`,
    {headers:{Authorization:`token ${token}`,Accept:"application/vnd.github.v3+json"}});
  if(r.status===404) return {data:null,sha:null};
  if(!r.ok) throw new Error("GitHub error");
  const j = await r.json();
  return {data:JSON.parse(base64ToUtf8(j.content.replace(/\n/g,""))), sha:j.sha};
}

export async function ghPut(token,data,sha){
  const content = utf8ToBase64(JSON.stringify(data,null,2));
  const body = {message:"Update",content};
  if(sha) body.sha = sha;
  const r = await fetch(`https://api.github.com/repos/${GH_USER}/${GH_REPO}/contents/${GH_FILE}`,
    {method:"PUT",headers:{Authorization:`token ${token}`,"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!r.ok) throw new Error("Save error");
  return (await r.json()).content.sha;
}
