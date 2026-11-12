import { html, StatusDot } from "./components.js";
import { midi } from "../app/store.js";
import { connectionText } from "../core/midi/engine.js";

/** Connection state only; template/reconnect actions live in Settings. */
export function ConnectionInline() {
  const state = midi.value;
  const connected = state.devices.some((device) => device.sendable || device.echoable);
  return html`
    <div class="connection-inline">
      <${StatusDot} active=${connected} danger=${!connected} />
      <span class="connection-text" title=${connectionText(state)}>${connectionText(state)}</span>
    </div>
  `;
}
