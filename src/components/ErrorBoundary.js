import { Component, h } from "../react.js";

// Catches any render-time crash anywhere below it and shows a recoverable
// screen instead of a silent black/blank page — Gus: "ça crash vraiment,
// c'est écran noir et on peut plus revenir dans la room (elle est vide
// quoi)". A crash triggered by another player's stale/mismatched client
// pushing an unexpected data shape to Firebase (see CLAUDE.md "Vérification
// de version") would otherwise leave the app permanently unrenderable —
// reloading is enough to escape it too, since neither `page` nor
// `onlineRoom` in App.js persist across a reload, so a fresh load always
// lands back on the home screen rather than auto-rejoining the same room.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('Erreur capturée par ErrorBoundary:', error, info);
  }
  render() {
    if (this.state.error) {
      return h('div', {style:{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24, background:'#111'}},
        h('div', {style:{maxWidth:360, textAlign:'center'}},
          h('div', {style:{fontSize:40, marginBottom:16}}, '⚠️'),
          h('h2', {style:{color:'#eee', fontSize:18, marginBottom:10}}, 'Un problème est survenu'),
          h('p', {style:{color:'#888', fontSize:13, marginBottom:20}}, "L'application a rencontré une erreur inattendue. Recharge la page pour repartir de zéro."),
          h('button', {
            onClick:()=>window.location.reload(),
            style:{background:'rgba(79,163,255,.15)', border:'1px solid rgba(79,163,255,.4)', borderRadius:8, color:'#9cf', padding:'10px 20px', fontSize:14}
          }, 'Recharger la page')
        )
      );
    }
    return this.props.children;
  }
}
