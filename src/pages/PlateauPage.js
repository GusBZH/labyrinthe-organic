import { h, useState, useEffect, useRef } from "../react.js";
import { uid } from "../utils.js";
import { EditText } from "../components/EditText.js";
import { AddBtn } from "../components/AddBtn.js";
import { Popup } from "../components/Popup.js";
import { UndoRedo } from "../components/UndoRedo.js";

// Live game session (grid, players, PV, dice) — a "confort visuel" only,
// never an authoritative rules arbiter (see CLAUDE.md). Kept out of
// data.json on purpose: this is single-device hotseat state, not part of
// the shared card catalog that syncs through GitHub.
const STORAGE_KEY = 'labyrinthe_organic_plateau_v1';
const PALETTE = ['#e74c3c','#3498db','#2ecc71','#f1c40f','#9b59b6','#e67e22','#1abc9c','#95a5a6'];
const ROWS = 100, COLS = 100, CELL = 44;
const CENTER_ROW = Math.floor(ROWS/2), CENTER_COL = Math.floor(COLS/2);
const MAX_HISTORY = 50;
const DEFAULT_PV = 3;

function loadSession(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function gridBgStyle(){
  return {
    background: `repeating-linear-gradient(0deg,transparent,transparent ${CELL-1}px,rgba(255,255,255,.08) ${CELL-1}px,rgba(255,255,255,.08) ${CELL}px),`
      + `repeating-linear-gradient(90deg,transparent,transparent ${CELL-1}px,rgba(255,255,255,.08) ${CELL-1}px,rgba(255,255,255,.08) ${CELL}px),#161616`
  };
}

function PlayerSquare({player, isCurrent, onRemove, onRename}) {
  const [showInfo, setShowInfo] = useState(false);
  const anchorRef = useRef(null);

  return h('div', {ref:anchorRef, style:{position:'relative'}},
    h('div', {
      onClick: () => setShowInfo(!showInfo),
      style: {
        width:64, height:64, borderRadius:10, background:player.couleur,
        display:'flex', alignItems:'center', justifyContent:'center',
        position:'relative', cursor:'pointer', overflow:'hidden',
        boxShadow: isCurrent ? '0 0 0 2px #fff, 0 0 10px 3px #4fa3ff' : '0 2px 6px rgba(0,0,0,.4)'
      }
    },
      h('div', {style:{fontSize:26, fontWeight:700, color:'rgba(255,255,255,.85)'}}, player.nom.slice(0,1).toUpperCase()),
      h('div', {
        onClick: e => { e.stopPropagation(); onRemove(); },
        style:{position:'absolute', top:2, left:2, width:15, height:15, borderRadius:'50%', background:'rgba(0,0,0,.55)',
          color:'#ccc', fontSize:9, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}
      }, '✕'),
      h('div', {style:{position:'absolute', top:-2, right:-4, fontSize:22}}, '❤️'),
      h('div', {style:{position:'absolute', top:2, right:2, fontSize:10, fontWeight:700, color:'#fff', minWidth:14, textAlign:'center'}}, player.pv),
      h('div', {style:{position:'absolute', bottom:0, left:0, right:0, background:'rgba(0,0,0,.6)', padding:'2px 4px'}},
        h('div', {style:{fontSize:9, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}},
          h(EditText, {value:player.nom, onChange:onRename, editMode:true})
        )
      )
    ),
    showInfo && h(Popup, {
      onClose: () => setShowInfo(false),
      anchorRef,
      style: {left:'100%', marginLeft:8, top:0, width:180},
      children: h('div', {},
        h('div', {style:{fontSize:13, fontWeight:600, color:'#eee', marginBottom:6}}, player.nom),
        h('div', {style:{fontSize:11, color:'#666'}}, 'Sorts & Énergies — bientôt disponible')
      )
    })
  );
}

export function PlateauPage({onBack}) {
  const saved = loadSession();
  const [players, setPlayers] = useState(saved?.players || []);
  const [currentIndex, setCurrentIndex] = useState(saved?.currentIndex || 0);
  const [selectedId, setSelectedId] = useState(null);
  const [showReset, setShowReset] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const resetAnchorRef = useRef(null);

  const viewportRef = useRef(null);
  const contentRef = useRef(null);
  const dragRef = useRef(null);
  const wasDraggingRef = useRef(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({players, currentIndex})); } catch {}
  }, [players, currentIndex]);

  // Grid starts centered on (0,0) — the middle of the board, so there's
  // equal room to move in every direction from where players spawn —
  // rather than the native top-left scroll origin.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.scrollLeft = CENTER_COL*CELL - vp.clientWidth/2;
    vp.scrollTop = CENTER_ROW*CELL - vp.clientHeight/2;
  }, []);

  function commitPlayers(next){
    pastRef.current.push(players);
    if (pastRef.current.length > MAX_HISTORY) pastRef.current.shift();
    futureRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
    setPlayers(next);
  }

  function undo(){
    if (pastRef.current.length === 0) return;
    const prev = pastRef.current.pop();
    futureRef.current.push(players);
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(true);
    setPlayers(prev);
  }

  function redo(){
    if (futureRef.current.length === 0) return;
    const next = futureRef.current.pop();
    pastRef.current.push(players);
    setCanRedo(futureRef.current.length > 0);
    setCanUndo(true);
    setPlayers(next);
  }

  function nextColor(){
    const used = new Set(players.map(p => p.couleur));
    return PALETTE.find(c => !used.has(c)) || PALETTE[players.length % PALETTE.length];
  }

  function addPlayer(){
    commitPlayers([...players, {id:uid(), nom:`Joueur ${players.length+1}`, couleur:nextColor(), pv:DEFAULT_PV, row:CENTER_ROW, col:CENTER_COL, dice:null}]);
  }

  function removePlayer(id){
    const idx = players.findIndex(p => p.id === id);
    commitPlayers(players.filter(p => p.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (idx !== -1 && currentIndex >= players.length - 1) setCurrentIndex(Math.max(0, players.length - 2));
  }

  function renamePlayer(id, nom){
    commitPlayers(players.map(p => p.id === id ? {...p, nom} : p));
  }

  function updatePv(id, delta){
    commitPlayers(players.map(p => p.id === id ? {...p, pv: p.pv + delta} : p));
  }

  function onContentClick(e){
    if (wasDraggingRef.current) { wasDraggingRef.current = false; return; }
    const rect = contentRef.current.getBoundingClientRect();
    const c = Math.floor((e.clientX - rect.left) / CELL);
    const r = Math.floor((e.clientY - rect.top) / CELL);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;

    if (selectedId) {
      const sel = players.find(p => p.id === selectedId);
      if (sel && sel.row === r && sel.col === c) {
        setSelectedId(null);
      } else {
        commitPlayers(players.map(p => p.id === selectedId ? {...p, row:r, col:c} : p));
        setSelectedId(null);
      }
      return;
    }
    const here = players.filter(p => p.row === r && p.col === c);
    if (here.length >= 1) setSelectedId(here[0].id);
  }

  // Mouse click-drag panning (desktop). Touch panning is handled natively
  // by the viewport's own overflow scroll — this only kicks in for mouse
  // pointers so it never fights with native touch scrolling.
  function onViewportPointerDown(e){
    if (e.pointerType !== 'mouse') return;
    dragRef.current = {
      startX:e.clientX, startY:e.clientY,
      startScrollLeft:viewportRef.current.scrollLeft, startScrollTop:viewportRef.current.scrollTop,
      moved:false
    };
    function onMove(ev){
      const d = dragRef.current;
      if (!d) return;
      const dx = ev.clientX - d.startX, dy = ev.clientY - d.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true;
      viewportRef.current.scrollLeft = d.startScrollLeft - dx;
      viewportRef.current.scrollTop = d.startScrollTop - dy;
    }
    function onUp(){
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      wasDraggingRef.current = dragRef.current?.moved || false;
      dragRef.current = null;
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // Each player keeps their own last roll — not pushed through
  // commitPlayers, a re-roll isn't meaningful to undo.
  function rollDice(id){
    const value = 1 + Math.floor(Math.random() * 6);
    setPlayers(players.map(p => p.id === id ? {...p, dice:value} : p));
  }

  function switchPlayer(delta){
    if (players.length === 0) return;
    setCurrentIndex((currentIndex + delta + players.length) % players.length);
  }

  function resetBoard(){
    pastRef.current = [];
    futureRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
    setSelectedId(null);
    setCurrentIndex(0);
    setPlayers([]);
    setShowReset(false);
    const vp = viewportRef.current;
    if (vp) { vp.scrollLeft = CENTER_COL*CELL - vp.clientWidth/2; vp.scrollTop = CENTER_ROW*CELL - vp.clientHeight/2; }
  }

  const current = players[currentIndex] || null;

  // Cluster same-cell tokens into a small 2-column pattern so several
  // players sharing a cell don't fully overlap each other.
  const cellGroups = {};
  players.forEach(p => {
    const key = `${p.row}-${p.col}`;
    (cellGroups[key] = cellGroups[key] || []).push(p);
  });

  return h('div', {style:{height:'100dvh', display:'flex', flexDirection:'column', overflow:'hidden', color:'#eee', fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif', background:'#111'}},

    // HEADER (sticky) — future home of tile draw/discard piles
    h('div', {style:{flexShrink:0, display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
      background:'rgba(20,20,20,.97)', borderBottom:'1px solid rgba(255,255,255,.08)', zIndex:20}},
      h('button', {onClick:onBack, style:{background:'none', border:'1px solid #333', borderRadius:6, color:'#aaa', padding:'6px 12px', fontSize:12}}, '← Retour'),
      h('h2', {style:{margin:0, fontSize:16, color:'#eee', flex:1}}, '🎮 Plateau'),
      h('div', {ref:resetAnchorRef, style:{position:'relative'}},
        h('button', {onClick:()=>setShowReset(!showReset), style:{background:'none', border:'1px solid #333', borderRadius:6, color:'#a55', padding:'6px 10px', fontSize:12}}, '⟲ Reset'),
        showReset && h(Popup, {
          onClose:()=>setShowReset(false),
          anchorRef:resetAnchorRef,
          style:{right:0, top:'100%', marginTop:8, width:200},
          children: h('div', {},
            h('div', {style:{fontSize:12, color:'#eee', marginBottom:10}}, 'Réinitialiser tout le plateau ?'),
            h('div', {style:{display:'flex', gap:8}},
              h('button', {onClick:resetBoard, style:{flex:1, background:'rgba(220,60,40,.15)', border:'1px solid rgba(220,60,40,.4)', borderRadius:6, color:'#f88', padding:'6px 0', fontSize:12}}, 'Oui'),
              h('button', {onClick:()=>setShowReset(false), style:{flex:1, background:'rgba(255,255,255,.06)', border:'1px solid #444', borderRadius:6, color:'#eee', padding:'6px 0', fontSize:12}}, 'Non')
            )
          )
        })
      ),
      h(UndoRedo, {canUndo, canRedo, onUndo:undo, onRedo:redo})
    ),

    // RIGHT SIDEBAR — player roster (sticky, vertically centered)
    h('div', {style:{
      position:'fixed', right:8, top:'50%', transform:'translateY(-50%)',
      display:'flex', flexDirection:'column', gap:8, zIndex:15
    }},
      players.map((p,i) => h(PlayerSquare, {
        key:p.id, player:p, isCurrent:i===currentIndex,
        onRemove:()=>removePlayer(p.id), onRename:v=>renamePlayer(p.id,v)
      })),
      h('div', {style:{width:64}}, h(AddBtn, {onClick:addPlayer}))
    ),

    // GRID VIEWPORT (scrollable / pannable)
    h('div', {
      ref:viewportRef,
      onPointerDown:onViewportPointerDown,
      style:{flex:1, overflow:'auto', position:'relative', touchAction:'pan-x pan-y', cursor:'grab'}
    },
      h('div', {
        ref:contentRef,
        onClick:onContentClick,
        style:{width:COLS*CELL, height:ROWS*CELL, position:'relative', ...gridBgStyle()}
      },
        Object.entries(cellGroups).map(([key, group]) => group.map((p, i) => {
          const cx = p.col*CELL + CELL/2 + (group.length>1 ? (i%2===0?-1:1)*(CELL/5) : 0);
          const cy = p.row*CELL + CELL/2 + (group.length>1 ? (i>=2?1:-1)*(CELL/5) : 0);
          return h('div', {
            key:p.id,
            style:{
              position:'absolute', left:cx, top:cy, transform:'translate(-50%,-50%)',
              width:26, height:26, borderRadius:'50%', background:p.couleur,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:700, color:'#fff', pointerEvents:'none',
              boxShadow: selectedId===p.id ? '0 0 0 2px #fff, 0 0 10px 3px #4fa3ff' : '0 1px 4px rgba(0,0,0,.5)'
            }
          }, p.nom.slice(0,1).toUpperCase());
        }))
      )
    ),

    // FOOTER (sticky) — dice / PV heart, with room left for sorts & énergies
    // (between dice and heart) once those exist
    h('div', {style:{flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'10px 14px', background:'rgba(20,20,20,.97)', borderTop:'1px solid rgba(255,255,255,.08)', zIndex:20}},
      h('button', {onClick:()=>switchPlayer(-1), disabled:players.length<2, style:navBtnStyle(players.length>1)}, '‹'),

      h('div', {style:{display:'flex', alignItems:'center', gap:10}},
        current ? h('button', {onClick:()=>rollDice(current.id), style:{background:'rgba(255,255,255,.06)', border:'1px solid #444', borderRadius:6, color:'#eee', padding:'6px 12px', fontSize:13}},
          current.dice ? `🎲 ${current.dice}` : '🎲'
        ) : h('button', {disabled:true, style:{background:'rgba(255,255,255,.03)', border:'1px solid #333', borderRadius:6, color:'#444', padding:'6px 12px', fontSize:13}}, '🎲'),
        current ? h('div', {style:{display:'flex', alignItems:'center', gap:4}},
          h('button', {onClick:()=>updatePv(current.id,-1), style:pvBtnStyle}, '−'),
          h('div', {style:{position:'relative', width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center'}},
            h('div', {style:{position:'absolute', fontSize:30}}, '❤️'),
            h('div', {style:{position:'relative', fontSize:12, fontWeight:700, color:'#fff'}}, current.pv)
          ),
          h('button', {onClick:()=>updatePv(current.id,1), style:pvBtnStyle}, '+')
        ) : h('div', {onClick:addPlayer, style:{fontSize:11, color:'#777', cursor:'pointer', textDecoration:'underline'}}, 'Ajoute un joueur')
      ),

      h('button', {onClick:()=>switchPlayer(1), disabled:players.length<2, style:navBtnStyle(players.length>1)}, '›')
    )
  );
}

function navBtnStyle(enabled){
  return {background:'rgba(255,255,255,.06)', border:'1px solid #444', borderRadius:8, color: enabled?'#eee':'#444',
    width:40, height:40, fontSize:26, lineHeight:1, cursor: enabled?'pointer':'default'};
}
const pvBtnStyle = {background:'rgba(255,255,255,.06)', border:'1px solid #444', borderRadius:6, color:'#eee', width:24, height:24, fontSize:14, lineHeight:1};
