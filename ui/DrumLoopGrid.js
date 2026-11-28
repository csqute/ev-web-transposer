import{useRef as S}from"preact/hooks";import{html as d,haptic as k}from"./components.js";import{padAccentClass as _}from"./DrumPad.js";import{DRUM_STEP_COUNT as f,DRUM_STEPS_PER_BEAT as $,chineseFor as g,hasStep as O,stepMask as T,withStepSet as R}from"../core/drums/model.js";import{drums as h}from"../app/store.js";const U=3;function q({state:i,playing:m,playhead:b,onPreview:P,onCommit:X}){const u=S(null),a=S(null),C=(t,r)=>{const e=document.elementFromPoint(t,r),n=e&&e.closest?e.closest("[data-step-cell]"):null;if(!n||!u.current||!u.current.contains(n))return null;const o=Number(n.dataset.row),c=Number(n.dataset.step);return!Number.isInteger(o)||!Number.isInteger(c)?null:{row:o,step:c,key:o*f+c}},D=(t,r)=>{const e=a.current;if(!e)return;const n=C(t,r);if(!n||e.applied.has(n.key))return;const o=h.value.padOrder[n.row];if(!o)return;e.applied.add(n.key);const c=R(h.value,o,n.step,e.targetOn);P(c,null)},Y=(t,r,e,n)=>{if(!a.current)return;const o=e-t,c=n-r,l=Math.sqrt(o*o+c*c),s=Math.max(1,Math.min(400,Math.ceil(l/U)));for(let p=1;p<=s;p+=1){const M=p/s;D(t+o*M,r+c*M)}},A=(t,r,e)=>{var s;if(t.button!==void 0&&t.button!==0||a.current)return;t.preventDefault();const n=h.value,o=n.padOrder[r];if(!o)return;const c=!O(n,o,e),l=R(n,o,e,c);a.current={targetOn:c,applied:new Set([r*f+e]),lastX:t.clientX,lastY:t.clientY};try{(s=u.current)==null||s.setPointerCapture(t.pointerId)}catch{}k(18),P(l,c&&!m?o:null)},E=t=>{const r=a.current;r&&(t.preventDefault(),Y(r.lastX,r.lastY,t.clientX,t.clientY),r.lastX=t.clientX,r.lastY=t.clientY)},v=t=>{var r;if(a.current){a.current=null;try{(r=u.current)==null||r.releasePointerCapture(t.pointerId)}catch{}X()}},N=i.padOrder,w=Array.from({length:f},(t,r)=>r);return d`
    <div
      class="loop-grid"
      ref=${u}
      onPointerMove=${E}
      onPointerUp=${v}
      onPointerCancel=${v}
    >
      <div class="loop-head">
        <span class="loop-row-label"></span>
        ${w.map(t=>d`
          <span
            class=${`loop-step-head${t%$===0?" beat":""}${m&&b===t?" current":""}${t%$===0&&t>0?" beat-gap":""}`}
          >${t+1}</span>
        `)}
      </div>
      <div class="loop-rows">
        ${N.map((t,r)=>{const e=T(i,t)!==0;return d`
            <div class="loop-row">
              <span
                class=${`loop-row-label ${_(t)}${e?" active":""}`}
                title=${g(i,t)}
              >${g(i,t)}</span>
              ${w.map(n=>{const o=O(i,t,n),c=m&&b===n,l=n%$===0;return d`
                  <div
                    class=${`loop-cell ${_(t)}${o?" active":""}${c?" current":""}${l?" beat":""}${l&&n>0?" beat-gap":""}`}
                    data-step-cell="true"
                    data-row=${r}
                    data-step=${n}
                    onPointerDown=${s=>A(s,r,n)}
                  ></div>
                `})}
            </div>
          `})}
      </div>
    </div>
  `}export{q as DrumLoopGrid};
