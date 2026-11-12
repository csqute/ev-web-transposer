import { useState } from "preact/hooks";
import {
  html,
  AppDialog,
  SmallButton,
  AlertDialog,
  Hint
} from "../ui/components.js";
import {
  closeDialog,
  deletePreset,
  hasUses,
  midi,
  openDialog,
  presets,
  savePreset,
  settings,
  showToast,
  updatePreset,
  updateSettings
} from "../app/store.js";
import { isConnected, sendTranspose } from "../core/midi/engine.js";
import { noteLabel, signedOffset } from "../core/midi/notes.js";
import { PROTOCOL_LABELS } from "../core/midi/protocols.js";

export function PresetDialog() {
  const [name, setName] = useState("");
  const [renamingId, setRenamingId] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [deleteId, setDeleteId] = useState("");
  const list = presets.value;
  const target = midi.value.devices.find((device) => device.sendable);

  const saveCurrent = () => {
    const value = name.trim() || `预设 ${list.length + 1}`;
    savePreset({
      name: value,
      offset: settings.value.offset,
      step: settings.value.step,
      protocol: settings.value.protocolMode,
      midiChannel: settings.value.midiChannel,
      deviceModel: target?.modelKey || ""
    });
    setName("");
    showToast(`已保存：${value}`);
  };

  const apply = (preset) => {
    updateSettings({
      offset: preset.offset,
      step: preset.step,
      protocolMode: preset.protocol,
      midiChannel: preset.midiChannel
    });
    if (isConnected() && !hasUses(1)) {
      openDialog("paywall");
      return;
    }
    sendTranspose(preset.offset, { consume: true, reason: "预设" }).catch(() => {});
    showToast(`已应用：${preset.name}`);
  };

  const startRename = (preset) => {
    setRenamingId(preset.id);
    setRenameValue(preset.name);
  };

  const saveRename = () => {
    const value = renameValue.trim();
    if (value) updatePreset(renamingId, { name: value });
    setRenamingId("");
  };

  const deleting = list.find((preset) => preset.id === deleteId) || null;

  return html`
    <${AppDialog} title="预设" onClose=${closeDialog}>
      <div class="preset-form">
        <label class="field-label">新预设名称</label>
        <div class="preset-save-row">
          <input
            class="learn-input"
            value=${name}
            onInput=${(event) => setName(event.currentTarget.value)}
            placeholder=${`预设 ${list.length + 1}`}
            maxlength="24"
          />
          <button type="button" class="primary-btn" onClick=${saveCurrent}>保存当前</button>
        </div>
        <${Hint}>保存当前移调、步值、默认协议和 MIDI 通道。应用预设会发送一次移调并扣 1 次。</${Hint}>
      </div>

      <div class="preset-list">
        ${list.length === 0 ? html`<p class="hint">还没有预设。</p>` : null}
        ${list.map((preset) => html`
          <div class="preset-row">
            <div class="preset-main">
              <div class="preset-name">${preset.name}</div>
              <div class="preset-meta">
                ${signedOffset(preset.offset)}（${noteLabel(preset.offset)}） ·
                步值 ${preset.step} · ${PROTOCOL_LABELS[preset.protocol] || preset.protocol}
              </div>
              ${renamingId === preset.id
                ? html`
                  <div class="preset-rename">
                    <input
                      class="learn-input"
                      value=${renameValue}
                      onInput=${(event) => setRenameValue(event.currentTarget.value)}
                      maxlength="24"
                    />
                    <${SmallButton} label="保存" onClick=${saveRename} />
                    <${SmallButton} label="取消" onClick=${() => setRenamingId("")} />
                  </div>
                `
                : null}
            </div>
            <div class="preset-actions">
              <button type="button" class="dialog-action primary" onClick=${() => apply(preset)}>应用</button>
              <${SmallButton} label="改名" onClick=${() => startRename(preset)} />
              <${SmallButton} label="删除" onClick=${() => setDeleteId(preset.id)} />
            </div>
          </div>
        `)}
      </div>

      ${deleting ? html`
        <${AlertDialog}
          title="删除预设"
          message=${`确定删除「${deleting.name}」？`}
          actions=${[
            { label: "删除", danger: true, onClick: () => { deletePreset(deleting.id); setDeleteId(""); } },
            { label: "取消", onClick: () => setDeleteId("") }
          ]}
          onClose=${() => setDeleteId("")}
        />
      ` : null}
    <//>
  `;
}
