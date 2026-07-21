import { h } from "../react.js";

export function AddBtn({onClick}) {
  return h('div', {className:'add-btn', onClick},
    h('div', {className:'add-circle'}, '+')
  );
}
