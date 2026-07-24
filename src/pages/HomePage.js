import { h, useRef } from "../react.js";
import { ELEMENTS, STATUTS, LVLS } from "../config.js";
import { Card } from "../components/Card.js";
import { ElemGroup } from "../components/ElemGroup.js";
import { LvlGroup } from "../components/LvlGroup.js";
import { ModeCard } from "../components/ModeCard.js";
import { NotesBlock } from "../components/NotesBlock.js";
import { AddBtn } from "../components/AddBtn.js";
import { EditText } from "../components/EditText.js";
import { EditToggle } from "../components/EditToggle.js";
import { UndoRedo } from "../components/UndoRedo.js";
import { DragHandle } from "../components/DragHandle.js";
import { EditableSection } from "../components/EditableSection.js";
import { Section } from "../components/Section.js";
import { BlockEditor } from "../components/BlockEditor.js";
import { uid, editBgStyle, useEditFlash, useReorder, reorderSubset, renderText } from "../utils.js";

function DragRow({dragging, dragHandle, children}) {
  return h('div', {style:{
    display:'flex', alignItems:'flex-start', gap:4,
    opacity: dragging?0.6:1, transform: dragging?'scale(1.01)':'none',
    boxShadow: dragging?'0 4px 14px rgba(0,0,0,.4)':'none', transition:'opacity .1s, box-shadow .1s',
  }},
    dragHandle,
    h('div', {style:{flex:1, minWidth:0}}, children)
  );
}

