import { useEffect, useState } from "preact/hooks";
import { html, SmallButton, AppDialog, Chip, haptic } from "../ui/components.js";
import { Fader } from "../ui/Fader.js";
import { navigate } from "../app/router.js";
import {
  addLog,
  consumeUse,
  hasUses,
  license,
  midi,
  mixerChannels,
  mixerTargets,
  openDialog,
  previewMixerChannel,
  saveMixerChannels,
  saveMixerTargets,
  showToast,
  updateMixerChannel
} from "../app/store.js";
import {
  MIXER_CHANNELS,
  allMuted,
  channelsForTarget,
  resetChannels,
  styleAtMax
} from "../core/mixer/model.js";
import {
  currentMixerTargets,
  listForTarget,
  mixerDeviceLists,
  targetsFor
} from "../core/mixer/targets.js";
import { connectMidi, sendCcToDevices } from "../core/midi/engine.js";

const TARGET_LABEL = {
  MIDI: "普通 MIDI 琴",
  SX: "SX 回环琴"
};

const TARGET_DEFAULTS = {
  MIDI: "默认：1 / 2 / 3 / 4 / 10 / 11 / 9",
  SX: "默认：右1=1 / 右2=2 / 右3=3 / 左=4"
};

function belongsTo(definition, target) {
  return target === "SX" ? definition.group === "SX" : definition.group !== "SX";
}

function deviceLabel(device) {
  return device.duplicate ? `${device.displayName} #${device.ordinal}` : device.displayName;
}

function MixerConnectionChip({ count, onClick }) {
  return html`
    <button
      type="button"
      class=${`mixer-conn${count > 0 ? " on" : ""}`}
      title=${count > 0 ? `正在控制 ${count} 台琴` : "点按连接 MIDI 并重新扫描设备"}
      onClick=${onClick}
    >
      <span class="mixer-conn-dot"></span>
      ${count > 0 ? `受控 ${count} 台` : "未选择设备"}
    </button>
  `;
}

function MixerLegend({ target, channels }) {
  const keyboard = channels.filter((channel) => channel.definition.group === "KEYBOARD_SET").length;
  const style = channels.filter((channel) => channel.definition.group === "STYLE").length;
  return html`
    <div class="mixer-legend">
      ${target === "MIDI"
        ? html`
            <span class="legend-item"><span class="legend-dot accent"></span>组合音色 · ${keyboard} 个通道</span>
            <span class="legend-item"><span class="legend-dot accent-alt"></span>STYLE 伴奏 · ${style} 个通道</span>
          `
        : html`
            <span class="legend-item"><span class="legend-dot accent"></span>SX 声部 · ${channels.length} 个通道（左 / 右 1–3）</span>
          `}
      <span class="legend-spacer"></span>
      <span class="legend-hint">上下拖动推子 · 点按 ON/OFF 开关静音</span>
    </div>
  `;
}

function ChannelStepper({ value, onChange }) {
  return html`
    <div class="mixer-channel-stepper">
      <button
        type="button"
        class="stepper-btn"
        disabled=${value <= 0}
        onClick=${() => onChange(Math.max(0, value - 1))}
      >−</button>
      <span class="stepper-value">${value + 1}</span>
      <button
        type="button"
        class="stepper-btn"
        disabled=${value >= 15}
        onClick=${() => onChange(Math.min(15, value + 1))}
      >＋</button>
    </div>
  `;
}

