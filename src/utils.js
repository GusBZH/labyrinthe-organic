import { h, Fragment, useState, useEffect, useRef } from "./react.js";
import { VISUEL_CATS, SECTION_ORDER_DEFAULT, SECTION_LABELS_DEFAULT, ELEMENTS, LVLS } from "./config.js";

export function uid(){ return Math.random().toString(36).slice(2); }

// Grows a <textarea> to fit its content instead of scrolling internally.
export function autoGrow(el){
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

// How many "mini notes" a bloc/note-globale text currently holds — same
// `\n\n`-separated-blocks convention as renderText/BlockEditor, just counted
// instead of rendered. Empty/whitespace-only blocks (e.g. a trailing blank
// divider) don't count, and an empty/unset field counts as 0 rather than 1 —
// used to show (or hide) the little red notification pastille next to a
// bloc's "▼ notes" toggle.
export function countNoteBlocks(text){
  if (!text) return 0;
  return text.split('\n\n').filter(b => b.trim() !== '').length;
}

export function renderText(text){
  if(!text) return null;
  const parts = text.split('\n\n');
  const out = [];
  parts.forEach((p,i)=>{
    out.push(h('span',{key:'t'+i,style:{whiteSpace:'pre-wrap'}},p));
    if(i < parts.length-1) out.push(h('hr',{key:'s'+i,className:'sep'}));
  });
  return h(Fragment,null,...out);
}

export function editBgStyle(editMode){
  return editMode
    ? {background:'repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(255,255,255,.04) 27px,rgba(255,255,255,.04) 28px),repeating-linear-gradient(90deg,transparent,transparent 27px,rgba(255,255,255,.04) 27px,rgba(255,255,255,.04) 28px),#1a1a1a'}
    : {background:'#0e0e0e'};
}

// Returns a CSS class ('gridflash-in' / 'gridflash-out' / '') to put on the
// same element that has editBgStyle's grid background, so the glow overlay
// (a ::after pseudo-element, see index.html) is pixel-aligned with it and
// scrolls together with it. Always alternates class value on every real
// editMode flip, so rapid toggling can never get the flash stuck off.
export function useEditFlash(editMode){
  const [cls, setCls] = useState('');
  const wasEdit = useRef(editMode);
  const timer = useRef(null);

  useEffect(() => {
    if (editMode !== wasEdit.current) {
      wasEdit.current = editMode;
      clearTimeout(timer.current);
      setCls(editMode ? 'gridflash-in' : 'gridflash-out');
      timer.current = setTimeout(() => setCls(''), editMode ? 500 : 900);
    }
  }, [editMode]);

  useEffect(() => () => clearTimeout(timer.current), []);
  return cls;
}

// Same fresh-class-per-toggle pattern as useEditFlash, for the Plateau's
// Vision mode overlay. Unlike the edit-mode flash, Vision mode's tint is
// meant to stay visible for as long as it's active (not fade back to 0) —
// the caller keeps the overlay's base opacity in sync with `active` itself
// (0 off / .25 on) and this class only drives the transient pulse/glitch
// animation during the toggle moment, handing off seamlessly once it clears
// since the animation's start/end opacity matches that base value.
export function useVisionFlash(active){
  const [cls, setCls] = useState('');
  const wasActive = useRef(active);
  const timer = useRef(null);

  useEffect(() => {
    if (active !== wasActive.current) {
      wasActive.current = active;
      clearTimeout(timer.current);
      setCls(active ? 'visionflash-in' : 'visionflash-out');
      timer.current = setTimeout(() => setCls(''), active ? 500 : 700);
    }
  }, [active]);

  useEffect(() => () => clearTimeout(timer.current), []);
  return cls;
}

// data.visuels used to be a fixed object ({general, boite, ...}); it's now a
// user-extensible array of {id, label, content} so categories can be added,
// renamed, reordered and removed. Converts old-shape data read from
// data.json on the fly — harmless no-op once it's already an array.
export function migrateVisuels(visuels){
  if (Array.isArray(visuels)) return visuels;
  return VISUEL_CATS.map(c => ({id:c.key, label:c.label, content:(visuels && visuels[c.key]) || ''}));
}

// data.sectionOrder holds the display order AND renamable labels of the
// home page's top-level sections: an array of {key, label}. Upgrades the
// older plain-array-of-keys shape (labels used to be hardcoded in
// HomePage.js) by filling in the default label, and folds in any section
// key not yet present (e.g. after adding a new section in a future
// update) so it doesn't just silently disappear.
export function migrateSectionOrder(order){
  if (!Array.isArray(order)) {
    return SECTION_ORDER_DEFAULT.map(key => ({key, label:SECTION_LABELS_DEFAULT[key]}));
  }
  const normalized = order.map(item =>
    typeof item === 'string' ? {key:item, label:SECTION_LABELS_DEFAULT[item] || item} : item
  );
  const known = new Set(SECTION_ORDER_DEFAULT);
  const kept = normalized.filter(x => known.has(x.key));
  const keptKeys = new Set(kept.map(x => x.key));
  const missing = SECTION_ORDER_DEFAULT.filter(k => !keptKeys.has(k)).map(key => ({key, label:SECTION_LABELS_DEFAULT[key]}));
  return [...kept, ...missing];
}

// Same idea as migrateSectionOrder, for the display order of elements
// (Sorts/Énergies group headers) and monster levels.
export function migrateElementOrder(order){
  if (!Array.isArray(order)) return [...ELEMENTS];
  const known = new Set(ELEMENTS);
  const kept = order.filter(k => known.has(k));
  const missing = ELEMENTS.filter(k => !kept.includes(k));
  return [...kept, ...missing];
}
export function migrateLvlOrder(order){
  if (!Array.isArray(order)) return [...LVLS];
  const known = new Set(LVLS);
  const kept = order.filter(k => known.has(k));
  const missing = LVLS.filter(k => !kept.includes(k));
  return [...kept, ...missing];
}

// Press-and-hold (mouse or touch, via Pointer Events) reordering for a flat
// list. The caller renders `display` (the live drag preview order) inside a
// container it owns, and wires each item's drag handle to
// startDrag(indexInDisplay, pointerDownEvent, containerEl).
export function useReorder(items, onReorder){
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const dragRef = useRef(null);
  const overRef = useRef(null);
  const rectsRef = useRef([]);

  function startDrag(index, e, listEl){
    e.preventDefault();
    dragRef.current = index;
    overRef.current = index;
    setDragIndex(index);
    setOverIndex(index);
    rectsRef.current = Array.from(listEl.children).map(el => el.getBoundingClientRect());

    function onMove(ev){
      const y = ev.clientY;
      let next = overRef.current;
      for (let i = 0; i < rectsRef.current.length; i++) {
        const r = rectsRef.current[i];
        if (y >= r.top && y < r.bottom) { next = i; break; }
      }
      if (next !== overRef.current) {
        overRef.current = next;
        setOverIndex(next);
      }
    }
    function onUp(){
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const from = dragRef.current, to = overRef.current;
      dragRef.current = null; overRef.current = null;
      setDragIndex(null); setOverIndex(null);
      if (from !== null && to !== null && from !== to) {
        const next = [...items];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        onReorder(next);
      }
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  const display = dragIndex === null ? items : (() => {
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(overIndex, 0, moved);
    return next;
  })();

  return { display, dragIndex, startDrag };
}

// Commits a reordering of a filtered/sorted subset back into the full
// array it came from, leaving items that aren't in the subset untouched
// at their existing slots. Used to let a per-element (or per-level, or
// per-status) grouping be drag-reordered without disturbing the other
// groups sharing the same underlying array.
export function reorderSubset(fullArray, reorderedSubset){
  const ids = new Set(reorderedSubset.map(x => x.id));
  let i = 0;
  return fullArray.map(item => ids.has(item.id) ? reorderedSubset[i++] : item);
}
