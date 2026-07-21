import { GH_USER, GH_REPO, GH_FILE } from "./config.js";

export async function ghGet(token){
  const r = await fetch(`https://api.github.com/repos/${GH_USER}/${GH_REPO}/contents/${GH_FILE}`,
    {headers:{Authorization:`token ${token}`,Accept:"application/vnd.github.v3+json"}});
  if(r.status===404) return {data:null,sha:null};
  if(!r.ok) throw new Error("GitHub error");
  const j = await r.json();
  return {data:JSON.parse(atob(j.content.replace(/\n/g,""))), sha:j.sha};
}

export async function ghPut(token,data,sha){
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data,null,2))));
  const body = {message:"Update",content};
  if(sha) body.sha = sha;
  const r = await fetch(`https://api.github.com/repos/${GH_USER}/${GH_REPO}/contents/${GH_FILE}`,
    {method:"PUT",headers:{Authorization:`token ${token}`,"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!r.ok) throw new Error("Save error");
  return (await r.json()).content.sha;
}
