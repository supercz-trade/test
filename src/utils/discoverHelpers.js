// ===============================================================
// utils/discoverHelpers.js
// Shared helpers for Discover page
// ===============================================================

import { useState, useEffect, useRef } from "react";
import { calcAge, calcAgeMinutes } from "./format";

/** Play UI sound if not muted */
export function playSound(src, volume = 0.5) {
  try {
    if (localStorage.getItem("ui_sound") === "off") return;
    const audio = new Audio(src);
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch {}
}

/** Default filter state */
export const DEFAULT_FILTER = {
  platforms: { flap_sh: true, four_meme: true },
  ageMin: "", ageMax: "",
  mcMin: "",  mcMax: "",
  volMin: "", volMax: "",
};

/** Apply filter to token list */
export function applyFilter(tokens, filter) {
  if (!Array.isArray(tokens) || !filter) return [];

  const platformValues = Object.values(filter.platforms);
  const allOff = platformValues.length > 0 && platformValues.every((v) => !v);

  return tokens.filter((t) => {
    const src = t.sourceFrom || "";
    if (!allOff && src in filter.platforms && !filter.platforms[src]) return false;

    const ageMin = filter.ageMin !== "" ? Number(filter.ageMin) : null;
    const ageMax = filter.ageMax !== "" ? Number(filter.ageMax) : null;
    if (ageMin !== null || ageMax !== null) {
      const ageMins = calcAgeMinutes(t.launchTime);
      if (ageMins === null) return false;
      if (ageMin !== null && ageMins < ageMin) return false;
      if (ageMax !== null && ageMins > ageMax) return false;
    }

    const mc = Number(t.marketCap || 0);
    if (filter.mcMin !== "" && mc < Number(filter.mcMin)) return false;
    if (filter.mcMax !== "" && mc > Number(filter.mcMax)) return false;

    const vol = Number(t.volumeUsdt || 0);
    if (filter.volMin !== "" && vol < Number(filter.volMin)) return false;
    if (filter.volMax !== "" && vol > Number(filter.volMax)) return false;

    return true;
  });
}

/** Hook: live updating age string */
export function useLiveAge(launchTime) {
  const [age, setAge] = useState(() => calcAge(launchTime));
  useEffect(() => {
    if (!launchTime) return;
    const tick = () => setAge(calcAge(launchTime));
    tick();
    const ms = typeof launchTime === "string" ? new Date(launchTime).getTime() : (launchTime > 1e12 ? launchTime : launchTime * 1000);
    const id = setInterval(tick, (Date.now() - ms) / 1000 < 3600 ? 1000 : 10000);
    return () => clearInterval(id);
  }, [launchTime]);
  return age;
}

/** Hook: previous value reference */
export function usePrevious(value) {
  const ref = useRef(undefined);
  useEffect(() => { ref.current = value; });
  return ref.current;
}

/** Get user trade settings from localStorage */
export function getUserTradeSettings() {
  try {
    const s = JSON.parse(localStorage.getItem("tp_settings") || "null");
    return s?.P1 || { slippage: "0.12", gas: "0", anti_mev: false };
  } catch {
    return { slippage: "0.12", gas: "0", anti_mev: false };
  }
}