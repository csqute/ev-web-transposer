import{useRef as b,useState as k}from"preact/hooks";import{html as v,haptic as C}from"./components.js";const u=24;function x(e){const a=e.offsetHeight;return a>0?e.getBoundingClientRect().height/a:1}function y(e){return u*x(e)}function P(e,a){const s=e.getBoundingClientRect(),c=y(e),d=Math.max(1,s.height-c),i=Math.max(0,Math.min(127,a))/127;return s.bottom-c/2-i*d}function R(e,a){const s=e.getBoundingClientRect(),c=y(e),d=Math.max(1,s.height-c),i=Math.max(s.top+c/2,Math.min(s.bottom-c/2,a)),l=(s.bottom-c/2-i)/d;return Math.max(0,Math.min(127,Math.round(l*127)))}function O({value:e,muted:a=!1,disabled:s=!1,onVolume:c,onToggleMute:d}){const i=b(null),l=b(null),[p,f]=k(null),g=Math.max(0,Math.min(127,e))/127,M=n=>{if(s||n.button!==void 0&&n.button!==0)return;const t=i.current;if(!t)return;n.preventDefault(),C(20);const r=P(t,e),o=Math.abs(n.clientY-r)<=16,m=e;l.current={pointerId:n.pointerId,start:m,last:e,dragging:o,waiting:!o,grabOffset:o?n.clientY-r:0,savedCenter:r,approach:Math.sign(n.clientY-r)||1},f({waiting:!o,pointerY:n.clientY});try{t.setPointerCapture(n.pointerId)}catch{}},Y=n=>{const t=l.current,r=i.current;if(!t||!r||n.pointerId!==t.pointerId)return;if(n.preventDefault(),t.waiting)if(t.approach>0?n.clientY>=t.savedCenter:n.clientY<=t.savedCenter)t.waiting=!1,t.dragging=!0,t.grabOffset=0;else{f({waiting:!0,pointerY:n.clientY});return}const o=R(r,n.clientY-t.grabOffset);if(t.last=o,f({waiting:!1,pointerY:n.clientY}),c(o,!1,t.start)===!1){t.dragging=!1,t.waiting=!1,f(null);try{r.releasePointerCapture(t.pointerId)}catch{}l.current=null}},h=n=>{const t=l.current,r=i.current;if(!(!t||!r||n&&n.pointerId!==t.pointerId)){try{r.releasePointerCapture(t.pointerId)}catch{}t.dragging&&t.last!==t.start&&c(t.last,!0,t.start),l.current=null,f(null)}},$=`calc((100% - ${u}px) * ${g})`,w=`calc(12px + (100% - ${u}px) * ${g})`;return v`
    <div class=${`mixer-fader${a?" muted":""}`}>
      <div
        class="fader-track"
        ref=${i}
        onPointerDown=${M}
        onPointerMove=${Y}
        onPointerUp=${n=>h(n)}
        onPointerCancel=${n=>h(n)}
      >
        <div class="fader-rail"></div>
        <div class="fader-fill" style=${{height:w}}></div>
        <div class="fader-tick" style=${{bottom:"0%"}}></div>
        <div class="fader-tick" style=${{bottom:"25%"}}></div>
        <div class="fader-tick" style=${{bottom:"50%"}}></div>
        <div class="fader-tick" style=${{bottom:"75%"}}></div>
        <div class="fader-tick" style=${{bottom:"100%"}}></div>
        <div class="fader-cap" style=${{bottom:$}}>
          <span class="fader-grip"></span>
          <span class="fader-grip"></span>
          <span class="fader-grip"></span>
        </div>
        ${p?v`
          <div class=${`fader-ring${p.waiting?" waiting":""}`} style=${{bottom:$}}></div>
          <div
            class="fader-finger"
            style=${{top:i.current?`${(p.pointerY-i.current.getBoundingClientRect().top)/x(i.current)}px`:"0px"}}
          ></div>
        `:null}
      </div>
      <button
        type="button"
        class=${`mute-pill${a?" off":""}`}
        onClick=${()=>{C(),d()}}
      >${a?"OFF":"ON"}</button>
    </div>
  `}export{O as Fader};
