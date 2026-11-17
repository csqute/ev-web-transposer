// Exact Android theme colors (ui/theme/Color.kt).

export const THEME_ORDER = ["DUAL", "WHITE", "BLACK", "DEEP_BLUE", "BLACK_GOLD"];

export const THEME_LABELS = {
  DUAL: "双色",
  WHITE: "白色",
  BLACK: "黑色",
  DEEP_BLUE: "深蓝",
  BLACK_GOLD: "黑金"
};

export const INTERFACE_LABELS = {
  PIANO: "钢琴键盘",
  LARGE_BUTTONS: "大按钮"
};

export const THEMES = {
  DUAL: {
    isLight: false,
    background: "#0E1620",
    surface: "#16232F",
    surfaceAlt: "#1E2E3E",
    accent: "#2EC4B6",
    accentAlt: "#FFB454",
    onAccent: "#06201D",
    success: "#3DDC97",
    text: "#E8F1F5",
    muted: "#8FA9B8",
    whiteKey: "#E8F1F5",
    blackKey: "#101A24",
    whiteKeyText: "#0E1620",
    blackKeyText: "#E8F1F5",
    pressed: "#2EC4B6",
    danger: "#FF5A5F",
    border: "#2A3B4D"
  },
  WHITE: {
    isLight: true,
    background: "#F2F4F7",
    surface: "#FFFFFF",
    surfaceAlt: "#E6EAF0",
    accent: "#1F6FEB",
    accentAlt: "#D97706",
    onAccent: "#FFFFFF",
    success: "#11875D",
    text: "#121820",
    muted: "#66707C",
    whiteKey: "#FFFFFF",
    blackKey: "#1B2027",
    whiteKeyText: "#121820",
    blackKeyText: "#F2F4F7",
    pressed: "#1F6FEB",
    danger: "#D7263D",
    border: "#C9D1DB"
  },
  BLACK: {
    isLight: false,
    background: "#000000",
    surface: "#141414",
    surfaceAlt: "#222222",
    accent: "#E6E6E6",
    accentAlt: "#FFB454",
    onAccent: "#000000",
    success: "#3DDC97",
    text: "#F2F2F2",
    muted: "#8A8A8A",
    whiteKey: "#EDEDED",
    blackKey: "#0A0A0A",
    whiteKeyText: "#0A0A0A",
    blackKeyText: "#EDEDED",
    pressed: "#BDBDBD",
    danger: "#FF5C5C",
    border: "#2E2E2E"
  },
  DEEP_BLUE: {
    isLight: false,
    background: "#061826",
    surface: "#0B2638",
    surfaceAlt: "#12364D",
    accent: "#3FC6FF",
    accentAlt: "#FFB454",
    onAccent: "#00202E",
    success: "#3DDC97",
    text: "#E5F6FF",
    muted: "#84A9BE",
    whiteKey: "#DCEFFA",
    blackKey: "#05121C",
    whiteKeyText: "#061826",
    blackKeyText: "#DCEFFA",
    pressed: "#3FC6FF",
    danger: "#FF6B6B",
    border: "#1B4258"
  },
  BLACK_GOLD: {
    isLight: false,
    background: "#0B0B0B",
    surface: "#17140E",
    surfaceAlt: "#221D14",
    accent: "#D4AF37",
    accentAlt: "#E08A4F",
    onAccent: "#1A1405",
    success: "#3DDC97",
    text: "#F2E6C9",
    muted: "#A6976F",
    whiteKey: "#F2E6C9",
    blackKey: "#0B0B0B",
    whiteKeyText: "#1A1405",
    blackKeyText: "#F2E6C9",
    pressed: "#D4AF37",
    danger: "#FF6B6B",
    border: "#3A3020"
  }
};

export function applyTheme(theme) {
  const name = THEMES[theme] ? theme : "DUAL";
  document.documentElement.dataset.theme = name;
  return name;
}

export function themeColors(theme) {
  return THEMES[theme] || THEMES.DUAL;
}
