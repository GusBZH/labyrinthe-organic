import { h } from "../react.js";

export function Popup({items, onClose, style}) {
  return h('div', {className:'popup', style},
    items.map((item,i) => h('div', {
      key: i, className:'popup-item',
      onClick: () => { item.onClick(); onClose(); }
    },
      item.dot && h('div', {style:{width:8,height:8,borderRadius:'50%',background:item.dot}}),
      item.label
    ))
  );
}
