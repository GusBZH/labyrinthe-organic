import { h, useState } from "../react.js";
import { EditText } from "./EditText.js";
import { renderText } from "../utils.js";

export function ModeCard({mode, editMode, onUpdate, onDelete, dragHandle}) {
  const [open, setOpen] = useState(false);
  return h('div', {style:{marginBottom:6}},
    h('div', {
      className: `elem-header ${open ? 'open' : ''}`,
      onClick: () => setOpen(!open),
      style: {background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)'}
    },
      dragHandle,
      h('span', {style:{fontSize:11, transform:open?'rotate(0)':'rotate(-90deg)', transition:'transform .2s', display:'inline-block', color:'#777'}}, '▼'),
      h('span', {style:{fontSize:14}}, mode.emoji),
      h('span', {style:{flex:1, fontSize:12, fontWeight:600, color:'#ddd'}}, mode.nom),
      // Both now editable by double-tap (Gus: "pouvoir modifier le nombre
      // d'emoji étoiles et le nombre de joueurs") — each wrapped in its own
      // span with `onClick:e=>e.stopPropagation()` so double-tapping to
      // edit doesn't also toggle this whole header's own onClick (open/
      // close the card), the same guard the ✕ delete button just below
      // already needed for the same reason.
      h('span', {onClick:e=>e.stopPropagation(), style:{fontSize:10, color:'#666'}},
        h(EditText, {value:mode.difficulte||'', onChange:v=>onUpdate({...mode,difficulte:v}), editMode})
      ),
      (editMode || mode.joueurs) && h('span', {onClick:e=>e.stopPropagation(), style:{fontSize:10, color:'#555', background:'rgba(255,255,255,.05)', padding:'1px 6px', borderRadius:6}},
        '👥', h(EditText, {value:mode.joueurs||'', onChange:v=>onUpdate({...mode,joueurs:v}), editMode})
      ),
      editMode && onDelete && h('div', {onClick:e=>{e.stopPropagation(); onDelete();}, style:{fontSize:12, color:'#555', cursor:'pointer', padding:'2px 4px'}}, '✕')
    ),
    open && h('div', {className:'elem-body', style:{background:'rgba(0,0,0,.15)', border:'1px solid rgba(255,255,255,.06)'}},
      h('div', {style:{fontSize:11, color:'#666', marginBottom:8}}, mode.style),
      h('div', {style:{fontSize:12, color:'#bbb', lineHeight:1.7}},
        h(EditText, {value:mode.contenu, onChange:v=>onUpdate({...mode,contenu:v}), editMode, multiline:true})
      ),
      editMode && h('div', {style:{marginTop:10, padding:8, background:'rgba(0,0,0,.3)', borderRadius:6, border:'1px solid #2a2a2a'}},
        h('div', {style:{fontSize:10, color:'#555', marginBottom:4}}, 'Notes de test'),
        h(EditText, {value:mode.notes||'', onChange:v=>onUpdate({...mode,notes:v}), editMode, multiline:true})
      ),
      !editMode && mode.notes && h('div', {style:{marginTop:10, padding:8, background:'rgba(0,0,0,.2)', borderRadius:6, borderLeft:'2px solid #333'}},
        h('div', {style:{fontSize:10, color:'#555', marginBottom:4}}, '📝 Notes'),
        h('div', {style:{fontSize:11, color:'#888'}}, renderText(mode.notes))
      )
    )
  );
}
