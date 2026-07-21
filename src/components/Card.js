import { h, useState, useRef } from "../react.js";
import { EC, STATUTS, SC, ELEMENTS, LVLS } from "../config.js";
import { EditText } from "./EditText.js";
import { StatusDot } from "./StatusDot.js";
import { Popup } from "./Popup.js";

export function Card({item, onUpdate, onDelete, editMode, showElem, withElem, withLvl}) {
  const [showSt, setShowSt] = useState(false);
  const [showEl, setShowEl] = useState(false);
  const [showLv, setShowLv] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const stRef = useRef(null);
  const elRef = useRef(null);
  const lvRef = useRef(null);
  const ec = item.element ? EC[item.element] : null;

  return h('div', {
    className: 'card',
    style: ec ? {background:ec.bg, borderColor:ec.br} : {}
  },
    h('div', {style:{display:'flex', gap:8, alignItems:'flex-start'}},
      editMode && h('div', {style:{display:'flex', flexDirection:'column', gap:4, alignItems:'center', flexShrink:0}},
        h('div', {ref:stRef, style:{position:'relative'}},
          h(StatusDot, {statut:item.statut, editMode, onClick:()=>setShowSt(!showSt)}),
          showSt && h(Popup, {
            onClose:()=>setShowSt(false),
            anchorRef: stRef,
            style:{left:16, top:0},
            items: STATUTS.map(s => ({label:s, dot:SC[s], onClick:()=>onUpdate({...item, statut:s})}))
          })
        ),
        withElem && h('div', {ref:elRef, style:{position:'relative'}},
          h('div', {onClick:()=>setShowEl(!showEl), style:{fontSize:14, cursor:'pointer'}}, ec?.em || '?'),
          showEl && h(Popup, {
            onClose:()=>setShowEl(false),
            anchorRef: elRef,
            style:{left:20, top:0},
            items: [...ELEMENTS, 'Commun'].map(el => ({
              label:`${EC[el]?.em||'⚪'} ${el}`,
              onClick:()=>onUpdate({...item, element:el})
            }))
          })
        )
      ),
      h('div', {style:{flex:1, minWidth:0}},
        h('div', {style:{display:'flex', justifyContent:'space-between', gap:8, marginBottom:4}},
          h('div', {style:{fontWeight:600, fontSize:13, color:'#eee', flex:1}},
            h(EditText, {value:item.nom, onChange:v=>onUpdate({...item,nom:v}), editMode})
          ),
          h('div', {style:{display:'flex', gap:6, flexShrink:0, alignItems:'center'}},
            item.cout && h('span', {style:{fontSize:11,color:'#aaa',background:'rgba(255,255,255,.07)',padding:'1px 6px',borderRadius:4}},
              h(EditText, {value:item.cout, onChange:v=>onUpdate({...item,cout:v}), editMode})
            ),
            item.limite && h('span', {style:{fontSize:11,color:'#777'}},
              h(EditText, {value:item.limite, onChange:v=>onUpdate({...item,limite:v}), editMode})
            ),
            item.lvl && !withLvl && h('span', {style:{fontSize:11,color:'#aaa',background:'rgba(255,255,255,.07)',padding:'1px 6px',borderRadius:4}}, item.lvl)
          )
        ),
        h('div', {style:{fontSize:12, color:'#bbb', lineHeight:1.6}},
          h(EditText, {value:item.effet, onChange:v=>onUpdate({...item,effet:v}), editMode, multiline:true})
        ),
        h('div', {style:{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6}},
          h('div', {style:{display:'flex', alignItems:'center', gap:8}},
            !editMode && showElem && ec && h('span', {style:{
              fontSize:10, color:ec.dot, background:ec.bg, padding:'1px 6px',
              borderRadius:10, border:`1px solid ${ec.br}`
            }}, `${ec.em} ${item.element}`),
            editMode && h('span', {onClick:()=>setShowNotes(!showNotes), style:{fontSize:10, color:'#555', cursor:'pointer'}},
              showNotes ? '▲ notes' : '▼ notes'
            )
          ),
          h('div', {style:{display:'flex', alignItems:'center', gap:8}},
            h('span', {style:{fontSize:11, color:'#555'}}, `×${item.quantite||1}`),
            withLvl && h('div', {ref:lvRef, style:{position:'relative'}},
              h('div', {onClick:()=>setShowLv(!showLv), style:{fontSize:10, color:'#aaa', cursor:'pointer'}},
                item.lvl?.replace('Lvl ','L')
              ),
              showLv && h(Popup, {
                onClose:()=>setShowLv(false),
                anchorRef: lvRef,
                style:{right:0, bottom:'100%', marginBottom:4},
                items: LVLS.map(l => ({label:l, onClick:()=>onUpdate({...item, lvl:l})}))
              })
            ),
            editMode && h('span', {onClick:()=>onDelete(item.id), style:{fontSize:10, color:'#444', cursor:'pointer'}}, '✕')
          )
        ),
        editMode && showNotes && h('div', {style:{marginTop:8, padding:8, background:'rgba(0,0,0,.3)', borderRadius:6, border:'1px solid #2a2a2a'}},
          h('div', {style:{fontSize:10, color:'#555', marginBottom:4}}, 'Notes'),
          h(EditText, {value:item.notes||'', onChange:v=>onUpdate({...item,notes:v}), editMode, multiline:true})
        )
      )
    )
  );
}