function MixerSettingsDialog({
  target,
  lists,
  config,
  channels,
  onClose,
  onTargetChange,
  onDeviceToggle,
  onSelectAll,
  onClear,
  onChannelChange,
  onResetChannels
}) {
  const devices = listForTarget(lists, target);
  const all = target === "SX" ? config.sxAll : config.midiAll;
  const selected = target === "SX" ? config.sxKeys : config.midiKeys;
  const selectedCount = all
    ? devices.length
    : devices.filter((device) => selected.includes(device.key)).length;

  return html`
    <${AppDialog} title="调音台设置" onClose=${onClose}>
      <div class="mixer-settings">
        <h3 class="section-title">控制目标</h3>
        <div class="chip-row">
          <${Chip}
            label=${`普通 MIDI (${lists.midiDevices.length})`}
            selected=${target === "MIDI"}
            onClick=${() => onTargetChange("MIDI")}
          />
          <${Chip}
            label=${`SX 回环 (${lists.sxDevices.length})`}
            selected=${target === "SX"}
            onClick=${() => onTargetChange("SX")}
          />
        </div>
        <p class="hint">可同时控制多台琴；切换目标只影响调音台，不改变每台琴的演奏模式。</p>

        <div class="mixer-divider-line"></div>

        <div class="mixer-settings-row">
          <h3 class="section-title">控制设备</h3>
          <span class="settings-row-spacer"></span>
          <${Chip} label="全选" selected=${all} onClick=${onSelectAll} />
          <${Chip} label="清空" selected=${!all && selected.length === 0} onClick=${onClear} />
        </div>

        ${devices.length === 0
          ? html`
              <p class="hint">
                ${target === "MIDI"
                  ? "未连接普通 MIDI 琴。连接后在主界面选择移调模式，再回到这里。"
                  : "未连接 SX 回环琴。接好 USB TO HOST 并在主界面把该琴设为「回环模式（雅马哈SX）」。"}
              </p>
            `
          : html`
              <div class="mixer-device-list">
                ${devices.map((device) => {
                  const checked = all || selected.includes(device.key);
                  return html`
                    <${Chip}
                      label=${deviceLabel(device)}
                      selected=${checked}
                      title=${device.outputName || device.displayName}
                      onClick=${() => onDeviceToggle(device, !checked)}
                    />
                  `;
                })}
              </div>
            `}
        ${devices.length > 0
          ? html`
              <p class="hint">
                ${all
                  ? `当前控制全部 ${devices.length} 台琴。取消「全选」后可单独勾选。`
                  : `已选 ${selectedCount} 台琴。`}
              </p>
            `
          : null}

        <div class="mixer-divider-line"></div>

        <h3 class="section-title">通道映射</h3>
        <p class="hint">
          ${target === "MIDI"
            ? "每个推子发送 MIDI CC#7（Channel Volume）。KORG PA700 出厂默认的 MIDI IN 通道如下；如果你在琴上改过通道，请在这里改成一致。"
            : "SX 每路推子也发送 CC#7（Channel Volume）。默认按右手 1/2/3 = 通道 1/2/3、左手 = 通道 4；请与你琴上的 MIDI 设置保持一致。"}
        </p>

        <div class="mixer-channel-list">
          ${channels.map((channel) => html`
            <div class="mixer-channel-row">
              <span class=${`legend-dot ${channel.definition.group === "STYLE" ? "accent-alt" : "accent"}`}></span>
              <span class="mixer-channel-name">${channel.definition.full}</span>
              <span class="mixer-channel-sub">${channel.definition.subtitle}</span>
              <${ChannelStepper}
                value=${channel.channel}
                onChange=${(value) => onChannelChange(channel.definition.id, value)}
              />
            </div>
          `)}
        </div>

        <div class="mixer-settings-row mixer-reset-row">
          <${SmallButton}
            label=${target === "MIDI" ? "恢复 PA700 默认通道" : "恢复 SX 默认通道"}
            onClick=${onResetChannels}
          />
          <span class="settings-row-spacer"></span>
          <span class="hint">${TARGET_DEFAULTS[target]}</span>
        </div>

        <p class="hint mixer-settings-foot">
          ${target === "MIDI"
            ? "推子没有反应时：在琴上进入 Global › MIDI › MIDI IN Channels，确认 Drum、Percussion、Bass、Upper 1–3、Lower 对应到这里显示的通道；并确认 Global › MIDI › Filters 没有屏蔽 Control Change。"
            : "推子没有反应时：确认 SX 的右手 1/2/3 / 左手 MIDI 接收通道与这里一致；Local Control Off 只关闭琴键直接发声，不会阻止 CC#7 调音量。"}
        </p>
      </div>
    <//>
  `;
}

