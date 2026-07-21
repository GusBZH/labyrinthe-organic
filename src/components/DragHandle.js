import { h } from "../react.js";

export function DragHandle({onPointerDown}) {
  return h('div', {
    onPointerDown,
    onClick: e => e.stopPropagation(),
    title: 'Glisser pour réordonner',
    style: {cursor:'grab', color:'#666', fontSize:14, padding:'2px 6px', touchAction:'none', userSelect:'none', flexShrink:0}
  }, '⠿');
}
