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
// Sorts/énergies are smaller than a tile card everywhere they appear —
// ITEM_BOX is the base size used to derive the footer's own (doubled) card
// size below, and on the board (ITEM_BOARD_SIZE vs. the tile's CELL-4 card
// size). The header's own pile/défausse box is now a SEPARATE, bigger size
// (HEADER_ITEM_BOX): Gus asked for header items "moitié plus grand" —
// between the original 30px and a full 56px tile box, not tied to ITEM_BOX
// so bumping it doesn't also inflate the footer/board sizes.
const ITEM_BOX = 30;
const HEADER_ITEM_BOX = 45;
const ITEM_BOARD_SIZE = 22;
// Distance from a cell's own corner to where an item token sitting there
// gets centered — half the token's own size plus a small gap so it doesn't
// visually touch the cell's edge.
const ITEM_CORNER_INSET = ITEM_BOARD_SIZE/2 + 3;
// Footer-equipped cards render at DOUBLE the header pile size (Gus) — the
// footer has more room to work with than the cramped header row, and
// equipped cards are meant to be the easiest ones on the whole board to
// glance at/tap. FOOTER_SLOT_PAD/HEIGHT size the dashed "slot" outlines
// around them (nature = a square the size of ONE card, same height as
// either of the 2 long rows — Gus asked for the square instead of a taller
// rectangle spanning both rows), all sharing the same fixed height so none
// of the three ever resizes based on whether it's empty or full.
const FOOTER_ITEM_SIZE = (ITEM_BOX - 8) * 2;
const FOOTER_SLOT_PAD = 4;
const FOOTER_SLOT_GAP = 4;
const FOOTER_ROW_HEIGHT = FOOTER_ITEM_SIZE + FOOTER_SLOT_PAD*2;
const FOOTER_ROW_WIDTH = FOOTER_ITEM_SIZE*3 + FOOTER_SLOT_PAD*2 + 4*2;
// Same slot layout as the footer (nature square + 2 long rows), reused in
// the player detail window ("disposée de la même manière que dans le
// footer"). Doubled (Gus: "agrandir du double... comme ça on peut lire
// sans forcément agrandir l'item") so the cards are readable at a glance
// without opening the separate enlarge window — the modal itself widens
// to make room (see its own width below), keeping the name/PV column the
// same size instead of shrinking it to compensate.
const VISION_ITEM_SIZE = 56;
const VISION_ROW_HEIGHT = VISION_ITEM_SIZE + FOOTER_SLOT_PAD*2;
const VISION_ROW_WIDTH = VISION_ITEM_SIZE*3 + FOOTER_SLOT_PAD*2 + 4*2;

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
// A discreet crosshair/target, for the "recentrer la vue" button.
function TargetIcon(){
  return h('svg', {width:16, height:16, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round'},
    h('circle', {cx:12, cy:12, r:7}),
    h('line', {x1:12, y1:1, x2:12, y2:4}),
    h('line', {x1:12, y1:20, x2:12, y2:23}),
    h('line', {x1:1, y1:12, x2:4, y2:12}),
    h('line', {x1:20, y1:12, x2:23, y2:12})
  );
}

// Eye glyph for the "voir en grand" button on a selected monster/item —
// same thin-stroke SVG treatment as Rotate/Flip/Target above, for the same
// reason (a font glyph like 👁️ isn't visually centered the same way across
// platforms).
function EyeIcon(){
  return h('svg', {width:14, height:14, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2.2, strokeLinecap:'round', strokeLinejoin:'round'},
    h('path', {d:'M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z'}),
    h('circle', {cx:12, cy:12, r:3})
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

// Placeholder deck: 100 identical cards for now, so the draw/place/rotate/
// split/shuffle mechanics can be built and tested before wiring in the real
// thing — reading data.cases/data.sorts/data.energies (only "Validé"
// entries, one card per `quantite`) so editing the catalog and starting a
// new game is all it takes to change what's in the deck. Each deck gets its
// own pile.type ('case'/'sort'/'energie') so piles can only ever merge
// same-type — that's also what keeps their défausses separate (see
// `discardCards`, each entry tagged with the same `type`).
function makeDeck(type){
  return shuffle(Array.from({length:100}, () => ({id:uid()})));
}

function makeInitialPiles(){
  return ['case', 'sort', 'energie', 'monstre'].map(type => ({id:uid(), type, cards:makeDeck(type)}));
}

// Back-of-card accent color per deck type — the only visual difference
// between a case/sort/énergie card back for now ("le reste on verra plus
// tard", per Gus): a plain dark back with a thin colored border, no other
// content since the real card art isn't wired in yet.
const BACK_ACCENT = {case:'#333', sort:'#8a6d1f', energie:'#1f6d7a', monstre:'#8a2f2f'};
// Front-face glyph per deck type: cases keep the original placeholder
// cross, sorts get a wand, énergies a flame (Gus's choice), monstres an
// ogre — purely cosmetic placeholders until real card art exists.
const FRONT_GLYPH = {case:'+', sort:'🪄', energie:'🔥', monstre:'👹'};

// A real card square: black back (accent border by deck type), white front
// with a glyph by type, flipped via a simple rotateY. Reused for the pile
// stack, the held tile/item, the défausses (always shown face-up), and
// tiles/items on the board.
function CardFace({showBack, size, kind='case'}) {
  return h('div', {style:{width:size, height:size, position:'relative', perspective:600}},
    h('div', {style:{
      position:'absolute', inset:0, transformStyle:'preserve-3d',
      transition:'transform .3s', transform: showBack ? 'rotateY(0deg)' : 'rotateY(180deg)'
    }},
      h('div', {style:{position:'absolute', inset:0, borderRadius:6, background:'#111',
        border:`1px solid ${BACK_ACCENT[kind] || BACK_ACCENT.case}`, backfaceVisibility:'hidden'}}),
      h('div', {style:{position:'absolute', inset:0, borderRadius:6, background:'#fff',
        border:'1px solid #ccc', backfaceVisibility:'hidden', transform:'rotateY(180deg)',
        display:'flex', alignItems:'center', justifyContent:'center'}},
        h('div', {style:{fontSize:size*0.5, color:'#111', fontWeight:900, lineHeight:1}}, FRONT_GLYPH[kind] || FRONT_GLYPH.case)
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
function PileStack({pile, holding, armedId, armedIdRef, hasSelectedCard, disabled, blockArm, boxSize=56, onArm, onDisarm, onDraw, onSplit, onShuffle, onMergeInto, onInsertSelected}) {
  const cardSize = boxSize - 4;
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
    if (blockArm) return;
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
    if (disabled) return; // let it bubble to the header's "click elsewhere deselects" handler instead
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
        width:boxSize, height:boxSize, borderRadius:8, cursor:'pointer', position:'relative',
        boxShadow: isArmed ? '0 0 10px 3px rgba(79,163,255,.6)' : 'none',
        outline: isArmed ? '2px solid #4fa3ff' : 'none',
        transition:'box-shadow .2s, outline-color .2s'
      }
    },
      // perspective stack: two offset squares behind the top card
      h('div', {style:{position:'absolute', left:5, top:5, width:cardSize, height:cardSize, borderRadius:6, background:'#151515', border:'1px solid #333'}}),
      h('div', {style:{position:'absolute', left:2, top:2, width:cardSize, height:cardSize, borderRadius:6, background:'#1a1a1a', border:'1px solid #383838'}}),
      h('div', {style:{position:'absolute', left:0, top:0}}, h(CardFace, {showBack: !holding, size:cardSize, kind:pile.type})),
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
function DiscardSlot({cards, type='case', selectedId, armedId, armedIdRef, hasSelectedTile, disabled, visionMode, boxSize=56, onArm, onDisarm, onMergeInto, onShuffleInPlace, onDiscardSelectedTile, onToggleSelect, onOpenVisionPeek}) {
  const cardSize = boxSize - 4;
  const anchorRef = useRef(null);
  const pressTimer = useRef(null);
  const pendingArmedRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const topCard = cards.length ? cards[cards.length-1] : null;
  const isSelected = topCard && selectedId === topCard.id;
  const armedSelfId = 'discard:' + type;
  const isArmed = armedId === armedSelfId;

  function onPointerDown(){
    if (disabled || visionMode) return; // Vision mode: no arming/merging either, only the click-to-browse below
    pendingArmedRef.current = armedIdRef.current;
    startPress();
  }
  function startPress(){
    if (cards.length === 0 || hasSelectedTile) return; // nothing to arm / a quick tap here means "discard the selection" instead
    pressTimer.current = setTimeout(() => {
      const r = anchorRef.current.getBoundingClientRect();
      setMenuPos({left:r.left, top:r.bottom+6});
      setShowMenu(true);
      onArm(armedSelfId);
    }, 500);
  }
  function cancelPress(){
    clearTimeout(pressTimer.current);
  }
  // Vision mode repurposes a défausse click entirely: instead of the usual
  // select/merge/discard-selection logic, it opens the whole pile browsable
  // in the enlarged view (see visionDiscardPeek) — the top card is already
  // known/face-up here, unlike a pioche's hidden top card (see PileGroup's
  // own comment on why pioches just go inert instead in Vision mode).
  function handleClick(e){
    if (visionMode) { e.stopPropagation(); if (topCard) onOpenVisionPeek(); return; }
    if (disabled) return; // let it bubble to the header's "click elsewhere deselects" handler instead
    e.stopPropagation();
    if (showMenu) return; // the click that follows a long-press shouldn't also act
    const armed = pendingArmedRef.current;
    if (armed) { onMergeInto(armed, armedSelfId); return; }
    if (hasSelectedTile) { onDiscardSelectedTile(); return; }
    // Always call through, even when empty (topCard null) — a MISMATCHED
    // selection elsewhere still needs this click to cancel it (see
    // toggleSelectDiscardCardOrCancelSelection), which an empty défausse
    // shouldn't block just because it has nothing of its own to select.
    onToggleSelect(topCard ? topCard.id : null);
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
        width:boxSize, height:boxSize, borderRadius:8, cursor:'pointer', position:'relative',
        border: topCard ? 'none' : '2px dashed #444',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow: (isSelected || isArmed) ? '0 0 10px 3px rgba(79,163,255,.6)' : 'none',
        outline: (isSelected || isArmed) ? '2px solid #4fa3ff' : 'none',
        transition:'box-shadow .2s, outline-color .2s'
      }
    },
      topCard && h(CardFace, {showBack:false, size:cardSize, kind:type}),
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

// One deck group in the header (cases, sorts, or énergies): the défausse
// sits BELOW the pile(s) of this type (Gus asked for that instead of beside
// them, for every deck type) — its own flex sibling under a separate
// 2-column CSS grid holding THIS type's piles. A plain 2-column grid
// naturally gives the wrap pattern Gus asked for (◻️◻️ / ◻️ once a pile's
// been split enough to produce a 3rd one): grid-auto-flow fills column 1
// then column 2 then wraps to a new row on its own, no manual row-breaking
// logic needed. The défausse sits outside that grid entirely, so it always
// stays right after the last pile regardless of how many there are.
function PileGroup({type, piles, discardCards, boxSize, holding, armedId, armedIdRef, hasSelectedCard, hasSelectedTile, disabled, allowPileDraw, visionMode, onOpenDiscardPeek, onArm, onDisarm, onDraw, onSplit, onShuffle, onMergeInto, onInsertSelected, onShuffleInPlace, onDiscardSelectedTile, onToggleSelect}) {
  const groupPiles = piles.filter(p => p.type === type);
  const groupDiscard = discardCards.filter(c => c.type === type);
  // `allowPileDraw` (case piles only, see its own comment where it's
  // passed in) lets a click through to draw normally even while `disabled`
  // would otherwise block it — long-press-to-arm stays blocked either way
  // (`blockArm`), just the plain click behaves differently. Vision mode
  // overrides that entirely: a pioche's top card is FACE-DOWN/unknown, so
  // there's nothing meaningful to preview — Gus asked for it to just do
  // nothing there ("pas pouvoir cliquer sur les pioches"), unconditionally,
  // `allowPileDraw` included (that override only ever existed for the
  // 'placed' tile mode UX, unrelated to Vision — the two states can't
  // overlap anyway, entering Vision always clears any tile selection).
  const pileClickDisabled = visionMode ? true : (disabled && !allowPileDraw);
  const pileArmBlocked = visionMode || disabled;
  return h('div', {style:{display:'flex', flexDirection:'column', alignItems:'center', gap:5}},
    groupPiles.length
      // CSS grid reserves the FULL declared column count regardless of how
      // many children actually exist — with the usual 1 pile (no splits
      // yet), a fixed `repeat(2, ...)` left a whole empty 2nd column's
      // worth of blank space, which is also what threw off the défausse's
      // centering underneath (it centers under the grid's OWN width, not
      // under wherever its 1 real pile happens to sit). Only ever declaring
      // as many columns as there are piles (capped at 2) fixes both.
      ? h('div', {style:{display:'grid', gridTemplateColumns:`repeat(${Math.min(2, groupPiles.length)}, ${boxSize}px)`, gap:5}},
          groupPiles.map(p => h(PileStack, {
            key:p.id, pile:p, boxSize, holding: holding.pileId === p.id,
            armedId, armedIdRef, hasSelectedCard, disabled:pileClickDisabled, blockArm:pileArmBlocked,
            onArm, onDisarm, onDraw, onSplit, onShuffle, onMergeInto, onInsertSelected
          }))
        )
      : h('div', {style:{width:boxSize, height:boxSize}}),
    h(DiscardSlot, {
      cards:groupDiscard, type, boxSize, selectedId:holding.discardId,
      armedId, armedIdRef, hasSelectedTile, disabled, visionMode,
      onArm, onDisarm, onMergeInto, onShuffleInPlace, onDiscardSelectedTile, onToggleSelect,
      onOpenVisionPeek: () => onOpenDiscardPeek(type)
    })
  );
}

// A player's equipped cards as one flat, ordered list — the "nature" slot
// (if filled) first, then the sorts row, then the énergies row — so the
// enlarge/carousel window's ‹/› can cycle through everything a player has
// without needing a separate carousel per row. `slot` on each entry tracks
// which array/slot it came from, for removeFooterItem/discardSelectedItem.
function playerCardList(p){
  return [
    ...(p.natureSort ? [{...p.natureSort, slot:'nature'}] : []),
    ...(p.sorts || []).map(c => ({...c, slot:'sort'})),
    ...(p.energies || []).map(c => ({...c, slot:'energie'}))
  ];
}

// Gesture engine for one row of equipped footer cards (or the single-card
// "nature" slot, reusing the same machinery harmlessly since a 1-item list
// never actually reorders). Modeled closely on utils.js's own useReorder
// (refs for the live drag state, state only for the visual re-render) but
// kept local here rather than generalizing that shared hook: the trigger is
// gated behind a 500ms hold instead of starting immediately on pointerdown,
// and it also disambiguates a short tap into a THIRD outcome (open the
// enlarge window) — different enough from every other useReorder call site
// in the app (which all start dragging immediately from a dedicated handle)
// that folding it in would complicate that hook for everyone else.
// Final gesture spec from Gus: short tap → enlarge; long-press without
// moving → select for move (to grid/pile/défausse); long-press then drag →
// live-reorder within this row; right-click → same as a completed
// long-press (desktop equivalent, no separate drag path needed for it).
function useFooterItemGestures(items, onReorder, onSelectForMove){
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const dragRef = useRef(null);
  const overRef = useRef(null);
  const rectsRef = useRef([]);
  const pressTimerRef = useRef(null);
  const startRef = useRef(null);
  const firedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const listElRef = useRef(null);

  function armHold(index){
    firedRef.current = true;
    dragRef.current = index;
    overRef.current = index;
    setDragIndex(index);
    setOverIndex(index);
    if (listElRef.current) rectsRef.current = Array.from(listElRef.current.children).map(el => el.getBoundingClientRect());
  }

  function onMove(e){
    if (!firedRef.current) {
      const s = startRef.current;
      if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 6) clearTimeout(pressTimerRef.current);
      return;
    }
    let next = overRef.current;
    for (let i = 0; i < rectsRef.current.length; i++) {
      const r = rectsRef.current[i];
      if (e.clientX >= r.left && e.clientX < r.right) { next = i; break; }
    }
    if (next !== overRef.current) { overRef.current = next; setOverIndex(next); }
  }
  function onUp(){
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    clearTimeout(pressTimerRef.current);
    if (firedRef.current) {
      suppressClickRef.current = true; // the click that follows this release shouldn't also open the enlarge window
      const from = dragRef.current, to = overRef.current;
      dragRef.current = null; overRef.current = null;
      setDragIndex(null); setOverIndex(null);
      if (from !== null && to !== null && from !== to) {
        const next = [...items];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        onReorder(next);
      } else if (from !== null) {
        onSelectForMove(items[from]);
      }
    }
    firedRef.current = false;
    startRef.current = null;
  }
  function onItemPointerDown(index, e){
    if (e.pointerType === 'mouse' && e.button === 2) return; // right-click: onItemContextMenu handles it instead
    startRef.current = {x:e.clientX, y:e.clientY};
    firedRef.current = false;
    clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => armHold(index), 500);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }
  function onItemContextMenu(index, e){
    e.preventDefault();
    onSelectForMove(items[index]);
  }
  function onItemClick(index, item, onOpenEnlarge){
    if (suppressClickRef.current) { suppressClickRef.current = false; return; }
    onOpenEnlarge(item);
  }

  const display = dragIndex === null ? items : (() => {
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(overIndex, 0, moved);
    return next;
  })();

  return { display, dragIndex, listElRef, onItemPointerDown, onItemContextMenu, onItemClick };
}

// One row (or the single-slot nature square) of equipped footer cards.
// `onDiscard` is optional (the Vision player modal reuses this component
// read-only for ANY player, not just the current one — see its own
// onReorder/onSelectForMove no-ops — so it never has anything selected
// here to discard). When present, a long-press-selected card (selectedId
// matches) shows a small red ✕ badge floating over its own top-right
// corner (Gus: "avoir la croix qui s'affiche en haut à droite" — unlike
// the grid's tile/monster/item controls, a footer card has no grid
// coordinates to anchor a corner-of-the-cell button to, so the badge sits
// directly on the card itself instead).
function FooterItemRow({items, kind, size, selectedId, onReorder, onSelectForMove, onOpenEnlarge, onDiscard}) {
  const g = useFooterItemGestures(items, onReorder, onSelectForMove);
  return h('div', {ref:g.listElRef, style:{display:'flex', gap:4}},
    g.display.map((it, i) => h('div', {
      key:it.id,
      onPointerDown: e => g.onItemPointerDown(i, e),
      onContextMenu: e => g.onItemContextMenu(i, e),
      onClick: () => g.onItemClick(i, it, onOpenEnlarge),
      style:{
        position:'relative', cursor:'pointer', borderRadius:5, opacity: g.dragIndex === i ? 0.5 : 1,
        boxShadow: selectedId === it.id ? '0 0 0 2px #fff, 0 0 8px 2px #4fa3ff' : 'none'
      }
    },
      h(CardFace, {showBack:false, size, kind}),
      selectedId === it.id && onDiscard && h('div', {
        className:'footer-item-discard-btn',
        onClick: e => { e.stopPropagation(); onDiscard(); },
        style:{position:'absolute', top:-8, right:-8, width:20, height:20, borderRadius:'50%',
          background:'rgba(220,60,40,.9)', border:'1px solid rgba(220,60,40,.6)', color:'#fff',
          display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:11, zIndex:5}
      }, '✕')
    ))
  );
}

// `size` shrinks the whole square (and every sub-element proportionally)
// when the sidebar doesn't have enough vertical room for everyone at the
// default 64px — see sizing logic in PlateauPage, right below the header/
// footer height measurement.
function PlayerSquare({player, isCurrent, size=64, onRemove, onRename, onOpenInfo}) {
  const scale = size/64;

  return h('div', {style:{position:'relative', pointerEvents:'auto'}},
    h('div', {
      onClick: onOpenInfo,
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
    )
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
  // Whether the currently-open player detail window was opened from the
  // sidebar's row of squares (‹/› cycles through `players` in that same
  // order) or from tapping a token on the grid in Vision mode (no ‹/› —
  // "en mode vision et qu'on clique sur un joueur pas besoin de <>").
  const [visionPlayerFromSidebar, setVisionPlayerFromSidebar] = useState(false);
  const [piles, setPiles] = useState(saved?.piles || makeInitialPiles());
  const [discardCards, setDiscardCards] = useState(saved?.discardCards || []);
  const [placedTiles, setPlacedTiles] = useState(saved?.placedTiles || []);
  // Monstres traités comme des "joueurs" (CLAUDE.md) : leur propre pioche/
  // défausse (type 'monstre', générique via PileGroup — aucun changement
  // nécessaire là-bas) et leur propre tableau d'entités sur le plateau,
  // avec le MÊME système de sélection/déplacement à un clic que `players`
  // (voir handleSingleClick) — juste un état séparé (`selectedMonsterId`
  // à côté de `selectedId`) pour ne toucher à aucune logique déjà validée
  // spécifique aux joueurs (sidebar, dé, PV, footer "joueur courant"...).
  const [monsters, setMonsters] = useState(saved?.monsters || []);
  const [selectedMonsterId, setSelectedMonsterId] = useState(null);
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

  // Sorts/énergies on the board (Couche 3) — small tokens, not full tiles,
  // so they get their own array instead of reusing placedTiles: they don't
  // rotate/flip, several can share a cell, and they render above tiles but
  // below players (see cellGroups/boardItems rendering order below).
  const [boardItems, setBoardItems] = useState(saved?.boardItems || []);
  // Drawn from a sort/énergie pile, mirrors heldTile exactly (see its own
  // comments) but for items: {cardId, itemType:'sort'|'energie', fromPileId}.
  const [heldItem, setHeldItem] = useState(null);
  // An item already on the board, picked up via long-press (items' dedicated
  // gesture — see the grid long-press handlers below) — mirrors selectedTileId
  // in 'moving' mode: stays in `boardItems` at its current cell while
  // selected (glow highlight), a later tap elsewhere moves it. No 'placed'-
  // style mode: items only ever need "move", never rotate/flip.
  const [selectedItemId, setSelectedItemId] = useState(null);
  // An item picked up from a PLAYER's own footer slots via long-press (see
  // FooterItemSlot) — mirrors selectedDiscardCardId: stays in the player's
  // natureSort/sorts/energies array (glow highlight) until a later tap
  // elsewhere (grid cell, a matching pile, a défausse) moves it out, or
  // re-tapping deselects it. {playerId, slot:'nature'|'sort'|'energie', cardId}.
  const [selectedFooterItem, setSelectedFooterItem] = useState(null);
  // The big enlarge/carousel window for a single sort/énergie card — reused
  // both from the Vision player modal and directly from your own footer
  // slots. {playerId, index} where index is a position in that player's
  // combined [natureSort?, ...sorts, ...energies] list, so ‹/› can cycle
  // through everything without needing separate per-row carousels.
  const [enlargedItem, setEnlargedItem] = useState(null);
  // Vision-mode "hold to peek" — {items, index}: items is the full list of
  // board items sharing that cell (just [item] when there's only one, e.g.
  // the hold-to-peek path below), index is which one is currently shown.
  // Shown big while a board item is held down during Vision mode, or opened
  // from itemCellPicker when several items shared the cell (see
  // handleItemLongPress). ‹/› cycle through `items` when there's more than
  // one — mirrors enlargedItem's carousel, but scoped to THIS cell only.
  const [visionPeekItem, setVisionPeekItem] = useState(null);
  function shiftVisionPeek(dir){
    setVisionPeekItem(prev => {
      if (!prev) return prev;
      const len = prev.items.length;
      return {...prev, index: (prev.index + dir + len) % len};
    });
  }
  // Monster card, shown big — reachable from a Vision-mode click on a
  // monster-only cell (direct, no picker step needed since there's no
  // player to disambiguate against) or from the eye button on a selected
  // monster in normal mode (see the in-grid monster controls further down).
  // Not vision-exclusive despite living next to visionPeekItem — same
  // multi-entry-point pattern as enlargedItem (footer tap + Vision modal).
  // {monsterIds, index}: monsterIds is every monster sharing that monster's
  // OWN cell, so ‹/› can browse them without needing a separate picker.
  const [enlargedMonster, setEnlargedMonster] = useState(null);
  function shiftEnlargedMonster(dir){
    setEnlargedMonster(prev => {
      if (!prev) return prev;
      const len = prev.monsterIds.length;
      return {...prev, index: (prev.index + dir + len) % len};
    });
  }
  // Défausse browsing in Vision mode — clicking a défausse (any of the 4
  // deck types) opens its top card enlarged with ‹/› to page through the
  // WHOLE pile (Gus: "afficher la carte en grand avec des < et > en bas
  // pour faire défiler toutes les cartes de la défausse"), not just the
  // top one. {type, index}: index 0 is the TOP (most recent) card — see
  // discardBrowseList below for the top-first ordering. Deliberately
  // NON-looping (Gus: "il faut pas de loop") — shiftDiscardPeek clamps
  // instead of wrapping, so the top card only ever shows › (nothing
  // "newer" to look at) and the oldest card only ever shows ‹.
  const [visionDiscardPeek, setVisionDiscardPeek] = useState(null);
  function discardBrowseList(type){
    return discardCards.filter(c => c.type === type).slice().reverse();
  }
  function shiftDiscardPeek(dir){
    setVisionDiscardPeek(prev => {
      if (!prev) return prev;
      const list = discardBrowseList(prev.type);
      const next = prev.index + dir;
      if (next < 0 || next >= list.length) return prev;
      return {...prev, index: next};
    });
  }
  function openDiscardPeek(type){
    if (discardBrowseList(type).length === 0) return;
    setVisionDiscardPeek({type, index:0});
  }
  // Several items sharing a cell can't be disambiguated by a single
  // long-press — this offers a small choice popup instead (mirrors the
  // multi-player cellPicker). `forVision` decides whether picking one opens
  // visionPeekItem or selects it for the normal move flow.
  const [itemCellPicker, setItemCellPicker] = useState(null); // {clientX, clientY, items, forVision}
  const armedPileIdRef = useRef(null);
  // See selectFooterItem's own comment.
  const suppressNextEquipClickRef = useRef(false);
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
    liveRef.current = { visionMode, heldTile, selectedDiscardCardId, selectedTileId, selectedTileMode, selectedId, players, placedTiles, discardCards, piles, currentIndex,
      boardItems, heldItem, selectedItemId, selectedFooterItem, monsters, selectedMonsterId };
  });
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const resetAnchorRef = useRef(null);
  const cellPickerAnchorRef = useRef(null);
  const visionModalAnchorRef = useRef(null);
  const enlargeModalAnchorRef = useRef(null);
  const itemCellPickerAnchorRef = useRef(null);

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
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({players, currentIndex, piles, discardCards, placedTiles, boardItems, monsters})); } catch {}
  }, [players, currentIndex, piles, discardCards, placedTiles, boardItems, monsters]);

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
  // footer refs needed.
  const [sidebarBounds, setSidebarBounds] = useState({top:0, bottom:0});
  // Bug fixed here: only re-measuring on the window's own 'resize' event
  // missed every case where the HEADER or FOOTER changed height on their
  // own without the window itself resizing — splitting a pile enough to
  // wrap the header onto a 2nd row (Couche 3's pile groups), or a player
  // equipping their first item and growing the footer's equip zone into
  // existence. Gus noticed the sidebar creeping behind the header after
  // splitting piles, and the footer overflowing off the bottom of the
  // screen — both are this same stale-measurement bug, just surfacing on
  // opposite edges of the viewport. A `ResizeObserver` on the viewport
  // element itself (rather than the window) fires on ANY change to ITS OWN
  // box — which is exactly "header got taller" or "footer got taller",
  // since the viewport is the flex:1 space left over between them — so it
  // covers every cause uniformly instead of enumerating each one.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    function measure(){
      const rect = vp.getBoundingClientRect();
      setSidebarBounds({top:rect.top, bottom: window.innerHeight - rect.bottom});
    }
    measure();
    window.addEventListener('resize', measure);
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(vp);
    }
    return () => {
      window.removeEventListener('resize', measure);
      if (ro) ro.disconnect();
    };
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
      placedTiles: live.placedTiles, heldTile: live.heldTile, currentIndex: live.currentIndex,
      boardItems: live.boardItems, heldItem: live.heldItem, monsters: live.monsters
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
    if ('currentIndex' in updates) setCurrentIndex(updates.currentIndex);
    if ('boardItems' in updates) setBoardItems(updates.boardItems);
    if ('heldItem' in updates) setHeldItem(updates.heldItem);
    if ('monsters' in updates) setMonsters(updates.monsters);
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
    setCurrentIndex(snap.currentIndex);
    setBoardItems(snap.boardItems);
    setHeldItem(snap.heldItem);
    setMonsters(snap.monsters || []);
  }

  function currentSnapshot(){
    const live = liveRef.current;
    return { players: live.players, piles: live.piles, discardCards: live.discardCards, placedTiles: live.placedTiles, heldTile: live.heldTile, currentIndex: live.currentIndex,
      boardItems: live.boardItems, heldItem: live.heldItem, monsters: live.monsters };
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

  // Removing a player used to just drop their equipped cards along with
  // them — Gus asked for those to land in their matching défausse instead
  // (nature slot + sorts count as 'sort', énergies as 'energie'), same
  // spirit as discarding a tile/item: nothing the app manages just
  // vanishes. Goes through commitBoard directly (not the commitPlayers
  // wrapper) so the player removal and the discard land in the SAME undo
  // step.
  function removePlayer(id){
    const idx = players.findIndex(p => p.id === id);
    const removed = players.find(p => p.id === id);
    const updates = {players: players.filter(p => p.id !== id)};
    if (removed) {
      const toDiscard = [
        ...(removed.natureSort ? [{id:removed.natureSort.id, type:'sort'}] : []),
        ...(removed.sorts || []).map(c => ({id:c.id, type:'sort'})),
        ...(removed.energies || []).map(c => ({id:c.id, type:'energie'}))
      ];
      if (toDiscard.length) updates.discardCards = [...discardCards, ...toDiscard];
    }
    commitBoard(updates);
    if (selectedId === id) setSelectedId(null);
    if (selectedFooterItem?.playerId === id) setSelectedFooterItem(null);
    if (enlargedItem?.playerId === id) setEnlargedItem(null);
    if (visionPlayerId === id) setVisionPlayerId(null);
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
  // or tracks `flipped`, it just always renders face-up). `type` tags the
  // entry so it lands in the right one of the 3 défausses (see PileGroup).
  function discardTile(tileId){
    const live = liveRef.current;
    commitBoard({
      placedTiles: live.placedTiles.filter(t => t.id !== tileId),
      discardCards: [...live.discardCards, {id:tileId, type:'case'}]
    });
    clearTileSelection();
  }

  function discardSelectedTile(){
    if (selectedTileId) discardTile(selectedTileId);
  }

  // Removes a sort/énergie card from wherever it's equipped on a player —
  // the "nature" slot holds a single card directly, the two rows are plain
  // arrays. Shared by discardSelectedItem and insertSelectedCardIntoPile.
  function removeFooterItem(players, sel){
    return players.map(p => {
      if (p.id !== sel.playerId) return p;
      if (sel.slot === 'nature') return {...p, natureSort:null};
      if (sel.slot === 'sort') return {...p, sorts:(p.sorts||[]).filter(c => c.id !== sel.cardId)};
      return {...p, energies:(p.energies||[]).filter(c => c.id !== sel.cardId)};
    });
  }

  // Item equivalent of discardSelectedTile: sends whichever item is
  // currently selected — picked up from the board (selectedItemId) or from
  // a player's own footer slots (selectedFooterItem) — to its matching
  // défausse. Whichever DiscardSlot this got wired to already only calls it
  // when its own type matches the selection (see hasSelectedForType below),
  // so no type check is needed here.
  function discardSelectedItem(){
    const live = liveRef.current;
    if (live.selectedItemId) {
      const it = live.boardItems.find(x => x.id === live.selectedItemId);
      if (!it) return;
      commitBoard({
        boardItems: live.boardItems.filter(x => x.id !== live.selectedItemId),
        discardCards: [...live.discardCards, {id:it.id, type:it.type}]
      });
      setSelectedItemId(null);
      return;
    }
    if (live.selectedFooterItem) {
      const sel = live.selectedFooterItem;
      commitBoard({
        players: removeFooterItem(live.players, sel),
        discardCards: [...live.discardCards, {id:sel.cardId, type: sel.slot === 'energie' ? 'energie' : 'sort'}]
      });
      setSelectedFooterItem(null);
    }
  }

  // Monster equivalent of discardSelectedTile/discardSelectedItem — the
  // last step of an encounter per CLAUDE.md ("il fait une sélection... puis
  // clique sur la défausse pour le défausser"): the monster entity is
  // removed from `monsters` and its card lands in the monster défausse,
  // same défausse-per-type mechanism already shared by cases/sorts/énergies.
  function discardSelectedMonster(){
    const live = liveRef.current;
    if (!live.selectedMonsterId) return;
    commitBoard({
      monsters: live.monsters.filter(m => m.id !== live.selectedMonsterId),
      discardCards: [...live.discardCards, {id:live.selectedMonsterId, type:'monstre'}]
    });
    setSelectedMonsterId(null);
  }

  // Clicking a défausse's own top card selects/deselects it (toggle) — it
  // never needs to flip since it's already shown face-up. Fully generic
  // across all 3 défausses (case/sort/énergie): `discardCards` entries carry
  // their own `type`, so a selected id unambiguously belongs to one of them
  // no matter which défausse it was toggled from.
  function toggleSelectDiscardCard(cardId){
    setSelectedDiscardCardId(prev => prev === cardId ? null : cardId);
    clearTileSelection();
    setSelectedId(null); // only one thing selected at a time
    setSelectedItemId(null);
    setSelectedFooterItem(null);
    setSelectedMonsterId(null);
  }

  // Feeds the currently-selected card (a placed tile, a défausse's top
  // card, a board item, or a footer-equipped item) into a pile, at whichever
  // end was chosen in the Dessus/Dessous menu. Whichever PileStack this got
  // wired to only opens that menu when its own type matches the current
  // selection (see hasSelectedForType below), so the pile's type is already
  // guaranteed to match — no extra check needed here either.
  function insertSelectedCardIntoPile(pileId, position){
    const live = liveRef.current;
    let cardId = null;
    const updates = {};
    if (live.selectedTileId) {
      cardId = live.selectedTileId;
      updates.placedTiles = live.placedTiles.filter(t => t.id !== live.selectedTileId);
    } else if (live.selectedItemId) {
      cardId = live.selectedItemId;
      updates.boardItems = live.boardItems.filter(it => it.id !== live.selectedItemId);
    } else if (live.selectedFooterItem) {
      cardId = live.selectedFooterItem.cardId;
      updates.players = removeFooterItem(live.players, live.selectedFooterItem);
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
    setSelectedItemId(null);
    setSelectedFooterItem(null);
    setSelectedMonsterId(null);
  }

  // Clears whatever card OR entity is selected (a placed tile, a défausse
  // card, a board/footer item, a player, a monster) — wired to header/
  // footer background clicks, so tapping anywhere outside the grid/piles/
  // footer slots also deselects, same spirit as every popup's "click
  // elsewhere closes it" rule. Player/monster clearing joined this
  // relatively late (Gus: "dès que je sélectionne quelque chose et que je
  // clique à un endroit où il ne peut rien y faire, ça annule juste la
  // sélection" — a selected player/monster can ONLY ever be moved via the
  // grid or re-tapped to deselect, so every other surface is exactly that
  // kind of dead end for it) — see cancelEntitySelection's own comment for
  // the piles/défausses/footer-items that call `e.stopPropagation()` and
  // so need their OWN explicit check instead of relying on this bubbling.
  function clearCardSelection(){
    clearTileSelection();
    setSelectedDiscardCardId(null);
    setSelectedItemId(null);
    setSelectedFooterItem(null);
    setSelectedId(null);
    setSelectedMonsterId(null);
  }

  // Whether ANYTHING is currently selected — a tile (not in rotate-only
  // 'placed' mode, which has its own separate deselect-on-any-tap rule
  // already), a board/footer item, a défausse card, a player, or a
  // monster. The single source of truth for "does the next click need to
  // just cancel instead of doing its own thing" (see guardedBySelection
  // below and clearCardSelection's own comment for why several controls
  // need this check explicitly rather than relying on bubbling alone).
  function hasAnySelection(){
    return !!(selectedId || selectedMonsterId || (selectedTileId && selectedTileMode !== 'placed')
      || selectedItemId || selectedDiscardCardId || selectedFooterItem);
  }
  // Wraps a click handler so that, if ANYTHING is selected when it fires,
  // the click ONLY cancels that selection instead of also performing its
  // own normal action — Gus: "dès que je sélectionne quelque chose et que
  // je clique à un endroit où il ne peut rien y faire, ça annule juste la
  // sélection". Used for every control in the header/footer whose own
  // action has no relationship to card/entity selection at all (PV, dice,
  // switch player, Vision toggle, Undo/Redo, Reset, a player square, the
  // add-player button) — piles/défausses are handled separately just below
  // since THEY do have a legitimate action when the matching type/card is
  // selected (the Dessus/Dessous menu, the défausse fast-discard), so a
  // blanket wrap would incorrectly swallow those too.
  function guardedBySelection(fn){
    return (...args) => {
      if (hasAnySelection()) { clearCardSelection(); return; }
      fn(...args);
    };
  }
  // See clearCardSelection's own comment. Piles/défausses/the footer equip
  // zone each stop click propagation as part of their own normal handling
  // (so their action isn't ALSO seen as "click elsewhere" by the header/
  // footer background), which means they never reach clearCardSelection on
  // their own — wrapping the callback PlateauPage hands them is simpler
  // than reaching into PileStack/DiscardSlot/FooterItemRow themselves to
  // add the same check three times. Unlike guardedBySelection above, these
  // two are only ever reached once PileStack/DiscardSlot have ALREADY
  // determined the current selection does NOT match this specific pile's/
  // défausse's own type (that check lives in hasSelectedCardOfType/
  // hasSelectedForDiscardOfType, passed down as hasSelectedCard/
  // hasSelectedTile) — so ANY selection reaching this point is a mismatch,
  // hasAnySelection() alone is the right (and sufficient) condition.
  function drawFromPileOrCancelSelection(pileId){
    if (hasAnySelection()) { clearCardSelection(); return; }
    drawFromPile(pileId);
  }
  function toggleSelectDiscardCardOrCancelSelection(cardId){
    if (hasAnySelection()) { clearCardSelection(); return; }
    if (!cardId) return; // empty défausse, nothing else selected either — genuinely nothing to do
    toggleSelectDiscardCard(cardId);
  }

  // Equips whichever item is currently held (fresh from a pile, heldItem)
  // or selected on the board (selectedItemId) onto the CURRENT player —
  // "peu importe où je clique dans cette zone avec un item" (Gus): any tap
  // anywhere in the footer's nature/sorts/énergies zone does this, wired via
  // onClickCapture below so it pre-empts the individual cards' own
  // tap-to-enlarge click. The very first sort a player ever equips goes
  // into the single "nature" slot; every one after (and every énergie
  // always) appends to the end of its row.
  function equipHeldOrSelectedItem(){
    const live = liveRef.current;
    const cur = live.players[live.currentIndex];
    if (!cur) return;
    let cardId = null, itemType = null;
    const updates = {};
    if (live.heldItem) {
      cardId = live.heldItem.cardId;
      itemType = live.heldItem.itemType;
      updates.heldItem = null;
    } else if (live.selectedItemId) {
      const it = live.boardItems.find(x => x.id === live.selectedItemId);
      if (!it) return;
      cardId = it.id;
      itemType = it.type;
      updates.boardItems = live.boardItems.filter(x => x.id !== live.selectedItemId);
    } else return;
    updates.players = live.players.map(p => {
      if (p.id !== cur.id) return p;
      if (itemType === 'sort') {
        if (!p.natureSort) return {...p, natureSort:{id:cardId}};
        return {...p, sorts:[...(p.sorts || []), {id:cardId}]};
      }
      return {...p, energies:[...(p.energies || []), {id:cardId}]};
    });
    commitBoard(updates);
    setSelectedItemId(null);
  }

  // Picks up an already-equipped card for the "move it elsewhere" flow
  // (mirrors selectedTileId/selectedDiscardCardId): stays in the player's
  // array (glow highlight) until a later tap on the grid/a matching pile/a
  // défausse moves it out, or it's re-armed into a drag-reorder instead —
  // see useFooterItemGestures/FooterItemRow above for how this gets called.
  function selectFooterItem(playerId, slot, cardId){
    setSelectedFooterItem({playerId, slot, cardId});
    setSelectedId(null);
    clearTileSelection();
    setSelectedDiscardCardId(null);
    setSelectedItemId(null);
    setSelectedMonsterId(null);
    // A long-press-driven selection here (see useFooterItemGestures) is
    // still followed by a native trailing 'click' on release, same as the
    // grid's item long-press (see suppressNextClickRef's own comment) —
    // without this, the equip zone's own onClickCapture would see the
    // selection this JUST made (hasAnySelection() now true) and instantly
    // cancel it again on that same trailing click, before the user ever
    // gets to see the cross/glow.
    suppressNextEquipClickRef.current = true;
  }

  function openEnlargeFor(playerId, slot, cardId){
    const p = players.find(pl => pl.id === playerId);
    if (!p) return;
    const idx = playerCardList(p).findIndex(c => c.id === cardId && c.slot === slot);
    if (idx === -1) return;
    setEnlargedItem({playerId, index:idx});
  }

  // ‹/› in the enlarge window — cycles through that SAME player's full card
  // list (nature + sorts + énergies combined, see playerCardList) so it can
  // scroll from one card to the next without closing back to the list.
  function shiftEnlarged(delta){
    setEnlargedItem(prev => {
      if (!prev) return prev;
      const p = players.find(pl => pl.id === prev.playerId);
      if (!p) return null;
      const list = playerCardList(p);
      if (!list.length) return null;
      return {playerId:prev.playerId, index:(prev.index + delta + list.length) % list.length};
    });
  }

  // ‹/› in the player detail window — ONLY shown when it was opened from
  // the sidebar (visionPlayerFromSidebar), cycles through `players` in the
  // same order they appear there. A token clicked in Vision mode is a
  // one-off inspection, not a browse, so it deliberately gets none of this.
  function shiftVisionPlayer(delta){
    setVisionPlayerId(prev => {
      if (!prev || players.length === 0) return prev;
      const idx = players.findIndex(p => p.id === prev);
      if (idx === -1) return prev;
      return players[(idx + delta + players.length) % players.length].id;
    });
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
      const herePlayers = live.players.filter(p => p.row === r && p.col === c);
      const hereMonsters = live.monsters.filter(m => m.row === r && m.col === c);
      if (herePlayers.length === 0 && hereMonsters.length === 0) return;
      // Monster-only cell: no player to disambiguate against, so the card
      // opens directly (with ‹/› if several monsters share it) rather than
      // going through the picker first.
      if (herePlayers.length === 0) { setEnlargedMonster({monsterIds:hereMonsters.map(m=>m.id), index:0}); return; }
      if (herePlayers.length === 1 && hereMonsters.length === 0) { setVisionPlayerId(herePlayers[0].id); setVisionPlayerFromSidebar(false); return; }
      // Several players, or players mixed with monsters: disambiguate via
      // the same two-column picker the normal (non-Vision) flow uses.
      setCellPicker({clientX, clientY, playerIds:herePlayers.map(p=>p.id), monsterIds:hereMonsters.map(m=>m.id), forVision:true});
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

    // A sort/énergie drawn from a pile — unlike tiles, several items can
    // share a cell (they're small tokens, not case-covering tiles), so no
    // occupancy check, and no 'placed'-style mode: items only ever need to
    // be movable, nothing to orient. A monster drawn from the monster pile
    // rides this exact same held-card hand-off (drawFromPile doesn't
    // distinguish pile.type past 'case' vs. everything else — see its own
    // comment) but lands as a new `monsters` entity instead of a boardItem,
    // since it's "traité comme un joueur" (CLAUDE.md), not a small item
    // token — same "no occupancy check" as players sharing a cell.
    if (live.heldItem) {
      if (live.heldItem.itemType === 'monstre') {
        commitBoard({monsters: [...live.monsters, {id:live.heldItem.cardId, row:r, col:c}], heldItem: null});
        return;
      }
      commitBoard({boardItems: [...live.boardItems, {id:live.heldItem.cardId, type:live.heldItem.itemType, row:r, col:c}], heldItem: null});
      return;
    }

    if (live.selectedDiscardCardId) {
      const dcard = live.discardCards.find(cd => cd.id === live.selectedDiscardCardId);
      if (!dcard) { setSelectedDiscardCardId(null); return; }
      if (dcard.type === 'case') {
        if (live.placedTiles.some(t => t.row === r && t.col === c)) return;
        const cardId = live.selectedDiscardCardId;
        commitBoard({
          discardCards: live.discardCards.filter(cd => cd.id !== cardId),
          placedTiles: [...live.placedTiles, {id:cardId, row:r, col:c, rotation:0, flipped:false}]
        });
        setSelectedDiscardCardId(null);
        setSelectedTileId(cardId);
        setSelectedTileMode('placed');
      } else if (dcard.type === 'monstre') {
        const cardId = live.selectedDiscardCardId;
        commitBoard({
          discardCards: live.discardCards.filter(cd => cd.id !== cardId),
          monsters: [...live.monsters, {id:cardId, row:r, col:c}]
        });
        setSelectedDiscardCardId(null);
      } else {
        const cardId = live.selectedDiscardCardId;
        commitBoard({
          discardCards: live.discardCards.filter(cd => cd.id !== cardId),
          boardItems: [...live.boardItems, {id:cardId, type:dcard.type, row:r, col:c}]
        });
        setSelectedDiscardCardId(null);
      }
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

    // An item picked up on the board via long-press — mirrors selectedTileId
    // in 'moving' mode, minus the occupancy check (items can stack).
    if (live.selectedItemId) {
      const it = live.boardItems.find(x => x.id === live.selectedItemId);
      if (it && it.row === r && it.col === c) { setSelectedItemId(null); return; }
      commitBoard({boardItems: live.boardItems.map(x => x.id === live.selectedItemId ? {...x, row:r, col:c} : x)});
      setSelectedItemId(null);
      return;
    }

    // An item picked up from a player's own footer slots — moving it onto
    // the grid removes it from that player and drops it at this cell.
    if (live.selectedFooterItem) {
      const sel = live.selectedFooterItem;
      commitBoard({
        players: removeFooterItem(live.players, sel),
        boardItems: [...live.boardItems, {id:sel.cardId, type: sel.slot === 'energie' ? 'energie' : 'sort', row:r, col:c}]
      });
      setSelectedFooterItem(null);
      return;
    }

    if (live.selectedId) {
      const sel = live.players.find(p => p.id === live.selectedId);
      if (sel && sel.row === r && sel.col === c) { setSelectedId(null); return; }
      commitPlayers(live.players.map(p => p.id === live.selectedId ? {...p, row:r, col:c} : p));
      setSelectedId(null);
      return;
    }
    // A monster selected for movement — exactly the same "tap elsewhere
    // moves it, same cell deselects" flow as a player above, just writing
    // into `monsters` instead of `players` (CLAUDE.md: monsters follow the
    // same selection/movement system as players, no separate mechanic).
    if (live.selectedMonsterId) {
      const sel = live.monsters.find(m => m.id === live.selectedMonsterId);
      if (sel && sel.row === r && sel.col === c) { setSelectedMonsterId(null); return; }
      commitBoard({monsters: live.monsters.map(m => m.id === live.selectedMonsterId ? {...m, row:r, col:c} : m)});
      setSelectedMonsterId(null);
      return;
    }
    // Nothing held/selected: a plain tap picks whatever's on this cell —
    // players and monsters share the same click gesture, so both are
    // gathered together here. A single match selects it directly; several
    // (any mix of players/monsters) opens the disambiguation picker, now
    // carrying both lists so it can show them in two columns (see its
    // render below) instead of only ever listing players.
    const herePlayers = live.players.filter(p => p.row === r && p.col === c);
    const hereMonsters = live.monsters.filter(m => m.row === r && m.col === c);
    if (herePlayers.length + hereMonsters.length === 1) {
      if (herePlayers.length === 1) setSelectedId(herePlayers[0].id);
      else setSelectedMonsterId(hereMonsters[0].id);
    } else if (herePlayers.length + hereMonsters.length > 1) {
      setCellPicker({clientX, clientY, playerIds:herePlayers.map(p=>p.id), monsterIds:hereMonsters.map(m=>m.id), forVision:false});
    }
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

  // The grid is rendered as ONE giant div (no per-cell elements, for perf —
  // see contentRef below), so the browser's own native 'dblclick' event only
  // checks "same DOM target + within the OS timing/distance threshold" — it
  // has no concept of "cell" at all. Two ordinary single clicks on DIFFERENT
  // cells, fired quickly enough, can still make the browser emit a genuine
  // dblclick — which onContentDoubleClick would otherwise happily act on
  // using the second click's coordinates, selecting whatever tile happens to
  // sit there even though only one tap ever landed on it. lastClickCellRef/
  // sameCellStreakRef track whether the two most recent clicks actually hit
  // the SAME cell (recomputed on every onContentClick call, since it always
  // runs before the dblclick that may follow), so onContentDoubleClick can
  // reject a spurious native dblclick that doesn't correspond to a real
  // same-cell double-tap.
  const lastClickCellRef = useRef(null);
  const sameCellStreakRef = useRef(false);

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
    if (suppressNextClickRef.current) { suppressNextClickRef.current = false; return; } // the click that follows a successful item long-press
    if (wasDraggingRef.current) { wasDraggingRef.current = false; return; }
    const clientX = e.clientX, clientY = e.clientY;
    const rect = contentRef.current.getBoundingClientRect();
    const col = Math.floor((clientX - rect.left) / effectiveCell);
    const row = Math.floor((clientY - rect.top) / effectiveCell);

    sameCellStreakRef.current = !!(lastClickCellRef.current && lastClickCellRef.current.row === row && lastClickCellRef.current.col === col);
    lastClickCellRef.current = {row, col};

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
    setSelectedItemId(null);
    setSelectedFooterItem(null);
    setSelectedMonsterId(null);
  }

  function onContentDoubleClick(e){
    if (wasDraggingRef.current) { wasDraggingRef.current = false; return; }
    if (clickTimerRef.current) { clearTimeout(clickTimerRef.current.timer); clickTimerRef.current = null; }
    if (!sameCellStreakRef.current) return; // spurious native dblclick: the two clicks weren't actually on the same cell
    if (visionMode) return; // inspect-only: no new tile selection while Vision is active
    const rect = contentRef.current.getBoundingClientRect();
    const c = Math.floor((e.clientX - rect.left) / effectiveCell);
    const r = Math.floor((e.clientY - rect.top) / effectiveCell);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    selectTileAt(r, c);
  }

  // Items (sorts/énergies) use a THIRD, dedicated gesture — long-press —
  // per the original "one gesture per entity type" design (see the big
  // comment further up: tap = players, double-click = tiles). Implemented
  // as a self-contained pointerdown/move/up trio on the content div,
  // additive to the existing click/dblclick handlers above (content had no
  // pointer handlers before this) rather than woven into them, to avoid any
  // risk of regressing the already-fragile click/double-click/pan
  // disambiguation those handle. Mirrors PileStack/DiscardSlot's own
  // long-press-to-arm timer (500ms, cancel on movement past a small
  // threshold) rather than inventing a new pattern.
  const itemPressTimerRef = useRef(null);
  const itemPressStartRef = useRef(null); // {x, y, row, col, moved}
  // A long-press that successfully selects an item is still followed by a
  // native 'click' on release (preventDefault on pointerdown doesn't cancel
  // it) — which would otherwise fall into onContentClick's normal
  // single-click handling right on top of the fresh selection. Set the
  // instant the long-press fires, checked and cleared at the top of
  // onContentClick.
  const suppressNextClickRef = useRef(false);
  // True while a Vision-mode "hold to peek" is active (see
  // handleItemLongPress) — onContentPointerUp uses this to know the peek
  // card should disappear the instant the finger/mouse lifts, unlike the
  // picker-opened peek below which stays open until dismissed like any
  // other window.
  const peekingRef = useRef(false);

  function onContentPointerDown(e){
    if (e.pointerType === 'mouse' && e.button !== 0) return; // only the primary button starts an item long-press
    const rect = contentRef.current.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / effectiveCell);
    const row = Math.floor((e.clientY - rect.top) / effectiveCell);
    itemPressStartRef.current = {x:e.clientX, y:e.clientY, row, col, moved:false};
    clearTimeout(itemPressTimerRef.current);
    itemPressTimerRef.current = setTimeout(() => {
      const s = itemPressStartRef.current;
      if (!s || s.moved) return;
      const result = handleItemLongPress(s.row, s.col, s.x, s.y);
      if (result === 'peek') peekingRef.current = true;
      else if (result) suppressNextClickRef.current = true;
    }, 500);
  }
  function onContentPointerMove(e){
    const s = itemPressStartRef.current;
    if (!s || s.moved) return;
    if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > 6) { s.moved = true; clearTimeout(itemPressTimerRef.current); }
  }
  function onContentPointerUp(){
    clearTimeout(itemPressTimerRef.current);
    itemPressStartRef.current = null;
    if (peekingRef.current) { setVisionPeekItem(null); peekingRef.current = false; }
  }

  // Picks up an item at (r,c) for the SAME "select then tap elsewhere to
  // move" flow tiles already use — see selectedItemId's own declaration
  // comment — UNLESS Vision mode is active, in which case it shows the card
  // enlarged instead ("je dois être capable d'afficher le sort... en
  // restant appuyé", no move/select happens in Vision, matching how it
  // already blocks every other card gesture). Several items sharing a cell
  // can't be told apart by a single long-press, so instead of silently
  // grabbing whichever was placed last, it opens a small picker (mirrors
  // the multi-player cellPicker) offset BELOW the press point — placing it
  // right under the still-down pointer would let the release that follows
  // land on one of the picker's own options by accident.
  // Returns 'peek' (continuous-hold preview, cleared on release above),
  // true (selected something / opened a picker — suppress the trailing
  // click either way), or false (nothing there).
  function handleItemLongPress(r, c, clientX, clientY){
    const live = liveRef.current;
    if (live.heldTile || live.heldItem) return false;
    const items = live.boardItems.filter(it => it.row === r && it.col === c);
    if (!items.length) return false;
    if (items.length > 1) {
      setItemCellPicker({clientX, clientY: clientY + 40, items, forVision: live.visionMode});
      return true;
    }
    const item = items[0];
    if (live.visionMode) { setVisionPeekItem({items:[item], index:0}); return 'peek'; }
    setSelectedItemId(item.id);
    setSelectedId(null);
    clearTileSelection();
    setSelectedDiscardCardId(null);
    setSelectedFooterItem(null);
    setSelectedMonsterId(null);
    return true;
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
    const pile = piles.find(p => p.id === pileId);
    if (!pile) return;

    // Sort/énergie decks draw into heldItem instead of heldTile — same
    // "click again to cancel" cycle, just tagged with the deck's type so it
    // lands in boardItems (not placedTiles) once placed.
    if (pile.type !== 'case') {
      if (heldItem) {
        if (heldItem.fromPileId === pileId) {
          const cardId = heldItem.cardId;
          setPiles(piles.map(p => p.id === pileId ? {...p, cards:[...p.cards, {id:cardId}]} : p));
          setHeldItem(null);
        }
        return;
      }
      if (pile.cards.length === 0) return;
      const card = pile.cards[pile.cards.length-1];
      setPiles(piles.map(p => p.id === pileId ? {...p, cards:p.cards.slice(0,-1)} : p));
      setHeldItem({cardId:card.id, itemType:pile.type, fromPileId:pileId});
      setSelectedItemId(null);
      setSelectedFooterItem(null);
      setSelectedDiscardCardId(null);
      setSelectedId(null); // only one thing selected at a time
      setSelectedMonsterId(null);
      clearTileSelection();
      return;
    }

    if (heldTile) {
      if (heldTile.fromPileId === pileId) {
        const cardId = heldTile.cardId;
        setPiles(piles.map(p => p.id === pileId ? {...p, cards:[...p.cards, {id:cardId}]} : p));
        setHeldTile(null);
      }
      return;
    }
    if (pile.cards.length === 0) return;
    const card = pile.cards[pile.cards.length-1];
    setPiles(piles.map(p => p.id === pileId ? {...p, cards:p.cards.slice(0,-1)} : p));
    setHeldTile({cardId:card.id, fromPileId:pileId});
    clearTileSelection();
    setSelectedDiscardCardId(null);
    setSelectedId(null); // only one thing selected at a time
    setSelectedItemId(null);
    setSelectedFooterItem(null);
    setSelectedMonsterId(null);
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
  // the same card type can merge — keeps cases/sorts/énergies from ever
  // mixing. Takes the source id as an explicit argument (captured by the
  // target's own PileStack/DiscardSlot at pointerdown time — see their
  // comments) rather than reading armedPileIdRef here: by the time this
  // runs, the source pile's own popup has already disarmed it via the
  // outside-click listener (which fires on the target's pointerdown,
  // earlier than this click), so re-deriving the source from that ref at
  // this point would already read back null too.
  // Since there are now 3 défausses (one per deck type, see PileGroup), an
  // armed défausse's id is the composite string 'discard:'+type rather than
  // a bare 'discard' — `sourceId`/`targetPileId` starting with 'discard:'
  // identifies which one and, sliced after the colon, its type; only its
  // OWN type's cards ever move (the other défausses' cards, if any exist as
  // separate entries in the same flat `discardCards` array, stay put).
  function mergeArmedInto(sourceId, targetPileId){
    const live = liveRef.current;
    if (!sourceId || sourceId === targetPileId) return;
    if (sourceId.startsWith('discard:')) {
      const dtype = sourceId.slice(8);
      const target = live.piles.find(p => p.id === targetPileId);
      if (!target || target.type !== dtype) return;
      const moving = live.discardCards.filter(c => c.type === dtype);
      commitBoard({
        piles: live.piles.map(p => p.id === targetPileId ? {...p, cards:shuffle([...p.cards, ...moving])} : p),
        discardCards: live.discardCards.filter(c => c.type !== dtype)
      });
      disarmPile();
      return;
    }
    const source = live.piles.find(p => p.id === sourceId);
    if (!source) return;
    if (targetPileId.startsWith('discard:')) {
      const dtype = targetPileId.slice(8);
      if (source.type !== dtype) return;
      commitBoard({
        discardCards: [...live.discardCards, ...shuffle(source.cards.map(c => ({...c, type:source.type})))],
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
      setSelectedMonsterId(null);
    }
    setVisionMode(!visionMode);
  }

  // Reset used to wipe pastRef/futureRef outright, so it could never itself
  // be undone. Gus asked for it to behave like any other action instead: it
  // now goes through commitBoard (pushing the pre-reset state as a normal
  // history entry) rather than clearing history, so ↩ brings everything
  // back exactly as before the reset. Only the truly transient UI state
  // (selection/popups/zoom/scroll, none of it part of the undo snapshot
  // anyway) is still reset directly.
  // Recenters the viewport on the board's middle at the default zoom —
  // shared by Reset (which already did this) and the new discreet target
  // button (Gus: "revenir au centre du plateau avec le zoom de base").
  function centerView(){
    zoomRef.current = 1;
    setZoom(1);
    const vp = viewportRef.current;
    if (vp) { vp.scrollLeft = CENTER_COL*CELL - vp.clientWidth/2; vp.scrollTop = CENTER_ROW*CELL - vp.clientHeight/2; }
  }

  function resetBoard(){
    setSelectedId(null);
    setShowReset(false);
    setArmedPileId(null);
    clearTileSelection();
    setSelectedDiscardCardId(null);
    setCellPicker(null);
    setVisionPlayerId(null);
    setSelectedItemId(null);
    setSelectedFooterItem(null);
    setEnlargedItem(null);
    setSelectedMonsterId(null);
    centerView();
    commitBoard({
      players: [], piles: makeInitialPiles(),
      discardCards: [], placedTiles: [], heldTile: null, currentIndex: 0,
      boardItems: [], heldItem: null, monsters: []
    });
  }

  const current = players[currentIndex] || null;

  // Cluster same-cell tokens into a small 2-column pattern so several
  // entities sharing a cell don't fully overlap each other. Monsters share
  // THIS SAME clustering with players (tagged `kind` to tell them apart at
  // render time) rather than getting their own separate one — Gus asked for
  // a monster to be "vraiment considéré comme un joueur sur le plateau" :
  // alone on a cell it sits centered exactly like a lone player, and
  // sharing a cell with a player (the normal case — a monster spawns on the
  // cell of the player who encountered it) they split the same jitter
  // positions players already use amongst themselves, instead of a monster
  // corner-token stacking underneath the player's own token.
  const cellGroups = {};
  players.forEach(p => {
    const key = `${p.row}-${p.col}`;
    (cellGroups[key] = cellGroups[key] || []).push({...p, kind:'player'});
  });
  monsters.forEach(m => {
    const key = `${m.row}-${m.col}`;
    (cellGroups[key] = cellGroups[key] || []).push({...m, kind:'monstre'});
  });

  // Same clustering idea for items sharing a cell — a smaller offset than
  // players' since the tokens themselves are smaller (ITEM_BOARD_SIZE).
  const itemCellGroups = {};
  boardItems.forEach(it => {
    const key = `${it.row}-${it.col}`;
    (itemCellGroups[key] = itemCellGroups[key] || []).push(it);
  });

  const selectedTileObj = selectedTileId ? placedTiles.find(t => t.id === selectedTileId) : null;
  const selectedTileOccupied = selectedTileObj && players.some(p => p.row === selectedTileObj.row && p.col === selectedTileObj.col);
  const selectedItemObj = selectedItemId ? boardItems.find(it => it.id === selectedItemId) : null;
  const selectedMonsterObj = selectedMonsterId ? monsters.find(m => m.id === selectedMonsterId) : null;
  // A tile fresh out of a pile/défausse ('placed' mode, rotate-only) isn't
  // "selected" as far as piles/défausse are concerned — Gus asked for those
  // to be completely inert (not even the Dessus/Dessous insert menu) while
  // it's in that state, matching how it also can't be moved or discarded
  // yet. `pilesDisabled` below is what actually blocks the clicks (all 3
  // deck groups, not just cases — a stray sort/énergie draw would be just
  // as disruptive mid-rotation); this just keeps the insert-menu gate
  // consistent with it.
  const isPlacedMode = selectedTileMode === 'placed';
  const pilesDisabled = isPlacedMode;
  // Which deck type (if any) the currently-selected défausse/footer card
  // belongs to — used below to gate each of the 3 header groups' insert-menu
  // and quick-discard behavior to only the matching type, now that "the
  // défausse" isn't a single thing anymore.
  const discardSelType = selectedDiscardCardId ? discardCards.find(c => c.id === selectedDiscardCardId)?.type : null;
  const footerSelType = selectedFooterItem ? (selectedFooterItem.slot === 'energie' ? 'energie' : 'sort') : null;
  // A board-selected monster (selectedMonsterId) is deliberately EXCLUDED
  // from hasSelectedCardOfType('monstre') — it used to feed the pile's
  // Dessus/Dessous insert menu (mirroring tiles/items), but that's now in
  // direct conflict with the newer "selecting an entity, then clicking
  // somewhere it has no valid action, cancels the selection" rule (Gus):
  // clicking the monster PILE while a monster is selected must cancel the
  // selection (see drawFromPileOrCancelSelection), not open that menu. A
  // monster CARD selected from the DÉFAUSSE (discardSelType, a completely
  // different state var) is unaffected and still opens the menu normally,
  // same as any other type — only a LIVE board monster loses this path.
  function hasSelectedCardOfType(type){
    if (type === 'case') return !!(selectedTileId && !isPlacedMode) || discardSelType === 'case';
    if (type === 'monstre') return discardSelType === 'monstre';
    return (!!selectedItemObj && selectedItemObj.type === type) || discardSelType === type || footerSelType === type;
  }
  // Unlike hasSelectedCardOfType above, this ONE keeps checking
  // selectedMonsterId — it gates the monster défausse's "a plain click
  // discards the selection directly" fast path (CLAUDE.md's documented
  // combat flow: select the monster, tap its défausse), which fires
  // BEFORE DiscardSlot ever reaches the cancel-selection wrapper, so no
  // conflict with the new rule here.
  function hasSelectedForDiscardOfType(type){
    if (type === 'case') return !!(selectedTileId && !isPlacedMode);
    if (type === 'monstre') return !!selectedMonsterId;
    return (!!selectedItemObj && selectedItemObj.type === type) || footerSelType === type;
  }

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
  // Once even the floor size doesn't fit everyone (enough players — Gus hit
  // this around 8), the column becomes scrollable — but `justifyContent:
  // 'center'` on an OVERFLOWING flex container centers the excess equally
  // above AND below the box, and a plain `overflowY:'auto'` scroll range
  // for centered overflow doesn't let you scroll up far enough to reach
  // that above-the-box excess: the first player (sometimes the second)
  // stayed permanently hidden behind the header, un-reachable by scrolling
  // at all, not just visually clipped. Switching to `flex-start` once this
  // "wouldn't fit even at the floor" state is detected keeps the list
  // flush against the top of its box instead, so scrolling actually
  // reaches every item.
  const sidebarDesiredAtFloor = sidebarItemCount*SIDEBAR_MIN_SIZE + (sidebarItemCount-1)*SIDEBAR_GAP;
  const sidebarWillOverflow = sidebarDesiredAtFloor > sidebarAvailH;

  // Same "shrink to fit, don't overflow" idea as squareSize above, applied
  // to the header's 3 deck groups: each group is now a 2-column grid of
  // however many piles that type has been split into, with its défausse
  // BELOW it (see PileGroup) — splitting enough of them could otherwise
  // push the row wider than the screen. `groupNaturalWidth` mirrors what
  // PileGroup actually renders (min(2,count) columns, défausse stacked
  // underneath so it no longer adds to the WIDTH) so the estimate matches
  // the real layout. Gus wants the header to NEVER need horizontal
  // scrolling — "pile poil la taille de l'écran" — so unlike the sidebar's
  // squareSize this has only a token floor (just to avoid the boxes
  // shrinking to nothing in an extreme case), not a real minimum size;
  // overflowX:'auto' on the row stays only as an ultimate safety net.
  // Case tiles use the SAME box size as sort/énergie piles here (Gus:
  // "mets les cartes map à la même taille que les items") — no separate
  // CASE_BOX constant anymore, just HEADER_ITEM_BOX for all 3 groups.
  const HEADER_GROUP_GAP = 6, HEADER_PAD = 32, HEADER_MIN_SCALE = 0.2;
  function groupNaturalWidth(count, box){
    const cols = Math.min(2, Math.max(1, count));
    return cols*box + (cols > 1 ? 5 : 0);
  }
  const caseCount = Math.max(1, piles.filter(p => p.type === 'case').length);
  const sortCount = Math.max(1, piles.filter(p => p.type === 'sort').length);
  const energieCount = Math.max(1, piles.filter(p => p.type === 'energie').length);
  const monstreCount = Math.max(1, piles.filter(p => p.type === 'monstre').length);
  const naturalHeaderWidth = groupNaturalWidth(caseCount, HEADER_ITEM_BOX) + HEADER_GROUP_GAP*3
    + groupNaturalWidth(sortCount, HEADER_ITEM_BOX)
    + groupNaturalWidth(energieCount, HEADER_ITEM_BOX)
    + groupNaturalWidth(monstreCount, HEADER_ITEM_BOX);
  const availHeaderWidth = Math.max(0, (typeof window !== 'undefined' ? window.innerWidth : 800) - HEADER_PAD);
  const headerScale = naturalHeaderWidth <= availHeaderWidth ? 1 : Math.max(HEADER_MIN_SCALE, availHeaderWidth / naturalHeaderWidth);
  const headerBoxSize = Math.round(HEADER_ITEM_BOX * headerScale);

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
          h('button', {onClick:guardedBySelection(()=>setShowReset(!showReset)), style:{background:'none', border:`1px solid ${borderColor(visionMode,'#333')}`, borderRadius:6, color:'#a55', padding:'6px 10px', fontSize:12}}, '⟲ Reset'),
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
        h(UndoRedo, {canUndo, canRedo, onUndo:guardedBySelection(undo), onRedo:guardedBySelection(redo)})
      ),
      // Three deck groups side by side — cases, then sorts, then énergies
      // (Gus: "les sorts à droite des cases et les énergies à droite des
      // sorts") — each its own PileGroup (piles above their défausse,
      // wrapping 2-per-row once split), separated by a thin vertical
      // divider (Gus: "trop d'écart... rapproche-les" — a tight
      // HEADER_GROUP_GAP plus a divider reads as 3 distinct groups without
      // needing wide spacing to do it). Sizes shrink together via
      // headerBoxSize (see its own comment) rather than letting the row
      // overflow off-screen; overflowX stays as a last-resort fallback
      // exactly like the sidebar's own squareSize floor+scroll.
      h('div', {style:{display:'flex', alignItems:'flex-start', gap:HEADER_GROUP_GAP, padding:'0 16px 12px', overflowX:'auto'}},
        h(PileGroup, {
          type:'case', piles, discardCards, boxSize:headerBoxSize,
          holding:{pileId: heldTile ? heldTile.fromPileId : null, discardId:selectedDiscardCardId},
          armedId:armedPileId, armedIdRef:armedPileIdRef,
          hasSelectedCard:hasSelectedCardOfType('case'), hasSelectedTile:hasSelectedForDiscardOfType('case'), disabled:pilesDisabled,
          visionMode, onOpenDiscardPeek:openDiscardPeek,
          // A tile fresh out of a pile ('placed' mode) blocks the DÉFAUSSE
          // and long-press-arming a pile, but clicking a case PILE itself
          // is deliberately let through: Gus asked for it to deselect the
          // placed tile and immediately draw the next card in one tap
          // ("c'est le truc qu'on va faire le plus souvent") instead of
          // being fully inert. `drawFromPile` already calls
          // clearTileSelection() as part of any normal draw, so allowing
          // the click through is all that's needed — no extra logic.
          allowPileDraw:true,
          onArm:armPile, onDisarm:disarmPile,
          onDraw:drawFromPileOrCancelSelection, onSplit:splitPile, onShuffle:shufflePile, onMergeInto:mergeArmedInto,
          onInsertSelected:insertSelectedCardIntoPile, onShuffleInPlace:shuffleDiscardInPlace,
          onDiscardSelectedTile:discardSelectedTile, onToggleSelect:toggleSelectDiscardCardOrCancelSelection
        }),
        h('div', {style:{width:1, alignSelf:'stretch', background: borderColor(visionMode,'rgba(255,255,255,.12)')}}),
        h(PileGroup, {
          type:'sort', piles, discardCards, boxSize:headerBoxSize,
          holding:{pileId: heldItem && heldItem.itemType === 'sort' ? heldItem.fromPileId : null, discardId:selectedDiscardCardId},
          armedId:armedPileId, armedIdRef:armedPileIdRef,
          hasSelectedCard:hasSelectedCardOfType('sort'), hasSelectedTile:hasSelectedForDiscardOfType('sort'), disabled:pilesDisabled,
          visionMode, onOpenDiscardPeek:openDiscardPeek,
          onArm:armPile, onDisarm:disarmPile,
          onDraw:drawFromPileOrCancelSelection, onSplit:splitPile, onShuffle:shufflePile, onMergeInto:mergeArmedInto,
          onInsertSelected:insertSelectedCardIntoPile, onShuffleInPlace:shuffleDiscardInPlace,
          onDiscardSelectedTile:discardSelectedItem, onToggleSelect:toggleSelectDiscardCardOrCancelSelection
        }),
        h('div', {style:{width:1, alignSelf:'stretch', background: borderColor(visionMode,'rgba(255,255,255,.12)')}}),
        h(PileGroup, {
          type:'energie', piles, discardCards, boxSize:headerBoxSize,
          holding:{pileId: heldItem && heldItem.itemType === 'energie' ? heldItem.fromPileId : null, discardId:selectedDiscardCardId},
          armedId:armedPileId, armedIdRef:armedPileIdRef,
          hasSelectedCard:hasSelectedCardOfType('energie'), hasSelectedTile:hasSelectedForDiscardOfType('energie'), disabled:pilesDisabled,
          visionMode, onOpenDiscardPeek:openDiscardPeek,
          onArm:armPile, onDisarm:disarmPile,
          onDraw:drawFromPileOrCancelSelection, onSplit:splitPile, onShuffle:shufflePile, onMergeInto:mergeArmedInto,
          onInsertSelected:insertSelectedCardIntoPile, onShuffleInPlace:shuffleDiscardInPlace,
          onDiscardSelectedTile:discardSelectedItem, onToggleSelect:toggleSelectDiscardCardOrCancelSelection
        }),
        h('div', {style:{width:1, alignSelf:'stretch', background: borderColor(visionMode,'rgba(255,255,255,.12)')}}),
        // Monstres — 4ème groupe, à droite des énergies. Piocher/déplacer/
        // défausser un monstre passe par les mêmes callbacks génériques que
        // les 3 autres groupes (PileGroup/PileStack/DiscardSlot ne savent
        // même pas qu'un 4ème type existe) — seul `discardSelectedMonster`
        // est spécifique, exactement comme `discardSelectedTile`/
        // `discardSelectedItem` le sont déjà pour les cases/sorts-énergies.
        h(PileGroup, {
          type:'monstre', piles, discardCards, boxSize:headerBoxSize,
          holding:{pileId: heldItem && heldItem.itemType === 'monstre' ? heldItem.fromPileId : null, discardId:selectedDiscardCardId},
          armedId:armedPileId, armedIdRef:armedPileIdRef,
          hasSelectedCard:hasSelectedCardOfType('monstre'), hasSelectedTile:hasSelectedForDiscardOfType('monstre'), disabled:pilesDisabled,
          visionMode, onOpenDiscardPeek:openDiscardPeek,
          onArm:armPile, onDisarm:disarmPile,
          onDraw:drawFromPileOrCancelSelection, onSplit:splitPile, onShuffle:shufflePile, onMergeInto:mergeArmedInto,
          onInsertSelected:insertSelectedCardIntoPile, onShuffleInPlace:shuffleDiscardInPlace,
          onDiscardSelectedTile:discardSelectedMonster, onToggleSelect:toggleSelectDiscardCardOrCancelSelection
        }),
        (heldTile || heldItem) && h('div', {style:{fontSize:11, color:'#9cf', alignSelf:'center'}}, 'Clique une case pour poser la carte')
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
      display:'flex', flexDirection:'column', justifyContent: sidebarWillOverflow ? 'flex-start' : 'center', alignItems:'flex-end',
      gap:SIDEBAR_GAP, overflowY:'auto', zIndex:15, pointerEvents:'none'
    }},
      players.map((p,i) => h(PlayerSquare, {
        key:p.id, player:p, isCurrent:i===currentIndex, size:squareSize,
        onRemove:guardedBySelection(()=>removePlayer(p.id)), onRename:v=>renamePlayer(p.id,v),
        onOpenInfo:guardedBySelection(()=>{ setVisionPlayerId(p.id); setVisionPlayerFromSidebar(true); })
      })),
      h('div', {style:{width:squareSize, pointerEvents:'auto'}}, h(AddBtn, {onClick:guardedBySelection(addPlayer)}))
    ),

    // RECENTER BUTTON — discreet target icon, top-left of the footer (so
    // visually it sits right at the board's own bottom-left corner) but
    // `position:fixed` like the header/footer themselves, not part of the
    // pannable/zoomable grid content — clicking it just calls the same
    // centerView() Reset already used, without touching anything else.
    // Anchored off `sidebarBounds.bottom` (already measured for the
    // sidebar) so it always sits exactly at the grid/footer boundary.
    h('button', {
      onClick:centerView,
      title:'Recentrer la vue',
      style:{
        position:'fixed', left:8, bottom:sidebarBounds.bottom+8, zIndex:15,
        width:30, height:30, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center',
        background:'rgba(255,255,255,.05)', border:`1px solid ${borderColor(visionMode,'#333')}`, color:'#777'
      }
    }, h(TargetIcon)),

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
        onPointerDown:onContentPointerDown,
        onPointerMove:onContentPointerMove,
        onPointerUp:onContentPointerUp,
        onPointerCancel:onContentPointerUp,
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
        // Items render ABOVE tiles, BELOW players — plain DOM order (no
        // z-index needed) already gives that: this block sits between the
        // placedTiles block above and the player-tokens block below.
        // Gus asked for a lone item to sit on a CORNER of its tile rather
        // than dead center (center is where a player token/the tile's own
        // controls tend to be) — so every item, even a group of 1, picks a
        // quadrant by index (i%4) and sits near that corner; a 2nd/3rd/4th
        // item sharing the cell just takes the next corner over instead of
        // needing a separate "single vs. multiple" branch.
        Object.entries(itemCellGroups).map(([key, group]) => group.map((it, i) => {
          const q = i % 4;
          const cx = it.col*CELL + (q % 2 === 0 ? ITEM_CORNER_INSET : CELL - ITEM_CORNER_INSET);
          const cy = it.row*CELL + (q < 2 ? ITEM_CORNER_INSET : CELL - ITEM_CORNER_INSET);
          return h('div', {
            key:it.id,
            style:{
              position:'absolute', left:cx, top:cy, transform:'translate(-50%,-50%)', pointerEvents:'none',
              borderRadius:5, boxShadow: selectedItemId === it.id ? '0 0 0 2px #fff, 0 0 8px 2px #4fa3ff' : 'none'
            }
          }, h(CardFace, {showBack:false, size:ITEM_BOARD_SIZE, kind:it.type}));
        })),
        // Players AND monsters, from the same cellGroups clustering (see its
        // own comment) — a monster is visually distinguishable (dark
        // accent background, 👹 glyph, red selection glow) but shares the
        // exact same positioning math as a player, including sitting dead
        // center when alone on a cell.
        Object.entries(cellGroups).map(([key, group]) => group.map((e, i) => {
          const cx = e.col*CELL + CELL/2 + (group.length>1 ? (i%2===0?-1:1)*(CELL/5) : 0);
          const cy = e.row*CELL + CELL/2 + (group.length>1 ? (i>=2?1:-1)*(CELL/5) : 0);
          if (e.kind === 'monstre') {
            return h('div', {
              key:e.id,
              style:{
                position:'absolute', left:cx, top:cy, transform:'translate(-50%,-50%)',
                width:26, height:26, borderRadius:'50%', background:BACK_ACCENT.monstre,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:13, pointerEvents:'none',
                boxShadow: selectedMonsterId===e.id ? '0 0 0 2px #fff, 0 0 10px 3px #f66' : '0 1px 4px rgba(0,0,0,.5)'
              }
            }, '👹');
          }
          return h('div', {
            key:e.id,
            style:{
              position:'absolute', left:cx, top:cy, transform:'translate(-50%,-50%)',
              width:26, height:26, borderRadius:'50%', background:e.couleur,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:700, color:'#fff', pointerEvents:'none',
              boxShadow: selectedId===e.id ? '0 0 0 2px #fff, 0 0 10px 3px #4fa3ff' : '0 1px 4px rgba(0,0,0,.5)'
            }
          }, e.nom.slice(0,1).toUpperCase());
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
        ],

        // SELECTED MONSTER / ITEM CONTROLS — same corner-anchored button
        // pattern as the tile controls above ("au croisement de la grille,
        // comme les cartes map"), just 2 buttons instead of 3: eye top-right
        // opens the card enlarged (with ‹/› through whatever else shares
        // that same cell, reusing enlargedMonster/visionPeekItem — no new
        // window needed, both already support being opened from here as
        // well as from Vision mode), red ✕ top-left discards it — the same
        // `discardSelectedMonster`/`discardSelectedItem` the matching
        // défausse click already used, just a second, faster entry point.
        selectedMonsterObj && [
          h('div', {
            key:'monster-eye', onClick: e => {
              e.stopPropagation();
              const here = monsters.filter(m => m.row === selectedMonsterObj.row && m.col === selectedMonsterObj.col);
              setEnlargedMonster({monsterIds: here.map(m => m.id), index: here.findIndex(m => m.id === selectedMonsterObj.id)});
            },
            style:{...inGridBtnStyle, left:selectedMonsterObj.col*CELL+CELL, top:selectedMonsterObj.row*CELL}
          }, h(EyeIcon)),
          h('div', {
            key:'monster-discard', onClick: e => { e.stopPropagation(); discardSelectedMonster(); },
            style:{...inGridBtnStyle, left:selectedMonsterObj.col*CELL, top:selectedMonsterObj.row*CELL, color:'#f66', borderColor:'rgba(220,60,40,.5)'}
          }, '✕')
        ],
        selectedItemObj && [
          h('div', {
            key:'item-eye', onClick: e => {
              e.stopPropagation();
              const here = boardItems.filter(it => it.row === selectedItemObj.row && it.col === selectedItemObj.col);
              setVisionPeekItem({items: here, index: here.findIndex(it => it.id === selectedItemObj.id)});
            },
            style:{...inGridBtnStyle, left:selectedItemObj.col*CELL+CELL, top:selectedItemObj.row*CELL}
          }, h(EyeIcon)),
          h('div', {
            key:'item-discard', onClick: e => { e.stopPropagation(); discardSelectedItem(); },
            style:{...inGridBtnStyle, left:selectedItemObj.col*CELL, top:selectedItemObj.row*CELL, color:'#f66', borderColor:'rgba(220,60,40,.5)'}
          }, '✕')
        ]
      )
    ),

    // MULTI-PLAYER/MONSTER CELL PICKER — several players and/or monsters
    // sharing a cell means a single click can't tell which one you mean, so
    // a small popup asks. Positioned at the raw tap coordinates (outside the
    // pannable/zoomed content, no transform math needed). Tiles never appear
    // here anymore: they're selected via double-click, an entirely separate
    // gesture. Two rendering paths: with no monsters on this cell (the
    // original, still-validated case — Vision mode never puts any monsters
    // here either, see handleSingleClick) it's the exact same single-column
    // `items` list as before; once monsters join a cell (CLAUDE.md: "la
    // fenêtre de choix joueurs/monstres (deux colonnes)"), it switches to a
    // two-column `children` layout mirroring itemCellPicker's own
    // sorts/énergies split — joueurs left, monstres right.
    cellPicker && h('div', {
      ref:cellPickerAnchorRef,
      style:{position:'fixed', left:cellPicker.clientX, top:cellPicker.clientY, zIndex:250}
    },
      cellPicker.monsterIds.length === 0
        ? h(Popup, {
            onClose:()=>setCellPicker(null),
            anchorRef:cellPickerAnchorRef,
            style:{left:0, top:0, width:220},
            // Bigger tap targets than the default .popup-item — this picker
            // exists specifically to make an easy, unambiguous choice when a
            // cell has several players on it, so it should be the easiest
            // popup in the app to hit, not the default compact size shared
            // with menus like Diviser/Mélanger.
            itemStyle:{padding:'12px 14px', fontSize:15, gap:10},
            items: cellPicker.playerIds.map(id => {
              const p = players.find(pl => pl.id === id);
              return {
                label:p.nom, dot:p.couleur,
                onClick:() => { if (cellPicker.forVision) { setVisionPlayerId(id); setVisionPlayerFromSidebar(false); } else setSelectedId(id); }
              };
            })
          })
        : h(Popup, {
            onClose:()=>setCellPicker(null),
            anchorRef:cellPickerAnchorRef,
            style:{left:0, top:0, padding:10},
            children: h('div', {style:{display:'flex', gap:12}},
              h('div', {style:{display:'flex', flexDirection:'column', gap:6}},
                cellPicker.playerIds.map(id => {
                  const p = players.find(pl => pl.id === id);
                  return h('div', {
                    key:id, className:'popup-item', style:{padding:'12px 14px', fontSize:15, gap:10, cursor:'pointer'},
                    onClick:() => { setSelectedId(id); setCellPicker(null); }
                  }, h('div', {style:{width:8,height:8,borderRadius:'50%',background:p.couleur}}), p.nom);
                })
              ),
              h('div', {style:{display:'flex', flexDirection:'column', gap:6}},
                cellPicker.monsterIds.map(id => h('div', {
                  key:id, className:'popup-item', style:{padding:'12px 14px', fontSize:15, gap:10, cursor:'pointer'},
                  onClick:() => {
                    if (cellPicker.forVision) setEnlargedMonster({monsterIds:cellPicker.monsterIds, index:cellPicker.monsterIds.indexOf(id)});
                    else setSelectedMonsterId(id);
                    setCellPicker(null);
                  }
                }, '👹 Monstre'))
              )
            )
          })
    ),

    // MULTI-ITEM CELL PICKER — several sorts/énergies sharing a cell can't
    // be told apart by a single long-press, so it offers a choice popup
    // instead (see handleItemLongPress). `forVision` decides whether
    // picking one opens visionPeekItem (Vision mode) or selects it for the
    // normal move flow. Laid out as two columns (sorts left, énergies
    // right, Gus) rather than one flat list — a custom `children` layout
    // instead of Popup's own `items` list mode, since that mode only ever
    // renders a single column.
    itemCellPicker && h('div', {
      ref:itemCellPickerAnchorRef,
      style:{position:'fixed', left:itemCellPicker.clientX, top:itemCellPicker.clientY, zIndex:250}
    },
      h(Popup, {
        onClose:()=>setItemCellPicker(null),
        anchorRef:itemCellPickerAnchorRef,
        style:{left:0, top:0, padding:10},
        children: h('div', {style:{display:'flex', gap:12}},
          ['sort', 'energie'].map(kind => h('div', {key:kind, style:{display:'flex', flexDirection:'column', gap:6}},
            itemCellPicker.items.filter(it => (it.type === 'energie') === (kind === 'energie')).map(it =>
              h('div', {
                key:it.id, className:'popup-item', style:{padding:'12px 14px', fontSize:15, gap:10, cursor:'pointer'},
                onClick: () => {
                  if (itemCellPicker.forVision) {
                    setVisionPeekItem({items: itemCellPicker.items, index: itemCellPicker.items.findIndex(x => x.id === it.id)});
                  } else {
                    setSelectedItemId(it.id);
                    setSelectedId(null);
                    clearTileSelection();
                    setSelectedDiscardCardId(null);
                    setSelectedFooterItem(null);
                  }
                  setItemCellPicker(null);
                }
              }, kind === 'energie' ? '🔥 Énergie' : '🪄 Sort')
            )
          ))
        )
      })
    ),

    // VISION MODE "HOLD TO PEEK" — a big preview of a card, either live
    // while the board item is held down (auto-clears on release, see
    // onContentPointerUp — always a single item, no arrows since there's
    // nothing else to browse to) or opened from itemCellPicker when several
    // items shared the cell (stays until dismissed by tapping outside, like
    // any other window). In the multi-item case, ‹/› cycle through the
    // OTHER items sharing that same cell (visionPeekItem.items) — mirrors
    // enlargedItem's carousel but scoped to this cell instead of a player's
    // full equipment. The card+arrows stop propagation so tapping an arrow
    // (or the card itself) doesn't also bubble up to the backdrop's
    // close-on-outside-click.
    visionPeekItem && (() => {
      const item = visionPeekItem.items[visionPeekItem.index];
      if (!item) return null;
      return h('div', {
        onClick:()=>setVisionPeekItem(null),
        style:{position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:275, display:'flex', alignItems:'center', justifyContent:'center'}
      },
        h('div', {onClick:e=>e.stopPropagation(), style:{position:'relative'}},
          h(CardFace, {showBack:false, size:140, kind: item.type === 'energie' ? 'energie' : 'sort'}),
          visionPeekItem.items.length > 1 && h('div', {
            onClick:()=>shiftVisionPeek(-1),
            style:{position:'absolute', left:-18, bottom:-18, width:36, height:36, borderRadius:'50%', background:'rgba(30,30,30,.95)',
              border:'1px solid #777', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:18, color:'#eee'}
          }, '‹'),
          visionPeekItem.items.length > 1 && h('div', {
            onClick:()=>shiftVisionPeek(1),
            style:{position:'absolute', right:-18, bottom:-18, width:36, height:36, borderRadius:'50%', background:'rgba(30,30,30,.95)',
              border:'1px solid #777', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:18, color:'#eee'}
          }, '›')
        )
      );
    })(),

    // MONSTER CARD ENLARGED — same backdrop/arrows pattern as visionPeekItem
    // just above, reachable from a Vision-mode click on a monster-only cell
    // OR the eye button on a selected monster in normal mode (see the
    // in-grid monster controls). ‹/› cycle through every OTHER monster
    // sharing that monster's own cell.
    enlargedMonster && (() => {
      if (!enlargedMonster.monsterIds[enlargedMonster.index]) return null;
      return h('div', {
        onClick:()=>setEnlargedMonster(null),
        style:{position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:275, display:'flex', alignItems:'center', justifyContent:'center'}
      },
        h('div', {onClick:e=>e.stopPropagation(), style:{position:'relative'}},
          h(CardFace, {showBack:false, size:140, kind:'monstre'}),
          enlargedMonster.monsterIds.length > 1 && h('div', {
            onClick:()=>shiftEnlargedMonster(-1),
            style:{position:'absolute', left:-18, bottom:-18, width:36, height:36, borderRadius:'50%', background:'rgba(30,30,30,.95)',
              border:'1px solid #777', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:18, color:'#eee'}
          }, '‹'),
          enlargedMonster.monsterIds.length > 1 && h('div', {
            onClick:()=>shiftEnlargedMonster(1),
            style:{position:'absolute', right:-18, bottom:-18, width:36, height:36, borderRadius:'50%', background:'rgba(30,30,30,.95)',
              border:'1px solid #777', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:18, color:'#eee'}
          }, '›')
        )
      );
    })(),

    // DÉFAUSSE BROWSING (Vision mode) — clicking any défausse in Vision
    // mode opens this instead of the normal select/merge behavior (see
    // DiscardSlot's own `visionMode` branch). Deliberately non-looping,
    // unlike every other ‹/› carousel in the app (Gus: "il faut pas de
    // loop") — the top (most recent, shown first) card only ever gets ›
    // since there's nothing "newer" to look at, and the oldest only gets ‹.
    visionDiscardPeek && (() => {
      const list = discardBrowseList(visionDiscardPeek.type);
      const card = list[visionDiscardPeek.index];
      if (!card) return null;
      return h('div', {
        onClick:()=>setVisionDiscardPeek(null),
        style:{position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:275, display:'flex', alignItems:'center', justifyContent:'center'}
      },
        h('div', {onClick:e=>e.stopPropagation(), style:{position:'relative'}},
          h(CardFace, {showBack:false, size:140, kind:visionDiscardPeek.type}),
          visionDiscardPeek.index > 0 && h('div', {
            onClick:()=>shiftDiscardPeek(-1),
            style:{position:'absolute', left:-18, bottom:-18, width:36, height:36, borderRadius:'50%', background:'rgba(30,30,30,.95)',
              border:'1px solid #777', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:18, color:'#eee'}
          }, '‹'),
          visionDiscardPeek.index < list.length-1 && h('div', {
            onClick:()=>shiftDiscardPeek(1),
            style:{position:'absolute', right:-18, bottom:-18, width:36, height:36, borderRadius:'50%', background:'rgba(30,30,30,.95)',
              border:'1px solid #777', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:18, color:'#eee'}
          }, '›')
        )
      );
    })(),

    // VISION MODE / SIDEBAR — clicking a token (Vision mode) or a sidebar
    // square opens this player's detail window. Same "closes on outside
    // click" rule as every other popup, plus an explicit red ✕ since it's a
    // big window. Layout: name + PV heart on the LEFT, the player's
    // equipped cards on the RIGHT laid out the same way as the footer
    // (nature slot + long sorts/énergies rows) — each card opens the same
    // enlarge/carousel window as tapping it in the footer. `visionPlayerFromSidebar`
    // gates the ‹/› row at the bottom: only the sidebar entry point cycles
    // between players (in sidebar order), a Vision-mode tap is a one-off
    // inspection with nothing to browse.
    visionPlayerId && (() => {
      const p = players.find(pl => pl.id === visionPlayerId);
      if (!p) return null;
      return h('div', {style:{position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:260, display:'flex', alignItems:'center', justifyContent:'center'}},
        h('div', {ref:visionModalAnchorRef, style:{position:'relative'}},
          h(Popup, {
            // Guarded rather than a plain setVisionPlayerId(null): Popup's
            // own "click outside my anchor" listener has no idea the
            // enlarge window (enlargedItem) might be floating on TOP of
            // this one — every click inside that layered window (including
            // its own ‹/› arrows) is technically "outside" this modal's own
            // anchor, so without this guard it closed the WRONG (bottom)
            // window whenever the top one was interacted with, arrows
            // included. While enlargedItem is open this Popup simply
            // doesn't react to outside clicks at all — the enlarge window's
            // own Popup still closes normally on its own outside clicks
            // (its anchor correctly contains its ‹/›/✕), so a blank-space
            // tap now closes the TOPMOST window first, as expected.
            onClose:()=>{ if (!enlargedItem) setVisionPlayerId(null); },
            anchorRef:visionModalAnchorRef,
            style:{position:'relative', width:'min(95vw,420px)', maxHeight:'80vh', overflow:'auto', padding:20},
            // Layout: name+heart and the ✕ share a single top row (same
            // height, Gus: "même hauteur toute à droite la croix"), items
            // stacked below spanning the full width — a previous version
            // put name+heart in a narrow LEFT column with items to its
            // RIGHT, which forced the window wide enough for both side by
            // side and didn't fit a phone screen. Nothing here changes
            // size (VISION_ITEM_SIZE, VISION_ROW_WIDTH, the heart/name
            // fonts) — only the arrangement moves, per Gus's ask.
            children: h('div', {},
              h('div', {style:{display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:14}},
                h('div', {style:{display:'flex', alignItems:'center', gap:10, minWidth:0}},
                  h('div', {style:{fontSize:16, fontWeight:700, color:'#eee', wordBreak:'break-word'}}, p.nom),
                  h('div', {style:{position:'relative', width:40, height:40, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center'}},
                    h('div', {style:{position:'absolute', fontSize:36}}, '❤️'),
                    h('div', {style:{position:'relative', fontSize:14, fontWeight:700, color:'#fff'}}, p.pv)
                  )
                ),
                h('div', {
                  onClick:()=>setVisionPlayerId(null),
                  style:{width:26, height:26, flexShrink:0, borderRadius:'50%',
                    background:'rgba(220,60,40,.2)', border:'1px solid rgba(220,60,40,.5)', color:'#f66',
                    display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:14}
                }, '✕')
              ),
              h('div', {style:{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}},
                  h('div', {style:{width:VISION_ROW_HEIGHT, height:VISION_ROW_HEIGHT, flexShrink:0, boxSizing:'border-box',
                    display:'flex', justifyContent:'center', alignItems:'center',
                    border:'1px dashed #444', borderRadius:6, padding:FOOTER_SLOT_PAD}},
                    h(FooterItemRow, {
                      items: p.natureSort ? [p.natureSort] : [], kind:'sort', size:VISION_ITEM_SIZE, selectedId:null,
                      onReorder:()=>{}, onSelectForMove:()=>{}, onOpenEnlarge:it=>openEnlargeFor(p.id, 'nature', it.id)
                    })
                  ),
                  h('div', {style:{display:'flex', flexDirection:'column', gap:FOOTER_SLOT_GAP}},
                    h('div', {style:{height:VISION_ROW_HEIGHT, minWidth:VISION_ROW_WIDTH, boxSizing:'border-box',
                      display:'flex', alignItems:'center', overflowX:'auto',
                      border:'1px dashed #444', borderRadius:6, padding:`0 ${FOOTER_SLOT_PAD}px`}},
                      h(FooterItemRow, {
                        items: p.sorts || [], kind:'sort', size:VISION_ITEM_SIZE, selectedId:null,
                        onReorder:()=>{}, onSelectForMove:()=>{}, onOpenEnlarge:it=>openEnlargeFor(p.id, 'sort', it.id)
                      })
                    ),
                    h('div', {style:{height:VISION_ROW_HEIGHT, minWidth:VISION_ROW_WIDTH, boxSizing:'border-box',
                      display:'flex', alignItems:'center', overflowX:'auto',
                      border:'1px dashed #444', borderRadius:6, padding:`0 ${FOOTER_SLOT_PAD}px`}},
                      h(FooterItemRow, {
                        items: p.energies || [], kind:'energie', size:VISION_ITEM_SIZE, selectedId:null,
                        onReorder:()=>{}, onSelectForMove:()=>{}, onOpenEnlarge:it=>openEnlargeFor(p.id, 'energie', it.id)
                      })
                    )
                  )
                ),
              visionPlayerFromSidebar && players.length > 1 && h('div', {style:{display:'flex', justifyContent:'space-between', marginTop:18}},
                h('button', {onClick:()=>shiftVisionPlayer(-1), style:{background:'rgba(255,255,255,.06)', border:'1px solid #444', borderRadius:8, color:'#eee', width:34, height:34, fontSize:20}}, '‹'),
                h('button', {onClick:()=>shiftVisionPlayer(1), style:{background:'rgba(255,255,255,.06)', border:'1px solid #444', borderRadius:8, color:'#eee', width:34, height:34, fontSize:20}}, '›')
              )
            )
          })
        )
      );
    })(),

    // FOOTER (sticky) — a column: the current player's equipped sorts/
    // énergies (only once items exist to show, Couche 3) stacked above the
    // original dice/PV row, which keeps its own layout/behavior untouched.
    // Clicking the footer's own background clears any selected card, same
    // as the header.
    h('div', {onClick:clearCardSelection, style:{flexShrink:0, display:'flex', flexDirection:'column',
      background: visionMode ? 'rgba(15,25,35,.97)' : 'rgba(20,20,20,.97)',
      borderTop:`1px solid ${borderColor(visionMode,'rgba(255,255,255,.08)')}`, zIndex:20, transition:'background .3s, border-color .3s'}},

      // EQUIPPED ITEMS — "sort de nature" (single fixed-size slot, left)
      // beside two long fixed-size row slots (sorts, then énergies below) —
      // all 3 dashed outlines share FOOTER_SLOT_HEIGHT so none of them ever
      // changes size depending on whether it's empty or full (Gus flagged
      // the nature square doing exactly that). `onClickCapture` (fires
      // BEFORE any child's own bubble-phase onClick) intercepts every tap
      // in this zone while a card is held/board-selected and equips it here
      // instead of letting an individual slot's own tap-to-enlarge handler
      // run — "peu importe où je clique dans cette zone avec un item".
      current && h('div', {
        onClickCapture: e => {
          const live = liveRef.current;
          if (live.heldItem || live.selectedItemId) { e.stopPropagation(); equipHeldOrSelectedItem(); return; }
          // The trailing native click right after a footer long-press
          // selection (see selectFooterItem's own comment) — stopped here
          // entirely (capture-phase stopPropagation halts the event before
          // it ever reaches the target, so the item's own onClick never
          // fires either — its internal suppressClickRef would have made
          // it a no-op anyway) rather than just skipped: letting it merely
          // fall through without stopping it would still bubble past this
          // div to the OUTER footer's own onClick={clearCardSelection},
          // undoing the selection this click was never supposed to touch.
          if (suppressNextEquipClickRef.current) { suppressNextEquipClickRef.current = false; e.stopPropagation(); return; }
          // The discard ✕ badge on a long-press-selected footer card IS a
          // valid action for that exact selection (unlike everything else
          // in this zone) — without this, hasAnySelection() below would be
          // true (because of the very selection whose ✕ is being clicked)
          // and cancel it before the badge's own onClick ever got to fire.
          if (e.target.closest('.footer-item-discard-btn')) return;
          // Any OTHER selection (a tile, a défausse card, a footer item
          // already selected elsewhere, a player, a monster) has no valid
          // action in the equip zone either — capture-phase intercept, same
          // as the branch above, so this fires BEFORE an equipped card's
          // own click (which would otherwise open it enlarged instead of
          // just cancelling the selection). Reached the "equip" branch
          // above only for held/selected ITEMS, so hasAnySelection() here
          // is checking every OTHER kind.
          if (hasAnySelection()) { e.stopPropagation(); clearCardSelection(); }
        },
        style:{display:'flex', alignItems:'center', gap:8, padding:'8px 14px 0', justifyContent:'center'}
      },
        h('div', {style:{width:FOOTER_ROW_HEIGHT, height:FOOTER_ROW_HEIGHT, flexShrink:0, boxSizing:'border-box',
          display:'flex', justifyContent:'center', alignItems:'center',
          border:`1px dashed ${borderColor(visionMode,'#444')}`, borderRadius:6, padding:FOOTER_SLOT_PAD}},
          h(FooterItemRow, {
            items: current.natureSort ? [current.natureSort] : [], kind:'sort', size:FOOTER_ITEM_SIZE,
            selectedId: selectedFooterItem?.playerId===current.id && selectedFooterItem?.slot==='nature' ? selectedFooterItem.cardId : null,
            onReorder:()=>{}, // a single slot never has anything to reorder against
            onSelectForMove:it=>selectFooterItem(current.id, 'nature', it.id),
            onOpenEnlarge:it=>openEnlargeFor(current.id, 'nature', it.id),
            onDiscard:discardSelectedItem
          })
        ),
        h('div', {style:{display:'flex', flexDirection:'column', gap:FOOTER_SLOT_GAP}},
          h('div', {style:{height:FOOTER_ROW_HEIGHT, minWidth:FOOTER_ROW_WIDTH, boxSizing:'border-box',
            display:'flex', alignItems:'center', overflowX:'auto',
            border:`1px dashed ${borderColor(visionMode,'#444')}`, borderRadius:6, padding:`0 ${FOOTER_SLOT_PAD}px`}},
            h(FooterItemRow, {
              items: current.sorts || [], kind:'sort', size:FOOTER_ITEM_SIZE,
              selectedId: selectedFooterItem?.playerId===current.id && selectedFooterItem?.slot==='sort' ? selectedFooterItem.cardId : null,
              onReorder:next=>commitBoard({players: players.map(p => p.id===current.id ? {...p, sorts:next} : p)}),
              onSelectForMove:it=>selectFooterItem(current.id, 'sort', it.id),
              onOpenEnlarge:it=>openEnlargeFor(current.id, 'sort', it.id),
              onDiscard:discardSelectedItem
            })
          ),
          h('div', {style:{height:FOOTER_ROW_HEIGHT, minWidth:FOOTER_ROW_WIDTH, boxSizing:'border-box',
            display:'flex', alignItems:'center', overflowX:'auto',
            border:`1px dashed ${borderColor(visionMode,'#444')}`, borderRadius:6, padding:`0 ${FOOTER_SLOT_PAD}px`}},
            h(FooterItemRow, {
              items: current.energies || [], kind:'energie', size:FOOTER_ITEM_SIZE,
              selectedId: selectedFooterItem?.playerId===current.id && selectedFooterItem?.slot==='energie' ? selectedFooterItem.cardId : null,
              onReorder:next=>commitBoard({players: players.map(p => p.id===current.id ? {...p, energies:next} : p)}),
              onSelectForMove:it=>selectFooterItem(current.id, 'energie', it.id),
              onOpenEnlarge:it=>openEnlargeFor(current.id, 'energie', it.id),
              onDiscard:discardSelectedItem
            })
          )
        )
      ),

      // Every button in this row is game-flow control with no relationship
      // to card/entity selection (dice, PV, switch player, Vision toggle) —
      // guardedBySelection makes each one cancel a pending selection
      // instead of ALSO performing its own action when one exists (Gus's
      // general rule — see its own comment for the full reasoning).
      h('div', {style:{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px'}},
        h('button', {onClick:guardedBySelection(()=>switchPlayer(-1)), disabled:players.length<2, style:navBtnStyle(players.length>1, visionMode)}, '‹'),

        h('div', {style:{display:'flex', alignItems:'center', gap:10}},
          current ? h('button', {onClick:guardedBySelection(()=>rollDice(current.id)), style:{background:'rgba(255,255,255,.06)', border:`1px solid ${borderColor(visionMode,'#444')}`, borderRadius:6, color:'#eee', padding:'6px 12px', fontSize:13}},
            current.dice ? `🎲 ${current.dice}` : '🎲'
          ) : h('button', {disabled:true, style:{background:'rgba(255,255,255,.03)', border:'1px solid #333', borderRadius:6, color:'#444', padding:'6px 12px', fontSize:13}}, '🎲'),
          current ? h('div', {style:{display:'flex', alignItems:'center', gap:4}},
            h('button', {onClick:guardedBySelection(()=>updatePv(current.id,-1)), style:pvBtnStyle(visionMode)}, '−'),
            h('div', {style:{position:'relative', width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center'}},
              h('div', {style:{position:'absolute', fontSize:30}}, '❤️'),
              h('div', {style:{position:'relative', fontSize:12, fontWeight:700, color:'#fff'}}, current.pv)
            ),
            h('button', {onClick:guardedBySelection(()=>updatePv(current.id,1)), style:pvBtnStyle(visionMode)}, '+')
          ) : h('div', {onClick:e=>{ e.stopPropagation(); guardedBySelection(addPlayer)(); }, style:{fontSize:11, color:'#777', cursor:'pointer', textDecoration:'underline'}}, 'Ajoute un joueur')
        ),

        h('div', {style:{display:'flex', alignItems:'center', gap:8}},
          h('button', {
            onClick:guardedBySelection(toggleVisionMode),
            title:'Mode Vision',
            style:{
              background: visionMode ? 'rgba(79,163,255,.15)' : 'rgba(255,255,255,.06)',
              border:`1px solid ${visionMode ? 'rgba(79,163,255,.7)' : '#444'}`,
              borderRadius:8, color: visionMode ? '#9cf' : '#eee', width:40, height:40, fontSize:18,
              boxShadow: visionMode ? '0 0 10px 2px rgba(79,163,255,.5)' : 'none', transition:'all .3s'
            }
          }, '👁️'),
          h('button', {onClick:guardedBySelection(()=>switchPlayer(1)), disabled:players.length<2, style:navBtnStyle(players.length>1, visionMode)}, '›')
        )
      )
    ),

    // ENLARGE/CAROUSEL WINDOW — a single sort/énergie card blown up, with
    // ‹/› to cycle through that same player's full card list without
    // closing back to the small view. Reachable from the Vision player
    // modal (click a card there) and directly from your own footer slots
    // (a short tap on an equipped card) — same window either way.
    enlargedItem && (() => {
      const p = players.find(pl => pl.id === enlargedItem.playerId);
      if (!p) return null;
      const list = playerCardList(p);
      const card = list[enlargedItem.index];
      if (!card) return null;
      return h('div', {style:{position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:270, display:'flex', alignItems:'center', justifyContent:'center'}},
        h('div', {ref:enlargeModalAnchorRef, style:{position:'relative'}},
          h(Popup, {
            onClose:()=>setEnlargedItem(null),
            anchorRef:enlargeModalAnchorRef,
            style:{position:'relative', padding:20, background:'transparent', border:'none', boxShadow:'none'},
            children: h('div', {style:{position:'relative'}},
              h('div', {
                onClick:()=>setEnlargedItem(null),
                style:{position:'absolute', top:-16, right:-16, width:28, height:28, borderRadius:'50%',
                  background:'rgba(220,60,40,.25)', border:'1px solid rgba(220,60,40,.6)', color:'#f66',
                  display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:15, zIndex:1}
              }, '✕'),
              h(CardFace, {showBack:false, size:140, kind: card.slot==='energie' ? 'energie' : 'sort'}),
              list.length > 1 && h('div', {
                onClick:()=>shiftEnlarged(-1),
                style:{position:'absolute', left:-18, bottom:-18, width:36, height:36, borderRadius:'50%', background:'rgba(30,30,30,.95)',
                  border:'1px solid #777', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:18, color:'#eee'}
              }, '‹'),
              list.length > 1 && h('div', {
                onClick:()=>shiftEnlarged(1),
                style:{position:'absolute', right:-18, bottom:-18, width:36, height:36, borderRadius:'50%', background:'rgba(30,30,30,.95)',
                  border:'1px solid #777', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:18, color:'#eee'}
              }, '›')
            )
          })
        )
      );
    })()
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
