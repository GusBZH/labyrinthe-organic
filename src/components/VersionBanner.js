import { h, useState, useEffect } from "../react.js";
import { APP_VERSION } from "../config.js";

// Detects a browser tab left open on an OLD build of the JS — Gus: "si
// quelqu'un d'autre crée une partie ils ont une vieille version du jeu,
// avec plus de 100 cartes maps, pas tous les monstres" — this project has
// no build step/cache-busting on its script tags, so a tab opened before a
// deploy keeps running that old JS indefinitely until reloaded. Fetches
// version.json with cache disabled (so THIS request always sees the real
// latest deploy, unlike the already-loaded JS modules) and compares it to
// the version baked into the JS actually running right now — a mismatch
// means this tab is stale. Checked once on mount and again every 5 minutes
// (a stale tab left open across a whole play session should still notice
// eventually), never blocking anything — just a dismissable-looking but
// persistent banner, since silently reloading someone mid-game would be
// worse than leaving a stale tab alone until they choose to.
export function VersionBanner() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
        const json = await res.json();
        if (!cancelled && json.version && json.version !== APP_VERSION) setStale(true);
      } catch {
        // Réseau indisponible ou fichier introuvable — pas de quoi bloquer
        // l'app, on retentera au prochain intervalle.
      }
    }
    check();
    const interval = setInterval(check, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (!stale) return null;

  return h('div', {
    style:{
      position:'fixed', top:0, left:0, right:0, zIndex:1000,
      background:'#4fa3ff', color:'#111', fontSize:13, fontWeight:600,
      padding:'8px 14px', display:'flex', alignItems:'center', justifyContent:'center', gap:12
    }
  },
    h('span', {}, 'Une nouvelle version est disponible.'),
    h('button', {
      onClick:()=>window.location.reload(),
      style:{background:'#111', color:'#fff', border:'none', borderRadius:6, padding:'4px 12px', fontSize:12, cursor:'pointer'}
    }, 'Recharger')
  );
}
