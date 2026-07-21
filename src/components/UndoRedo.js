import { h } from "../react.js";

function btnStyle(enabled){
  return {
    background:'none', border:'1px solid #333', borderRadius:8,
    padding:'6px 10px', cursor: enabled ? 'pointer' : 'default',
    color: enabled ? '#aaa' : '#333', fontSize:16, opacity: enabled ? 1 : 0.4,
  };
}

export function UndoRedo({canUndo, canRedo, onUndo, onRedo}) {
  return h('div', {style:{display:'flex', gap:4}},
    h('button', {onClick: canUndo ? onUndo : undefined, disabled: !canUndo, style:btnStyle(canUndo), title:'Annuler'}, '↩'),
    h('button', {onClick: canRedo ? onRedo : undefined, disabled: !canRedo, style:btnStyle(canRedo), title:'Rétablir'}, '↪')
  );
}
