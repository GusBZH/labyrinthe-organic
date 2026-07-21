import { h, Fragment, useState, useEffect, useRef } from "./react.js";

export function uid(){ return Math.random().toString(36).slice(2); }

export function renderText(text){
  if(!text) return null;
  const parts = text.split('\n\n');
  const out = [];
  parts.forEach((p,i)=>{
    out.push(h('span',{key:'t'+i,style:{whiteSpace:'pre-wrap'}},p));
    if(i < parts.length-1) out.push(h('hr',{key:'s'+i,className:'sep'}));
  });
  return h(Fragment,null,...out);
}

export function editBgStyle(editMode){
  return editMode
    ? {background:'repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(255,255,255,.04) 27px,rgba(255,255,255,.04) 28px),repeating-linear-gradient(90deg,transparent,transparent 27px,rgba(255,255,255,.04) 27px,rgba(255,255,255,.04) 28px),#1a1a1a'}
    : {background:'#0e0e0e'};
}

// Returns a CSS class ('gridflash-in' / 'gridflash-out' / '') to put on the
// same element that has editBgStyle's grid background, so the glow overlay
// (a ::after pseudo-element, see index.html) is pixel-aligned with it and
// scrolls together with it. Always alternates class value on every real
// editMode flip, so rapid toggling can never get the flash stuck off.
export function useEditFlash(editMode){
  const [cls, setCls] = useState('');
  const wasEdit = useRef(editMode);
  const timer = useRef(null);

  useEffect(() => {
    if (editMode !== wasEdit.current) {
      wasEdit.current = editMode;
      clearTimeout(timer.current);
      setCls(editMode ? 'gridflash-in' : 'gridflash-out');
      timer.current = setTimeout(() => setCls(''), 500);
    }
  }, [editMode]);

  useEffect(() => () => clearTimeout(timer.current), []);
  return cls;
}
