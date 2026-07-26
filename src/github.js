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

// Bug corrigé (Gus : un ami "sans token" qui crée une partie en ligne se
// retrouvait avec un catalogue périmé — moins de monstres, cases sans image
// de face) : le bouton "Continuer sans token" retombait directement sur
// `INIT` (data/initialData.js), un instantané figé de data.json datant d'une
// version très ancienne du jeu, jamais tenu à jour depuis (39 sorts contre
// bien plus aujourd'hui, 11 monstres contre ~28, aucune ligne `details`/
// `fichier` sur les cases). Ce n'était pas un problème tant que le Plateau
// restait solo, mais devient réel dès qu'un joueur SANS token rejoint une
// partie en ligne : il construit son deck depuis un catalogue totalement
// différent de celui des autres joueurs. `data.json` est déjà servi tel
// quel à côté d'`index.html` sur GitHub Pages (et par le serveur local de
// test) — le lire ne nécessite AUCUNE authentification pour un dépôt public,
// contrairement à l'API GitHub contents/ (qui elle exige un token). Fetch
// direct, même origine, `cache:'no-store'` pour ne jamais servir une copie
// mise en cache par le navigateur (même raisonnement que `VersionBanner`).
export async function fetchPublicData(){
  const r = await fetch('data.json', {cache:'no-store'});
  if (!r.ok) throw new Error('data.json indisponible');
  return await r.json();
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
