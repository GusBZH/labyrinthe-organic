import { h, useEffect } from "../react.js";

// anchorRef should point at the wrapper that contains BOTH the toggle
// button and this popup, so a click on the toggle itself (which re-fires
// its own onClick to close) isn't also seen as an "outside" click here —
// only genuinely external clicks/taps close it.
export function Popup({items, onClose, anchorRef, style}) {
  useEffect(() => {
    function handlePointerDown(e){
      if (anchorRef?.current && !anchorRef.current.contains(e.target)) onClose();
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [onClose, anchorRef]);

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
