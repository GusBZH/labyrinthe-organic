import { h, useState } from "../react.js";
import { EC, STATUTS } from "../config.js";
import { uid } from "../utils.js";
import { Card } from "./Card.js";
import { AddBtn } from "./AddBtn.js";

export function ElemGroup({element, items, editMode, onUpdate, onDelete, onAdd, withElem}) {
  const ec = EC[element] || EC['Commun'];
  const validCount = items.filter(i => i.statut === 'Validé').length;
  const [open, setOpen] = useState(false);
  const filtered = editMode
    ? [...items].sort((a,b) => STATUTS.indexOf(a.statut) - STATUTS.indexOf(b.statut))
    : items.filter(i => i.statut === 'Validé');
  if (!editMode && filtered.length === 0) return null;

  return h('div', {style:{marginBottom:6}},
    h('div', {
      className: `elem-header ${open ? 'open' : ''}`,
      onClick: () => setOpen(!open),
      style: {background:ec.bg, border:`1px solid ${ec.br}`}
    },
      h('span', {style:{fontSize:11, transform:open?'rotate(0)':'rotate(-90deg)', transition:'transform .2s', display:'inline-block', color:ec.dot}}, '▼'),
      h('span', {style:{fontSize:14}}, ec.em),
      h('span', {style:{flex:1, fontSize:12, fontWeight:600, color:ec.dot}}, element),
      h('span', {style:{fontSize:11, background:ec.br, color:ec.dot, padding:'1px 8px', borderRadius:10, fontWeight:700}}, validCount)
    ),
    open && h('div', {className:'elem-body', style:{background:'rgba(0,0,0,.2)', border:`1px solid ${ec.br}`}},
      filtered.map(i => h(Card, {key:i.id, item:i, onUpdate, onDelete, editMode, showElem:false, withElem:withElem||false})),
      editMode && h(AddBtn, {onClick:()=>onAdd({id:uid(), nom:'Nouveau', element, statut:'Test 3', cout:'', limite:'', effet:'', quantite:1, notes:''})})
    )
  );
}
