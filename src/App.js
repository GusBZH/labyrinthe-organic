import { h, useState, useEffect, useRef, useCallback } from "./react.js";
import { ghGet, ghPut } from "./github.js";
import { INIT } from "./data/initialData.js";
import { SoireePage } from "./pages/SoireePage.js";
import { IdeeVracPage } from "./pages/IdeeVracPage.js";
import { HomePage } from "./pages/HomePage.js";

export function App() {
  const [data, setData] = useState(null);
  const [sha, setSha] = useState(null);
  const [token, setToken] = useState(() => { try { return localStorage.getItem('gh_token')||''; } catch { return ''; } });
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [page, setPage] = useState('home');
  const saveTimer = useRef(null);
  const shaRef = useRef(null);

  useEffect(() => { shaRef.current = sha; }, [sha]);

  useEffect(() => {
    if (!token) return;
    setLoading(true); setSaveErr(null);
    ghGet(token).then(({data:d, sha:s}) => {
      setData(d || INIT); setSha(s); shaRef.current = s; setLoading(false);
    }).catch(() => {
      setData(INIT); setLoading(false);
      setSaveErr('Mode local — GitHub non disponible');
    });
  }, [token]);

  const save = useCallback((nd) => {
    if (!token) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true); setSaveErr(null);
      try { const s = await ghPut(token, nd, shaRef.current); setSha(s); shaRef.current = s; }
      catch(e) { setSaveErr('Sauvegarde échouée'); }
      setSaving(false);
    }, 2000);
  }, [token]);

  const upd = useCallback((nd) => { setData(nd); save(nd); }, [save]);
  const updArr = (key, item) => upd({...data, [key]: data[key].map(i => i.id === item.id ? item : i)});
  const delArr = (key, id) => upd({...data, [key]: data[key].filter(i => i.id !== id)});
  const addArr = (key, item) => upd({...data, [key]: [...data[key], item]});

  // TOKEN SCREEN
  if (!data && !loading) {
    return h('div', {style:{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24}},
      h('div', {style:{maxWidth:340, width:'100%', textAlign:'center'}},
        h('div', {style:{fontSize:40, marginBottom:16}}, '🎲'),
        h('h1', {style:{color:'#eee', fontSize:20, marginBottom:8}}, 'Labyrinthe Organic'),
        h('p', {style:{color:'#666', fontSize:13, marginBottom:20}}, 'Entre ton token GitHub, ou continue sans token.'),
        h('input', {
          type:'password', value:tokenInput, autoFocus:true,
          onChange:e=>setTokenInput(e.target.value),
          onKeyDown:e=>{ if(e.key==='Enter'&&tokenInput){try{localStorage.setItem('gh_token',tokenInput);}catch{}setToken(tokenInput);} },
          placeholder:'ghp_...',
          style:{width:'100%', background:'rgba(255,255,255,.05)', border:'1px solid #333', borderRadius:8, color:'#eee', padding:'10px 14px', fontSize:14, boxSizing:'border-box', marginBottom:10}
        }),
        h('button', {
          onClick:()=>{ if(tokenInput){try{localStorage.setItem('gh_token',tokenInput);}catch{}setToken(tokenInput);} },
          style:{width:'100%', background:'#222', border:'1px solid #444', borderRadius:8, color:'#eee', padding:'10px 14px', fontSize:14, marginBottom:8}
        }, 'Connexion GitHub'),
        h('button', {
          onClick:()=>setData(INIT),
          style:{width:'100%', background:'none', border:'1px solid #2a2a2a', borderRadius:8, color:'#666', padding:'8px 14px', fontSize:12}
        }, 'Continuer sans token (mode local)')
      )
    );
  }

  if (loading) return h('div', {style:{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#555'}}, 'Chargement...');
  if (!data) return null;

  // PAGES
  if (page === 'soirees') return h(SoireePage, {
    soirees:data.soireesProto, editMode, setEditMode, onBack:()=>setPage('home'),
    onUpdate:s=>updArr('soireesProto',s),
    onAdd:s=>addArr('soireesProto',s),
    onDelete:id=>delArr('soireesProto',id)
  });

  if (page === 'idees') return h(IdeeVracPage, {value:data.ideeEnVrac, onChange:v=>upd({...data,ideeEnVrac:v}), editMode, setEditMode, onBack:()=>setPage('home')});

  return h(HomePage, {
    data, editMode, setEditMode, saving, saveErr,
    upd, updArr, delArr, addArr, setPage,
    onLogout: () => { try{localStorage.removeItem('gh_token');}catch{} setToken(''); setData(null); }
  });
}
