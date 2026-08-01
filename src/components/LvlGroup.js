import { h, useState, useRef } from "../react.js";
import { STATUTS } from "../config.js";
import { uid, useReorder } from "../utils.js";
import { Card } from "./Card.js";
import { AddBtn } from "./AddBtn.js";
import { DragHandle } from "./DragHandle.js";
import { EditText } from "./EditText.js";

export function LvlGroup({lvl, items, editMode, rewardText, onRewardChange, onUpdate, onDelete, onAdd, onReorder}) {
  const validCount = items.filter(i => i.statut === 'Validé').length;
  const [open, setOpen] = useState(false);
  const filtered = editMode
    ? [...items].sort((a,b) => STATUTS.indexOf(a.statut) - STATUTS.indexOf(b.statut))
    : items.filter(i => i.statut === 'Validé');
  const containerRef = useRef(null);
  const { display, dragIndex, startDrag } = useReorder(filtered, onReorder);
  if (!editMode && filtered.length === 0) return null;

  return h('div', {style:{marginBottom:6}},
    h('div', {
      className: `elem-header ${open ? 'open' : ''}`,
      onClick: () => setOpen(!open),
      style: {background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)'}
    },
      h('span', {style:{fontSize:11, transform:open?'rotate(0)':'rotate(-90deg)', transition:'transform .2s', display:'inline-block', color:'#777'}}, '▼'),
      h('span', {style:{flex:1, fontSize:12, fontWeight:600, color:'#ccc'}},
        lvl,
        h('span', {style:{fontWeight:400, color:'#666', fontSize:11}},
          ' — ',
          // Éditable par double-tap directement depuis l'en-tête replié (Gus :
          // "pouvoir modifier la ligne à côté des niveaux du monstre... avant
          // d'ouvrir l'onglet déroulant") — ce texte vivait jusqu'ici comme la
          // constante figée LR[lvl] (config.js), jamais éditable ; migré en
          // data.lvlRewards (voir migrateLvlRewards). onClick:stopPropagation
          // pour que le double-tap n'ouvre/ferme pas l'accordéon en même
          // temps (même garde déjà utilisée pour ModeCard difficulte/joueurs).
          h('span', {onClick:e=>e.stopPropagation()},
            h(EditText, {value:rewardText||'', onChange:onRewardChange, editMode})
          )
        )
      ),
      h('span', {style:{fontSize:11, background:'rgba(255,255,255,.08)', color:'#aaa', padding:'1px 8px', borderRadius:10, fontWeight:700}}, validCount)
    ),
    open && h('div', {className:'elem-body', style:{background:'rgba(0,0,0,.15)', border:'1px solid rgba(255,255,255,.06)'}},
      h('div', {ref:containerRef},
        display.map((i,idx) => h('div', {key:i.id, style:{
          display:'flex', alignItems:'flex-start', gap:4,
          opacity: dragIndex===idx?0.6:1, transform: dragIndex===idx?'scale(1.01)':'none',
          boxShadow: dragIndex===idx?'0 4px 14px rgba(0,0,0,.4)':'none', transition:'opacity .1s, box-shadow .1s',
        }},
          editMode && h(DragHandle, {onPointerDown:e=>startDrag(idx, e, containerRef.current)}),
          h('div', {style:{flex:1, minWidth:0}},
            h(Card, {item:i, onUpdate, onDelete, editMode, showElem:false, withLvl:editMode, withMonsterStats:true})
          )
        ))
      ),
      editMode && h(AddBtn, {onClick:()=>onAdd({id:uid(), nom:'Nom', lvl, statut:'Test 3', effet:'', quantite:1, notes:''})})
    )
  );
}
