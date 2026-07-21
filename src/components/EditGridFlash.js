import { h, useState, useEffect, useRef } from "../react.js";

// Plays a 1s glow-in + glitch-flicker flourish over the grid lines
// whenever editMode flips from off to on.
export function EditGridFlash({editMode}) {
  const [flashing, setFlashing] = useState(false);
  const wasEdit = useRef(editMode);

  useEffect(() => {
    if (editMode && !wasEdit.current) {
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 1000);
      wasEdit.current = editMode;
      return () => clearTimeout(t);
    }
    wasEdit.current = editMode;
  }, [editMode]);

  if (!flashing) return null;
  return h('div', {className:'edit-grid-flash'});
}
