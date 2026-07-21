import { h, useRef, useEffect } from "../react.js";

function autoGrow(el){
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

const blockStyle = {
  width:'100%', display:'block', background:'rgba(255,255,255,.03)', border:'1px solid #333',
  borderRadius:8, color:'#ddd', padding:12, fontFamily:'inherit', fontSize:13, lineHeight:1.7,
  resize:'none', overflow:'hidden', boxSizing:'border-box',
};

// Content is stored as one string, blocks separated by a blank line ('\n\n') —
// the same convention renderText() already uses to draw a real <hr> in view
// mode. Enter twice in a row splits the current block in two (new divider);
// Backspace at the very start of a block merges it back into the previous one.
export function BlockEditor({value, onChange, placeholder}){
  const blocks = value === '' ? [''] : value.split('\n\n');
  const refs = useRef([]);
  const focusRequest = useRef(null);

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

  const nodes = [];
  blocks.forEach((block, i) => {
    if (i > 0) nodes.push(h('hr', {key:'sep'+i, className:'sep'}));
    nodes.push(h('textarea', {
      key:'b'+i,
      ref: el => { refs.current[i] = el; autoGrow(el); },
      value: block,
      onChange: e => { setBlock(i, e.target.value); autoGrow(e.target); },
      onKeyDown: e => handleKeyDown(e, i),
      placeholder: blocks.length === 1 ? (placeholder||'') : '',
      rows: 1,
      style: blockStyle,
    }));
  });

  return h('div', null, ...nodes);
}
