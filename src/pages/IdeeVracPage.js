import { h } from "../react.js";
import { EditToggle } from "../components/EditToggle.js";
import { UndoRedo } from "../components/UndoRedo.js";
import { BlockEditor } from "../components/BlockEditor.js";
import { renderText, editBgStyle, useEditFlash } from "../utils.js";

export function IdeeVracPage({value, onChange, editMode, setEditMode, canUndo, canRedo, onUndo, onRedo, onBack}) {
  const flashCls = useEditFlash(editMode);
  return h('div', {className:flashCls, style:{position:'relative', minHeight:'100vh', padding:'0 16px 80px', transition:'background .5s', ...editBgStyle(editMode)}},
    h('div', {style:{display:'flex', alignItems:'center', gap:12, padding:'16px 0'}},
      h('button', {onClick:onBack, style:{background:'none', border:'1px solid #333', borderRadius:6, color:'#aaa', padding:'6px 12px', fontSize:12}}, '← Retour'),
      h('h2', {style:{margin:0, fontSize:16, color:'#eee', flex:1}}, '💡 Idées en vrac'),
      h('div', {style:{display:'flex', alignItems:'center', gap:8}},
        editMode && h(UndoRedo, {canUndo, canRedo, onUndo, onRedo}),
        h(EditToggle, {editMode, setEditMode})
      )
    ),
    h('p', {style:{fontSize:11, color:'#555', marginBottom:8}}, 'Entrée deux fois de suite = ligne séparateur'),
    editMode
      ? h(BlockEditor, {value: value||'', onChange, placeholder:'Tes idées ici...'})
      : h('div', {style:{fontSize:13, color:'#bbb', lineHeight:1.7}}, renderText(value||''))
  );
}
