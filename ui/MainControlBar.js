import { html, haptic } from "./components.js";

export function MainControlBar({ step, onTranspose, onStepChange }) {
  const changeStep = (next) => {
    const clamped = Math.max(1, Math.min(12, next));
    if (clamped !== step) onStepChange(clamped);
  };

  return html`
    <div class="control-bar">
      <div class="control-group transpose-group">
        <button
          type="button"
          class="action-btn action-transpose"
          aria-label="移调减"
          onClick=${() => {
            haptic();
            onTranspose(-step);
          }}
        >
          <span class="action-label">移调</span>
          <span class="action-symbol">−</span>
        </button>
        <button
          type="button"
          class="action-btn action-transpose"
          aria-label="移调加"
          onClick=${() => {
            haptic();
            onTranspose(step);
          }}
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
          onClick=${() => {
            haptic();
            changeStep(step - 1);
          }}
        >
          <span class="action-label">步值</span>
          <span class="action-symbol">−</span>
        </button>
        <div class="step-badge" aria-label=${`步值 ${step}`}>${step}</div>
        <button
          type="button"
          class="action-btn action-step"
          aria-label="步值加"
          onClick=${() => {
            haptic();
            changeStep(step + 1);
          }}
        >
          <span class="action-label">步值</span>
          <span class="action-symbol">＋</span>
        </button>
      </div>
    </div>
  `;
}
