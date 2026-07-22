import { h, useState, useEffect, useLayoutEffect, useRef } from "../react.js";
import { uid, useVisionFlash } from "../utils.js";
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
const MIN_ZOOM = 0.4, MAX_ZOOM = 2.5;
const MAX_HISTORY = 50;
const DEFAULT_PV = 3;

function loadSession(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

// Grid background is drawn ONCE at the native CELL size and never
// regenerated for zoom — the whole content div (background + tokens) is
// scaled visually via a single CSS transform instead (see contentRef's
// style below). Recomputing this repeating-gradient string at a new
// fractional pixel size on every zoom tick was itself the cause of both
// the jank (a big CSS background reparse/repaint per tick, on top of a
// full React re-render) and the flickering lines (sub-pixel gradient stop
// rounding at odd cell sizes) — scaling a single already-rendered layer is
// both cheaper (GPU-composited) and artifact-free.
const GRID_BG = {
  background: `repeating-linear-gradient(0deg,transparent,transparent ${CELL-1}px,rgba(255,255,255,.08) ${CELL-1}px,rgba(255,255,255,.08) ${CELL}px),`
    + `repeating-linear-gradient(90deg,transparent,transparent ${CELL-1}px,rgba(255,255,255,.08) ${CELL-1}px,rgba(255,255,255,.08) ${CELL}px),#161616`
};

// Vision mode overlay: same grid lines, tinted blue, layered on top of the
// base grid (not replacing it) so the toggle can fade/glitch independently.
const VISION_GRID_BG = {
  background: `repeating-linear-gradient(0deg,transparent,transparent ${CELL-1}px,rgba(120,180,255,.9) ${CELL-1}px,rgba(120,180,255,.9) ${CELL}px),`
    + `repeating-linear-gradient(90deg,transparent,transparent ${CELL-1}px,rgba(120,180,255,.9) ${CELL-1}px,rgba(120,180,255,.9) ${CELL}px)`
};

function borderColor(vision, normal){
  return vision ? 'rgba(79,163,255,.5)' : normal;
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
      style: {right:'100%', marginRight:8, top:0, width:180},
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
  const [zoom, setZoom] = useState(1);
  const [scrollTick, setScrollTick] = useState(0);
  const [visionMode, setVisionMode] = useState(false);
  const [cellPicker, setCellPicker] = useState(null); // {clientX, clientY, ids, forVision}
  const [visionPlayerId, setVisionPlayerId] = useState(null);
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const resetAnchorRef = useRef(null);
  const cellPickerAnchorRef = useRef(null);
  const visionModalAnchorRef = useRef(null);
  const zoomRef = useRef(1);
  const pinchRef = useRef(null);

  const viewportRef = useRef(null);
  const contentRef = useRef(null);
  const dragRef = useRef(null);
  const wasDraggingRef = useRef(false);
  const pendingScrollRef = useRef(null);
  const visionFlashCls = useVisionFlash(visionMode);

  const effectiveCell = CELL * zoom;

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({players, currentIndex})); } catch {}
  }, [players, currentIndex]);

  // Grid starts centered on (0,0) — the middle of the board, so there's
  // equal room to move in every direction from where players spawn —
  // rather than the native top-left scroll origin.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.scrollLeft = CENTER_COL*effectiveCell - vp.clientWidth/2;
    vp.scrollTop = CENTER_ROW*effectiveCell - vp.clientHeight/2;
  }, []);

  // Applies a pending scroll correction right after React has committed a
  // zoom-triggered re-render — i.e. once the content div's dimensions
  // already reflect the new effectiveCell. This used to be done via
  // requestAnimationFrame instead of a layout effect, which had a real bug:
  // when several zoom updates land in the same tick (e.g. a burst of
  // pinch touchmove events, or even just two pointermove events — one per
  // finger — for a single pinch step), React batches them into ONE
  // re-render that can commit *after* all those rAF callbacks have already
  // fired. Each one then read/wrote scrollLeft against the still-OLD
  // (smaller) content size, so the browser silently clamped it to the old
  // max scroll — the view would snap to that clamped position and stay
  // there once the resize finally landed, which is exactly the
  // "jumps around in every direction" symptom. A layout effect only ever
  // runs after the matching DOM update, so scrollWidth/scrollHeight are
  // already correct and nothing gets clamped. Keyed on a dedicated
  // `scrollTick` counter rather than `zoom` itself: once zoom is clamped at
  // MIN/MAX, repeated calls pass the same value and React bails out of
  // re-rendering (skipping the effect) — but the pinch midpoint can still
  // be drifting (panning) even while clamped, so the trigger needs to fire
  // on every call regardless of whether the zoom value actually changed.
  useLayoutEffect(() => {
    const vp = viewportRef.current;
    const pending = pendingScrollRef.current;
    if (vp && pending) {
      vp.scrollLeft = pending.left;
      vp.scrollTop = pending.top;
    }
  }, [scrollTick]);

  // Zooms toward a focus point (defaults to viewport center) — computes
  // the scroll needed to keep the same world position under that point,
  // applied by the layout effect above once the resize has landed.
  function applyZoom(newZoomRaw, clientX, clientY){
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoomRaw));
    const vp = viewportRef.current;
    if (!vp) { zoomRef.current = newZoom; setZoom(newZoom); return; }
    const oldCell = CELL * zoomRef.current;
    const newCell = CELL * newZoom;
    const rect = vp.getBoundingClientRect();
    const focusX = clientX != null ? clientX - rect.left : vp.clientWidth/2;
    const focusY = clientY != null ? clientY - rect.top : vp.clientHeight/2;
    const worldX = (vp.scrollLeft + focusX) / oldCell;
    const worldY = (vp.scrollTop + focusY) / oldCell;
    zoomRef.current = newZoom;
    pendingScrollRef.current = { left: worldX*newCell - focusX, top: worldY*newCell - focusY };
    setZoom(newZoom);
    setScrollTick(t => t+1);
  }

  function onWheel(e){
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.001);
    applyZoom(zoomRef.current * factor, e.clientX, e.clientY);
  }

  function worldPointAt(clientX, clientY){
    const vp = viewportRef.current;
    const rect = vp.getBoundingClientRect();
    const cell = CELL * zoomRef.current;
    return {
      x: (vp.scrollLeft + (clientX - rect.left)) / cell,
      y: (vp.scrollTop + (clientY - rect.top)) / cell,
    };
  }

  // Same idea as applyZoom, but for an ongoing pinch: the world point is
  // captured ONCE at the start of the gesture and passed in on every move,
  // rather than re-derived from the viewport's current scrollLeft/scrollTop
  // each time — a pinch reports each finger's movement as a separate
  // pointermove, so re-deriving the world point from a "half-updated"
  // finger pair on every single event would drift.
  function zoomToWorldPoint(newZoomRaw, worldX, worldY, clientX, clientY){
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoomRaw));
    const vp = viewportRef.current;
    if (!vp) { zoomRef.current = newZoom; setZoom(newZoom); return; }
    const rect = vp.getBoundingClientRect();
    const focusX = clientX - rect.left, focusY = clientY - rect.top;
    const newCell = CELL * newZoom;
    zoomRef.current = newZoom;
    pendingScrollRef.current = { left: worldX*newCell - focusX, top: worldY*newCell - focusY };
    setZoom(newZoom);
    setScrollTick(t => t+1);
  }

  // React's onWheel prop is attached passively, so preventDefault inside it
  // is silently ignored (the viewport would natively scroll on top of our
  // zoom). Attaching the native listener ourselves with passive:false fixes
  // that — has to be a plain useEffect, not the JSX onWheel prop.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.addEventListener('wheel', onWheel, {passive:false});
    return () => vp.removeEventListener('wheel', onWheel);
  });

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
    const c = Math.floor((e.clientX - rect.left) / effectiveCell);
    const r = Math.floor((e.clientY - rect.top) / effectiveCell);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;

    // Vision mode: selecting a token shows its detail window instead of
    // doing the normal action (here: movement selection) — never falls
    // through to the movement logic below.
    if (visionMode) {
      const here = players.filter(p => p.row === r && p.col === c);
      if (here.length === 1) setVisionPlayerId(here[0].id);
      else if (here.length > 1) setCellPicker({clientX:e.clientX, clientY:e.clientY, ids:here.map(p=>p.id), forVision:true});
      return;
    }

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
    if (here.length === 1) {
      setSelectedId(here[0].id);
    } else if (here.length > 1) {
      setCellPicker({clientX:e.clientX, clientY:e.clientY, ids:here.map(p=>p.id), forVision:false});
    }
  }

  function pickFromCellPicker(id){
    if (cellPicker?.forVision) setVisionPlayerId(id);
    else setSelectedId(id);
    setCellPicker(null);
  }

  // Mouse click-drag panning (desktop). Touch single-finger panning is
  // handled natively by the viewport's own overflow scroll — the mouse
  // branch here only kicks in for mouse pointers so it never fights with
  // that native touch scrolling. A second touch pointer starts a pinch
  // instead (see pointersRef below), which the browser won't try to
  // natively zoom since touchAction is restricted to pan-x/pan-y.
  const pointersRef = useRef(new Map());

  function onViewportPointerDown(e){
    if (e.pointerType === 'mouse') {
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
      return;
    }

    if (e.pointerType === 'touch') {
      pointersRef.current.set(e.pointerId, {x:e.clientX, y:e.clientY});
      if (pointersRef.current.size === 2) {
        try { e.target.setPointerCapture?.(e.pointerId); } catch {}
        const pts = [...pointersRef.current.values()];
        const dist = Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y);
        const midX = (pts[0].x+pts[1].x)/2, midY = (pts[0].y+pts[1].y)/2;
        pinchRef.current = {
          startDist: dist, startZoom: zoomRef.current,
          world: worldPointAt(midX, midY)
        };
      }
    }
  }

  function onViewportPointerMove(e){
    if (e.pointerType !== 'touch' || !pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if (pointersRef.current.size === 2 && pinchRef.current) {
      e.preventDefault();
      const pts = [...pointersRef.current.values()];
      const dist = Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y);
      const ratio = dist / pinchRef.current.startDist;
      const midX = (pts[0].x+pts[1].x)/2, midY = (pts[0].y+pts[1].y)/2;
      zoomToWorldPoint(pinchRef.current.startZoom * ratio, pinchRef.current.world.x, pinchRef.current.world.y, midX, midY);
    }
  }

  function onViewportPointerUp(e){
    if (e.pointerType !== 'touch') return;
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
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

  // Entering Vision mode clears any pending movement selection — a
  // lingering blue glow from before the toggle would otherwise sit there
  // with no way to clear it, since grid clicks in Vision mode open the
  // detail window instead of touching selectedId at all.
  function toggleVisionMode(){
    if (!visionMode) setSelectedId(null);
    setVisionMode(!visionMode);
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
    zoomRef.current = 1;
    setZoom(1);
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
      background: visionMode ? 'rgba(15,25,35,.97)' : 'rgba(20,20,20,.97)',
      borderBottom:`1px solid ${borderColor(visionMode,'rgba(255,255,255,.08)')}`, zIndex:20, transition:'background .3s, border-color .3s'}},
      h('button', {onClick:onBack, style:{background:'none', border:`1px solid ${borderColor(visionMode,'#333')}`, borderRadius:6, color:'#aaa', padding:'6px 12px', fontSize:12}}, '← Retour'),
      h('h2', {style:{margin:0, fontSize:16, color:'#eee', flex:1}}, '🎮 Plateau'),
      h('div', {ref:resetAnchorRef, style:{position:'relative'}},
        h('button', {onClick:()=>setShowReset(!showReset), style:{background:'none', border:`1px solid ${borderColor(visionMode,'#333')}`, borderRadius:6, color:'#a55', padding:'6px 10px', fontSize:12}}, '⟲ Reset'),
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

    // GRID VIEWPORT (scrollable / pannable / zoomable)
    h('div', {
      ref:viewportRef,
      onPointerDown:onViewportPointerDown,
      onPointerMove:onViewportPointerMove,
      onPointerUp:onViewportPointerUp,
      onPointerCancel:onViewportPointerUp,
      style:{flex:1, overflow:'auto', position:'relative', touchAction:'pan-x pan-y', cursor:'grab'}
    },
      h('div', {
        ref:contentRef,
        onClick:onContentClick,
        style:{
          width:COLS*CELL, height:ROWS*CELL, position:'relative',
          transform:`scale(${zoom})`, transformOrigin:'0 0',
          ...GRID_BG
        }
      },
        h('div', {
          className: visionFlashCls,
          style:{
            position:'absolute', inset:0, pointerEvents:'none',
            opacity: visionMode ? 0.25 : 0,
            ...VISION_GRID_BG
          }
        }),
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

    // MULTI-PLAYER CELL PICKER — several players sharing a cell means a
    // plain click can't tell which one you mean, so a small popup asks.
    // Positioned at the raw click coordinates (outside the pannable/zoomed
    // content, no transform math needed).
    cellPicker && h('div', {
      ref:cellPickerAnchorRef,
      style:{position:'fixed', left:cellPicker.clientX, top:cellPicker.clientY, zIndex:250}
    },
      h(Popup, {
        onClose:()=>setCellPicker(null),
        anchorRef:cellPickerAnchorRef,
        style:{left:0, top:0},
        items: cellPicker.ids.map(id => {
          const p = players.find(pl => pl.id === id);
          return {label:p.nom, dot:p.couleur, onClick:()=>pickFromCellPicker(id)};
        })
      })
    ),

    // VISION MODE — clicking a token opens its full detail window instead
    // of selecting it for movement. Same "closes on outside click" rule as
    // every other popup, plus an explicit red ✕ since it's a big window.
    // This is the future home of the player's sorts/énergies cards.
    visionPlayerId && (() => {
      const p = players.find(pl => pl.id === visionPlayerId);
      if (!p) return null;
      return h('div', {style:{position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:260, display:'flex', alignItems:'center', justifyContent:'center'}},
        h('div', {ref:visionModalAnchorRef, style:{position:'relative'}},
          h(Popup, {
            onClose:()=>setVisionPlayerId(null),
            anchorRef:visionModalAnchorRef,
            style:{position:'relative', width:'min(90vw,380px)', maxHeight:'80vh', overflow:'auto', padding:20},
            children: h('div', {},
              h('div', {
                onClick:()=>setVisionPlayerId(null),
                style:{position:'absolute', top:8, right:8, width:26, height:26, borderRadius:'50%',
                  background:'rgba(220,60,40,.2)', border:'1px solid rgba(220,60,40,.5)', color:'#f66',
                  display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:14}
              }, '✕'),
              h('div', {style:{fontSize:18, fontWeight:700, color:'#eee', marginBottom:14, paddingRight:30}}, p.nom),
              h('div', {style:{display:'flex', alignItems:'center', gap:10, marginBottom:16}},
                h('div', {style:{position:'relative', width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}},
                  h('div', {style:{position:'absolute', fontSize:36}}, '❤️'),
                  h('div', {style:{position:'relative', fontSize:14, fontWeight:700, color:'#fff'}}, p.pv)
                ),
                h('span', {style:{fontSize:12, color:'#888'}}, 'Points de vie')
              ),
              h('hr', {style:{border:'none', borderTop:'1px solid rgba(255,255,255,.1)', margin:'12px 0'}}),
              h('div', {style:{fontSize:12, color:'#666'}}, 'Sorts & Énergies — bientôt disponible')
            )
          })
        )
      );
    })(),

    // FOOTER (sticky) — dice / PV heart, with room left for sorts & énergies
    // (between dice and heart) once those exist, and the Vision mode toggle
    // just left of the player-switch arrow
    h('div', {style:{flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'10px 14px', background: visionMode ? 'rgba(15,25,35,.97)' : 'rgba(20,20,20,.97)',
      borderTop:`1px solid ${borderColor(visionMode,'rgba(255,255,255,.08)')}`, zIndex:20, transition:'background .3s, border-color .3s'}},
      h('button', {onClick:()=>switchPlayer(-1), disabled:players.length<2, style:navBtnStyle(players.length>1, visionMode)}, '‹'),

      h('div', {style:{display:'flex', alignItems:'center', gap:10}},
        current ? h('button', {onClick:()=>rollDice(current.id), style:{background:'rgba(255,255,255,.06)', border:`1px solid ${borderColor(visionMode,'#444')}`, borderRadius:6, color:'#eee', padding:'6px 12px', fontSize:13}},
          current.dice ? `🎲 ${current.dice}` : '🎲'
        ) : h('button', {disabled:true, style:{background:'rgba(255,255,255,.03)', border:'1px solid #333', borderRadius:6, color:'#444', padding:'6px 12px', fontSize:13}}, '🎲'),
        current ? h('div', {style:{display:'flex', alignItems:'center', gap:4}},
          h('button', {onClick:()=>updatePv(current.id,-1), style:pvBtnStyle(visionMode)}, '−'),
          h('div', {style:{position:'relative', width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center'}},
            h('div', {style:{position:'absolute', fontSize:30}}, '❤️'),
            h('div', {style:{position:'relative', fontSize:12, fontWeight:700, color:'#fff'}}, current.pv)
          ),
          h('button', {onClick:()=>updatePv(current.id,1), style:pvBtnStyle(visionMode)}, '+')
        ) : h('div', {onClick:addPlayer, style:{fontSize:11, color:'#777', cursor:'pointer', textDecoration:'underline'}}, 'Ajoute un joueur')
      ),

      h('div', {style:{display:'flex', alignItems:'center', gap:8}},
        h('button', {
          onClick:toggleVisionMode,
          title:'Mode Vision',
          style:{
            background: visionMode ? 'rgba(79,163,255,.15)' : 'rgba(255,255,255,.06)',
            border:`1px solid ${visionMode ? 'rgba(79,163,255,.7)' : '#444'}`,
            borderRadius:8, color: visionMode ? '#9cf' : '#eee', width:40, height:40, fontSize:18,
            boxShadow: visionMode ? '0 0 10px 2px rgba(79,163,255,.5)' : 'none', transition:'all .3s'
          }
        }, '👁️'),
        h('button', {onClick:()=>switchPlayer(1), disabled:players.length<2, style:navBtnStyle(players.length>1, visionMode)}, '›')
      )
    )
  );
}

function navBtnStyle(enabled, vision){
  return {background:'rgba(255,255,255,.06)', border:`1px solid ${borderColor(vision, '#444')}`, borderRadius:8, color: enabled?'#eee':'#444',
    width:40, height:40, fontSize:26, lineHeight:1, cursor: enabled?'pointer':'default'};
}
function pvBtnStyle(vision){
  return {background:'rgba(255,255,255,.06)', border:`1px solid ${borderColor(vision, '#444')}`, borderRadius:6, color:'#eee', width:24, height:24, fontSize:14, lineHeight:1};
}
