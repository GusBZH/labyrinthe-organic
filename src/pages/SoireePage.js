import { h } from "../react.js";
import { Section } from "../components/Section.js";
import { EditText } from "../components/EditText.js";
import { AddBtn } from "../components/AddBtn.js";
import { EditToggle } from "../components/EditToggle.js";
import { renderText, uid, editBgStyle, useEditFlash } from "../utils.js";

export function SoireePage({soirees, onUpdate, onAdd, onDelete, editMode, setEditMode, onBack}) {
  const flashCls = useEditFlash(editMode);
  return h('div', {className:flashCls, style:{position:'relative', minHeight:'100vh', padding:'0 16px 80px', transition:'background .5s', ...editBgStyle(editMode)}},
    h('div', {style:{display:'flex', alignItems:'center', gap:12, padding:'16px 0'}},
      h('button', {onClick:onBack, style:{background:'none', border:'1px solid #333', borderRadius:6, color:'#aaa', padding:'6px 12px', fontSize:12}}, '← Retour'),
      h('h2', {style:{margin:0, fontSize:16, color:'#eee', flex:1}}, '📅 Soirées Proto'),
      h(EditToggle, {editMode, setEditMode})
    ),
    soirees.map(s => h(Section, {key:s.id, title:s.date||'Sans date', emoji:'📅'},
      h('div', {style:{marginBottom:8}},
        h('div', {style:{fontSize:10, color:'#555', marginBottom:4}}, 'Participants & lieu'),
        editMode
          ? h(EditText, {value:s.meta||'', onChange:v=>onUpdate({...s,meta:v}), editMode, multiline:true})
          : h('div', {style:{fontSize:12, color:'#bbb'}}, renderText(s.meta||''))
      ),
      h('hr', {className:'sep'}),
      h('div', {style:{fontSize:10, color:'#555', marginBottom:4}}, 'Notes'),
      editMode
        ? h(EditText, {value:s.notes||'', onChange:v=>onUpdate({...s,notes:v}), editMode, multiline:true})
        : h('div', {style:{fontSize:12, color:'#bbb'}}, renderText(s.notes||'')),
      editMode && h('div', {style:{marginTop:8, textAlign:'right'}},
        h('button', {onClick:()=>onDelete(s.id), style:{background:'none', border:'1px solid #333', borderRadius:4, color:'#666', padding:'2px 8px', fontSize:11}}, 'Supprimer')
      )
    )),
    h(AddBtn, {onClick:()=>onAdd({id:uid(), date:new Date().toLocaleDateString('fr-FR'), meta:'', notes:''})})
  );
}
