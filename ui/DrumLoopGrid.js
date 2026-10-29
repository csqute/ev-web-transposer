import { useRef } from "preact/hooks";
import { html, haptic } from "./components.js";
import { padAccentClass } from "./DrumPad.js";
import {
  DRUM_STEP_COUNT,
  DRUM_STEPS_PER_BEAT,
  chineseFor,
  hasStep,
  stepMask,
  withStepSet
} from "../core/drums/model.js";
import { drums } from "../app/store.js";

const SAMPLE_PX = 3;

export function DrumLoopGrid({ state, playing, playhead, onPreview, onCommit }) {
  const gridRef = useRef(null);
  const paintRef = useRef(null);

  const cellFromPoint = (x, y) => {
    const element = document.elementFromPoint(x, y);
    const cell = element && element.closest ? element.closest("[data-step-cell]") : null;
    if (!cell || !gridRef.current || !gridRef.current.contains(cell)) return null;
    const row = Number(cell.dataset.row);
    const step = Number(cell.dataset.step);
    if (!Number.isInteger(row) || !Number.isInteger(step)) return null;
    return { row, step, key: row * DRUM_STEP_COUNT + step };
  };

  const paintAt = (x, y) => {
    const paint = paintRef.current;
    if (!paint) return;
    const hit = cellFromPoint(x, y);
    if (!hit || paint.applied.has(hit.key)) return;
    const padId = drums.value.padOrder[hit.row];
    if (!padId) return;
    paint.applied.add(hit.key);
    const next = withStepSet(drums.value, padId, hit.step, paint.targetOn);
    onPreview(next, null);
  };

  const paintLine = (x1, y1, x2, y2) => {
    if (!paintRef.current) return;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const samples = Math.max(1, Math.min(400, Math.ceil(distance / SAMPLE_PX)));
    for (let i = 1; i <= samples; i += 1) {
      const t = i / samples;
      paintAt(x1 + dx * t, y1 + dy * t);
    }
  };

  const beginCell = (event, rowIndex, step) => {
    if (event.button !== undefined && event.button !== 0) return;
    if (paintRef.current) return;
    event.preventDefault();
    const current = drums.value;
    const padId = current.padOrder[rowIndex];
    if (!padId) return;
    const targetOn = !hasStep(current, padId, step);
    const next = withStepSet(current, padId, step, targetOn);
    paintRef.current = {
      targetOn,
      applied: new Set([rowIndex * DRUM_STEP_COUNT + step]),
      lastX: event.clientX,
      lastY: event.clientY
    };
    try {
      gridRef.current?.setPointerCapture(event.pointerId);
    } catch (_) {}
    haptic(18);
    onPreview(next, targetOn && !playing ? padId : null);
  };

  const moveOnGrid = (event) => {
    const paint = paintRef.current;
    if (!paint) return;
    event.preventDefault();
    paintLine(paint.lastX, paint.lastY, event.clientX, event.clientY);
    paint.lastX = event.clientX;
    paint.lastY = event.clientY;
  };

  const endPaint = (event) => {
    if (!paintRef.current) return;
    paintRef.current = null;
    try {
      gridRef.current?.releasePointerCapture(event.pointerId);
    } catch (_) {}
    onCommit();
  };

  const rows = state.padOrder;
  const steps = Array.from({ length: DRUM_STEP_COUNT }, (_, index) => index);

  return html`
    <div
      class="loop-grid"
      ref=${gridRef}
      onPointerMove=${moveOnGrid}
      onPointerUp=${endPaint}
      onPointerCancel=${endPaint}
    >
      <div class="loop-head">
        <span class="loop-row-label"></span>
        ${steps.map((step) => html`
          <span
            class=${`loop-step-head${step % DRUM_STEPS_PER_BEAT === 0 ? " beat" : ""}${playing && playhead === step ? " current" : ""}${step % DRUM_STEPS_PER_BEAT === 0 && step > 0 ? " beat-gap" : ""}`}
          >${step + 1}</span>
        `)}
      </div>
      <div class="loop-rows">
        ${rows.map((padId, rowIndex) => {
          const activeRow = stepMask(state, padId) !== 0;
          return html`
            <div class="loop-row">
              <span
                class=${`loop-row-label ${padAccentClass(padId)}${activeRow ? " active" : ""}`}
                title=${chineseFor(state, padId)}
              >${chineseFor(state, padId)}</span>
              ${steps.map((step) => {
                const active = hasStep(state, padId, step);
                const current = playing && playhead === step;
                const beatStart = step % DRUM_STEPS_PER_BEAT === 0;
                return html`
                  <div
                    class=${`loop-cell ${padAccentClass(padId)}${active ? " active" : ""}${current ? " current" : ""}${beatStart ? " beat" : ""}${beatStart && step > 0 ? " beat-gap" : ""}`}
                    data-step-cell="true"
                    data-row=${rowIndex}
                    data-step=${step}
                    onPointerDown=${(event) => beginCell(event, rowIndex, step)}
                  ></div>
                `;
              })}
            </div>
          `;
        })}
      </div>
    </div>
  `;
}
