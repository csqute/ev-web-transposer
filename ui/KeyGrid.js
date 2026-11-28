import{html as c,haptic as i}from"./components.js";import{NOTE_LABELS as l,isBlack as d,wrapIndex as p}from"../core/midi/notes.js";function b({offset:o,onSelect:r}){const s=p(o);return c`
    <div class="key-grid">
      ${l.map((n,t)=>{const e=t===s,a=d(t);return c`
          <button
            type="button"
            class=${`key-button${a?" black":" white"}${e?" selected":""}`}
            aria-pressed=${e}
            onClick=${()=>{i(),r(t)}}
          >${n}</button>
        `})}
    </div>
  `}export{b as KeyGrid};
