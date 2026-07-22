import { h, useState, useEffect, useLayoutEffect, useRef } from "../react.js";
import { uid, useVisionFlash } from "../utils.js";
import { EditText } from "../components/EditText.js";
import { AddBtn } from "../components/AddBtn.js";
import { Popup } from "../components/Popup.js";
import { UndoRedo } from "../components/UndoRedo.js";

// Live game session (grid, players, PV, dice, tiles) — a "confort visuel"
// only, never an authoritative rules arbiter (see CLAUDE.md). Kept out of
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

// Thin-stroke SVG icons for the tile controls, replacing emoji (⟳/↕️): an
// emoji glyph's visual weight isn't centered in its own character box the
// same way across fonts/platforms, which is why the rotate button's arrow
// looked off-center inside its circle — an SVG with an explicit viewBox is
// always centered exactly the same way everywhere. `currentColor` picks up
// the button's own `color` style, so the red discard button's icon (if it
// ever needs one) would tint automatically too.
function RotateIcon(){
  return h('svg', {width:14, height:14, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2.4, strokeLinecap:'round', strokeLinejoin:'round'},
    h('path', {d:'M21 12a9 9 0 1 1-3-6.7'}),
    h('polyline', {points:'21 3 21 9 15 9'})
  );
}
function FlipIcon(){
  return h('svg', {width:14, height:14, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2.4, strokeLinecap:'round', strokeLinejoin:'round'},
    h('line', {x1:12, y1:2, x2:12, y2:22}),
    h('polyline', {points:'7 7 12 2 17 7'}),
    h('polyline', {points:'7 17 12 22 17 17'})
  );
}

