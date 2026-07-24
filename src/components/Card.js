import { h, useState, useRef } from "../react.js";
import { EC, STATUTS, SC, ELEMENTS, LVLS } from "../config.js";
import { EditText } from "./EditText.js";
import { StatusDot } from "./StatusDot.js";
import { Popup } from "./Popup.js";
import { BlockEditor } from "./BlockEditor.js";
import { renderText, countNoteBlocks } from "../utils.js";

export function Card({item, onUpdate, onDelete, editMode, showElem, withElem, withLvl}) {
  const [showSt, setShowSt] = useState(false);
  const [showEl, setShowEl] = useState(false);
  const [showLv, setShowLv] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const stRef = useRef(null);
  const elRef = useRef(null);
  const lvRef = useRef(null);
  const ec = item.element ? EC[item.element] : null;
  const noteCount = countNoteBlocks(item.notes);

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
        h('div', {style:{position:'relative', display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6}},
          h('div', {style:{display:'flex', alignItems:'center', gap:8}},
            // Element emoji-picker moved down here from the top-left column
            // (Gus: "trop proche de la pastille de couleur en haut à
            // gauche") — sits at the bottom-left now, same spot a monster's
            // withLvl popup already used, instead of stacked right under
            // StatusDot with only 4px between them.
            editMode && withElem && h('div', {ref:elRef, style:{position:'relative'}},
              h('div', {onClick:()=>setShowEl(!showEl), style:{fontSize:14, cursor:'pointer'}}, ec?.em || '?'),
              showEl && h(Popup, {
                onClose:()=>setShowEl(false),
                anchorRef: elRef,
                style:{left:0, bottom:'100%', marginBottom:4},
                items: [...ELEMENTS, 'Commun'].map(el => ({
                  label:`${EC[el]?.em||'⚪'} ${el}`,
                  onClick:()=>onUpdate({...item, element:el})
                }))
              })
            ),
            !editMode && showElem && ec && h('span', {style:{
              fontSize:10, color:ec.dot, background:ec.bg, padding:'1px 6px',
              borderRadius:10, border:`1px solid ${ec.br}`
            }}, `${ec.em} ${item.element}`),
            withLvl && h('div', {ref:lvRef, style:{position:'relative'}},
              h('div', {onClick:()=>setShowLv(!showLv), style:{fontSize:10, color:'#aaa', cursor:'pointer'}},
                item.lvl?.replace('Lvl ','L')
              ),
              showLv && h(Popup, {
                onClose:()=>setShowLv(false),
                anchorRef: lvRef,
                style:{left:0, bottom:'100%', marginBottom:4},
                items: LVLS.map(l => ({label:l, onClick:()=>onUpdate({...item, lvl:l})}))
              })
            ),
            // "Notes des blocs" (Gus's own name) — toggle and count pastille
            // now visible in BOTH modes ("j'aimerais que la pastille et les
            // notes des blocs soient visibles même sans le mode édition"),
            // not just editMode as before.
            h('span', {onClick:()=>setShowNotes(!showNotes), style:{fontSize:10, color:'#555', cursor:'pointer', display:'flex', alignItems:'center', gap:4}},
              showNotes ? '▲ notes' : '▼ notes',
              noteCount > 0 && h('span', {style:{
                fontSize:9, fontWeight:700, color:'#fff', background:'#d33', borderRadius:'50%',
                minWidth:14, height:14, padding:'0 3px', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1
              }}, noteCount)
            )
          ),
          // Quantity badge re-centered (Gus: "actuellement il est en bas à
          // droite... je veux en bas au milieu") — was grouped with the ✕
          // in the right-hand flex group, too close to it; now absolutely
          // centered in the row regardless of how wide either side group is,
          // leaving the ✕ alone on the right. Also now editable by
          // double-tap (Gus, on the case/sort/énergie decks specifically,
          // but shared here like everything else in Card.js) — same
          // double-tap-to-edit convention as every other EditText in the
          // app, parsed back to a positive integer (falls back to 1 on
          // anything non-numeric, matching the existing `||1` display
          // fallback for an unset value).
          // Bug fixed here: the "×" used to be a plain text sibling OUTSIDE
          // EditText's own div, only there for display — EditText's
          // `onDoubleClick` lives on ITS div alone, which doesn't include
          // that sibling text node at all, and never receives a bubbled
          // event fired on a sibling either (bubbling only goes up the
          // tree, never sideways). A double-tap landing on the "×" itself
          // (roughly half of a target as short as "×1") therefore hit
          // nothing and silently did nothing — explains the "works maybe
          // 1 time in 10" symptom, it only worked on taps that happened to
          // land precisely on the digit(s). Fix: fold the "×" into
          // EditText's own value so the WHOLE "×N" string is one single
          // element and thus one single double-tap target, same pattern
          // already used for `item.cout`/`item.limite` just above (full
          // text incl. non-numeric characters, edited as one string) —
          // `v.replace(/[^\d]/g,'')` strips whatever punctuation the user
          // left (or didn't) before parsing the integer back out.
          h('span', {style:{position:'absolute', left:'50%', transform:'translateX(-50%)', fontSize:11, color:'#555'}},
            h(EditText, {
              value: '×' + (item.quantite || 1),
              onChange: v => { const n = parseInt(v.replace(/[^\d]/g, ''), 10); onUpdate({...item, quantite: Number.isFinite(n) && n > 0 ? n : 1}); },
              editMode
            })
          ),
          h('div', {style:{display:'flex', alignItems:'center', gap:8}},
            editMode && h('span', {onClick:()=>onDelete(item.id), style:{fontSize:10, color:'#444', cursor:'pointer'}}, '✕')
          )
        ),
        // Visible in both modes now (see the toggle's own comment) — edit
        // mode gets the "double entrée" BlockEditor (Enter-twice splits a
        // divider-separated mini note, ✕ per mini note), view mode gets the
        // matching read-only rendering (renderText, same `\n\n` convention).
        showNotes && h('div', {style:{marginTop:8, padding:8, background:'rgba(0,0,0,.3)', borderRadius:6, border:'1px solid #2a2a2a'}},
          h('div', {style:{fontSize:10, color:'#555', marginBottom:4}}, 'Notes'),
          editMode
            ? h(BlockEditor, {value:item.notes||'', onChange:v=>onUpdate({...item,notes:v})})
            : h('div', {style:{fontSize:12, color:'#bbb', lineHeight:1.6}}, renderText(item.notes||''))
        )
      )
    )
  );
}
