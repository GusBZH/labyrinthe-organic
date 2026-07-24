import { h } from "../react.js";
import { BlockEditor } from "./BlockEditor.js";

// "Note globale" (Gus's own name for this) — a whole main category's own
// free-space for jotting general ideas, edit-mode-only (still just a
// visibility gate, never rendered at all in view mode — unlike a bloc's own
// "note des blocs" below, which Gus asked to stay visible either way).
// Upgraded to the "double entrée" system (BlockEditor: Enter twice splits a
// new divider-separated mini note, ✕ per mini note) instead of a single
// plain text field, same as every other note space in the app now.
export function NotesBlock({value, onChange, editMode, label}) {
  if (!editMode) return null;
  return h('div', {style:{marginTop:8, padding:8, background:'rgba(0,0,0,.3)', borderRadius:6, border:'1px solid #2a2a2a'}},
    h('div', {style:{fontSize:10, color:'#555', marginBottom:4}}, label || 'Notes globales'),
    h(BlockEditor, {value:value||'', onChange})
  );
}