export function MixerScreen({ embedded = false }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const state = license.value;
  const config = mixerTargets.value;
  const target = config.target;
  const lists = mixerDeviceLists();
  const targets = targetsFor(config, target, lists);
  const channels = channelsForTarget(mixerChannels.value, target);
  const mutedAll = allMuted(mixerChannels.value, target);
  const balanceText = state.unlimited ? "无限制版" : `剩余 ${state.balance} 次`;
  const syncSignature = `${target}|${targets.map((device) => `${device.key}:${device.output?.port?.id || device.outputName}`).join("|")}`;

  // Opening the mixer first (before any transpose) should still find the
  // keyboards. MIDIWeb typically grants Web MIDI silently.
  useEffect(() => {
    if (midi.value.supported && midi.value.status !== "connected") {
      connectMidi().catch(() => {});
    }
  }, []);

  // Entering the page (or changing target/selection) mirrors the saved fader
  // values onto the instruments. Syncing is free, exactly like Android.
  useEffect(() => {
    if (!targets.length) return undefined;
    let disposed = false;
    const sync = async () => {
      const snapshot = channelsForTarget(mixerChannels.value, target);
      for (const channel of snapshot) {
        await sendCcToDevices(targets, channel.channel, 7, channel.muted ? 0 : channel.volume);
      }
      if (!disposed) {
        addLog(
          `调音台：已同步 ${TARGET_LABEL[target]} ${snapshot.length} 个通道 · ${targets.length} 台`,
          "muted"
        );
      }
    };
    sync().catch(() => {});
    return () => {
      disposed = true;
    };
  }, [syncSignature]);

  const changeTarget = (next) => {
    if (next === target) return;
    haptic();
    saveMixerTargets({ ...mixerTargets.value, target: next });
    addLog(`调音台：切换目标 → ${TARGET_LABEL[next]}`, "muted");
  };

  const toggleDevice = (device, checked) => {
    haptic();
    const cfg = mixerTargets.value;
    const current = target === "MIDI" ? cfg.midiKeys : cfg.sxKeys;
    const devices = listForTarget(mixerDeviceLists(), target);
    const allNow = target === "MIDI" ? cfg.midiAll : cfg.sxAll;
    const keys = new Set(allNow ? devices.map((item) => item.key) : current);
    if (checked) keys.add(device.key);
    else keys.delete(device.key);
    const nextAll = devices.length > 0 && devices.every((item) => keys.has(item.key));
    if (target === "MIDI") {
      saveMixerTargets({ ...cfg, midiAll: nextAll, midiKeys: [...keys] });
    } else {
      saveMixerTargets({ ...cfg, sxAll: nextAll, sxKeys: [...keys] });
    }
  };

  const selectAll = () => {
    haptic();
    const cfg = mixerTargets.value;
    saveMixerTargets(target === "MIDI" ? { ...cfg, midiAll: true } : { ...cfg, sxAll: true });
  };

  const clearDevices = () => {
    haptic();
    const cfg = mixerTargets.value;
    if (target === "MIDI") {
      saveMixerTargets({ ...cfg, midiAll: false, midiKeys: [] });
    } else {
      saveMixerTargets({ ...cfg, sxAll: false, sxKeys: [] });
    }
  };

  const changeChannel = (id, channel) => {
    haptic();
    const definition = MIXER_CHANNELS.find((item) => item.id === id);
    if (!definition || !belongsTo(definition, target)) return;
    const current = mixerChannels.value[id];
    if (!current) return;
    updateMixerChannel(id, { channel });
    const devices = currentMixerTargets();
    sendCcToDevices(devices, channel, 7, current.muted ? 0 : current.volume).catch(() => {});
    addLog(`调音台：${definition.full} → 通道 ${channel + 1}`, "muted");
  };

  const resetChannelsToDefault = () => {
    haptic();
    saveMixerChannels(resetChannels(mixerChannels.value, target));
    showToast(`${TARGET_LABEL[target]}已恢复默认通道`);
    addLog(`调音台：已恢复 ${TARGET_LABEL[target]} 默认通道`, "muted");
  };

  const finishFader = (id, start, devices) => {
    const channel = mixerChannels.value[id];
    saveMixerChannels(mixerChannels.value);
    if (!channel) return;
    // A muted fader sends no CC and is free; the Android charge here was a bug.
    if (devices.length > 0 && !channel.muted && channel.volume !== start) {
      consumeUse(1);
    }
  };

  const changeVolume = (id, value, commit, start) => {
    const cfg = mixerTargets.value;
    const definition = MIXER_CHANNELS.find((item) => item.id === id);
    if (!definition || !belongsTo(definition, cfg.target)) return false;
    const channel = mixerChannels.value[id];
    if (!channel) return false;
    const devices = currentMixerTargets(cfg);
    const clamped = Math.max(0, Math.min(127, value));

    if (!commit && clamped !== start && channel.volume === start
      && devices.length > 0 && !channel.muted && !hasUses(1)) {
      openDialog("paywall");
      return false;
    }

    if (channel.volume === clamped) {
      if (commit) finishFader(id, start, devices);
      return true;
    }

    // Preview only updates the signal; persistence happens on release.
    previewMixerChannel(id, { volume: clamped });
    if (!channel.muted) {
      sendCcToDevices(devices, channel.channel, 7, clamped).catch(() => {});
    }
    if (commit) finishFader(id, start, devices);
    return true;
  };

  const toggleMute = (id) => {
    const definition = MIXER_CHANNELS.find((item) => item.id === id);
    if (!definition || !belongsTo(definition, mixerTargets.value.target)) return;
    const channel = mixerChannels.value[id];
    if (!channel) return;
    const devices = currentMixerTargets();
    if (devices.length > 0 && !hasUses(1)) {
      openDialog("paywall");
      return;
    }
    const nextMuted = !channel.muted;
    updateMixerChannel(id, { muted: nextMuted });
    if (devices.length > 0) {
      sendCcToDevices(devices, channel.channel, 7, nextMuted ? 0 : channel.volume).catch(() => {});
      consumeUse(1);
    }
  };

  const toggleAllMute = () => {
    haptic();
    const cfg = mixerTargets.value;
    const mutedNow = allMuted(mixerChannels.value, cfg.target);
    const nextMuted = !mutedNow;
    const devices = currentMixerTargets(cfg);
    if (devices.length > 0 && !hasUses(1)) {
      openDialog("paywall");
      return;
    }
    const next = { ...mixerChannels.value };
    for (const definition of MIXER_CHANNELS) {
      if (belongsTo(definition, cfg.target)) {
        next[definition.id] = { ...next[definition.id], muted: nextMuted };
      }
    }
    saveMixerChannels(next);
    for (const channel of channelsForTarget(next, cfg.target)) {
      sendCcToDevices(
        devices,
        channel.channel,
        7,
        nextMuted ? 0 : channel.volume
      ).catch(() => {});
    }
    if (devices.length > 0) consumeUse(1);
    addLog(
      nextMuted
        ? `调音台：${TARGET_LABEL[cfg.target]} 全部通道静音`
        : `调音台：${TARGET_LABEL[cfg.target]} 全部通道恢复`,
      "muted"
    );
  };

  const boostStyle = () => {
    haptic();
    if (mixerTargets.value.target !== "MIDI") return;
    const next = styleAtMax(mixerChannels.value);
    saveMixerChannels(next);
    const devices = targetsFor({ ...mixerTargets.value, target: "MIDI" }, "MIDI", mixerDeviceLists());
    for (const definition of MIXER_CHANNELS) {
      if (definition.group !== "STYLE") continue;
      const channel = next[definition.id];
      sendCcToDevices(devices, channel.channel, 7, 127).catch(() => {});
    }
    showToast("鼓 / 打击乐 / 贝斯已拉满 127");
    addLog("调音台：鼓 / 打击乐 / 贝斯已一键拉满 127", "muted");
  };

  const footnote = target === "SX"
    ? "SX：推子发送 CC#7 到琴的声部通道 · 通道在设置里改 · Local Control Off 不影响音量"
    : "进入页面自动同步 · 推子需推过当前值点才开始变化（防跳变）· 静音只把音量设为 0，再次打开恢复原值。";

  return html`
    <div class="sub-screen mixer-screen">
      <div class="mixer-header">
        ${embedded ? null : html`<button type="button" class="back-btn" onClick=${() => navigate("transpose")}>‹ 返回</button>`}
        <div class="mixer-heading">
          <h1>通道调音台</h1>
          <p>${TARGET_LABEL[target]} · CC#7 音量 · ${balanceText}</p>
        </div>
        <div class="mixer-header-actions">
          <${MixerConnectionChip}
            count=${targets.length}
            onClick=${() => { haptic(); connectMidi().catch(() => {}); }}
          />
          ${target === "MIDI"
            ? html`<button type="button" class="mixer-boost" onClick=${boostStyle}>节奏拉满</button>`
            : null}
          <${SmallButton} label=${mutedAll ? "全部恢复" : "全部静音"} onClick=${toggleAllMute} />
          <${SmallButton} label="设置" onClick=${() => { haptic(); setSettingsOpen(true); }} />
        </div>
      </div>

      <${MixerLegend} target=${target} channels=${channels} />

      <div class="mixer-faders">
        ${channels.map((channel, index) => html`
          ${index === 4 ? html`<div class="mixer-strip-divider"></div>` : null}
          <div class=${`mixer-strip ${channel.definition.group === "STYLE" ? "style" : "keyboard"}${channel.muted ? " muted" : ""}`}>
            <span class="mixer-strip-color"></span>
            <div class="mixer-strip-name">${channel.definition.short}</div>
            <div class="mixer-strip-sub" title=${`${channel.definition.subtitle} · CH${channel.channel + 1}`}>
              ${channel.definition.subtitle} · CH${channel.channel + 1}
            </div>
            <div class="mixer-volume">
              <span class="mixer-volume-value">${channel.volume}</span><span class="mixer-volume-max">/127</span>
            </div>
            <${Fader}
              value=${channel.volume}
              muted=${channel.muted}
              onVolume=${(value, commit, start) => changeVolume(channel.definition.id, value, commit, start)}
              onToggleMute=${() => toggleMute(channel.definition.id)}
            />
          </div>
        `)}
        ${Array.from({ length: Math.max(0, 7 - channels.length) }, () => html`
          <div class="mixer-strip-spacer"></div>
        `)}
      </div>

      <div class="mixer-footnote" title=${footnote}>${footnote}</div>

      ${settingsOpen
        ? html`
            <${MixerSettingsDialog}
              target=${target}
              lists=${lists}
              config=${config}
              channels=${channels}
              onClose=${() => setSettingsOpen(false)}
              onTargetChange=${changeTarget}
              onDeviceToggle=${toggleDevice}
              onSelectAll=${selectAll}
              onClear=${clearDevices}
              onChannelChange=${changeChannel}
              onResetChannels=${resetChannelsToDefault}
            />
          `
        : null}
    </div>
  `;
}
