import { html, haptic } from "./components.js";
import { NOTE_LABELS, isBlack, wrapIndex } from "../core/midi/notes.js";

export function KeyGrid({ offset, onSelect }) {
  const selectedIndex = wrapIndex(offset);
  return html`
    <div class="key-grid">
      ${NOTE_LABELS.map((label, index) => {
        const selected = index === selectedIndex;
        const black = isBlack(index);
        return html`
          <button
            type="button"
            class=${`key-button${black ? " black" : " white"}${selected ? " selected" : ""}`}
            aria-pressed=${selected}
            onClick=${() => {
              haptic();
              onSelect(index);
            }}
          >${label}</button>
        `;
      })}
    </div>
  `;
}
