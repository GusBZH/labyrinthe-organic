import { h, useState } from "../react.js";
import { EditText } from "./EditText.js";

// Like Section, but the title is renamable (double-tap) and can carry a
// drag handle / delete button in its header — used for user-extensible
// lists of collapsible blocks (e.g. Visuels categories).
export function EditableSection({title, onTitleChange, dragHandle, onDelete, dragging, children}) {
  const [open, setOpen] = useState(false);
  return h('div', {style:{
    marginBottom:6, opacity: dragging?0.6:1, transform: dragging?'scale(1.01)':'none',
    boxShadow: dragging?'0 4px 14px rgba(0,0,0,.4)':'none', transition:'opacity .1s, box-shadow .1s',
  }},
    h('div', {
      className: `section-header ${open ? 'open' : ''}`,
      style: {display:'flex', alignItems:'center', gap:8},
    },
      dragHandle,
      h('span', {
        onClick: () => setOpen(!open),
        style: {fontSize:12, cursor:'pointer', transform:open?'rotate(0)':'rotate(-90deg)', transition:'transform .2s', display:'inline-block', color:'#777'}
      }, '▼'),
      h('span', {style:{flex:1, fontSize:13, fontWeight:500, color:'#ddd'}},
        h(EditText, {value:title, onChange:onTitleChange||(()=>{}), editMode: !!onTitleChange})
      ),
      onDelete && h('div', {onClick:onDelete, style:{fontSize:12, color:'#555', cursor:'pointer', padding:'2px 6px'}}, '✕')
    ),
    open && h('div', {className:'section-body'}, children)
  );
}
