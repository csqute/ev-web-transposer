import { useEffect, useRef, useState } from "preact/hooks";
import {
  AlertDialog,
  AppDialog,
  Chip,
  SmallButton,
  haptic,
  html
} from "../ui/components.js";
import { navigate } from "../app/router.js";
import {
  addLog,
  consumeUse,
  controlChannel,
  hasUses,
  license,
  midi,
  openDialog,
  saveSoundChain,
  setControlChannel,
  settings,
  soundChain,
  soundPicker,
  updateSettings
} from "../app/store.js";
import {
  SOUND_CHAIN_LINK_NAME_MAX,
  SOUND_CHAIN_MAX_COLOR_INDEX,
  SOUND_CHAIN_MAX_LINKS,
  SOUND_CHAIN_NAME_MAX,
  activateChain,
  activeChain,
  addChain,
  addLink,
  bankLabel,
  chainDisplayName,
  chainLinkDetail,
  chainTileDetail,
  createChain,
  deleteChain,
  deleteLink,
  duplicateLink,
  factoryCategory,
  moveLink,
  moveLinkTo,
  newId,
  nextChainLink,
  normalizeLink,
  numberDisplay,
  pageDisplay,
  pageRange,
  programRange,
  renameChain,
  serpentineSlots,
  soundChainMessages,
  transposeDetail,
  transposeOffsetFor,
  transposeSummary,
  updateLink,
  withCurrentLink
} from "../core/sounds/chain.js";
import { groupLabel, nameAt, resolveSoundTarget } from "../core/sounds/picker.js";
import {
  isConnected,
  scheduleKeepAfterSoundChange,
  sendMessagesToDevice,
  sendTranspose
} from "../core/midi/engine.js";
import { noteLabel, signedOffset } from "../core/midi/notes.js";

const PALETTE = ["#EF5350", "#FFA726", "#FFD54F", "#66BB6A", "#26C6DA", "#42A5F5", "#AB47BC"];
const GAP = 5;

function ChannelStepper({ value, onChange }) {
  return html`
    <div class="mixer-channel-stepper sound-channel-stepper">
      <button type="button" class="stepper-btn" disabled=${value <= 0} onClick=${() => onChange(value - 1)}>−</button>
      <span class="stepper-value">${value + 1}</span>
      <button type="button" class="stepper-btn" disabled=${value >= 15} onClick=${() => onChange(value + 1)}>＋</button>
    </div>
  `;
}

function NumberStepper({ label, value, min, max, display, onChange }) {
  return html`
    <div class="chain-number-row">
      <span class="chain-number-label">${label}</span>
      <div class="chain-number-controls">
        <button type="button" class="stepper-btn" disabled=${value <= min} onClick=${() => onChange(Math.max(min, value - 1))}>−</button>
        <span class="stepper-value chain-number-value">${display ? display(value) : value}</span>
        <button type="button" class="stepper-btn" disabled=${value >= max} onClick=${() => onChange(Math.min(max, value + 1))}>＋</button>
      </div>
    </div>
  `;
}

function ChainTile({
  index,
  link,
  displayName,
  current,
  dragging,
  highlighted,
  style,
  tileRef,
  onSelect,
  onEdit,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel
}) {
  const paletteColor = link.colorIndex > 0 ? PALETTE[link.colorIndex - 1] : null;
  return html`
    <div
      class=${`chain-tile${current ? " current" : ""}${dragging ? " dragging" : ""}${highlighted ? " highlighted" : ""}${paletteColor ? " custom" : ""}`}
      style=${{ ...style, ...(paletteColor ? { "--chain-color": paletteColor } : {}) }}
      ref=${tileRef}
      role="button"
      tabindex="0"
      data-chain-id=${link.id}
      onPointerDown=${onPointerDown}
      onPointerMove=${onPointerMove}
      onPointerUp=${onPointerUp}
      onPointerCancel=${onPointerCancel}
      onKeyDown=${(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div class="chain-tile-top">
        <span class="chain-tile-index">${index + 1}</span>
        <span
          class="chain-edit"
          role="button"
          tabindex="0"
          title="编辑"
          onPointerDown=${(event) => event.stopPropagation()}
          onClick=${(event) => {
            event.stopPropagation();
            onEdit();
          }}
        >✎</span>
      </div>
      <div class="chain-tile-name">${displayName}</div>
      <div class="chain-tile-detail">
        ${link.transpose ? chainTileDetail(link) : chainTileDetail(link)}
      </div>
    </div>
  `;
}

