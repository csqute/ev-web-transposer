import { useEffect, useState } from "preact/hooks";
import { html } from "./components.js";

function formatTime(date) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function StatusBar() {
  const [time, setTime] = useState(() => formatTime(new Date()));
  const [battery, setBattery] = useState(null);
  const [charging, setCharging] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(formatTime(new Date())), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let batteryManager = null;
    let cancelled = false;
    const update = () => {
      if (cancelled || !batteryManager) return;
      setBattery(Math.round(batteryManager.level * 100));
      setCharging(!!batteryManager.charging);
    };
    if (navigator.getBattery) {
      navigator.getBattery().then((manager) => {
        if (cancelled) return;
        batteryManager = manager;
        update();
        manager.addEventListener?.("levelchange", update);
        manager.addEventListener?.("chargingchange", update);
      }).catch(() => {});
    }
    return () => {
      cancelled = true;
      if (batteryManager) {
        batteryManager.removeEventListener?.("levelchange", update);
        batteryManager.removeEventListener?.("chargingchange", update);
      }
    };
  }, []);

  const low = battery !== null && battery < 20;
  return html`
    <div class="statusbar" aria-label="时钟和电量">
      <span class="status-time">${time}</span>
      <span class=${`status-battery${low ? " low" : ""}`}>
        ${charging ? "⚡ " : ""}${battery === null ? "--" : `${battery}%`}
      </span>
    </div>
  `;
}
