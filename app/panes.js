// Free-form 1–4 pane layout model for the iPad workspace.

export const PANE_SCREENS = ["transpose", "setlist", "sounds", "chain", "mixer", "drums"];
export const PANE_MAX = 4;

export const PANE_TITLES = {
  transpose: "主界面",
  setlist: "歌单",
  sounds: "音色选择",
  chain: "音色链",
  mixer: "调音台",
  drums: "打鼓"
};

export function isPaneScreen(screen) {
  return PANE_SCREENS.includes(screen);
}

export function defaultLayout() {
  return { version: 1, panes: ["transpose", "mixer"], focused: 0 };
}

export function normalizeLayout(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const panes = [];
  if (Array.isArray(source.panes)) {
    for (const screen of source.panes) {
      if (isPaneScreen(screen) && !panes.includes(screen)) panes.push(screen);
      if (panes.length >= PANE_MAX) break;
    }
  }
  const safePanes = panes.length ? panes : ["transpose"];
  const focused = Number.isInteger(source.focused)
    ? Math.max(0, Math.min(safePanes.length - 1, source.focused))
    : 0;
  return { version: 1, panes: safePanes, focused };
}

export function withPaneScreen(layout, index, screen) {
  if (!isPaneScreen(screen)) return layout;
  if (index < 0 || index >= layout.panes.length) return layout;
  const existing = layout.panes.indexOf(screen);
  if (existing === index) return { ...layout, focused: index };
  const panes = [...layout.panes];
  if (existing >= 0) {
    const other = panes[index];
    panes[index] = screen;
    panes[existing] = other;
  } else {
    panes[index] = screen;
  }
  return { ...layout, panes, focused: index };
}

export function withPaneAdded(layout, screen) {
  if (!isPaneScreen(screen)) return layout;
  const existing = layout.panes.indexOf(screen);
  if (existing >= 0) return { ...layout, focused: existing };
  if (layout.panes.length >= PANE_MAX) return layout;
  const panes = [...layout.panes, screen];
  return { ...layout, panes, focused: panes.length - 1 };
}

export function withPaneRemoved(layout, index) {
  if (layout.panes.length <= 1 || index < 0 || index >= layout.panes.length) return layout;
  const panes = layout.panes.filter((_, item) => item !== index);
  const focused = Math.max(0, Math.min(panes.length - 1,
    layout.focused > index ? layout.focused - 1 : layout.focused));
  return { ...layout, panes, focused };
}

export function withPanesSwapped(layout, from, to) {
  if (from === to) return layout;
  if (from < 0 || from >= layout.panes.length) return layout;
  if (to < 0 || to >= layout.panes.length) return layout;
  const panes = [...layout.panes];
  [panes[from], panes[to]] = [panes[to], panes[from]];
  const focused = layout.focused === from
    ? to
    : layout.focused === to
      ? from
      : layout.focused;
  return { ...layout, panes, focused };
}

export function withPaneMoved(layout, index, delta) {
  const target = index + delta;
  if (index < 0 || index >= layout.panes.length) return layout;
  if (target < 0 || target >= layout.panes.length) return layout;
  const panes = [...layout.panes];
  [panes[index], panes[target]] = [panes[target], panes[index]];
  const focused = layout.focused === index
    ? target
    : layout.focused === target
      ? index
      : layout.focused;
  return { ...layout, panes, focused };
}