function ChainGrid({
  chain,
  picker,
  currentIndex,
  onSelect,
  onEdit,
  onMove,
  onAddFirst
}) {
  const wrapRef = useRef(null);
  const gridRef = useRef(null);
  const tileRefs = useRef(new Map());
  const pressRef = useRef(null);
  const timerRef = useRef(0);
  const [width, setWidth] = useState(0);
  const [columns, setColumns] = useState(4);
  const [drag, setDrag] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(-1);
  const [flowPath, setFlowPath] = useState("");

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return undefined;
    const measure = () => {
      const next = element.clientWidth;
      setWidth(next);
      setColumns(Math.max(4, Math.min(12, Math.floor(next / 74))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [chain.links.length === 0]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const container = gridRef.current;
      if (!container || chain.links.length < 2) {
        setFlowPath("");
        return;
      }
      const base = container.getBoundingClientRect();
      const points = [];
      for (const link of chain.links) {
        const element = tileRefs.current.get(link.id);
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        points.push([rect.left - base.left + rect.width / 2, rect.top - base.top + rect.height / 2]);
      }
      if (points.length < 2) {
        setFlowPath("");
        return;
      }
      setFlowPath(points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" "));
    });
    return () => cancelAnimationFrame(frame);
  }, [chain.links.map((link) => link.id).join("|"), chain.currentIndex, columns, width]);

  const slots = serpentineSlots(chain.links.length, columns);

  const indexAtPoint = (x, y, exclude) => {
    for (const [index, link] of chain.links.entries()) {
      if (index === exclude) continue;
      const element = tileRefs.current.get(link.id);
      if (!element) continue;
      const rect = element.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return index;
    }
    return -1;
  };

  const clearPress = () => {
    clearTimeout(timerRef.current);
    timerRef.current = 0;
  };

  const begin = (event, index, link) => {
    if (event.button !== undefined && event.button !== 0) return;
    clearPress();
    pressRef.current = {
      index,
      link,
      startX: event.clientX,
      startY: event.clientY,
      pointerId: event.pointerId,
      moved: false,
      active: false
    };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch (_) {}
    timerRef.current = setTimeout(() => {
      const press = pressRef.current;
      if (!press || press.moved) return;
      press.active = true;
      setDrag({ index, dx: 0, dy: 0 });
      setHoverIndex(index);
      haptic(30);
    }, 360);
  };

  const move = (event) => {
    const press = pressRef.current;
    if (!press || event.pointerId !== press.pointerId) return;
    const dx = event.clientX - press.startX;
    const dy = event.clientY - press.startY;
    if (!press.active) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        press.moved = true;
        clearPress();
      }
      return;
    }
    event.preventDefault();
    setDrag({ index: press.index, dx, dy });
    setHoverIndex(indexAtPoint(event.clientX, event.clientY, press.index));
  };

  const finish = (event) => {
    const press = pressRef.current;
    if (!press || (event && event.pointerId !== press.pointerId)) return;
    clearPress();
    try { event.currentTarget.releasePointerCapture(press.pointerId); } catch (_) {}
    if (press.active) {
      const target = hoverIndex;
      setDrag(null);
      setHoverIndex(-1);
      if (target >= 0 && target !== press.index) onMove(press.index, target);
    } else if (!press.moved) {
      onSelect(press.index);
    }
    pressRef.current = null;
  };

  const cancel = (event) => {
    clearPress();
    const press = pressRef.current;
    if (press) {
      try { event.currentTarget.releasePointerCapture(press.pointerId); } catch (_) {}
    }
    pressRef.current = null;
    setDrag(null);
    setHoverIndex(-1);
  };

  if (!chain.links.length) {
    return html`
      <div class="chain-empty">
        <h2>这条链还没有音色</h2>
        <p>点右上角「＋ 添加」，录入 PA700 的用户组组合音色（库/页/编号）。</p>
        <${SmallButton} label="＋ 添加第一个音色" onClick=${onAddFirst} />
      </div>
    `;
  }

  return html`
    <div class="chain-grid-wrap" ref=${wrapRef}>
      <div class="chain-grid-inner" ref=${gridRef}>
        <svg class="chain-flow" aria-hidden="true">
          <path d=${flowPath} vector-effect="non-scaling-stroke"></path>
        </svg>
        <div class="chain-grid" style=${{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          ${slots.map((index, slot) => {
            if (index === null) return html`<div class="chain-tile-placeholder"></div>`;
            const link = chain.links[index];
            const isDragging = drag?.index === index;
            const style = isDragging
              ? { transform: `translate(${drag.dx}px, ${drag.dy}px)`, zIndex: 5 }
              : {};
            return html`
              <${ChainTile}
                key=${link.id}
                index=${index}
                link=${link}
                displayName=${chainDisplayName(link, picker)}
                current=${index === currentIndex}
                dragging=${isDragging}
                highlighted=${hoverIndex === index && drag && drag.index !== index}
                style=${style}
                tileRef=${(element) => {
                  if (element) tileRefs.current.set(link.id, element);
                  else tileRefs.current.delete(link.id);
                }}
                onSelect=${() => onSelect(index)}
                onEdit=${() => onEdit(index)}
                onPointerDown=${(event) => begin(event, index, link)}
                onPointerMove=${move}
                onPointerUp=${finish}
                onPointerCancel=${cancel}
              />
            `;
          })}
        </div>
      </div>
    </div>
  `;
}

