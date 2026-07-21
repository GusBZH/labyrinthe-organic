import { h } from "../react.js";
import { EditText } from "./EditText.js";

export function NotesBlock({value, onChange, editMode, label}) {
  if (!editMode) return null;
  return h('div', {style:{marginTop:8, padding:8, background:'rgba(0,0,0,.3)', borderRadius:6, border:'1px solid #2a2a2a'}},
    h('div', {style:{fontSize:10, color:'#555', marginBottom:4}}, label || 'Notes globales'),
    h(EditText, {value:value||'', onChange, editMode, multiline:true})
  );
}
