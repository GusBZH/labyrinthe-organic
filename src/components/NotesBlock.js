import { h } from "../react.js";
import { BlockEditor } from "./BlockEditor.js";
import { renderText } from "../utils.js";

// "Note globale" (Gus's own name for this) — a whole main category's own
// free-space for jotting general ideas, edit-mode-only by default (a plain
// visibility gate, never rendered at all in view mode). `alwaysVisible`
// opts a specific caller out of that gate (Gus: "notes des 2 sous
// catégories de application doivent être visible sans le mode edition" —
// scoped to just those two, every other NotesBlock call site keeps the
// default edit-mode-only behavior) — mirrors the read/edit split a bloc's
// own "note des blocs" already has in Card.js (BlockEditor while editing,
// renderText read-only otherwise, same `\n\n` convention).
export function NotesBlock({value, onChange, editMode, label, alwaysVisible}) {
  if (!editMode && !alwaysVisible) return null;
  return h('div', {style:{marginTop:8, padding:8, background:'rgba(0,0,0,.3)', borderRadius:6, border:'1px solid #2a2a2a'}},
    h('div', {style:{fontSize:10, color:'#555', marginBottom:4}}, label || 'Notes globales'),
    editMode
      ? h(BlockEditor, {value:value||'', onChange})
      : h('div', {style:{fontSize:12, color:'#bbb', lineHeight:1.6}}, renderText(value||''))
  );
}
