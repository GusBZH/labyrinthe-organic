import { h } from "../react.js";
import { uid } from "../utils.js";

// Per-bloc breakdown of a card's exemplaires when they aren't all visually
// identical (Gus, on Cases specifically: "il y a 20 cases portails... mais
// les 20 ne sont pas identiques, certains sont une case d'un couloir tout
// droit, certains en forme de T"). One row = {id, fichier, quantite}; the
// caller (Card.js) sums `quantite` across rows to drive the ×N badge once
// there's at least one row — see Card.js's own comment for why.
export function DetailsEditor({details, onChange, editMode}) {
  const rows = details || [];

  function updateRow(id, patch) {
    onChange(rows.map(r => r.id === id ? {...r, ...patch} : r));
  }
  function addRow() {
    onChange([...rows, {id: uid(), fichier: '', quantite: 1}]);
  }
  function deleteRow(id) {
    onChange(rows.filter(r => r.id !== id));
  }

  if (!editMode) {
    if (rows.length === 0) return null;
    return h('div', {style:{display:'flex', flexDirection:'column', gap:4}},
      rows.map(r => h('div', {key:r.id, style:{display:'flex', justifyContent:'space-between', fontSize:12, color:'#bbb'}},
        h('span', null, r.fichier || h('span', {style:{color:'#555'}}, '(sans nom)')),
        h('span', {style:{color:'#777'}}, '×' + (r.quantite || 1))
      ))
    );
  }

  return h('div', {style:{display:'flex', flexDirection:'column', gap:6}},
    rows.map(r => h('div', {key:r.id, style:{display:'flex', alignItems:'center', gap:6}},
      h('input', {
        className:'edit-input', value:r.fichier, placeholder:'nom_fichier.png',
        onChange:e => updateRow(r.id, {fichier:e.target.value}), style:{flex:1}
      }),
      h('input', {
        className:'edit-input', value:r.quantite,
        onChange:e => { const n = parseInt(e.target.value.replace(/[^\d]/g,''), 10); updateRow(r.id, {quantite:Number.isFinite(n) && n > 0 ? n : 1}); },
        style:{width:48, textAlign:'center', flexShrink:0}
      }),
      h('span', {onClick:()=>deleteRow(r.id), style:{fontSize:10, color:'#444', cursor:'pointer', flexShrink:0}}, '✕')
    )),
    h('div', {onClick:addRow, style:{fontSize:11, color:'#4fa3ff', cursor:'pointer', textAlign:'center', padding:'4px 0'}}, '+ ajouter une ligne')
  );
}