function SoundListPickerDialog({ picker, onClose, onPick }) {
  const [group, setGroup] = useState(0);
  const [page, setPage] = useState(0);
  const groups = picker.groups;
  const allEmpty = groups.every((slots) => !slots.some(Boolean));
  return html`
    <${AppDialog} title="从音色列表选择" onClose=${onClose}>
      <div class="chain-picker-dialog">
        ${allEmpty
          ? html`<p class="hint">还没有导入音色表。请先回到「音色选择」页，点「导入音色表」选择 KEYBOARDSET 文件夹或 ZIP。</p>`
          : html`
              <h3 class="section-title">组</h3>
              <div class="chain-picker-groups">
                ${Array.from({ length: 9 }, (_, index) => html`
                  <${Chip}
                    label=${groupLabel(picker, index)}
                    selected=${group === index}
                    onClick=${() => { setGroup(index); setPage(0); }}
                  />
                `)}
              </div>
              <div class="chain-picker-pages">
                ${Array.from({ length: 6 }, (_, index) => html`
                  <button
                    type="button"
                    class=${`sound-page-btn${page === index ? " selected" : ""}`}
                    onClick=${() => setPage(index)}
                  >P${index + 1}</button>
                `)}
              </div>
              <div class="chain-picker-grid">
                ${Array.from({ length: 2 }, (_, column) =>
                  Array.from({ length: 4 }, (_, row) => {
                    const slotInPage = column * 4 + row;
                    const slot = page * 8 + slotInPage;
                    const name = groups[group]?.[slot];
                    return html`
                      <button
                        type="button"
                        class=${`chain-picker-tile${name ? " used" : ""}`}
                        disabled=${!name}
                        onClick=${() => name && onPick(group, slot, name)}
                      >
                        <span>${group + 1}-${slot + 1}</span>
                        <strong>${name || "空"}</strong>
                      </button>
                    `;
                  })
                )}
              </div>
              <p class="hint">点一个有名有位置的音色即可填入；空位置不能选。</p>
            `}
      </div>
    <//>
  `;
}

