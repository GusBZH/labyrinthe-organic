import { h, useState, useEffect } from "../react.js";
import { renderText } from "../utils.js";

export function EditText({value, onChange, editMode, multiline}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => { setVal(value); }, [value]);

  if (!editMode) {
    return h('div', {style:{fontSize:'inherit',color:'inherit',lineHeight:'inherit'}}, renderText(value || ''));
  }

  if (editing) {
    if (multiline) {
      return h('textarea', {
        className: 'edit-textarea',
        value: val,
        autoFocus: true,
        onChange: e => setVal(e.target.value),
        onBlur: () => { onChange(val); setEditing(false); }
      });
    }
    return h('input', {
      className: 'edit-input',
      value: val,
      autoFocus: true,
      onChange: e => setVal(e.target.value),
      onBlur: () => { onChange(val); setEditing(false); }
    });
  }

  return h('div', {
    onDoubleClick: () => setEditing(true),
    title: 'Double-cliquer pour modifier',
    style: {cursor:'pointer', borderBottom:'1px dashed rgba(255,255,255,.2)', minHeight:16}
  }, renderText(val) || h('span', {style:{color:'#444'}}, 'Double-cliquer…'));
}
