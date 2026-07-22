import { h, useState, useEffect } from "../react.js";
import { uid } from "../utils.js";

// Live game session (grid, players, PV, dice) — a "confort visuel" only,
// never an authoritative rules arbiter (see CLAUDE.md). Kept out of
// data.json on purpose: this is single-device hotseat state, not part of
// the shared card catalog that syncs through GitHub.
const STORAGE_KEY = 'labyrinthe_organic_plateau_v1';
const PALETTE = ['#e74c3c','#3498db','#2ecc71','#f1c40f','#9b59b6','#e67e22','#1abc9c','#95a5a6'];
const DEFAULT_SIZE = 9;

function loadSession(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function PlateauPage({onBack}) {
  const saved = loadSession();
  const [rows, setRows] = useState(saved?.rows || DEFAULT_SIZE);
  const [cols, setCols] = useState(saved?.cols || DEFAULT_SIZE);
  const [players, setPlayers] = useState(saved?.players || []);
  const [selectedId, setSelectedId] = useState(null);
  const [nameInput, setNameInput] = useState('');
  const [dice, setDice] = useState(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({rows, cols, players})); } catch {}
  }, [rows, cols, players]);

  function nextColor(){
    const used = new Set(players.map(p => p.couleur));
    return PALETTE.find(c => !used.has(c)) || PALETTE[players.length % PALETTE.length];
  }

  function addPlayer(){
    const nom = nameInput.trim();
    if (!nom) return;
    setPlayers([...players, {id:uid(), nom, couleur:nextColor(), pv:10, row:0, col:0}]);
    setNameInput('');
  }

  function removePlayer(id){
    setPlayers(players.filter(p => p.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function updatePv(id, delta){
    setPlayers(players.map(p => p.id === id ? {...p, pv: p.pv + delta} : p));
  }

  function onCellClick(r, c){
    if (selectedId) {
      const sel = players.find(p => p.id === selectedId);
      if (sel && sel.row === r && sel.col === c) {
        setSelectedId(null); // tap the selected token's own cell again = deselect
      } else {
        setPlayers(players.map(p => p.id === selectedId ? {...p, row:r, col:c} : p));
        setSelectedId(null);
      }
      return;
    }
    const here = players.filter(p => p.row === r && p.col === c);
    if (here.length >= 1) setSelectedId(here[0].id);
  }

  function rollDice(){
    setDice(1 + Math.floor(Math.random() * 6));
  }

  const cellSize = `min(${Math.floor(92/cols)}vw, ${Math.floor(560/cols)}px)`;

  return h('div', {style:{minHeight:'100vh', padding:'0 16px 40px', color:'#eee', fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif'}},
    h('div', {style:{display:'flex', alignItems:'center', gap:12, padding:'16px 0'}},
      h('button', {onClick:onBack, style:{background:'none', border:'1px solid #333', borderRadius:6, color:'#aaa', padding:'6px 12px', fontSize:12}}, '← Retour'),
      h('h2', {style:{margin:0, fontSize:16, color:'#eee', flex:1}}, '🎮 Plateau'),
      h('button', {onClick:rollDice, style:{background:'rgba(255,255,255,.06)', border:'1px solid #444', borderRadius:6, color:'#eee', padding:'6px 12px', fontSize:13}},
        dice ? `🎲 ${dice}` : '🎲 Lancer'
      )
    ),

    h('div', {style:{display:'flex', gap:6, alignItems:'center', marginBottom:14, flexWrap:'wrap'}},
      h('span', {style:{fontSize:11, color:'#666'}}, 'Taille du plateau :'),
      h('button', {onClick:()=>setRows(Math.max(3,rows-1)), style:sizeBtnStyle}, '−'),
      h('span', {style:{fontSize:12, color:'#aaa', minWidth:14, textAlign:'center'}}, rows),
      h('span', {style:{fontSize:11, color:'#555'}}, '×'),
      h('button', {onClick:()=>setCols(Math.max(3,cols-1)), style:sizeBtnStyle}, '−'),
      h('span', {style:{fontSize:12, color:'#aaa', minWidth:14, textAlign:'center'}}, cols),
      h('button', {onClick:()=>{setRows(Math.min(20,rows+1));setCols(Math.min(20,cols+1));}, style:sizeBtnStyle}, '+ tout')
    ),

    h('div', {style:{
      display:'grid', gridTemplateColumns:`repeat(${cols}, ${cellSize})`,
      gap:2, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)',
      borderRadius:8, padding:4, width:'fit-content', margin:'0 auto 20px'
    }},
      Array.from({length:rows}).map((_,r) =>
        Array.from({length:cols}).map((_,c) => {
          const here = players.filter(p => p.row===r && p.col===c);
          return h('div', {
            key:`${r}-${c}`,
            onClick:()=>onCellClick(r,c),
            style:{
              width:cellSize, height:cellSize, background:'rgba(255,255,255,.03)',
              border:'1px solid rgba(255,255,255,.06)', borderRadius:4, cursor:'pointer',
              display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'center', gap:2, padding:2
            }
          },
            here.map(p => h('div', {
              key:p.id,
              style:{
                width:'62%', maxWidth:22, aspectRatio:'1', borderRadius:'50%',
                background:p.couleur, display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:10, fontWeight:700, color:'#fff', flexShrink:0,
                boxShadow: selectedId===p.id ? '0 0 0 2px #fff, 0 0 10px 3px #4fa3ff' : 'none',
                transition:'box-shadow .15s'
              }
            }, p.nom.slice(0,1).toUpperCase()))
          );
        })
      )
    ),

    h('div', {style:{fontSize:11, color:'#555', marginBottom:16}},
      h('input', {
        value:nameInput, onChange:e=>setNameInput(e.target.value),
        onKeyDown:e=>{ if(e.key==='Enter') addPlayer(); },
        placeholder:'Nom du joueur',
        style:{background:'rgba(255,255,255,.06)', border:'1px solid #444', borderRadius:6, color:'#eee', padding:'6px 10px', fontSize:13, marginRight:8}
      }),
      h('button', {onClick:addPlayer, style:{background:'rgba(255,255,255,.06)', border:'1px solid #444', borderRadius:6, color:'#eee', padding:'6px 12px', fontSize:13}}, '+ Ajouter')
    ),

    h('div', {style:{display:'flex', flexDirection:'column', gap:8}},
      players.map(p => h('div', {key:p.id, style:{
        display:'flex', alignItems:'center', gap:10, background:'rgba(255,255,255,.04)',
        border:'1px solid rgba(255,255,255,.08)', borderRadius:8, padding:'8px 12px'
      }},
        h('div', {style:{width:16, height:16, borderRadius:'50%', background:p.couleur, flexShrink:0}}),
        h('div', {style:{flex:1, fontSize:13, color:'#eee'}}, p.nom),
        h('button', {onClick:()=>updatePv(p.id,-1), style:pvBtnStyle}, '−'),
        h('span', {style:{fontSize:13, color:'#f88', minWidth:26, textAlign:'center'}}, `${p.pv} PV`),
        h('button', {onClick:()=>updatePv(p.id,1), style:pvBtnStyle}, '+'),
        h('span', {onClick:()=>removePlayer(p.id), style:{fontSize:11, color:'#555', cursor:'pointer', marginLeft:6}}, '✕')
      ))
    )
  );
}

const sizeBtnStyle = {background:'rgba(255,255,255,.06)', border:'1px solid #444', borderRadius:6, color:'#eee', width:24, height:24, fontSize:14, lineHeight:1};
const pvBtnStyle = {background:'rgba(255,255,255,.06)', border:'1px solid #444', borderRadius:6, color:'#eee', width:24, height:24, fontSize:14, lineHeight:1};