function ChainLinkDialog({
  link,
  chain,
  picker,
  currentOffset,
  onClose,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDuplicate
}) {
  const isEditing = !!link;
  const [name, setName] = useState(link?.name || "");
  const [nameAuto, setNameAuto] = useState(
    !!link && !!link.name.trim()
    && link.name.trim() === (link.bankMsb === 17 ? (nameAt(picker, link.bankLsb, link.program) || "") : "")
  );
  const [transpose, setTranspose] = useState(!!link?.transpose);
  const [mode, setMode] = useState(link?.transpose?.mode || "OFFSET");
  const [value, setValue] = useState(link?.transpose?.value || 0);
  const [bankMsb, setBankMsb] = useState(link?.bankMsb ?? 17);
  const [bankLsb, setBankLsb] = useState(link?.bankLsb ?? 0);
  const [program, setProgram] = useState(link?.program ?? 0);
  const [colorIndex, setColorIndex] = useState(link?.colorIndex ?? 0);
  const [showList, setShowList] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const importedCount = picker.groups.reduce((sum, slots) => sum + slots.filter(Boolean).length, 0);

  const ranges = {
    page: pageRange(bankMsb),
    program: programRange(bankMsb)
  };

  const syncName = (msb = bankMsb, lsb = bankLsb, prog = program) => {
    if (transpose) return;
    if (name.trim() && !nameAuto) return;
    if (msb === 17) {
      setName(nameAt(picker, lsb, prog) || "");
      setNameAuto(true);
    } else if (nameAuto) {
      setName("");
    }
  };

  const changeBank = (nextMsb) => {
    setBankMsb(nextMsb);
    const pRange = pageRange(nextMsb);
    const sRange = programRange(nextMsb);
    const nextLsb = Math.max(pRange[0], Math.min(pRange[1], bankLsb));
    const nextProgram = Math.max(sRange[0], Math.min(sRange[1], program));
    setBankLsb(nextLsb);
    setProgram(nextProgram);
    syncName(nextMsb, nextLsb, nextProgram);
  };

  const changeLsb = (next) => {
    setBankLsb(next);
    syncName(bankMsb, next, program);
  };

  const changeProgram = (next) => {
    setProgram(next);
    syncName(bankMsb, bankLsb, next);
  };

  const setTransposeMode = (next) => {
    setMode(next);
  };

  const toggleTranspose = (enabled) => {
    setTranspose(enabled);
    if (enabled && nameAuto) {
      setName("");
      setNameAuto(false);
    }
    if (!enabled) syncName();
  };

  const save = () => {
    onSave(normalizeLink({
      id: link?.id || newId(),
      name,
      bankMsb,
      bankLsb,
      program,
      colorIndex,
      transpose: transpose ? { mode, value } : null
    }));
  };

  const importedName = bankMsb === 17 ? nameAt(picker, bankLsb, program) : null;
  const pageLabel = bankMsb === 16 ? "分类（CC#32）" : "页（CC#32）";
  const displayPage = bankMsb === 16 ? bankLsb : bankLsb + 1;

  return html`
    <${AppDialog} title=${link ? (link.transpose ? "编辑移调指令" : "编辑音色") : "添加步骤"} onClose=${onClose}>
      <div class="chain-link-dialog">
        ${!isEditing
          ? html`
              <h3 class="section-title">添加类型</h3>
              <div class="chip-row">
                <${Chip} label="音色" selected=${!transpose} onClick=${() => toggleTranspose(false)} />
                <${Chip} label="移调指令" selected=${transpose} onClick=${() => toggleTranspose(true)} />
              </div>
            `
          : null}

        <label class="chain-field">
          <span>名称（选填）</span>
          <input
            type="text"
            maxlength=${SOUND_CHAIN_LINK_NAME_MAX}
            value=${name}
            placeholder=${transpose ? "例如：副歌升调 / 回到原调" : "例如：钢琴 / 弦乐 / 演出 1"}
            onInput=${(event) => {
              setName(event.currentTarget.value.slice(0, SOUND_CHAIN_LINK_NAME_MAX));
              setNameAuto(false);
            }}
          />
        </label>

        <h3 class="section-title">颜色</h3>
        <p class="hint">选一个颜色方便在链条里区分；默认跟随主题。</p>
        <div class="chain-color-row">
          <button
            type="button"
            class=${`chain-color none${colorIndex === 0 ? " selected" : ""}`}
            onClick=${() => setColorIndex(0)}
          >无</button>
          ${PALETTE.map((color, index) => html`
            <button
              type="button"
              class=${`chain-color${colorIndex === index + 1 ? " selected" : ""}`}
              style=${{ background: color }}
              title=${`颜色 ${index + 1}`}
              onClick=${() => setColorIndex(index + 1)}
            ></button>
          `)}
        </div>

        <div class="mixer-divider-line"></div>

        ${transpose
          ? html`
              <h3 class="section-title">移调方式</h3>
              <p class="hint">选中这一步时，按下面的设置改变移调。</p>
              <div class="chip-row">
                <${Chip} label="按偏移量" selected=${mode === "OFFSET"} onClick=${() => setTransposeMode("OFFSET")} />
                <${Chip} label="直接跳到" selected=${mode === "TARGET"} onClick=${() => setTransposeMode("TARGET")} />
              </div>
              <${NumberStepper}
                label=${mode === "OFFSET" ? "偏移量" : "目标半音"}
                value=${value}
                min=${-12}
                max=${12}
                display=${(current) => mode === "OFFSET"
                  ? `${signedOffset(current)} 半音`
                  : `${signedOffset(current)}（${noteLabel(current)}）`}
                onChange=${setValue}
              />
              <p class="hint accent">
                ${mode === "OFFSET"
                  ? `相对当前调移动 ${signedOffset(value)} 个半音；现在是 ${noteLabel(currentOffset)}，选中后 → ${noteLabel(transposeOffsetFor({ mode, value }, currentOffset))}。`
                  : `无论当前是什么调，选中这一步时 Key=${noteLabel(value)}（${signedOffset(value)} 半音）。`}
              </p>
            `
          : html`
              <h3 class="section-title">组合音色库</h3>
              <p class="hint">
                按 PA700/PA1000 Keyboard Set Library 的库/页/编号选择；编号在琴上显示从 1 开始，MIDI 使用 0 开始。
              </p>
              <div class="chain-dialog-actions">
                <${SmallButton}
                  label=${importedCount > 0 ? `从音色列表选择（已导入 ${importedCount}）` : "从音色列表选择（先导入音色表）"}
                  disabled=${!importedCount}
                  onClick=${() => setShowList(true)}
                />
              </div>
              <div class="chip-row wrap chain-bank-row">
                ${[
                  [17, "用户"], [18, "直接用户"], [19, "本机"], [16, "出厂"]
                ].map(([msb, label]) => html`
                  <${Chip} label=${label} selected=${bankMsb === msb} onClick=${() => changeBank(msb)} />
                `)}
                <${Chip}
                  label="自定义"
                  selected=${![16, 17, 18, 19].includes(bankMsb)}
                  onClick=${() => changeBank([16, 17, 18, 19].includes(bankMsb) ? 0 : bankMsb)}
                />
              </div>
              ${![16, 17, 18, 19].includes(bankMsb)
                ? html`
                    <${NumberStepper}
                      label="Bank MSB"
                      value=${bankMsb}
                      min=${0}
                      max=${127}
                      onChange=${changeBank}
                    />
                  `
                : null}
              <${NumberStepper}
                label=${pageLabel}
                value=${bankLsb}
                min=${ranges.page[0]}
                max=${ranges.page[1]}
                display=${(current) => bankMsb === 16
                  ? `${current} · ${factoryCategory(current)}`
                  : `${current + 1}`}
                onChange=${changeLsb}
              />
              <${NumberStepper}
                label="编号（PC）"
                value=${program}
                min=${ranges.program[0]}
                max=${ranges.program[1]}
                display=${(current) => `${current + 1}`}
                onChange=${changeProgram}
              />
              <p class="hint accent">
                Bank ${bankMsb}-${bankLsb} · PC ${program}
                （琴上显示 ${bankLabel(bankMsb)} ${displayPage}-${program + 1}）
              </p>
              ${importedName
                ? html`<p class="hint">音色列表名称：${importedName}</p>`
                : null}
            `}

        <div class="chain-dialog-actions">
          <${SmallButton} label="取消" onClick=${onClose} />
          <${SmallButton} label="保存" onClick=${save} />
          ${isEditing
            ? html`<${SmallButton} label="复制到链尾" onClick=${() => onDuplicate()} />`
            : null}
        </div>

        ${isEditing
          ? html`
              <div class="chain-dialog-actions chain-dialog-danger">
                <${SmallButton} label="删除" onClick=${() => setConfirmDelete(true)} />
                ${onMoveUp ? html`<${SmallButton} label="上移" onClick=${() => onMoveUp()} />` : null}
                ${onMoveDown ? html`<${SmallButton} label="下移" onClick=${() => onMoveDown()} />` : null}
              </div>
            `
          : null}
      </div>
    <//>

    ${showList
      ? html`
          <${SoundListPickerDialog}
            picker=${picker}
            onClose=${() => setShowList(false)}
            onPick=${(group, slot, pickedName) => {
              setTranspose(false);
              setBankMsb(17);
              setBankLsb(group);
              setProgram(slot);
              setName(pickedName);
              setNameAuto(true);
              setShowList(false);
            }}
          />
        `
      : null}

    ${confirmDelete && onDelete
      ? html`
          <${AlertDialog}
            title="删除这个步骤？"
            message="只会从当前链里移除；不会改动 PA700 上的组合音色。"
            actions=${[
              { label: "取消", onClick: () => setConfirmDelete(false) },
              { label: "删除", danger: true, onClick: () => { setConfirmDelete(false); onDelete(); } }
            ]}
          />
        `
      : null}
  `;
}

