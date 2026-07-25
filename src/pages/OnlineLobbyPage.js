import { h, useState } from "../react.js";
// Import dynamique, pas statique — voir le commentaire équivalent dans
// PlateauPage.js : ne charge le CDN Firebase qu'au moment où on essaie
// vraiment de créer/rejoindre une partie, jamais juste en arrivant sur
// cet écran.

// Sanitise un code de partie choisi librement par le créateur (Gus voulait
// pouvoir taper "Game" ou "1234" à sa guise) pour en faire une clé Firebase
// valide : Realtime Database refuse . # $ [ ] / dans une clé, donc on les
// retire, on majuscule pour éviter les confusions "abc" vs "ABC" entre amis
// qui se dictent le code à l'oral, et on borne la longueur.
function sanitizeCode(raw) {
  return (raw || '').toUpperCase().replace(/[.#$\[\]/]/g, '').trim().slice(0, 20);
}

export function OnlineLobbyPage({onBack, onEnterRoom}) {
  const [mode, setMode] = useState(null); // 'create' | 'join' | null
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  async function handleCreate(){
    const clean = sanitizeCode(code);
    if (!clean) { setError('Choisis un code (lettres/chiffres).'); return; }
    setBusy(true); setError('');
    try {
      const { roomExists } = await import("../multiplayer.js");
      const exists = await roomExists(clean);
      if (exists && !confirmOverwrite) {
        setError('Ce code existe déjà (partie en cours ?). Reclique pour créer quand même et écraser cette partie.');
        setConfirmOverwrite(true);
        setBusy(false);
        return;
      }
      onEnterRoom(clean, true);
    } catch (e) {
      setError("Erreur de connexion : " + e.message);
      setBusy(false);
    }
  }

  async function handleJoin(){
    const clean = sanitizeCode(code);
    if (!clean) { setError('Tape le code de la partie.'); return; }
    setBusy(true); setError('');
    try {
      const { roomExists } = await import("../multiplayer.js");
      const exists = await roomExists(clean);
      if (!exists) {
        setError('Aucune partie trouvée avec ce code.');
        setBusy(false);
        return;
      }
      onEnterRoom(clean, false);
    } catch (e) {
      setError("Erreur de connexion : " + e.message);
      setBusy(false);
    }
  }

  return h('div', {style:{minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, gap:16}},
    h('button', {onClick:onBack, style:{position:'fixed', top:16, left:16, background:'none', border:'1px solid #333', borderRadius:6, color:'#aaa', padding:'6px 12px', fontSize:12}}, '← Retour'),
    h('h2', {style:{color:'#eee', margin:0}}, '🌐 Jouer en ligne'),

    !mode && h('div', {style:{display:'flex', flexDirection:'column', gap:10, width:'min(90vw, 320px)'}},
      h('button', {
        onClick:()=>setMode('create'),
        style:{background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', borderRadius:10, color:'#eee', padding:'14px', fontSize:15}
      }, 'Créer une partie'),
      h('button', {
        onClick:()=>setMode('join'),
        style:{background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', borderRadius:10, color:'#eee', padding:'14px', fontSize:15}
      }, 'Rejoindre une partie')
    ),

    mode && h('div', {style:{display:'flex', flexDirection:'column', gap:10, width:'min(90vw, 320px)'}},
      h('div', {style:{color:'#999', fontSize:13, marginBottom:4}},
        mode === 'create' ? 'Choisis un code à dicter aux autres joueurs :' : 'Tape le code que le créateur t\'a donné :'
      ),
      h('input', {
        type:'text', value:code, autoFocus:true,
        onChange:e=>{ setCode(e.target.value); setError(''); setConfirmOverwrite(false); },
        onKeyDown:e=>{ if (e.key==='Enter') (mode==='create'?handleCreate:handleJoin)(); },
        placeholder:'ex: GAME ou 1234',
        style:{width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,.05)', border:'1px solid #333', borderRadius:8, color:'#eee', padding:'10px 14px', fontSize:16, textAlign:'center', letterSpacing:2}
      }),
      error && h('div', {style:{color:'#f88', fontSize:12}}, error),
      h('button', {
        disabled:busy,
        onClick: mode==='create' ? handleCreate : handleJoin,
        style:{background:'rgba(79,163,255,.15)', border:'1px solid rgba(79,163,255,.4)', borderRadius:8, color:'#9cf', padding:'12px', fontSize:14, opacity:busy?0.6:1}
      }, busy ? 'Connexion…' : (mode==='create' ? (confirmOverwrite ? 'Créer quand même' : 'Créer') : 'Rejoindre')),
      h('button', {
        onClick:()=>{ setMode(null); setCode(''); setError(''); setConfirmOverwrite(false); },
        style:{background:'none', border:'none', color:'#666', fontSize:12, padding:'4px'}
      }, '← Choisir autre chose')
    )
  );
}
