import { h, useRef } from "../react.js";
import { Section } from "../components/Section.js";
import { EditText } from "../components/EditText.js";
import { AddBtn } from "../components/AddBtn.js";
import { EditToggle } from "../components/EditToggle.js";
import { UndoRedo } from "../components/UndoRedo.js";
import { DragHandle } from "../components/DragHandle.js";
import { BlockEditor } from "../components/BlockEditor.js";
import { renderText, uid, editBgStyle, useEditFlash, useReorder } from "../utils.js";

export function SoireePage({soirees, onUpdate, onAdd, onDelete, onReorder, editMode, setEditMode, canUndo, canRedo, onUndo, onRedo, onBack}) {
  const flashCls = useEditFlash(editMode);
  const containerRef = useRef(null);
  const { display, dragIndex, startDrag } = useReorder(soirees, onReorder);

  return h('div', {className:flashCls, style:{position:'relative', minHeight:'100vh', padding:'0 16px 80px', transition:'background .5s', ...editBgStyle(editMode)}},
    h('div', {style:{display:'flex', alignItems:'center', gap:12, padding:'16px 0'}},
      h('button', {onClick:onBack, style:{background:'none', border:'1px solid #333', borderRadius:6, color:'#aaa', padding:'6px 12px', fontSize:12}}, '← Retour'),
      h('h2', {style:{margin:0, fontSize:16, color:'#eee', flex:1}}, '📅 Soirées Proto'),
      h('div', {style:{display:'flex', alignItems:'center', gap:8}},
        editMode && h(UndoRedo, {canUndo, canRedo, onUndo, onRedo}),
        h(EditToggle, {editMode, setEditMode})
      )
    ),
    h('div', {ref:containerRef},
      display.map((s, i) => h('div', {key:s.id, style:{
        display:'flex', alignItems:'flex-start', gap:4,
        opacity: dragIndex===i?0.6:1, transform: dragIndex===i?'scale(1.01)':'none',
        boxShadow: dragIndex===i?'0 4px 14px rgba(0,0,0,.4)':'none', transition:'opacity .1s, box-shadow .1s',
      }},
        editMode && h(DragHandle, {onPointerDown:e=>startDrag(i, e, containerRef.current)}),
        h('div', {style:{flex:1, minWidth:0}},
          h(Section, {title:s.date||'Sans date', emoji:'📅'},
            h('div', {style:{marginBottom:8}},
              h('div', {style:{fontSize:10, color:'#555', marginBottom:4}}, 'Participants & lieu'),
              editMode
                ? h(EditText, {value:s.meta||'', onChange:v=>onUpdate({...s,meta:v}), editMode, multiline:true})
                : h('div', {style:{fontSize:12, color:'#bbb'}}, renderText(s.meta||''))
            ),
            h('hr', {className:'sep'}),
            h('div', {style:{fontSize:10, color:'#555', marginBottom:4}}, 'Notes'),
            // Gus : "Soirée proto n'a pas le système divider double entrée" —
            // passé de EditText multiline à BlockEditor (Entrée deux fois de
            // suite scinde le texte en un nouveau bloc séparé par un <hr>,
            // comme Idée en vrac/Visuels/Matériel/notes globales), lecture
            // seule via renderText (même convention `\n\n`) hors édition.
            editMode
              ? h(BlockEditor, {value:s.notes||'', onChange:v=>onUpdate({...s,notes:v})})
              : h('div', {style:{fontSize:12, color:'#bbb'}}, renderText(s.notes||'')),
            editMode && h('div', {style:{marginTop:8, textAlign:'right'}},
              h('button', {onClick:()=>onDelete(s.id), style:{background:'none', border:'1px solid #333', borderRadius:4, color:'#666', padding:'2px 8px', fontSize:11}}, 'Supprimer')
            )
          )
        )
      ))
    ),
    h(AddBtn, {onClick:()=>onAdd({id:uid(), date:new Date().toLocaleDateString('fr-FR'), meta:'', notes:''})})
  );
}
