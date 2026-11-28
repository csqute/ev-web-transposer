import{html as i,haptic as n}from"./components.js";function p({step:a,onTranspose:t,onStepChange:l}){const s=c=>{const o=Math.max(1,Math.min(12,c));o!==a&&l(o)};return i`
    <div class="control-bar">
      <div class="control-group transpose-group">
        <button
          type="button"
          class="action-btn action-transpose"
          aria-label="移调减"
          onClick=${()=>{n(),t(-a)}}
        >
          <span class="action-label">移调</span>
          <span class="action-symbol">−</span>
        </button>
        <button
          type="button"
          class="action-btn action-transpose"
          aria-label="移调加"
          onClick=${()=>{n(),t(a)}}
        >
          <span class="action-label">移调</span>
          <span class="action-symbol">＋</span>
        </button>
      </div>

      <div class="control-group step-group">
        <button
          type="button"
          class="action-btn action-step"
          aria-label="步值减"
          onClick=${()=>{n(),s(a-1)}}
        >
          <span class="action-label">步值</span>
          <span class="action-symbol">−</span>
        </button>
        <div class="step-badge" aria-label=${`\u6B65\u503C ${a}`}>${a}</div>
        <button
          type="button"
          class="action-btn action-step"
          aria-label="步值加"
          onClick=${()=>{n(),s(a+1)}}
        >
          <span class="action-label">步值</span>
          <span class="action-symbol">＋</span>
        </button>
      </div>
    </div>
  `}export{p as MainControlBar};
