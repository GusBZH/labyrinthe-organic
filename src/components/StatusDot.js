import { h } from "../react.js";
import { SC } from "../config.js";

export function StatusDot({statut, editMode, onClick}) {
  const c = SC[statut] || '#555';
  return h('div', {
    onClick: editMode ? onClick : undefined,
    title: statut,
    style: {width:10, height:10, borderRadius:'50%', background:c, border:`2px solid ${c}`,
      boxShadow:`0 0 5px ${c}44`, flexShrink:0, cursor: editMode ? 'pointer' : 'default'}
  });
}
