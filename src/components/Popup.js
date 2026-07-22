import { h, useEffect } from "../react.js";

// anchorRef should point at the wrapper that contains BOTH the toggle
// button and this popup, so a click on the toggle itself (which re-fires
// its own onClick to close) isn't also seen as an "outside" click here —
// only genuinely external clicks/taps close it. This is the project-wide
// rule for every popup/window: closes on outside click, and (since a click
// on a different toggle is itself an "outside" click for the first one)
// closes automatically when another selection is made elsewhere too.
// Pass either `items` (selection list, original mode) or `children`
// (free-form content, e.g. the player info window on the Plateau page).
export function Popup({items, children, onClose, anchorRef, style}) {
  useEffect(() => {
    function handlePointerDown(e){
      if (anchorRef?.current && !anchorRef.current.contains(e.target)) onClose();
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [onClose, anchorRef]);

  if (children) {
    return h('div', {className:'popup', style}, children);
  }

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
