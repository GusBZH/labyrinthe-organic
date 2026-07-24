import { h, useRef, useEffect } from "../react.js";
import { autoGrow, useReorder } from "../utils.js";
import { DragHandle } from "./DragHandle.js";

const blockStyle = {
  flex:1, minWidth:0, display:'block', background:'rgba(255,255,255,.03)', border:'1px solid #333',
  borderRadius:8, color:'#ddd', padding:12, fontFamily:'inherit', fontSize:13, lineHeight:1.7,
  resize:'none', overflow:'hidden', boxSizing:'border-box',
};

// Content is stored as one string, blocks separated by a blank line ('\n\n') —
// the same convention renderText() already uses to draw a real <hr> in view
// mode. Enter twice in a row splits the current block in two (new divider);
// Backspace at the very start of a block merges it back into the previous one;
// blocks can also be drag-reordered via a handle.
export function BlockEditor({value, onChange, placeholder}){
  const blocks = value === '' ? [''] : value.split('\n\n');
  const refs = useRef([]);
  const focusRequest = useRef(null);
  const containerRef = useRef(null);
  const { display, dragIndex, startDrag } = useReorder(blocks, next => onChange(next.join('\n\n')));

  useEffect(() => {
    if (focusRequest.current == null) return;
    const { index, pos } = focusRequest.current;
    focusRequest.current = null;
    const el = refs.current[index];
    if (el) {
      autoGrow(el);
      el.focus();
      el.selectionStart = el.selectionEnd = pos;
    }
  });

  function setBlock(i, text){
    const next = [...blocks];
    next[i] = text;
    onChange(next.join('\n\n'));
  }

  // Removes one whole "mini note" outright (Gus: "une croix rouge en haut à
  // droite de chaque mini note créée par le double entrée pour pouvoir
  // supprimer la note") — distinct from Backspace-at-start, which only
  // merges a block into its neighbor. Deleting the last remaining block
  // clears the field entirely rather than leaving an empty array (blocks
  // always has at least one entry per this component's own convention).
  function deleteBlock(i){
    const next = blocks.filter((_, idx) => idx !== i);
    onChange(next.length ? next.join('\n\n') : '');
  }

  function handleKeyDown(e, i){
    const el = e.target;
    if (e.key === 'Enter' && el.value.slice(0, el.selectionStart).endsWith('\n')) {
      e.preventDefault();
      const pos = el.selectionStart;
      const before = el.value.slice(0, pos - 1);
      const after = el.value.slice(el.selectionEnd);
      const next = [...blocks];
      next.splice(i, 1, before, after);
      onChange(next.join('\n\n'));
      focusRequest.current = { index: i + 1, pos: 0 };
      return;
    }
    if (e.key === 'Backspace' && el.selectionStart === 0 && el.selectionEnd === 0 && i > 0) {
      e.preventDefault();
      const prev = blocks[i - 1];
      const next = [...blocks];
      next.splice(i - 1, 2, prev + el.value);
      onChange(next.join('\n\n'));
      focusRequest.current = { index: i - 1, pos: prev.length };
    }
  }

  return h('div', {ref:containerRef},
    display.map((block,i) => h('div', {key:'block'+i, style:{
      opacity: dragIndex===i?0.6:1, transform: dragIndex===i?'scale(1.01)':'none',
      boxShadow: dragIndex===i?'0 4px 14px rgba(0,0,0,.4)':'none', transition:'opacity .1s, box-shadow .1s',
    }},
      i > 0 && h('hr', {className:'sep'}),
      h('div', {style:{position:'relative', display:'flex', alignItems:'flex-start', gap:4}},
        h(DragHandle, {onPointerDown:e=>startDrag(i, e, containerRef.current)}),
        h('textarea', {
          ref: el => { refs.current[i] = el; autoGrow(el); },
          value: block,
          onChange: e => { setBlock(i, e.target.value); autoGrow(e.target); },
          onKeyDown: e => handleKeyDown(e, i),
          placeholder: blocks.length === 1 ? (placeholder||'') : '',
          rows: 1,
          style: {...blockStyle, paddingRight:26},
        }),
        h('div', {
          onClick: () => deleteBlock(i),
          title: 'Supprimer cette note',
          style: {position:'absolute', top:4, right:4, width:18, height:18, borderRadius:'50%',
            background:'rgba(220,60,40,.2)', border:'1px solid rgba(220,60,40,.5)', color:'#f66',
            display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:10, lineHeight:1}
        }, '✕')
      )
    ))
  );
}