function RenameChainDialog({ chain, onClose, onConfirm }) {
  const [name, setName] = useState(chain.name);
  return html`
    <${AppDialog} title="链名" onClose=${onClose}>
      <div class="chain-rename-dialog">
        <label class="chain-field">
          <span>名称</span>
          <input
            type="text"
            maxlength=${SOUND_CHAIN_NAME_MAX}
            value=${name}
            onInput=${(event) => setName(event.currentTarget.value.slice(0, SOUND_CHAIN_NAME_MAX))}
          />
        </label>
        <div class="chain-dialog-actions">
          <${SmallButton} label="取消" onClick=${onClose} />
          <${SmallButton} label="保存" disabled=${!name.trim()} onClick=${() => onConfirm(name)} />
        </div>
      </div>
    <//>
  `;
}

function ChainManagerDialog({ chainState, onClose, onActivate, onAdd, onRename, onDelete }) {
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const chains = chainState.chains;
  const saveNew = () => {
    if (!newName.trim()) return;
    onAdd(newName);
    setNewName("");
  };
  return html`
    <${AppDialog}
      title="音色链"
      onClose=${onClose}
      headerAction=${html`<${SmallButton} label="保存" disabled=${!newName.trim()} onClick=${saveNew} />`}
    >
      <div class="chain-manager">
        <p class="hint">每条链是一组按顺序排列的组合音色。演出时可以建多条链，用顶部的「‹ / ›」切换。</p>
        <div class="chain-new-row">
          <input
            type="text"
            maxlength=${SOUND_CHAIN_NAME_MAX}
            value=${newName}
            placeholder="输入新链名称，点右上角「保存」"
            onInput=${(event) => setNewName(event.currentTarget.value.slice(0, SOUND_CHAIN_NAME_MAX))}
            onKeyDown=${(event) => { if (event.key === "Enter") saveNew(); }}
          />
        </div>
        <div class="chain-manager-list">
          ${chains.map((chain, index) => html`
            <div class="chain-manager-row">
              <div class="chain-manager-info">
                <strong>${chain.name}</strong>
                <span>${chain.links.length} 个音色 · 第 ${index + 1}/${chains.length} 条</span>
              </div>
              <${SmallButton}
                label=${index === chainState.activeChainIndex ? "当前" : "切换"}
                disabled=${index === chainState.activeChainIndex}
                onClick=${() => onActivate(index)}
              />
              <${SmallButton} label="改名" onClick=${() => setRenaming(index)} />
              <${SmallButton} label="删除" disabled=${chains.length <= 1} onClick=${() => setDeleting(index)} />
            </div>
          `)}
        </div>
        <p class="hint">链的名称和当前位置保存在本机，重启后保留。</p>
      </div>
    <//>

    ${renaming !== null
      ? html`
          <${RenameChainDialog}
            chain=${chains[renaming]}
            onClose=${() => setRenaming(null)}
            onConfirm=${(name) => { onRename(renaming, name); setRenaming(null); }}
          />
        `
      : null}

    ${deleting !== null
      ? html`
          <${AlertDialog}
            title=${`删除「${chains[deleting].name}」？`}
            message=${`这条链里的 ${chains[deleting].links.length} 个音色会一起删除，不能撤销。`}
            actions=${[
              { label: "取消", onClick: () => setDeleting(null) },
              { label: "删除", danger: true, onClick: () => { onDelete(deleting); setDeleting(null); } }
            ]}
          />
        `
      : null}
  `;
}

