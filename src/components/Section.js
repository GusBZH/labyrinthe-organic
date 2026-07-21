import { h, useState } from "../react.js";

export function Section({title, emoji, children, defaultOpen}) {
  const [open, setOpen] = useState(defaultOpen || false);
  return h('div', {style:{marginBottom:6}},
    h('div', {
      className: `section-header ${open ? 'open' : ''}`,
      onClick: () => setOpen(!open)
    },
      h('span', {style:{fontSize:12, transform:open?'rotate(0)':'rotate(-90deg)', transition:'transform .2s', display:'inline-block', color:'#777'}}, '▼'),
      emoji && h('span', {style:{fontSize:16}}, emoji),
      h('span', {style:{flex:1, fontSize:13, fontWeight:500, color:'#ddd'}}, title)
    ),
    open && h('div', {className:'section-body'}, children)
  );
}
