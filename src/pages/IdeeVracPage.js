import { h } from "../react.js";
import { EditToggle } from "../components/EditToggle.js";
import { renderText, editBgStyle } from "../utils.js";

const DIVIDER = '─'.repeat(40);

// Two Enters in a row (empty line already present) inserts a visible
// divider line instead of leaving an easy-to-miss blank line.
// Uses execCommand so the browser places the caret itself (avoids fighting
// React's controlled re-render for cursor position).
function handleDividerKeyDown(e, value){
  if (e.key !== 'Enter') return;
  const el = e.target;
  if (!value.slice(0, el.selectionStart).endsWith('\n')) return;
  e.preventDefault();
  document.execCommand('insertText', false, DIVIDER + '\n');
}

export function IdeeVracPage({value, onChange, editMode, setEditMode, onBack}) {
  return h('div', {style:{minHeight:'100vh', padding:'0 16px 80px', transition:'background .5s', ...editBgStyle(editMode)}},
    h('div', {style:{display:'flex', alignItems:'center', gap:12, padding:'16px 0'}},
      h('button', {onClick:onBack, style:{background:'none', border:'1px solid #333', borderRadius:6, color:'#aaa', padding:'6px 12px', fontSize:12}}, '← Retour'),
      h('h2', {style:{margin:0, fontSize:16, color:'#eee', flex:1}}, '💡 Idées en vrac'),
      h(EditToggle, {editMode, setEditMode})
    ),
    h('p', {style:{fontSize:11, color:'#555', marginBottom:8}}, 'Entrée deux fois de suite = ligne séparateur ────'),
    editMode
      ? h('textarea', {
          value, onChange:e=>onChange(e.target.value),
          onKeyDown:e=>handleDividerKeyDown(e, value),
          placeholder:'Tes idées ici...',
          style:{width:'100%', minHeight:'65vh', background:'rgba(255,255,255,.03)', border:'1px solid #333',
            borderRadius:8, color:'#ddd', padding:12, fontFamily:'inherit', fontSize:13, lineHeight:1.7,
            resize:'vertical', boxSizing:'border-box'}
        })
      : h('div', {style:{fontSize:13, color:'#bbb', lineHeight:1.7}}, renderText(value||''))
  );
}