function ChainSettingsDialog({ onClose, onChannel }) {
  return html`
    <${AppDialog} title="音色链设置" onClose=${onClose}>
      <div class="chain-settings">
        <h3 class="section-title">PA700 Control 通道</h3>
        <p class="hint">和歌单共用。PA700 的 Global › MIDI › MIDI IN Channels 要把这个通道设为 Control，App 才能发送组合音色切换。</p>
        <${ChannelStepper} value=${controlChannel.value} onChange=${onChannel} />
        <div class="mixer-divider-line"></div>
        <h3 class="section-title">用户组组合音色的 MIDI 值</h3>
        <p class="hint">用户 CC#0=17，页 CC#32=0–8，编号 PC=0–47；直接用户 CC#0=18，本机 CC#0=19，出厂 CC#0=16。</p>
      </div>
    <//>
  `;
}

export function SoundChainScreen({ embedded = false }) {
  const chainState = soundChain.value;
  const chain = activeChain(chainState);
  const picker = soundPicker.value;
  const target = resolveSoundTarget(picker, midi.value.devices);
  const channel = controlChannel.value;
  const balance = license.value.unlimited ? "无限制" : `剩余 ${license.value.balance} 次`;
  const [adding, setAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [showChains, setShowChains] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [status, setStatus] = useState("");

  const apply = (next) => saveSoundChain(next);
  const updateStatus = (text) => {
    setStatus(text);
    if (text) addLog(text, "muted");
  };

  const selectLink = async (index) => {
    const state = soundChain.value;
    const active = activeChain(state);
    const link = active.links[index];
    if (!link) return;
    if (link.transpose) {
      const connected = isConnected();
      if (connected && !hasUses(1)) {
        openDialog("paywall");
        return;
      }
      apply(withCurrentLink(state, index));
      const targetOffset = transposeOffsetFor(link.transpose, settings.value.offset);
      updateSettings({ offset: targetOffset });
      const sent = await sendTranspose(targetOffset, { consume: true, reason: "音色链" });
      updateStatus(
        sent
          ? `音色链：${chainDisplayName(link, picker)}（${transposeDetail(link.transpose)}）`
          : `音色链：${chainDisplayName(link, picker)}（未发送：没有可用的琴）`
      );
      return;
    }
    const connected = !!target;
    if (connected && !hasUses(1)) {
      openDialog("paywall");
      return;
    }
    apply(withCurrentLink(state, index));
    if (!target) {
      updateStatus("音色链：未连接所选的琴（在音色选择设置里选择），未发送 " + chainDisplayName(link, picker));
      return;
    }
    const sent = await sendMessagesToDevice(target, soundChainMessages(channel, link)).catch(() => 0);
    if (!sent) {
      updateStatus(`音色链：发送失败：${target.displayName}`);
      return;
    }
    consumeUse(1);
    scheduleKeepAfterSoundChange("音色链");
    updateStatus(
      `音色链：${chainDisplayName(link, picker)}（${chainLinkDetail(link)} · ${target.displayName} · Control CH ${channel + 1}）`
    );
  };

  const stepLink = (step) => {
    const next = nextChainLink(chain.links, chain.currentIndex, step);
    if (next === null) {
      updateStatus("音色链：请先添加组合音色");
      return;
    }
    selectLink(next);
  };

  const saveEditing = (link) => {
    if (adding) {
      const result = addLink(soundChain.value, link);
      if (!result.added) {
        updateStatus(`音色链：每条链最多 ${SOUND_CHAIN_MAX_LINKS} 个音色`);
        return;
      }
      apply(result.state);
      updateStatus(`音色链：已添加 ${chainDisplayName(link, picker)}`);
      setAdding(false);
    } else {
      apply(updateLink(soundChain.value, editingIndex, link));
      setEditingIndex(-1);
    }
  };

  const deleteEditing = () => {
    apply(deleteLink(soundChain.value, editingIndex));
    setEditingIndex(-1);
  };

  const moveEditing = (delta) => {
    apply(moveLink(soundChain.value, editingIndex, delta));
    setEditingIndex(-1);
  };

  const duplicateCurrent = () => {
    const index = chain.currentIndex;
    const result = duplicateLink(soundChain.value, index);
    if (!result.added) {
      updateStatus(`音色链：每条链最多 ${SOUND_CHAIN_MAX_LINKS} 个音色`);
      return;
    }
    apply(result.state);
    updateStatus(`音色链：已复制「${chainDisplayName(chain.links[index], picker)}」到链尾`);
  };

  const duplicateEditing = () => {
    const result = duplicateLink(soundChain.value, editingIndex);
    if (!result.added) {
      updateStatus(`音色链：每条链最多 ${SOUND_CHAIN_MAX_LINKS} 个音色`);
      return;
    }
    apply(result.state);
    updateStatus("音色链：已复制到链尾");
  };

  const currentLink = chain.links[chain.currentIndex];
  const editingLink = editingIndex >= 0 ? chain.links[editingIndex] : null;

  return html`
    <div class="sub-screen chain-screen">
      <div class="chain-header">
        <button
          type="button"
          class="back-btn chain-back"
          title="返回音色选择"
          onClick=${() => navigate("sounds")}
        >‹ 返回</button>
        <div class="chain-heading">
          <h1>音色链</h1>
          <p class=${target ? "" : "danger"}>
            ${target?.displayName || "未连接"} · Control CH ${channel + 1} ·
            链 ${chainState.activeChainIndex + 1}/${chainState.chains.length} · ${balance}
          </p>
        </div>
        <div class="chain-header-actions">
          <${SmallButton} label="‹" disabled=${chainState.chains.length <= 1} onClick=${() => apply(activateChain(soundChain.value, (chainState.activeChainIndex - 1 + chainState.chains.length) % chainState.chains.length))} />
          <button type="button" class="chain-name-chip" onClick=${() => setShowChains(true)} title="管理音色链">${chain.name}</button>
          <${SmallButton} label="›" disabled=${chainState.chains.length <= 1} onClick=${() => apply(activateChain(soundChain.value, (chainState.activeChainIndex + 1) % chainState.chains.length))} />
          <${SmallButton} label="＋ 添加" onClick=${() => setAdding(true)} />
          <${SmallButton} label="复制到链尾" disabled=${!currentLink || chain.links.length >= SOUND_CHAIN_MAX_LINKS} onClick=${duplicateCurrent} />
          <${SmallButton} label="设置" onClick=${() => setShowSettings(true)} />
        </div>
      </div>

      <${ChainGrid}
        chain=${chain}
        picker=${picker}
        currentIndex=${chain.currentIndex}
        onSelect=${selectLink}
        onEdit=${(index) => setEditingIndex(index)}
        onMove=${(from, to) => apply(moveLinkTo(soundChain.value, from, to))}
        onAddFirst=${() => setAdding(true)}
      />

      <div class="chain-footer">
        <button type="button" class="chain-transport" disabled=${!chain.links.length} onClick=${() => stepLink(-1)}>◀ 上一个</button>
        <button type="button" class="chain-transport" disabled=${!chain.links.length} onClick=${() => stepLink(1)}>下一个 ▶</button>
      </div>
      <div class="chain-hint">点方块切换 · 长按拖动排序 · ✎ 编辑 · 每次切换扣 1 次</div>
      ${status ? html`<div class="chain-status" title=${status}>${status}</div>` : null}

      ${adding
        ? html`
            <${ChainLinkDialog}
              link=${null}
              chain=${chain}
              picker=${picker}
              currentOffset=${settings.value.offset}
              onClose=${() => setAdding(false)}
              onSave=${saveEditing}
            />
          `
        : null}

      ${editingLink
        ? html`
            <${ChainLinkDialog}
              key=${editingLink.id}
              link=${editingLink}
              chain=${chain}
              picker=${picker}
              currentOffset=${settings.value.offset}
              onClose=${() => setEditingIndex(-1)}
              onSave=${saveEditing}
              onDelete=${deleteEditing}
              onMoveUp=${editingIndex > 0 ? () => moveEditing(-1) : null}
              onMoveDown=${editingIndex < chain.links.length - 1 ? () => moveEditing(1) : null}
              onDuplicate=${duplicateEditing}
            />
          `
        : null}

      ${showChains
        ? html`
            <${ChainManagerDialog}
              chainState=${chainState}
              onClose=${() => setShowChains(false)}
              onActivate=${(index) => { apply(activateChain(soundChain.value, index)); setShowChains(false); }}
              onAdd=${(name) => apply(addChain(soundChain.value, name))}
              onRename=${(index, name) => apply(renameChain(soundChain.value, index, name))}
              onDelete=${(index) => apply(deleteChain(soundChain.value, index))}
            />
          `
        : null}

      ${showSettings
        ? html`
            <${ChainSettingsDialog}
              onClose=${() => setShowSettings(false)}
              onChannel=${(value) => setControlChannel(value)}
            />
          `
        : null}
    </div>
  `;
}
