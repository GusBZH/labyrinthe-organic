import { h, Fragment } from "./react.js";

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
