import { h } from "../react.js";

export function EditToggle({editMode, setEditMode}) {
  return h('button', {
    onClick:()=>setEditMode(!editMode),
    style:{background:editMode?'rgba(255,255,255,.1)':'none',
      border:`1px solid ${editMode?'rgba(255,255,255,.3)':'#333'}`,
      borderRadius:8, padding:'6px 10px', color:editMode?'#eee':'#555', fontSize:16, transition:'all .2s'}
  }, '✏️');
}
