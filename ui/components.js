import{h as f}from"preact";import{useEffect as u,useLayoutEffect as v,useRef as d}from"preact/hooks";import b from"htm";const s=b.bind(f),g=400;function p(){const e=d(null);return v(()=>{const t=e.current,n=t==null?void 0:t.closest(".workspace-pane");if(!t||!n)return;n.classList.add("pane-dialog-open");let a=0;const r=()=>{cancelAnimationFrame(a),a=requestAnimationFrame(()=>{n.isConnected&&!n.querySelector(".dialog-overlay")&&n.classList.remove("pane-dialog-open")})};if(n.getBoundingClientRect().width<g)return r;let o=0;const i=()=>{cancelAnimationFrame(o),o=requestAnimationFrame(()=>{if(!t.isConnected)return;const c=n.getBoundingClientRect();t.classList.add("pane-scoped"),t.style.left=`${c.left}px`,t.style.top=`${c.top}px`,t.style.width=`${c.width}px`,t.style.height=`${c.height}px`,t.style.right="auto",t.style.bottom="auto"})};i(),window.addEventListener("resize",i),window.addEventListener("scroll",i,!0);const l=typeof ResizeObserver!="undefined"?new ResizeObserver(i):null;return l==null||l.observe(n),()=>{cancelAnimationFrame(o),window.removeEventListener("resize",i),window.removeEventListener("scroll",i,!0),l==null||l.disconnect(),r()}},[]),e}function h(e=40){try{navigator.vibrate&&navigator.vibrate(e)}catch{}}function x({label:e,onClick:t,active:n=!1,disabled:a=!1,title:r="",className:o=""}){return s`
    <button
      type="button"
      class=${`small-btn${n?" active":""}${o?` ${o}`:""}`}
      onClick=${t}
      disabled=${a}
      title=${r||e}
    >${e}</button>
  `}function $(e,t=!1){const n=d(0),a=r=>{t||(n.current=performance.now(),e==null||e(r))};return{onPointerDown:r=>{t||r.pointerType==="mouse"&&r.button!==0||(r.preventDefault(),a(r))},onClick:r=>{t||performance.now()-n.current<700||a(r)}}}function k({label:e,active:t=!1,disabled:n=!1,onClick:a,className:r=""}){const o=$(a,n);return s`
    <button
      type="button"
      class=${`small-btn${t?" active":""}${r?` ${r}`:""}`}
      disabled=${n}
      title=${e}
      ...${o}
    >${e}</button>
  `}function E({label:e,title:t,disabled:n=!1,onClick:a,className:r="",children:o}){const i=$(a,n);return s`
    <button
      type="button"
      class=${`icon-btn${r?` ${r}`:""}`}
      title=${t||e}
      aria-label=${e}
      disabled=${n}
      ...${i}
    >${o}</button>
  `}function L({title:e,onClose:t,children:n,wide:a=!1,headerAction:r=null}){const o=p();return u(()=>{const i=l=>{l.key==="Escape"&&t&&t()};return window.addEventListener("keydown",i),()=>window.removeEventListener("keydown",i)},[t]),s`
    <div
      ref=${o}
      class="dialog-overlay"
      onPointerDown=${i=>{i.target===i.currentTarget&&t&&t()}}
    >
      <div class=${`app-dialog${a?" wide":""}`} role="dialog" aria-modal="true" aria-label=${e}>
        <div class="dialog-head">
          <h2>${e}</h2>
          <div class="dialog-head-actions">
            ${r}
            <button type="button" class="dialog-close" onClick=${t}>关闭</button>
          </div>
        </div>
        <div class="dialog-content">${n}</div>
      </div>
    </div>
  `}function D({title:e,message:t,children:n,actions:a=[],onClose:r=null}){const o=p();return u(()=>{if(!r)return;const i=l=>{l.key==="Escape"&&r()};return window.addEventListener("keydown",i),()=>window.removeEventListener("keydown",i)},[r]),s`
    <div ref=${o} class="dialog-overlay">
      <div class="alert-dialog" role="alertdialog" aria-modal="true" aria-label=${e}>
        <h2>${e}</h2>
        ${t?s`<p class="alert-message">${t}</p>`:null}
        ${n}
        <div class="alert-actions">
          ${a.map(i=>s`
            <button
              type="button"
              class=${`dialog-action${i.primary?" primary":""}${i.danger?" danger":""}`}
              onClick=${i.onClick}
            >${i.label}</button>
          `)}
        </div>
      </div>
    </div>
  `}function A({title:e,hint:t="",children:n}){return s`
    <section class="settings-section">
      <h3>${e}</h3>
      ${t?s`<p class="hint">${t}</p>`:null}
      <div class="section-body">${n}</div>
    </section>
  `}function R({label:e,selected:t=!1,onClick:n,title:a=""}){return s`
    <button
      type="button"
      class=${`chip${t?" selected":""}`}
      onClick=${n}
      title=${a||e}
    >${e}</button>
  `}function S({label:e,value:t,min:n,max:a,onChange:r,suffix:o="",inline:i=!1}){const l=c=>Math.max(n,Math.min(a,c));return s`
    <div class=${`stepper-row${i?" inline":""}`}>
      <span class="stepper-label">${e}</span>
      <div class="stepper">
        <button type="button" class="stepper-btn" disabled=${t<=n} onClick=${()=>r(l(t-1))}>−</button>
        <span class="stepper-value">${t}${o}</span>
        <button type="button" class="stepper-btn" disabled=${t>=a} onClick=${()=>r(l(t+1))}>＋</button>
      </div>
    </div>
  `}function T({label:e,checked:t,onChange:n}){return s`
    <label class="switch-row">
      <span>${e}</span>
      <input
        type="checkbox"
        checked=${t}
        onChange=${a=>n(a.currentTarget.checked)}
      />
      <span class="switch-track" aria-hidden="true"></span>
    </label>
  `}function B({label:e,value:t,min:n,max:a,onChange:r,suffix:o=""}){return s`
    <label class="slider-row">
      <span class="slider-label">${e}</span>
      <input
        type="range"
        min=${n}
        max=${a}
        value=${t}
        onInput=${i=>r(Number(i.currentTarget.value))}
      />
      <span class="slider-value">${t}${o}</span>
    </label>
  `}function F({active:e=!1,danger:t=!1}){return s`<span class=${`status-dot${e?" active":""}${t?" danger":""}`}></span>`}function P({lines:e=[],empty:t="\u6682\u65E0\u65E5\u5FD7"}){return e.length?s`
    <div class="log-view" aria-live="polite">
      ${e.map(n=>s`
        <div class=${`log-line ${n.kind||"info"}`}>
          <span class="log-time">${n.time}</span>
          <span class="log-text">${n.text}</span>
        </div>
      `)}
    </div>
  `:s`<div class="log-view empty">${t}</div>`}function z({toast:e}){return e?s`<div class="toast" role="status" aria-live="polite">${e.message}</div>`:null}function I({children:e}){return s`<p class="hint">${e}</p>`}function O(){return s`<div class="divider"></div>`}export{D as AlertDialog,L as AppDialog,k as BarButton,E as BarIconButton,R as Chip,O as Divider,I as Hint,P as LogView,A as Section,B as Slider,x as SmallButton,F as StatusDot,S as Stepper,z as Toast,T as Toggle,h as haptic,s as html};