function shuffle(arr){
  const a = [...arr];
  for (let i = a.length-1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Placeholder deck: 100 identical "Case" tiles for now, so the draw/place/
// rotate/split/shuffle mechanics can be built and tested before wiring in
// the real thing — reading data.cases (only "Validé" entries, one card per
// `quantite`) so editing the catalog and starting a new game is all it
// takes to change what's in the deck. Same plan later for sorts/énergies —
// each deck type gets its own pile.type so piles can only merge same-type.
function makeInitialDeck(){
  return shuffle(Array.from({length:100}, () => ({id:uid()})));
}

// A real card square: black back, white front with a black cross, flipped
// via a simple rotateY. Reused for the pile stack, the held tile, the
// défausse (always shown face-up), and tiles on the board.
function CardFace({showBack, size}) {
  return h('div', {style:{width:size, height:size, position:'relative', perspective:600}},
    h('div', {style:{
      position:'absolute', inset:0, transformStyle:'preserve-3d',
      transition:'transform .3s', transform: showBack ? 'rotateY(0deg)' : 'rotateY(180deg)'
    }},
      h('div', {style:{position:'absolute', inset:0, borderRadius:6, background:'#111',
        border:'1px solid #333', backfaceVisibility:'hidden'}}),
      h('div', {style:{position:'absolute', inset:0, borderRadius:6, background:'#fff',
        border:'1px solid #ccc', backfaceVisibility:'hidden', transform:'rotateY(180deg)',
        display:'flex', alignItems:'center', justifyContent:'center'}},
        h('div', {style:{fontSize:size*0.5, color:'#111', fontWeight:900, lineHeight:1}}, '+')
      )
    )
  );
}

// A pioche: click flips the top card in place to reveal it and holds it
// "in hand" (see drawFromPile) — clicking the SAME pile again while holding
// puts it back and flips it back down. Long-press arms it (blue glow) and
// opens a Diviser/Mélanger menu, and clicking a DIFFERENT pile while one is
// armed merges the armed one into it (shuffled, same type only) — that's
// how you reunite piles after splitting them apart. While a card is
// selected elsewhere (a placed tile, or the top of the défausse), clicking
// a pile instead opens a Dessus/Dessous menu to insert that card into it.
function PileStack({pile, holding, armedId, armedIdRef, hasSelectedCard, onArm, onDisarm, onDraw, onSplit, onShuffle, onMergeInto, onInsertSelected}) {
  const anchorRef = useRef(null);
  const pressTimer = useRef(null);
  const pendingArmedRef = useRef(null);
  const [showSplitMenu, setShowSplitMenu] = useState(false);
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const isArmed = armedId === pile.id;

  // Captures "what's armed right now" at pointerdown time, not click time.
  // Clicking a merge target fires (in order): this pile's own onPointerDown
  // (React delegates to the root container, reached first in the bubble
  // phase) → the ARMED pile's Popup outside-click listener (attached
  // directly on `document`, reached later in the same bubble) → pointerup
  // → click. That Popup listener disarms the source pile the moment this
  // pointerdown bubbles past it, so by the time 'click' fires here,
  // armedIdRef.current has already gone back to null — reading it in
  // handleClick (as a first attempt did) sees the merge target arrive
  // "un-armed" and silently falls through to a plain draw instead. Reading
  // it here, one step earlier, catches the real value before that disarm.
  function onPointerDown(){
    pendingArmedRef.current = armedIdRef.current;
    startPress();
  }
  // Captures the anchor's on-screen position when a menu opens, so the
  // popup can render `position:fixed` there (see the render below for why).
  function menuPosNow(){
    const r = anchorRef.current.getBoundingClientRect();
    return {left:r.left, top:r.bottom+6};
  }
  function startPress(){
    if (hasSelectedCard) return; // a quick click here means "insert", not "arm"
    pressTimer.current = setTimeout(() => {
      setMenuPos(menuPosNow());
      setShowSplitMenu(true);
      onArm(pile.id);
    }, 500);
  }
  function cancelPress(){
    clearTimeout(pressTimer.current);
  }
  function handleClick(e){
    e.stopPropagation(); // don't let this bubble into the header's "click elsewhere deselects" handler
    if (showSplitMenu) return; // the click that follows a long-press shouldn't also draw
    const armed = pendingArmedRef.current;
    if (armed && armed !== pile.id) { onMergeInto(armed, pile.id); return; }
    if (hasSelectedCard) { setMenuPos(menuPosNow()); setShowInsertMenu(true); return; }
    onDraw(pile.id);
  }
  function closeSplitMenu(){
    setShowSplitMenu(false);
    onDisarm();
  }

  return h('div', {ref:anchorRef, style:{position:'relative', flexShrink:0}},
    h('div', {
      onPointerDown, onPointerUp:cancelPress, onPointerLeave:cancelPress, onPointerCancel:cancelPress,
      onClick:handleClick,
      style:{
        width:56, height:56, borderRadius:8, cursor:'pointer', position:'relative',
        boxShadow: isArmed ? '0 0 10px 3px rgba(79,163,255,.6)' : 'none',
        outline: isArmed ? '2px solid #4fa3ff' : 'none',
        transition:'box-shadow .2s, outline-color .2s'
      }
    },
      // perspective stack: two offset squares behind the top card
      h('div', {style:{position:'absolute', left:5, top:5, width:52, height:52, borderRadius:6, background:'#151515', border:'1px solid #333'}}),
      h('div', {style:{position:'absolute', left:2, top:2, width:52, height:52, borderRadius:6, background:'#1a1a1a', border:'1px solid #383838'}}),
      h('div', {style:{position:'absolute', left:0, top:0}}, h(CardFace, {showBack: !holding, size:52})),
      h('div', {style:{position:'absolute', bottom:-4, right:-4, fontSize:9, fontWeight:700, color:'#fff',
        background:'rgba(0,0,0,.7)', borderRadius:8, padding:'1px 5px', border:'1px solid #444'}}, pile.cards.length)
    ),
    // `position:'fixed'` (overriding the shared .popup class's own
    // `position:absolute`) at a JS-computed screen position, instead of
    // anchor-relative `top:'100%'`: the header's pile row sets
    // `overflowX:'auto'` for horizontal scrolling when there are many
    // piles, and per the CSS overflow spec, setting overflow-x to anything
    // other than 'visible' silently forces overflow-y to 'auto' too (the
    // browser refuses the "mixed" combination) — so this popup, anchored
    // *inside* that row and extending below it, was being invisibly
    // clipped by the row's own now-vertical overflow, exactly like an
    // ordinary z-index problem but untouched by the earlier header
    // `position:relative`/z-index fix (that fix was for a different
    // layer — grid vs. header — not this overflow clipping). `fixed`
    // positioning escapes ancestor overflow clipping entirely (as long as
    // no ancestor has a `transform`, which none here do), the same
    // technique already used for the cellPicker/Vision modal.
    showSplitMenu && h(Popup, {
      onClose:closeSplitMenu,
      anchorRef,
      style:{position:'fixed', left:menuPos?.left, top:menuPos?.top, width:130, zIndex:280},
      items:[
        {label:'✂️ Diviser', onClick:()=>onSplit(pile.id)},
        {label:'🔀 Mélanger', onClick:()=>onShuffle(pile.id)},
      ]
    }),
    showInsertMenu && h(Popup, {
      onClose:()=>setShowInsertMenu(false),
      anchorRef,
      style:{position:'fixed', left:menuPos?.left, top:menuPos?.top, width:150, zIndex:280},
      items:[
        {label:'⬆️ Dessus', onClick:()=>onInsertSelected(pile.id, 'top')},
        {label:'⬇️ Dessous', onClick:()=>onInsertSelected(pile.id, 'bottom')},
      ]
    })
  );
}

// The défausse: shows its top card face-up (it's already known, no flip
// needed) instead of an empty slot. A quick tap either merges an armed
// pile into it, discards the currently-selected grid tile into it,
// selects/deselects its own top card (to place it back on the grid or
// feed it into a pile), or does nothing if it's empty. Long-press arms
// the WHOLE défausse instead (same blue glow as an armed pile, using the
// same shared `armPile('discard')`/`armedIdRef` mechanism) — clicking a
// pioche afterward reshuffles the whole défausse into it, letting you
// recycle discarded cards back into circulation without picking them up
// one at a time. Mirrors PileStack's own long-press-to-arm structure.
function DiscardSlot({cards, selectedId, armedId, armedIdRef, hasSelectedTile, onArm, onDisarm, onMergeInto, onShuffleInPlace, onDiscardSelectedTile, onToggleSelect}) {
  const anchorRef = useRef(null);
  const pressTimer = useRef(null);
  const pendingArmedRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const topCard = cards.length ? cards[cards.length-1] : null;
  const isSelected = topCard && selectedId === topCard.id;
  const isArmed = armedId === 'discard';

  function onPointerDown(){
    pendingArmedRef.current = armedIdRef.current;
    startPress();
  }
  function startPress(){
    if (cards.length === 0 || hasSelectedTile) return; // nothing to arm / a quick tap here means "discard the selection" instead
    pressTimer.current = setTimeout(() => {
      const r = anchorRef.current.getBoundingClientRect();
      setMenuPos({left:r.left, top:r.bottom+6});
      setShowMenu(true);
      onArm('discard');
    }, 500);
  }
  function cancelPress(){
    clearTimeout(pressTimer.current);
  }
  function handleClick(e){
    e.stopPropagation();
    if (showMenu) return; // the click that follows a long-press shouldn't also act
    const armed = pendingArmedRef.current;
    if (armed) { onMergeInto(armed, 'discard'); return; }
    if (hasSelectedTile) { onDiscardSelectedTile(); return; }
    if (topCard) onToggleSelect(topCard.id);
  }
  function closeMenu(){
    setShowMenu(false);
    onDisarm();
  }

  return h('div', {ref:anchorRef, style:{position:'relative', flexShrink:0}},
    h('div', {
      onPointerDown, onPointerUp:cancelPress, onPointerLeave:cancelPress, onPointerCancel:cancelPress,
      onClick:handleClick,
      style:{
        width:56, height:56, borderRadius:8, cursor:'pointer', position:'relative',
        border: topCard ? 'none' : '2px dashed #444',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow: (isSelected || isArmed) ? '0 0 10px 3px rgba(79,163,255,.6)' : 'none',
        outline: (isSelected || isArmed) ? '2px solid #4fa3ff' : 'none',
        transition:'box-shadow .2s, outline-color .2s'
      }
    },
      topCard && h(CardFace, {showBack:false, size:52}),
      cards.length > 0 && h('div', {style:{position:'absolute', bottom:-4, right:-4, fontSize:9, fontWeight:700, color:'#fff',
        background:'rgba(0,0,0,.7)', borderRadius:8, padding:'1px 5px', border:'1px solid #444'}}, cards.length)
    ),
    // See PileStack's identical comment: `position:'fixed'` at a
    // JS-computed screen position, not anchor-relative `top:'100%'` —
    // otherwise the header pile row's `overflowX:'auto'` (which forces
    // overflow-y to 'auto' too, per spec) invisibly clips this menu.
    showMenu && h(Popup, {
      onClose:closeMenu,
      anchorRef,
      style:{position:'fixed', left:menuPos?.left, top:menuPos?.top, width:150, zIndex:280},
      items:[
        {label:'🔀 Mélanger', onClick:onShuffleInPlace},
      ]
    })
  );
}

// `size` shrinks the whole square (and every sub-element proportionally)
// when the sidebar doesn't have enough vertical room for everyone at the
// default 64px — see sizing logic in PlateauPage, right below the header/
// footer height measurement.
function PlayerSquare({player, isCurrent, size=64, onRemove, onRename}) {
  const [showInfo, setShowInfo] = useState(false);
  const anchorRef = useRef(null);
  const scale = size/64;

  return h('div', {ref:anchorRef, style:{position:'relative', pointerEvents:'auto'}},
    h('div', {
      onClick: () => setShowInfo(!showInfo),
      style: {
        width:size, height:size, borderRadius:10*scale, background:player.couleur,
        display:'flex', alignItems:'center', justifyContent:'center',
        position:'relative', cursor:'pointer', overflow:'hidden',
        boxShadow: isCurrent ? '0 0 0 2px #fff, 0 0 10px 3px #4fa3ff' : '0 2px 6px rgba(0,0,0,.4)'
      }
    },
      h('div', {style:{fontSize:26*scale, fontWeight:700, color:'rgba(255,255,255,.85)'}}, player.nom.slice(0,1).toUpperCase()),
      h('div', {
        onClick: e => { e.stopPropagation(); onRemove(); },
        style:{position:'absolute', top:2, left:2, width:15*scale, height:15*scale, borderRadius:'50%', background:'rgba(0,0,0,.55)',
          color:'#ccc', fontSize:9*scale, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}
      }, '✕'),
      h('div', {style:{position:'absolute', top:-2, right:-4, fontSize:22*scale}}, '❤️'),
      h('div', {style:{position:'absolute', top:2, right:2, fontSize:10*scale, fontWeight:700, color:'#fff', minWidth:14*scale, textAlign:'center'}}, player.pv),
      h('div', {style:{position:'absolute', bottom:0, left:0, right:0, background:'rgba(0,0,0,.6)', padding:'2px 4px'}},
        h('div', {style:{fontSize:9*scale, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}},
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
  const [cellPicker, setCellPicker] = useState(null); // {clientX, clientY, ids:[...], forVision}
  const [visionPlayerId, setVisionPlayerId] = useState(null);
  const [piles, setPiles] = useState(saved?.piles || [{id:uid(), type:'case', cards:makeInitialDeck()}]);
  const [discardCards, setDiscardCards] = useState(saved?.discardCards || []);
  const [placedTiles, setPlacedTiles] = useState(saved?.placedTiles || []);
  const [heldTile, setHeldTile] = useState(null);
  const [armedPileId, setArmedPileId] = useState(null);
  const [selectedTileId, setSelectedTileId] = useState(null);
  // 'placed' (right after placing a fresh tile) only allows rotating it —
  // no flip/discard buttons, and tapping elsewhere just deselects instead
  // of moving it, so a stray tap right after placement can't send it flying
  // before you've had a chance to orient it. 'moving' (a tile picked up via
  // double-click, or re-selected) behaves as before: all 3 buttons, and a
  // tap elsewhere moves it. Kept in sync with selectedTileId everywhere
  // that's set/cleared — see clearTileSelection below.
  const [selectedTileMode, setSelectedTileMode] = useState(null);
  const [selectedDiscardCardId, setSelectedDiscardCardId] = useState(null);
  const armedPileIdRef = useRef(null);
  // handleSingleClick can run from a setTimeout scheduled well before its
  // own execution (the click/double-click debounce below) — by the time it
  // fires, a DIFFERENT click that arrived in between may already have
  // updated state (e.g. selecting a player). A `setTimeout` callback's
  // closure is fixed at creation time and never "sees" later re-renders,
  // so reading `selectedId`/`players`/etc. directly inside it can act on
  // data that's already stale by the time it actually runs. `liveRef` is
  // refreshed every render (no dependency array) and read from instead,
  // exactly like `armedPileIdRef` above solves the same problem for pile
  // arming/merging.
  const liveRef = useRef({});
  useEffect(() => {
    liveRef.current = { visionMode, heldTile, selectedDiscardCardId, selectedTileId, selectedTileMode, selectedId, players, placedTiles, discardCards, piles };
  });
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const resetAnchorRef = useRef(null);
  const cellPickerAnchorRef = useRef(null);
  const visionModalAnchorRef = useRef(null);

  function armPile(id){
    armedPileIdRef.current = id;
    setArmedPileId(id);
  }
  function disarmPile(){
    armedPileIdRef.current = null;
    setArmedPileId(null);
  }
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
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({players, currentIndex, piles, discardCards, placedTiles})); } catch {}
  }, [players, currentIndex, piles, discardCards, placedTiles]);

  // Grid starts centered on (0,0) — the middle of the board, so there's
  // equal room to move in every direction from where players spawn —
  // rather than the native top-left scroll origin.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.scrollLeft = CENTER_COL*effectiveCell - vp.clientWidth/2;
    vp.scrollTop = CENTER_ROW*effectiveCell - vp.clientHeight/2;
  }, []);

  // The player sidebar used to be centered on the FULL viewport height
  // (top:'50%') regardless of how tall the header/footer actually are —
  // with enough players (or just a header that grew a second row of
  // piles), the column's own height could push its top past the header's
  // bottom edge, overlapping it, or push players off the bottom of the
  // screen entirely, with nothing to catch the overflow. The grid viewport
  // sits in exactly the space between header and footer already, so its
  // own bounding rect gives us that space for free — no separate header/
  // footer refs needed. Re-measured on resize (and once after mount, since
  // fonts/first layout can nudge header height by a pixel or two).
  const [sidebarBounds, setSidebarBounds] = useState({top:0, bottom:0});
  useEffect(() => {
    function measure(){
      const vp = viewportRef.current;
      if (!vp) return;
      const rect = vp.getBoundingClientRect();
      setSidebarBounds({top:rect.top, bottom: window.innerHeight - rect.bottom});
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
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

  // Snapshots the board's full persisted state (players + piles + défausse
  // + placed tiles + whatever's currently held from a pile) as ONE combined
  // history entry, then applies `updates` (any subset of those five keys).
  // Previously only `players` was tracked (via the old commitPlayers),
  // which is why undo worked for adding/removing players but not for
  // moving/rotating/discarding a tile — this generalizes the same pattern
  // to cover every board mutation with a single shared undo/redo stack.
  // Reads the "before" snapshot from liveRef rather than the closure
  // variables directly, since this can be called from handleSingleClick
  // after it's resumed from a stale setTimeout closure (see liveRef's own
  // comment above) — pushing a stale snapshot would silently corrupt
  // undo/redo. `heldTile` is included even though it's otherwise treated
  // as transient, non-undoable UI state (drawing/cancelling a card doesn't
  // itself push a history entry): capturing it here is what makes undoing
  // a PLACEMENT put the card back in hand instead of leaking it — the
  // snapshot taken right before a placement naturally already shows that
  // card as held, so restoring it is exactly "pick it back up".
  function commitBoard(updates){
    const live = liveRef.current;
    pastRef.current.push({
      players: live.players, piles: live.piles, discardCards: live.discardCards,
      placedTiles: live.placedTiles, heldTile: live.heldTile
    });
    if (pastRef.current.length > MAX_HISTORY) pastRef.current.shift();
    futureRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
    if ('players' in updates) setPlayers(updates.players);
    if ('piles' in updates) setPiles(updates.piles);
    if ('discardCards' in updates) setDiscardCards(updates.discardCards);
    if ('placedTiles' in updates) setPlacedTiles(updates.placedTiles);
    if ('heldTile' in updates) setHeldTile(updates.heldTile);
  }

  function commitPlayers(next){
    commitBoard({players:next});
  }

  function applySnapshot(snap){
    setPlayers(snap.players);
    setPiles(snap.piles);
    setDiscardCards(snap.discardCards);
    setPlacedTiles(snap.placedTiles);
    setHeldTile(snap.heldTile);
  }

  function currentSnapshot(){
    const live = liveRef.current;
    return { players: live.players, piles: live.piles, discardCards: live.discardCards, placedTiles: live.placedTiles, heldTile: live.heldTile };
  }

  function undo(){
    if (pastRef.current.length === 0) return;
    const prev = pastRef.current.pop();
    futureRef.current.push(currentSnapshot());
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(true);
    applySnapshot(prev);
  }

  function redo(){
    if (futureRef.current.length === 0) return;
    const next = futureRef.current.pop();
    pastRef.current.push(currentSnapshot());
    setCanRedo(futureRef.current.length > 0);
    setCanUndo(true);
    applySnapshot(next);
  }

  function nextColor(){
    const used = new Set(players.map(p => p.couleur));
    return PALETTE.find(c => !used.has(c)) || PALETTE[players.length % PALETTE.length];
  }

  // `players.length+1` collided with an existing name once a player in the
  // middle got removed (4 players, remove #1, add one → 3 left named
  // 2/3/4, but length+1 still said "4" too) — find the lowest "Joueur N"
  // not currently in use instead of just counting how many players remain.
  function nextPlayerName(){
    const used = new Set(players.map(p => {
      const m = p.nom.match(/^Joueur (\d+)$/);
      return m ? parseInt(m[1], 10) : null;
    }).filter(n => n !== null));
    let n = 1;
    while (used.has(n)) n++;
    return `Joueur ${n}`;
  }

  function addPlayer(){
    commitPlayers([...players, {id:uid(), nom:nextPlayerName(), couleur:nextColor(), pv:DEFAULT_PV, row:CENTER_ROW, col:CENTER_COL, dice:null}]);
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

  function clearTileSelection(){
    setSelectedTileId(null);
    setSelectedTileMode(null);
  }

  function rotateTile(tileId){
    const live = liveRef.current;
    commitBoard({placedTiles: live.placedTiles.map(t => t.id === tileId ? {...t, rotation:(t.rotation+90)%360} : t)});
  }

  function flipTile(tileId){
    const live = liveRef.current;
    commitBoard({placedTiles: live.placedTiles.map(t => t.id === tileId ? {...t, flipped:!t.flipped} : t)});
  }

  // Sends a placed tile to the défausse — always face-up there regardless
  // of the tile's own flipped state at the time (the défausse never stores
  // or tracks `flipped`, it just always renders face-up).
  function discardTile(tileId){
    const live = liveRef.current;
    commitBoard({
      placedTiles: live.placedTiles.filter(t => t.id !== tileId),
      discardCards: [...live.discardCards, {id:tileId}]
    });
    clearTileSelection();
  }

  function discardSelectedTile(){
    if (selectedTileId) discardTile(selectedTileId);
  }

  // Clicking the défausse's own top card selects/deselects it (toggle) —
  // it never needs to flip since it's already shown face-up.
  function toggleSelectDiscardCard(cardId){
    setSelectedDiscardCardId(prev => prev === cardId ? null : cardId);
    clearTileSelection();
    setSelectedId(null); // only one thing selected at a time
  }

  // Feeds the currently-selected card (a placed tile, or the défausse's top
  // card) into a pile, at whichever end was chosen in the Dessus/Dessous menu.
  function insertSelectedCardIntoPile(pileId, position){
    const live = liveRef.current;
    let cardId = null;
    const updates = {};
    if (live.selectedTileId) {
      cardId = live.selectedTileId;
      updates.placedTiles = live.placedTiles.filter(t => t.id !== live.selectedTileId);
    } else if (live.selectedDiscardCardId) {
      cardId = live.selectedDiscardCardId;
      updates.discardCards = live.discardCards.filter(cd => cd.id !== cardId);
    } else return;
    updates.piles = live.piles.map(p => p.id === pileId
      ? {...p, cards: position === 'top' ? [...p.cards, {id:cardId}] : [{id:cardId}, ...p.cards]}
      : p
    );
    commitBoard(updates);
    clearTileSelection();
    setSelectedDiscardCardId(null);
  }

  // Clears whatever card is selected (a placed tile or a défausse card) —
  // wired to header/footer background clicks, so tapping anywhere outside
  // the grid/piles also deselects, same spirit as every popup's "click
  // elsewhere closes it" rule.
  function clearCardSelection(){
    clearTileSelection();
    setSelectedDiscardCardId(null);
  }

  // Single click: player selection/movement, AND finishing whatever card
  // is currently in hand (a held pile draw, a selected défausse card, or a
  // tile already picked up via double-click) — placing/moving those only
  // ever needs one more tap once they're "in hand", double-click is
  // reserved purely for the initial pickup of an untouched placed tile
  // (see onContentDoubleClick/selectTileAt), so the two gestures never
  // compete for the same tap. Long-press is reserved for items (sorts/
  // énergies) once those exist on the board — not implemented yet, nothing
  // to select there today.
  function handleSingleClick(clientX, clientY){
    const rect = contentRef.current.getBoundingClientRect();
    const c = Math.floor((clientX - rect.left) / effectiveCell);
    const r = Math.floor((clientY - rect.top) / effectiveCell);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;

    // Reads everything through liveRef (always current), not the closure
    // variables directly — this can run from a setTimeout scheduled up to
    // 250ms earlier (see clickTimerRef below), and by execution time a
    // DIFFERENT click that landed in between may have already changed
    // selectedId/selectedTileId/etc. A stale closure read here was exactly
    // the "player AND a tile both stay selected" bug: the queued single
    // click ran using the pre-selection snapshot, so it re-selected the
    // player instead of moving it, leaving both it and an unrelated tile
    // selected for the next tap to stumble into.
    const live = liveRef.current;

    // Vision mode is inspect-only: no card ever moves while it's active (a
    // held/selected card just waits, untouched, until Vision is turned back
    // off) — only players can be inspected here.
    if (live.visionMode) {
      const here = live.players.filter(p => p.row === r && p.col === c);
      if (here.length === 1) setVisionPlayerId(here[0].id);
      else if (here.length > 1) setCellPicker({clientX, clientY, ids:here.map(p=>p.id), forVision:true});
      return;
    }

    // A card already "in hand" (drawn from a pile, taken from the défausse,
    // or a tile selected via double-click) only ever needed ONE gesture to
    // get there — so a single tap is enough to finish the job (place/move
    // it), same cell taps it back down/deselects. Double-click is reserved
    // purely for the initial "pick an already-placed tile up" gesture (see
    // onContentDoubleClick/selectTileAt) — moving a fifth of the time
    // trades off with re-selecting, on a grid where 1-cell moves are the
    // overwhelming majority, made this asymmetry the right one.
    if (live.heldTile) {
      if (live.placedTiles.some(t => t.row === r && t.col === c)) return; // one tile per cell
      commitBoard({placedTiles: [...live.placedTiles, {id:live.heldTile.cardId, row:r, col:c, rotation:0, flipped:false}], heldTile: null});
      // Lands in 'placed' mode — rotate-only, see the mode's own comment
      // above selectedTileMode's declaration — so it can be turned freely
      // right after placing without a stray tap sending it elsewhere.
      setSelectedTileId(live.heldTile.cardId);
      setSelectedTileMode('placed');
      return;
    }

    if (live.selectedDiscardCardId) {
      if (live.placedTiles.some(t => t.row === r && t.col === c)) return;
      const cardId = live.selectedDiscardCardId;
      commitBoard({
        discardCards: live.discardCards.filter(cd => cd.id !== cardId),
        placedTiles: [...live.placedTiles, {id:cardId, row:r, col:c, rotation:0, flipped:false}]
      });
      setSelectedDiscardCardId(null);
      setSelectedTileId(cardId);
      setSelectedTileMode('placed');
      return;
    }

    if (live.selectedTileId) {
      if (live.selectedTileMode === 'placed') {
        // Rotate-only mode: ANY tap just deselects (finalizing the
        // placement) — it never moves the tile, unlike 'moving' below.
        clearTileSelection();
        return;
      }
      const t = live.placedTiles.find(x => x.id === live.selectedTileId);
      if (t && t.row === r && t.col === c) { clearTileSelection(); return; } // same tile: deselect
      if (live.placedTiles.some(x => x.row === r && x.col === c)) return; // blocked: another tile there
      commitBoard({placedTiles: live.placedTiles.map(x => x.id === live.selectedTileId ? {...x, row:r, col:c} : x)});
      clearTileSelection();
      return;
    }

    if (live.selectedId) {
      const sel = live.players.find(p => p.id === live.selectedId);
      if (sel && sel.row === r && sel.col === c) { setSelectedId(null); return; }
      commitPlayers(live.players.map(p => p.id === live.selectedId ? {...p, row:r, col:c} : p));
      setSelectedId(null);
      return;
    }
    const here = live.players.filter(p => p.row === r && p.col === c);
    if (here.length === 1) setSelectedId(here[0].id);
    else if (here.length > 1) setCellPicker({clientX, clientY, ids:here.map(p=>p.id), forVision:false});
  }

  // Distinguishing a single click (select/move a player) from a double-click
  // (select the tuile under the cursor) on the same element requires a
  // short delay: a native 'click' fires for BOTH clicks of a dblclick, so
  // the first one is held back briefly — if a second click arrives in time
  // it's cancelled and 'onContentDoubleClick' takes over instead. Stores
  // {timer, row, col, clientX, clientY} rather than just the timer, so a
  // second click can tell whether it's really a double-click on the SAME
  // cell (cancel and hand off to onContentDoubleClick) or an unrelated
  // click on a DIFFERENT cell (see bug fix below).
  const clickTimerRef = useRef(null);

  // Bug fixed here: the previous version cancelled ANY pending single
  // click whenever a second click arrived within 250ms, regardless of
  // where — so a normal, fast "select a player, then tap where they
  // should go" always risked losing the first tap (its action silently
  // never ran) whenever the two taps landed under 250ms apart, which is a
  // completely ordinary pace during real play, not just a mis-click.
  // Symptom Gus hit: the player never actually moved, so it stayed
  // selected — and since a tile happened to be selected too from some
  // earlier action, the NEXT tap moved the tile instead of the player.
  // Fix: only treat a second click as "this might be a double-click" (and
  // let onContentDoubleClick decide) when it lands on the SAME cell as the
  // pending one. A second click on a DIFFERENT cell can't be part of the
  // same double-click gesture, so instead of dropping the first click, we
  // run it immediately (flush it) and then schedule the new one normally.
  function onContentClick(e){
    if (wasDraggingRef.current) { wasDraggingRef.current = false; return; }
    const clientX = e.clientX, clientY = e.clientY;
    const rect = contentRef.current.getBoundingClientRect();
    const col = Math.floor((clientX - rect.left) / effectiveCell);
    const row = Math.floor((clientY - rect.top) / effectiveCell);

    if (clickTimerRef.current) {
      const pending = clickTimerRef.current;
      clearTimeout(pending.timer);
      clickTimerRef.current = null;
      if (pending.row === row && pending.col === col) return; // genuine double-click: let onContentDoubleClick handle it alone
      handleSingleClick(pending.clientX, pending.clientY); // different cell: the earlier click was real, run it now instead of dropping it
    }

    clickTimerRef.current = {
      row, col, clientX, clientY,
      timer: setTimeout(() => {
        clickTimerRef.current = null;
        handleSingleClick(clientX, clientY);
      }, 250)
    };
  }

  function selectTileAt(r, c){
    const tile = placedTiles.find(t => t.row === r && t.col === c);
    if (!tile) return;
    if (players.some(p => p.row === r && p.col === c)) return; // occupied: not selectable
    setSelectedTileId(tile.id);
    setSelectedTileMode('moving');
    setSelectedDiscardCardId(null);
    setSelectedId(null); // only one thing selected at a time
  }

  function onContentDoubleClick(e){
    if (wasDraggingRef.current) { wasDraggingRef.current = false; return; }
    if (clickTimerRef.current) { clearTimeout(clickTimerRef.current.timer); clickTimerRef.current = null; }
    if (visionMode) return; // inspect-only: no new tile selection while Vision is active
    const rect = contentRef.current.getBoundingClientRect();
    const c = Math.floor((e.clientX - rect.left) / effectiveCell);
    const r = Math.floor((e.clientY - rect.top) / effectiveCell);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    selectTileAt(r, c);
  }

  // Clicking a pile draws (flips its top card face-up and holds it) unless
  // already holding a card FROM THIS SAME pile, in which case the click
  // cancels the hold: the card goes back and the pile flips back to its
  // back side. Holding a card from a different pile blocks further draws
  // until that one is resolved (placed, discarded, or cancelled).
  // Drawing/cancelling a hold is deliberately NOT pushed onto the undo
  // history (direct setState, no commitBoard) — it's better treated as a
  // pending selection than a committed action, exactly like selecting a
  // player isn't itself undoable either (only the eventual move is). This
  // stays fully correct even so: `heldTile` is part of every commitBoard
  // snapshot (see its own comment), so undoing the PLACEMENT that follows
  // a draw still puts the card back in your hand — nothing is ever lost,
  // there's just no separate undo step for the draw itself, matching how
  // "click the same pile again" already cancels a draw directly.
  function drawFromPile(pileId){
    if (heldTile) {
      if (heldTile.fromPileId === pileId) {
        const cardId = heldTile.cardId;
        setPiles(piles.map(p => p.id === pileId ? {...p, cards:[...p.cards, {id:cardId}]} : p));
        setHeldTile(null);
      }
      return;
    }
    const pile = piles.find(p => p.id === pileId);
    if (!pile || pile.cards.length === 0) return;
    const card = pile.cards[pile.cards.length-1];
    setPiles(piles.map(p => p.id === pileId ? {...p, cards:p.cards.slice(0,-1)} : p));
    setHeldTile({cardId:card.id, fromPileId:pileId});
    clearTileSelection();
    setSelectedDiscardCardId(null);
    setSelectedId(null); // only one thing selected at a time
  }

  // Cuts the pile into two, in place, no shuffle — the point is to be able
  // to deal from either half separately, not to re-randomize.
  function splitPile(pileId){
    const live = liveRef.current;
    const pile = live.piles.find(p => p.id === pileId);
    if (!pile || pile.cards.length < 2) return;
    const mid = Math.floor(pile.cards.length/2);
    commitBoard({piles: live.piles.flatMap(p => p.id === pileId
      ? [{...p, cards:p.cards.slice(0, mid)}, {id:uid(), type:p.type, cards:p.cards.slice(mid)}]
      : [p]
    )});
  }

  function shufflePile(pileId){
    const live = liveRef.current;
    commitBoard({piles: live.piles.map(p => p.id === pileId ? {...p, cards:shuffle(p.cards)} : p)});
  }

  // Merging two piles together (unlike splitting) does shuffle the result —
  // this is how you reunite piles you'd split apart earlier. Only piles of
  // the same card type can merge (irrelevant today with a single "case"
  // deck, but keeps sorts/énergie piles from mixing once those exist).
  // Takes the source pile id as an explicit argument (captured by the
  // target's own PileStack/DiscardSlot at pointerdown time — see their
  // comments) rather than reading armedPileIdRef here: by the time this
  // runs, the source pile's own popup has already disarmed it via the
  // outside-click listener (which fires on the target's pointerdown,
  // earlier than this click), so re-deriving the source from that ref at
  // this point would already read back null too. The défausse can now be
  // armed too (long-press, see DiscardSlot) — `sourceId === 'discard'`
  // pulls from `discardCards` instead of `piles`, and (same as the
  // existing merge-INTO-discard exception) skips the same-type check since
  // the défausse doesn't track a type of its own.
  function mergeArmedInto(sourceId, targetPileId){
    const live = liveRef.current;
    if (!sourceId || sourceId === targetPileId) return;
    if (sourceId === 'discard') {
      const target = live.piles.find(p => p.id === targetPileId);
      if (!target) return;
      commitBoard({
        piles: live.piles.map(p => p.id === targetPileId ? {...p, cards:shuffle([...p.cards, ...live.discardCards])} : p),
        discardCards: []
      });
      disarmPile();
      return;
    }
    const source = live.piles.find(p => p.id === sourceId);
    if (!source) return;
    if (targetPileId === 'discard') {
      commitBoard({
        discardCards: shuffle([...live.discardCards, ...source.cards]),
        piles: live.piles.filter(p => p.id !== sourceId)
      });
    } else {
      const target = live.piles.find(p => p.id === targetPileId);
      if (!target || target.type !== source.type) return;
      commitBoard({piles: live.piles
        .filter(p => p.id !== sourceId)
        .map(p => p.id === targetPileId ? {...p, cards:shuffle([...p.cards, ...source.cards])} : p)
      });
    }
    disarmPile();
  }

  function shuffleDiscardInPlace(){
    commitBoard({discardCards: shuffle(liveRef.current.discardCards)});
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

  // Entering Vision mode clears any pending movement/card selection — a
  // lingering blue glow from before the toggle would otherwise sit there
  // with no way to clear it, since grid clicks in Vision mode open the
  // detail window instead of touching selection state at all. A held tile
  // (drawn from a pile) is deliberately left alone here — Vision just
  // blocks placing it for as long as it's active, it doesn't cancel it.
  function toggleVisionMode(){
    if (!visionMode) {
      setSelectedId(null);
      clearTileSelection();
      setSelectedDiscardCardId(null);
    }
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
    setPiles([{id:uid(), type:'case', cards:makeInitialDeck()}]);
    setDiscardCards([]);
    setPlacedTiles([]);
    setHeldTile(null);
    setArmedPileId(null);
    clearTileSelection();
    setSelectedDiscardCardId(null);
    setCellPicker(null);
    setVisionPlayerId(null);
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

  const selectedTileObj = selectedTileId ? placedTiles.find(t => t.id === selectedTileId) : null;
  const selectedTileOccupied = selectedTileObj && players.some(p => p.row === selectedTileObj.row && p.col === selectedTileObj.col);
  const hasSelectedCard = !!(selectedTileId || selectedDiscardCardId);

  // Shrinks the player squares (down to a 40px floor) once there isn't
  // enough room between header and footer to fit them all at the default
  // 64px — the sidebar itself stays vertically centered in that space and
  // scrolls if even the floor size doesn't fit everyone.
  const SIDEBAR_GAP = 8, SIDEBAR_DEFAULT_SIZE = 64, SIDEBAR_MIN_SIZE = 40;
  const sidebarAvailH = Math.max(0, (typeof window !== 'undefined' ? window.innerHeight : 800) - sidebarBounds.top - sidebarBounds.bottom - SIDEBAR_GAP*2);
  const sidebarItemCount = players.length + 1; // +1 for the "add player" button
  const sidebarDesiredH = sidebarItemCount*SIDEBAR_DEFAULT_SIZE + (sidebarItemCount-1)*SIDEBAR_GAP;
  const squareSize = sidebarDesiredH <= sidebarAvailH ? SIDEBAR_DEFAULT_SIZE
    : Math.max(SIDEBAR_MIN_SIZE, Math.floor((sidebarAvailH - (sidebarItemCount-1)*SIDEBAR_GAP) / sidebarItemCount));

  return h('div', {style:{height:'100dvh', display:'flex', flexDirection:'column', overflow:'hidden', color:'#eee', fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif', background:'#111'}},

    // HEADER (sticky) — top row of controls, second row for tile piles.
    // `position:relative` is what makes its `zIndex` actually apply (an
    // element with no `position` ignores z-index entirely) — without it,
    // the pile long-press menu popup rendered behind the grid viewport
    // despite its own z-index, since the header never won a stacking
    // context to lift it above the transformed (and therefore
    // stacking-context-creating) grid content. Clicking the header's own
    // background (not a button/pile, which stop propagation) clears any
    // selected card, same "click elsewhere deselects" rule as the grid.
    h('div', {onClick:clearCardSelection, style:{flexShrink:0, position:'relative',
      background: visionMode ? 'rgba(15,25,35,.97)' : 'rgba(20,20,20,.97)',
      borderBottom:`1px solid ${borderColor(visionMode,'rgba(255,255,255,.08)')}`, zIndex:20, transition:'background .3s, border-color .3s'}},
      h('div', {style:{display:'flex', alignItems:'center', gap:12, padding:'12px 16px'}},
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
      h('div', {style:{display:'flex', alignItems:'flex-start', gap:10, padding:'0 16px 12px', overflowX:'auto'}},
        h('div', {style:{display:'flex', flexDirection:'column', gap:8}},
          // piles can hit 0 entries (the last one merged entirely into the
          // défausse) — a blank spacer keeps the défausse slot aligned
          // instead of crashing on piles[0] being undefined.
          piles[0]
            ? h(PileStack, {
                pile:piles[0], holding: heldTile?.fromPileId === piles[0].id,
                armedId:armedPileId, armedIdRef:armedPileIdRef, hasSelectedCard,
                onArm:armPile, onDisarm:disarmPile,
                onDraw:drawFromPile, onSplit:splitPile, onShuffle:shufflePile, onMergeInto:mergeArmedInto,
                onInsertSelected:insertSelectedCardIntoPile
              })
            : h('div', {style:{width:56, height:56}}),
          h(DiscardSlot, {
            cards:discardCards, selectedId:selectedDiscardCardId,
            armedId:armedPileId, armedIdRef:armedPileIdRef, hasSelectedTile:!!selectedTileId,
            onArm:armPile, onDisarm:disarmPile,
            onMergeInto:mergeArmedInto, onShuffleInPlace:shuffleDiscardInPlace,
            onDiscardSelectedTile:discardSelectedTile, onToggleSelect:toggleSelectDiscardCard
          })
        ),
        piles.slice(1).map(p => h(PileStack, {
          key:p.id, pile:p, holding: heldTile?.fromPileId === p.id,
          armedId:armedPileId, armedIdRef:armedPileIdRef, hasSelectedCard,
          onArm:armPile, onDisarm:disarmPile,
          onDraw:drawFromPile, onSplit:splitPile, onShuffle:shufflePile, onMergeInto:mergeArmedInto,
          onInsertSelected:insertSelectedCardIntoPile
        })),
        heldTile && h('div', {style:{fontSize:11, color:'#9cf', alignSelf:'center'}}, 'Clique une case pour poser la tuile')
      )
    ),

    // RIGHT SIDEBAR — player roster, confined to the space between header
    // and footer (see sidebarBounds/squareSize above) so it can never
    // overlap the header or spill off-screen — centered within that space,
    // scrollable as a last resort if even the smallest square size doesn't
    // fit everyone. `pointerEvents:'none'` on the container + `'auto'` on
    // each actual square: this column's own box always spans the FULL
    // header-to-footer height regardless of player count (it's centered
    // via flexbox, not sized to its content), so with 1 player — or 0 —
    // most of that tall box is empty space with nothing visible in it, yet
    // it still sat on top of the grid and silently absorbed every click
    // that landed there instead of letting it reach the cell underneath.
    // Turning off pointer events on the empty box and back on for just the
    // squares/button themselves keeps the clickable area limited to what's
    // actually visible.
    h('div', {style:{
      position:'fixed', right:8, top:sidebarBounds.top+SIDEBAR_GAP, bottom:sidebarBounds.bottom+SIDEBAR_GAP,
      display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'flex-end',
      gap:SIDEBAR_GAP, overflowY:'auto', zIndex:15, pointerEvents:'none'
    }},
      players.map((p,i) => h(PlayerSquare, {
        key:p.id, player:p, isCurrent:i===currentIndex, size:squareSize,
        onRemove:()=>removePlayer(p.id), onRename:v=>renamePlayer(p.id,v)
      })),
      h('div', {style:{width:squareSize, pointerEvents:'auto'}}, h(AddBtn, {onClick:addPlayer}))
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
        onDoubleClick:onContentDoubleClick,
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
        placedTiles.map(t => h('div', {
          key:t.id,
          style:{
            position:'absolute', left:t.col*CELL+2, top:t.row*CELL+2, borderRadius:6,
            transform:`rotate(${t.rotation}deg)`, pointerEvents:'none',
            boxShadow: selectedTileId === t.id ? '0 0 0 2px #fff, 0 0 10px 3px #4fa3ff' : 'none'
          }
        }, h(CardFace, {showBack:t.flipped, size:CELL-4}))),
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
        })),

        // SELECTED TILE CONTROLS — just the option buttons around the
        // tile's own in-grid position (no enlarged duplicate card), placed
        // on its CORNERS rather than its cardinal edges. A first version put
        // them at the edge midpoints (top/left/right), which sat almost
        // exactly on the neighboring cell's center — since moving by one
        // cell (the overwhelming majority of moves) targets that center, a
        // move in any of those 3 directions landed on a button instead of
        // the grid 3 times out of 4. A cell's corner is equidistant (a half
        // diagonal, ~31px at CELL=44) from its own center AND from every
        // orthogonally- or diagonally-adjacent cell's center alike, so
        // corner placement can't be biased toward colliding with whichever
        // direction the player moves most. Rendered as children of the
        // transformed content div (in-grid coordinates, not a separate
        // fixed overlay) so they pan/zoom together with the tile — a
        // z-index keeps them above sibling tiles despite the tile divs'
        // own DOM order. In 'placed' mode (right after placing from a
        // pile/défausse), only the rotate button shows — no flip/discard,
        // and no move-on-tap-elsewhere (see handleSingleClick) — so you can
        // freely orient a freshly placed tile without any risk of a stray
        // tap sending it elsewhere or losing/discarding it by mistake.
        selectedTileObj && !selectedTileOccupied && [
          selectedTileMode !== 'placed' && h('div', {
            key:'flip', onClick: e => { e.stopPropagation(); flipTile(selectedTileObj.id); },
            style:{...inGridBtnStyle, left:selectedTileObj.col*CELL, top:selectedTileObj.row*CELL}
          }, h(FlipIcon)),
          h('div', {
            key:'rotate', onClick: e => { e.stopPropagation(); rotateTile(selectedTileObj.id); },
            style:{...inGridBtnStyle, left:selectedTileObj.col*CELL+CELL, top:selectedTileObj.row*CELL}
          }, h(RotateIcon)),
          selectedTileMode !== 'placed' && h('div', {
            key:'discard', onClick: e => { e.stopPropagation(); discardTile(selectedTileObj.id); },
            style:{...inGridBtnStyle, left:selectedTileObj.col*CELL+CELL, top:selectedTileObj.row*CELL+CELL, color:'#f66', borderColor:'rgba(220,60,40,.5)'}
          }, '✕')
        ]
      )
    ),

    // MULTI-PLAYER CELL PICKER — several players sharing a cell means a
    // single click can't tell which one you mean, so a small popup asks.
    // Positioned at the raw tap coordinates (outside the pannable/zoomed
    // content, no transform math needed). Tiles never appear here anymore:
    // they're selected via double-click, an entirely separate gesture.
    cellPicker && h('div', {
      ref:cellPickerAnchorRef,
      style:{position:'fixed', left:cellPicker.clientX, top:cellPicker.clientY, zIndex:250}
    },
      h(Popup, {
        onClose:()=>setCellPicker(null),
        anchorRef:cellPickerAnchorRef,
        style:{left:0, top:0, width:220},
        // Bigger tap targets than the default .popup-item — this picker
        // exists specifically to make an easy, unambiguous choice when a
        // cell has several players on it, so it should be the easiest
        // popup in the app to hit, not the default compact size shared
        // with menus like Diviser/Mélanger.
        itemStyle:{padding:'12px 14px', fontSize:15, gap:10},
        items: cellPicker.ids.map(id => {
          const p = players.find(pl => pl.id === id);
          return {
            label:p.nom, dot:p.couleur,
            onClick:() => { if (cellPicker.forVision) setVisionPlayerId(id); else setSelectedId(id); }
          };
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
    // just left of the player-switch arrow. Clicking the footer's own
    // background clears any selected card, same as the header.
    h('div', {onClick:clearCardSelection, style:{flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between',
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
        ) : h('div', {onClick:e=>{ e.stopPropagation(); addPlayer(); }, style:{fontSize:11, color:'#777', cursor:'pointer', textDecoration:'underline'}}, 'Ajoute un joueur')
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
const inGridBtnStyle = {
  position:'absolute', width:26, height:26, borderRadius:'50%', background:'rgba(30,30,30,.95)',
  border:'1px solid #777', display:'flex', alignItems:'center', justifyContent:'center',
  fontSize:13, cursor:'pointer', color:'#eee', boxShadow:'0 2px 8px rgba(0,0,0,.5)',
  transform:'translate(-50%,-50%)', zIndex:50, pointerEvents:'auto'
};