export function HomePage({data, editMode, setEditMode, saving, saveErr, canUndo, canRedo, onUndo, onRedo, upd, updArr, delArr, addArr, setPage, onLogout}) {
  const flashCls = useEditFlash(editMode);
  const sortsByEl = {};
  ELEMENTS.forEach(el => { sortsByEl[el] = data.sorts.filter(s => s.element === el); });
  const energElems = ['Commun', ...ELEMENTS];
  const energsByEl = {};
  energElems.forEach(el => { energsByEl[el] = data.energies.filter(e => e.element === el); });
  const monsByLvl = {};
  LVLS.forEach(l => { monsByLvl[l] = data.monstres.filter(m => m.lvl === l); });

  const reglesF = editMode
    ? [...data.regles].sort((a,b) => STATUTS.indexOf(a.statut) - STATUTS.indexOf(b.statut))
    : data.regles.filter(r => r.statut === 'Validé');
  const casesF = editMode
    ? [...data.cases].sort((a,b) => STATUTS.indexOf(a.statut) - STATUTS.indexOf(b.statut))
    : data.cases.filter(c => c.statut === 'Validé');

  const reglesRef = useRef(null);
  const regles = useReorder(reglesF, next => upd({...data, regles: reorderSubset(data.regles, next)}));
  const casesRef = useRef(null);
  const cases = useReorder(casesF, next => upd({...data, cases: reorderSubset(data.cases, next)}));
  const lexiqueRef = useRef(null);
  const lexique = useReorder(data.lexique, next => upd({...data, lexique: next}));
  const modesRef = useRef(null);
  const modes = useReorder(data.modes, next => upd({...data, modes: next}));
  const ideesModesRef = useRef(null);
  const ideesModes = useReorder(data.ideesModes, next => upd({...data, ideesModes: next}));
  const visuelsRef = useRef(null);
  const visuels = useReorder(data.visuels, next => upd({...data, visuels: next}));
  const sectionsRef = useRef(null);
  const sections = useReorder(data.sectionOrder, next => upd({...data, sectionOrder: next}));
  const sortsElemRef = useRef(null);
  const sortsElemOrder = useReorder(data.elementOrder, next => upd({...data, elementOrder: next}));
  const energiesElemRef = useRef(null);
  const energiesElemOrder = useReorder(data.elementOrder, next => upd({...data, elementOrder: next}));
  const lvlOrderRef = useRef(null);
  const lvlOrder = useReorder(data.lvlOrder, next => upd({...data, lvlOrder: next}));

  const sectionContent = {
    regles: [
      h('div', {key:'list', ref:reglesRef},
        regles.display.map((r,i) => h(DragRow, {key:r.id, dragging:regles.dragIndex===i, dragHandle:editMode && h(DragHandle, {onPointerDown:e=>regles.startDrag(i, e, reglesRef.current)})},
          h(Card, {item:r, onUpdate:i2=>updArr('regles',i2), onDelete:id=>delArr('regles',id), editMode, showElem:false})
        ))
      ),
      editMode && h(AddBtn, {key:'add', onClick:()=>addArr('regles',{id:uid(),nom:'Nouvelle règle',statut:'Test 3',effet:'',notes:''})}),
      h(NotesBlock, {key:'notes', value:data.reglesNotes, onChange:v=>upd({...data,reglesNotes:v}), editMode, label:'Notes — Règles'})
    ],

    cases: [
      h('div', {key:'list', ref:casesRef},
        cases.display.map((c,i) => h(DragRow, {key:c.id, dragging:cases.dragIndex===i, dragHandle:editMode && h(DragHandle, {onPointerDown:e=>cases.startDrag(i, e, casesRef.current)})},
          h(Card, {item:c, onUpdate:i2=>updArr('cases',i2), onDelete:id=>delArr('cases',id), editMode, showElem:false, withDetails:true})
        ))
      ),
      editMode && h(AddBtn, {key:'add', onClick:()=>addArr('cases',{id:uid(),nom:'Nouvelle case',statut:'Test 3',effet:'',quantite:1,notes:'',details:[]})}),
      h(NotesBlock, {key:'notes', value:data.casesNotes, onChange:v=>upd({...data,casesNotes:v}), editMode, label:'Notes — Cases'})
    ],

    sorts: [
      h('div', {key:'list', ref:sortsElemRef},
        sortsElemOrder.display.map((el,i) => h(DragRow, {key:el, dragging:sortsElemOrder.dragIndex===i, dragHandle:editMode && h(DragHandle, {onPointerDown:e=>sortsElemOrder.startDrag(i, e, sortsElemRef.current)})},
          h(ElemGroup, {element:el, items:sortsByEl[el]||[], editMode, withElem:true,
            onUpdate:i2=>updArr('sorts',i2), onDelete:id=>delArr('sorts',id),
            onAdd:i2=>addArr('sorts',i2),
            onReorder:next=>upd({...data, sorts: reorderSubset(data.sorts, next)})
          })
        ))
      ),
      h(NotesBlock, {key:'notes', value:data.sortsNotes, onChange:v=>upd({...data,sortsNotes:v}), editMode, label:'Notes — Sorts'})
    ],

    energies: [
      h(ElemGroup, {key:'commun', element:'Commun', items:energsByEl['Commun']||[], editMode, withElem:true,
        onUpdate:i2=>updArr('energies',i2), onDelete:id=>delArr('energies',id),
        onAdd:i2=>addArr('energies',{id:uid(),nom:'Nouvelle énergie',element:'Commun',statut:'Test 3',cout:'',limite:'',effet:'',quantite:1,notes:''}),
        onReorder:next=>upd({...data, energies: reorderSubset(data.energies, next)})
      }),
      h('div', {key:'list', ref:energiesElemRef},
        energiesElemOrder.display.map((el,i) => h(DragRow, {key:el, dragging:energiesElemOrder.dragIndex===i, dragHandle:editMode && h(DragHandle, {onPointerDown:e=>energiesElemOrder.startDrag(i, e, energiesElemRef.current)})},
          h(ElemGroup, {element:el, items:energsByEl[el]||[], editMode, withElem:true,
            onUpdate:i2=>updArr('energies',i2), onDelete:id=>delArr('energies',id),
            onAdd:i2=>addArr('energies',{id:uid(),nom:'Nouvelle énergie',element:el,statut:'Test 3',cout:'',limite:'',effet:'',quantite:1,notes:''}),
            onReorder:next=>upd({...data, energies: reorderSubset(data.energies, next)})
          })
        ))
      ),
      h(NotesBlock, {key:'notes', value:data.energiesNotes, onChange:v=>upd({...data,energiesNotes:v}), editMode, label:'Notes — Énergies'})
    ],

    monstres: [
      h('div', {key:'list', ref:lvlOrderRef},
        lvlOrder.display.map((l,i) => h(DragRow, {key:l, dragging:lvlOrder.dragIndex===i, dragHandle:editMode && h(DragHandle, {onPointerDown:e=>lvlOrder.startDrag(i, e, lvlOrderRef.current)})},
          h(LvlGroup, {lvl:l, items:monsByLvl[l]||[], editMode,
            onUpdate:i2=>updArr('monstres',i2), onDelete:id=>delArr('monstres',id),
            onAdd:i2=>addArr('monstres',i2),
            onReorder:next=>upd({...data, monstres: reorderSubset(data.monstres, next)})
          })
        ))
      ),
      h(NotesBlock, {key:'notes', value:data.monstresNotes, onChange:v=>upd({...data,monstresNotes:v}), editMode, label:'Notes — Monstres'})
    ],

    lexique: [
      h('div', {key:'list', ref:lexiqueRef},
        lexique.display.map((l,i) => h('div', {key:l.id, style:{padding:'8px 0',
          borderBottom:i<lexique.display.length-1?'1px solid rgba(255,255,255,.06)':'none',
          display:'flex', alignItems:'flex-start', gap:8,
          opacity: lexique.dragIndex===i?0.6:1, background: lexique.dragIndex===i?'rgba(255,255,255,.04)':'transparent',
        }},
          editMode && h(DragHandle, {onPointerDown:e=>lexique.startDrag(i, e, lexiqueRef.current)}),
          h('div', {style:{minWidth:120, fontSize:12, fontWeight:600, color:'#ccc', flexShrink:0}},
            h(EditText, {value:l.terme, onChange:v=>{const a=data.lexique.map(x=>x.id===l.id?{...x,terme:v}:x);upd({...data,lexique:a});}, editMode})
          ),
          h('div', {style:{fontSize:12, color:'#888', flex:1}},
            h(EditText, {value:l.definition, onChange:v=>{const a=data.lexique.map(x=>x.id===l.id?{...x,definition:v}:x);upd({...data,lexique:a});}, editMode, multiline:true})
          ),
          editMode && h('div', {onClick:()=>upd({...data,lexique:data.lexique.filter(x=>x.id!==l.id)}), style:{fontSize:10, color:'#555', cursor:'pointer', padding:'2px 4px', flexShrink:0}}, '✕')
        ))
      ),
      editMode && h(AddBtn, {key:'add', onClick:()=>upd({...data,lexique:[...data.lexique,{id:uid(),terme:'Terme',definition:'Définition'}]})}),
      h(NotesBlock, {key:'notes', value:data.lexiqueNotes, onChange:v=>upd({...data,lexiqueNotes:v}), editMode})
    ],

    modes: [
      h('div', {key:'list', ref:modesRef},
        modes.display.map((m,i) => h(DragRow, {key:m.id, dragging:modes.dragIndex===i, dragHandle:editMode && h(DragHandle, {onPointerDown:e=>modes.startDrag(i, e, modesRef.current)})},
          h(ModeCard, {mode:m, editMode,
            onUpdate:m2=>{const a=data.modes.map(x=>x.id===m2.id?m2:x);upd({...data,modes:a});},
            onDelete:()=>upd({...data,modes:data.modes.filter(x=>x.id!==m.id)})
          })
        ))
      ),
      editMode && h(AddBtn, {key:'add', onClick:()=>upd({...data,modes:[...data.modes,{id:uid(),nom:'Nouveau mode',emoji:'🎲',difficulte:'⭐',style:'',joueurs:'',contenu:'',notes:''}]})}),
      h('div', {key:'idees', style:{marginTop:8, borderTop:'1px solid rgba(255,255,255,.06)', paddingTop:8}},
        h('div', {style:{fontSize:11, color:'#555', marginBottom:8}}, '💡 Idées de modes'),
        h('div', {ref:ideesModesRef},
          ideesModes.display.map((im,i) => h(DragRow, {key:im.id, dragging:ideesModes.dragIndex===i, dragHandle:editMode && h(DragHandle, {onPointerDown:e=>ideesModes.startDrag(i, e, ideesModesRef.current)})},
            h('div', {style:{background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:6, padding:'8px 10px', marginBottom:6}},
              h('div', {style:{display:'flex', gap:8}},
                h('div', {style:{flex:1, minWidth:0}},
                  h('div', {style:{fontSize:12, fontWeight:600, color:'#ccc', marginBottom:4}},
                    h(EditText, {value:im.nom, onChange:v=>{const a=data.ideesModes.map(x=>x.id===im.id?{...x,nom:v}:x);upd({...data,ideesModes:a});}, editMode})
                  ),
                  h('div', {style:{fontSize:12, color:'#777'}},
                    h(EditText, {value:im.pitch, onChange:v=>{const a=data.ideesModes.map(x=>x.id===im.id?{...x,pitch:v}:x);upd({...data,ideesModes:a});}, editMode, multiline:true})
                  )
                ),
                editMode && h('div', {onClick:()=>upd({...data,ideesModes:data.ideesModes.filter(x=>x.id!==im.id)}), style:{fontSize:10, color:'#555', cursor:'pointer', padding:'2px 4px', flexShrink:0}}, '✕')
              )
            )
          ))
        ),
        editMode && h(AddBtn, {onClick:()=>upd({...data,ideesModes:[...data.ideesModes,{id:uid(),nom:'Nouveau mode',pitch:''}]})})
      ),
      h(NotesBlock, {key:'notes', value:data.modesNotes, onChange:v=>upd({...data,modesNotes:v}), editMode, label:'Notes — Modes de jeu'})
    ],

    visuels: [
      h('div', {key:'list', ref:visuelsRef},
        visuels.display.map((cat,i) => h(DragRow, {key:cat.id, dragging:visuels.dragIndex===i, dragHandle:editMode && h(DragHandle, {onPointerDown:e=>visuels.startDrag(i, e, visuelsRef.current)})},
          h(EditableSection, {
            title: cat.label,
            dragging: visuels.dragIndex===i,
            onTitleChange: editMode ? v=>{const a=data.visuels.map(x=>x.id===cat.id?{...x,label:v}:x);upd({...data,visuels:a});} : undefined,
            onDelete: editMode ? ()=>upd({...data,visuels:data.visuels.filter(x=>x.id!==cat.id)}) : undefined,
          },
            editMode
              ? h(BlockEditor, {value:cat.content||'', onChange:v=>{const a=data.visuels.map(x=>x.id===cat.id?{...x,content:v}:x);upd({...data,visuels:a});}})
              : h('div', {style:{fontSize:12, color:'#bbb', lineHeight:1.7}}, renderText(cat.content||''))
          )
        ))
      ),
      editMode && h(AddBtn, {key:'add', onClick:()=>upd({...data,visuels:[...data.visuels,{id:uid(),label:'Nouvelle catégorie',content:''}]})}),
      h(NotesBlock, {key:'notes', value:data.visuelsNotes, onChange:v=>upd({...data,visuelsNotes:v}), editMode, label:'Notes — Visuels'})
    ],

    materiel: [
      editMode
        ? h(BlockEditor, {key:'edit', value:data.materiel||'', onChange:v=>upd({...data,materiel:v})})
        : h('div', {key:'view', style:{fontSize:12, color:'#bbb', lineHeight:1.7}}, renderText(data.materiel||'')),
      h(NotesBlock, {key:'notes', value:data.materielNotes, onChange:v=>upd({...data,materielNotes:v}), editMode})
    ],

    // Nouvelle catégorie principale (Gus) — deux sous-catégories ("onglet
    // déroulant dans l'onglet déroulant"), simple `Section` non-renamable
    // (contrairement aux grandes catégories, pas besoin de renommer/glisser
    // ces deux-là — Gus a donné leurs noms exacts) plutôt qu'une deuxième
    // `EditableSection` imbriquée. Chacune a son propre espace note (double
    // entrée, comme toutes les autres) — `applicationNoteNotes`/
    // `applicationJeuNotes`, distincts de `applicationNotes` (la note
    // globale de la catégorie principale elle-même, juste en dessous).
    application: [
      h(Section, {key:'note', emoji:'📜', title:'Note'},
        h(NotesBlock, {value:data.applicationNoteNotes, onChange:v=>upd({...data,applicationNoteNotes:v}), editMode, label:'Notes'})
      ),
      h(Section, {key:'jeu', emoji:'👾', title:'Jeu'},
        h(NotesBlock, {value:data.applicationJeuNotes, onChange:v=>upd({...data,applicationJeuNotes:v}), editMode, label:'Notes'})
      ),
      h(NotesBlock, {key:'notes', value:data.applicationNotes, onChange:v=>upd({...data,applicationNotes:v}), editMode, label:'Notes — Application'})
    ],
  };

  return h('div', {className:flashCls, style:{position:'relative', minHeight:'100vh', fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif', color:'#eee', transition:'background .5s', ...editBgStyle(editMode)}},

    // HEADER
    h('div', {style:{position:'sticky', top:0, zIndex:50,
      background:editMode?'rgba(25,25,25,.97)':'rgba(14,14,14,.97)',
      backdropFilter:'blur(10px)', borderBottom:'1px solid rgba(255,255,255,.06)',
      padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between'}},
      h('div', {style:{flex:1, minWidth:0}},
        h('div', {style:{fontSize:15, fontWeight:700, color:'#eee'}},
          h(EditText, {value:data.gameName, onChange:v=>upd({...data,gameName:v}), editMode})
        ),
        h('div', {style:{fontSize:10, marginTop:1, color:saveErr?'#f55':saving?'#888':'transparent', minHeight:14}},
          saveErr || (saving ? 'Sauvegarde...' : '')
        )
      ),
      h('div', {style:{display:'flex', alignItems:'center', gap:8}},
        editMode && h(UndoRedo, {canUndo, canRedo, onUndo, onRedo}),
        h(EditToggle, {editMode, setEditMode})
      )
    ),

    // CONTENT
    h('div', {style:{padding:'16px 16px 100px'}},

      // JOUER
      h('div', {onClick:()=>setPage('plateau'), style:{background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)',
        borderRadius:12, padding:16, marginBottom:20, textAlign:'center', cursor:'pointer'}},
        h('div', {style:{fontSize:14, fontWeight:600, color:'#eee'}}, '🎮 Jouer'),
        h('div', {style:{fontSize:11, color:'#666', marginTop:4}}, 'Plateau hotseat (v1)')
      ),

      h('div', {ref:sectionsRef},
        sections.display.map((sec,i) => h(DragRow, {key:sec.key, dragging:sections.dragIndex===i, dragHandle:editMode && h(DragHandle, {onPointerDown:e=>sections.startDrag(i, e, sectionsRef.current)})},
          h(EditableSection, {
            title: sec.label,
            onTitleChange: editMode ? v => { const next = data.sectionOrder.map(s => s.key===sec.key?{...s,label:v}:s); upd({...data, sectionOrder:next}); } : undefined,
          },
            ...sectionContent[sec.key]
          )
        ))
      ),

      // BOUTONS BAS
      h('div', {style:{display:'flex', flexDirection:'column', gap:8, marginTop:20}},
        h('button', {className:'btn-main', onClick:()=>setPage('soirees')}, '📅 Soirées Prototype'),
        h('button', {className:'btn-main', onClick:()=>setPage('idees')}, '💡 Idées en vrac'),
        h('button', {
          onClick:onLogout,
          style:{width:'100%', background:'none', border:'1px solid #222', borderRadius:10, padding:10, color:'#444', fontSize:12, marginTop:8}
        }, 'Déconnexion')
      )
    )
  );
}
