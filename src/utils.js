import { h, Fragment, useState, useEffect, useRef } from "./react.js";
import { VISUEL_CATS, SECTION_ORDER_DEFAULT } from "./config.js";

export function uid(){ return Math.random().toString(36).slice(2); }

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
      timer.current = setTimeout(() => setCls(''), 500);
    }
  }, [editMode]);

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

// data.sectionOrder holds the display order of the home page's top-level
// sections (a plain array of keys, reorderable like everything else).
// Fills in a sane default when missing, and folds in any section key not
// yet present (e.g. after adding a new section in a future update) so it
// doesn't just silently disappear.
export function migrateSectionOrder(order){
  if (!Array.isArray(order)) return [...SECTION_ORDER_DEFAULT];
  const known = new Set(SECTION_ORDER_DEFAULT);
  const kept = order.filter(k => known.has(k));
  const missing = SECTION_ORDER_DEFAULT.filter(k => !kept.includes(k));
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
