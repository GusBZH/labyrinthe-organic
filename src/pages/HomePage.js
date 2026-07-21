import { h, useRef } from "../react.js";
import { ELEMENTS, STATUTS, LVLS } from "../config.js";
import { Section } from "../components/Section.js";
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
import { BlockEditor } from "../components/BlockEditor.js";
import { uid, editBgStyle, useEditFlash, useReorder, renderText } from "../utils.js";

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

  const lexiqueRef = useRef(null);
  const lexique = useReorder(data.lexique, next => upd({...data, lexique: next}));
  const modesRef = useRef(null);
  const modes = useReorder(data.modes, next => upd({...data, modes: next}));
  const ideesModesRef = useRef(null);
  const ideesModes = useReorder(data.ideesModes, next => upd({...data, ideesModes: next}));
  const visuelsRef = useRef(null);
  const visuels = useReorder(data.visuels, next => upd({...data, visuels: next}));

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

      // WIP JOUER
      h('div', {style:{background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)',
        borderRadius:12, padding:16, marginBottom:20, textAlign:'center', cursor:'not-allowed'}},
        h('div', {style:{fontSize:14, fontWeight:600, color:'#777'}}, '🎮 Jouer'),
        h('div', {style:{fontSize:11, color:'#555', marginTop:4}}, 'WIP — bientôt disponible')
      ),

      // RÈGLES
      h(Section, {title:'Règles de base', emoji:'📋'},
        reglesF.map(r => h(Card, {key:r.id, item:r, onUpdate:i=>updArr('regles',i), onDelete:id=>delArr('regles',id), editMode, showElem:false})),
        editMode && h(AddBtn, {onClick:()=>addArr('regles',{id:uid(),nom:'Nouvelle règle',statut:'Test 3',effet:'',notes:''})}),
        h(NotesBlock, {value:data.reglesNotes, onChange:v=>upd({...data,reglesNotes:v}), editMode, label:'Notes — Règles'})
      ),

      // CASES
      h(Section, {title:'Cases', emoji:'🗺️'},
        casesF.map(c => h(Card, {key:c.id, item:c, onUpdate:i=>updArr('cases',i), onDelete:id=>delArr('cases',id), editMode, showElem:false})),
        editMode && h(AddBtn, {onClick:()=>addArr('cases',{id:uid(),nom:'Nouvelle case',statut:'Test 3',effet:'',quantite:1,notes:''})})
      ),

      // SORTS
      h(Section, {title:'Sorts', emoji:'💎'},
        ELEMENTS.map(el => h(ElemGroup, {key:el, element:el, items:sortsByEl[el]||[], editMode, withElem:true,
          onUpdate:i=>updArr('sorts',i), onDelete:id=>delArr('sorts',id),
          onAdd:i=>addArr('sorts',i)
        })),
        h(NotesBlock, {value:data.sortsNotes, onChange:v=>upd({...data,sortsNotes:v}), editMode, label:'Notes — Sorts'})
      ),

      // ÉNERGIES
      h(Section, {title:'Énergies', emoji:'✨'},
        energElems.map(el => h(ElemGroup, {key:el, element:el, items:energsByEl[el]||[], editMode, withElem:true,
          onUpdate:i=>updArr('energies',i), onDelete:id=>delArr('energies',id),
          onAdd:i=>addArr('energies',{id:uid(),nom:'Nouvelle énergie',element:el,statut:'Test 3',cout:'',limite:'',effet:'',quantite:1,notes:''})
        })),
        h(NotesBlock, {value:data.energiesNotes, onChange:v=>upd({...data,energiesNotes:v}), editMode, label:'Notes — Énergies'})
      ),

      // MONSTRES
      h(Section, {title:'Monstres', emoji:'👹'},
        LVLS.map(l => h(LvlGroup, {key:l, lvl:l, items:monsByLvl[l]||[], editMode,
          onUpdate:i=>updArr('monstres',i), onDelete:id=>delArr('monstres',id),
          onAdd:i=>addArr('monstres',i)
        })),
        h(NotesBlock, {value:data.monstresNotes, onChange:v=>upd({...data,monstresNotes:v}), editMode, label:'Notes — Monstres'})
      ),

      // LEXIQUE
      h(Section, {title:'Lexique', emoji:'📖'},
        h('div', {ref:lexiqueRef},
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
        editMode && h(AddBtn, {onClick:()=>upd({...data,lexique:[...data.lexique,{id:uid(),terme:'Terme',definition:'Définition'}]})}),
        h(NotesBlock, {value:data.lexiqueNotes, onChange:v=>upd({...data,lexiqueNotes:v}), editMode})
      ),

      // MODES
      h(Section, {title:'Modes de jeu', emoji:'🎮'},
        h('div', {ref:modesRef},
          modes.display.map((m,i) => h('div', {key:m.id, style:{
            display:'flex', alignItems:'flex-start', gap:4,
            opacity: modes.dragIndex===i?0.6:1, transform: modes.dragIndex===i?'scale(1.01)':'none',
            boxShadow: modes.dragIndex===i?'0 4px 14px rgba(0,0,0,.4)':'none', transition:'opacity .1s, box-shadow .1s',
          }},
            editMode && h(DragHandle, {onPointerDown:e=>modes.startDrag(i, e, modesRef.current)}),
            h('div', {style:{flex:1, minWidth:0}},
              h(ModeCard, {mode:m, editMode,
                onUpdate:m2=>{const a=data.modes.map(x=>x.id===m2.id?m2:x);upd({...data,modes:a});},
                onDelete:()=>upd({...data,modes:data.modes.filter(x=>x.id!==m.id)})
              })
            )
          ))
        ),
        editMode && h(AddBtn, {onClick:()=>upd({...data,modes:[...data.modes,{id:uid(),nom:'Nouveau mode',emoji:'🎲',difficulte:'⭐',style:'',joueurs:'',contenu:'',notes:''}]})}),
        h('div', {style:{marginTop:8, borderTop:'1px solid rgba(255,255,255,.06)', paddingTop:8}},
          h('div', {style:{fontSize:11, color:'#555', marginBottom:8}}, '💡 Idées de modes'),
          h('div', {ref:ideesModesRef},
            ideesModes.display.map((im,i) => h('div', {key:im.id, style:{
              display:'flex', alignItems:'flex-start', gap:4,
              opacity: ideesModes.dragIndex===i?0.6:1, transform: ideesModes.dragIndex===i?'scale(1.01)':'none',
              boxShadow: ideesModes.dragIndex===i?'0 4px 14px rgba(0,0,0,.4)':'none', transition:'opacity .1s, box-shadow .1s',
            }},
              editMode && h(DragHandle, {onPointerDown:e=>ideesModes.startDrag(i, e, ideesModesRef.current)}),
              h('div', {style:{flex:1, minWidth:0, background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:6, padding:'8px 10px', marginBottom:6}},
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
        )
      ),

      // VISUELS
      h(Section, {title:'Visuels', emoji:'🎨'},
        h('div', {ref:visuelsRef},
          visuels.display.map((cat,i) => h('div', {key:cat.id, style:{display:'flex', alignItems:'flex-start', gap:4}},
            editMode && h(DragHandle, {onPointerDown:e=>visuels.startDrag(i, e, visuelsRef.current)}),
            h('div', {style:{flex:1, minWidth:0}},
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
            )
          ))
        ),
        editMode && h(AddBtn, {onClick:()=>upd({...data,visuels:[...data.visuels,{id:uid(),label:'Nouvelle catégorie',content:''}]})})
      ),

      // MATÉRIEL
      h(Section, {title:'Matériel', emoji:'🧰'},
        editMode
          ? h(BlockEditor, {value:data.materiel||'', onChange:v=>upd({...data,materiel:v})})
          : h('div', {style:{fontSize:12, color:'#bbb', lineHeight:1.7}}, renderText(data.materiel||'')),
        h(NotesBlock, {value:data.materielNotes, onChange:v=>upd({...data,materielNotes:v}), editMode})
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
