// src/components/chart/ChartWindows.jsx
// Main Chart Orchestrator (SwanFi)

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import "./lwchart.css";

import { LC_CDN, RANGE_OPTIONS } from "./chartConstants";
import { tokens as tokensApi, user as userApi } from "../../services/api";
import { subscribeCandle } from "../../services/ws";

// Import icons from central index
import { CopyIcon, ExternalLinkIcon } from "../../assets/icons";

// Import format utilities
import {
  formatUsd,
  formatPrice,
  formatTokenAmount,
  truncateAddress,
  timeAgo,
  formatAge,
  calcAge,
  calcAgeMinutes,
} from "../../utils/format";

// Import internal chart modules
import { calcSAR, buildPriceFormat, loadScript, DrawingEngine } from "./chartUtils";
import { calcMA, calcEMA, calcBOLL, calcSARFull, calcSupertrend } from "./chartIndicators";

import HeaderChart, { DEFAULT_DISPLAY_OPTIONS } from "./HeaderChart";
import IndicatorModal, { DEFAULT_INDICATOR_CONFIG } from "./IndicatorModal";
import BottomChart from "./BottomChart";
import SideChart from "./SideChart";
import SubPane from "./SubPane";

// ================================================================
// Helper functions (local to chart, not moved to format)
// ================================================================

function getSrc(bar, src) {
  switch (src) {
    case "open": return bar.open;
    case "high": return bar.high;
    case "low": return bar.low;
    case "hl2": return (bar.high + bar.low) / 2;
    case "hlc3": return (bar.high + bar.low + bar.close) / 3;
    case "ohlc4": return (bar.open + bar.high + bar.low + bar.close) / 4;
    default: return bar.close;
  }
}

function srcBars(bars, src) {
  return bars.map(b => ({ ...b, close: getSrc(b, src) }));
}

function snapToBar(bars, markTime) {
  if (!bars.length) return null;
  let lo = 0, hi = bars.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (bars[mid].time === markTime) return markTime;
    if (bars[mid].time < markTime) lo = mid + 1;
    else hi = mid - 1;
  }
  const prevIdx = lo - 1;
  if (prevIdx >= 0) return bars[prevIdx].time;
  return null;
}

function buildLWCMarkers(marks, bars, opts = {}) {
  const {
    buyColor = "#f97316",
    sellColor = "#a855f7",
    buyShape = "arrowUp",
    sellShape = "arrowDown",
    buyPos = "belowBar",
    sellPos = "aboveBar",
    prefix = "",
  } = opts;

  const merged = new Map();

  for (const m of marks) {
    const snapped = snapToBar(bars, m.time);
    if (snapped === null) continue;

    const isBuy = m.position === "BUY";
    const key = `${snapped}:${m.position}`;
    const usd = m.totalUsd ?? 0;
    const label = usd >= 1000 ? `${prefix}$${(usd / 1000).toFixed(1)}K` : `${prefix}$${usd.toFixed(1)}`;

    if (merged.has(key)) {
      const existing = merged.get(key);
      const combined = (m.totalUsd || 0) + (existing._rawUsd || 0);
      const newLabel = combined >= 1000 ? `${prefix}$${(combined / 1000).toFixed(1)}K` : `${prefix}$${combined.toFixed(1)}`;
      existing.text = newLabel;
      existing._rawUsd = combined;
    } else {
      merged.set(key, {
        time: snapped,
        position: isBuy ? buyPos : sellPos,
        color: isBuy ? buyColor : sellColor,
        shape: isBuy ? buyShape : sellShape,
        text: label,
        size: 1,
        _rawUsd: usd,
      });
    }
  }

  const result = Array.from(merged.values()).map(({ _rawUsd, ...m }) => m);
  result.sort((a, b) => a.time - b.time);
  return result;
}

function fmtWallet(w) {
  if (!w) return null;
  return `${w.slice(0, 6)}...${w.slice(-4)}`;
}

// ================================================================
// EventTooltip component
// ================================================================

function EventTooltip({ x, y, events, stats, containerRef, isFilterMode }) {
  if (!events?.length) return null;

  const devBuys = events.filter(e => e.type === "DEV_BUY");
  const devSells = events.filter(e => e.type === "DEV_SELL");
  const migrates = events.filter(e => e.type === "MIGRATE");

  const hasBuyStats = stats && stats.buyTxCount > 0;
  const hasSellStats = stats && stats.sellTxCount > 0;
  const statsRows = (hasBuyStats ? 3 : 0) + (hasSellStats ? 3 : 0) + (stats ? 1 : 0);
  const TW = 220;
  const TH = 80 + statsRows * 16 + devBuys.length * 22 + devSells.length * 22 + migrates.length * 22;

  const containerWidth = containerRef?.current?.clientWidth ?? 900;
  const containerHeight = containerRef?.current?.clientHeight ?? 400;

  let left = x + 16;
  let top = y - 12;

  if (left + TW > containerWidth - 8) left = x - TW - 12;
  if (top + TH > containerHeight - 8) top = containerHeight - TH - 8;
  if (top < 4) top = 4;

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        zIndex: 50,
        pointerEvents: "none",
        background: "rgba(15,15,18,0.96)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        padding: "10px 14px",
        minWidth: TW,
        fontFamily: "'JetBrains Mono','Fira Code',monospace",
        fontSize: 11,
        color: "#e4e4e7",
        boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: "#fff" }}>
        {events.some(e => ["DEV_BUY", "DEV_SELL", "MIGRATE"].includes(e.type)) && events.some(e => ["BUY", "SELL"].includes(e.type))
          ? "Activity"
          : events.some(e => ["BUY", "SELL"].includes(e.type))
          ? (isFilterMode ? "Activity" : "My Activity")
          : "Dev Activity"}
      </div>

      {stats && (
        <div
          style={{
            marginBottom: 8,
            fontSize: 10,
            color: "#a1a1aa",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            paddingBottom: 6,
          }}
        >
          {hasBuyStats && (
            <>
              <div style={{ color: "#22c55e", fontWeight: 600, marginBottom: 2 }}>Buy</div>
              <div>TXs: {stats.buyTxCount}</div>
              <div>Total: ${stats.buyTotalUsd?.toFixed(2)}</div>
              <div>Amount: {stats.buyTotalToken?.toFixed(0)}</div>
            </>
          )}
          {hasBuyStats && hasSellStats && <div style={{ margin: "4px 0" }} />}
          {hasSellStats && (
            <>
              <div style={{ color: "#ef4444", fontWeight: 600, marginBottom: 2, marginTop: hasBuyStats ? 4 : 0 }}>Sell</div>
              <div>TXs: {stats.sellTxCount}</div>
              <div>Total: ${stats.sellTotalUsd?.toFixed(2)}</div>
              <div>Amount: {stats.sellTotalToken?.toFixed(0)}</div>
            </>
          )}
          {stats.avgMcUsd > 0 && <div style={{ marginTop: 4 }}>Avg MC: ${stats.avgMcUsd?.toFixed(2)}</div>}
        </div>
      )}

      {devBuys.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
            <span style={{ color: "#22c55e" }}>Dev Buy</span>
            <span style={{ marginLeft: "auto" }}>×{devBuys.length}</span>
          </div>
          {devBuys[0]?.wallet && (
            <div style={{ fontSize: 10, color: "#71717a", marginTop: 2, paddingLeft: 14 }}>{fmtWallet(devBuys[0].wallet)}</div>
          )}
        </div>
      )}

      {devSells.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
            <span style={{ color: "#ef4444" }}>Dev Sell</span>
            <span style={{ marginLeft: "auto" }}>×{devSells.length}</span>
          </div>
          {devSells[0]?.wallet && (
            <div style={{ fontSize: 10, color: "#71717a", marginTop: 2, paddingLeft: 14 }}>{fmtWallet(devSells[0].wallet)}</div>
          )}
        </div>
      )}

      {migrates.length > 0 && (
        <div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", flexShrink: 0 }} />
            <span style={{ color: "#3b82f6" }}>Migrated</span>
          </div>
        </div>
      )}

      {events.filter(e => e.type === "BUY").length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
            <span style={{ color: "#22c55e" }}>{isFilterMode ? "Buy" : "My Buy"}</span>
            <span style={{ marginLeft: "auto" }}>×{events.filter(e => e.type === "BUY").length}</span>
          </div>
          {events.filter(e => e.type === "BUY")[0]?.stats?.buy?.totalUsd > 0 && (
            <div style={{ fontSize: 10, color: "#71717a", marginTop: 2, paddingLeft: 14 }}>
              ${events.filter(e => e.type === "BUY").reduce((s, e) => s + (e.stats?.buy?.totalUsd || 0), 0).toFixed(2)}
            </div>
          )}
        </div>
      )}

      {events.filter(e => e.type === "SELL").length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
            <span style={{ color: "#ef4444" }}>{isFilterMode ? "Sell" : "My Sell"}</span>
            <span style={{ marginLeft: "auto" }}>×{events.filter(e => e.type === "SELL").length}</span>
          </div>
          {events.filter(e => e.type === "SELL")[0]?.stats?.sell?.totalUsd > 0 && (
            <div style={{ fontSize: 10, color: "#71717a", marginTop: 2, paddingLeft: 14 }}>
              ${events.filter(e => e.type === "SELL").reduce((s, e) => s + (e.stats?.sell?.totalUsd || 0), 0).toFixed(2)}
            </div>
          )}
        </div>
      )}

      {events[0]?.txHash && (
        <div style={{ marginTop: 8, fontSize: 10, color: "#52525b" }}>
          tx: {events[0].txHash.slice(0, 10)}...{events[0].txHash.slice(-6)}
        </div>
      )}
    </div>
  );
}

// ================================================================
// SubIndicatorOverlay component
// ================================================================

function fmtSub(n) {
  if (n == null || !isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (abs >= 1) return n.toFixed(2);
  if (abs >= 0.001) return n.toFixed(4);
  return n.toExponential(2);
}

function SubIndicatorOverlay({ crosshair, barsSnap, indicatorConfig }) {
  const cfg = indicatorConfig;
  const active = [cfg.Volume?.enabled, cfg.MACD?.enabled, cfg.RSI?.enabled].filter(Boolean).length;
  if (!active) return null;

  const GAP = 0.01;
  const SUB_BOUNDARIES = { 1: [0.65], 2: [0.60, 0.80], 3: [0.60, 0.75, 0.875] };
  const boundaries = SUB_BOUNDARIES[active] || [];

  const slots = [];
  if (cfg.Volume?.enabled) slots.push("volume");
  if (cfg.MACD?.enabled) slots.push("macd");
  if (cfg.RSI?.enabled) slots.push("rsi");

  const bars = barsSnap;
  const barIdx = crosshair?.time != null ? bars.findLastIndex(b => b.time <= crosshair.time) : bars.length - 1;
  const bar = bars[barIdx];

  let macdVals = null;
  if (cfg.MACD?.enabled && bars.length > 0) {
    const ema = (arr, p) => {
      const k = 2 / (p + 1),
        out = new Array(arr.length).fill(null);
      let e = null;
      for (let i = 0; i < arr.length; i++) {
        if (e === null) {
          if (i >= p - 1) {
            let s = 0;
            for (let j = 0; j < p; j++) s += arr[i - j];
            e = s / p;
            out[i] = e;
          }
        } else {
          e = arr[i] * k + e * (1 - k);
          out[i] = e;
        }
      }
      return out;
    };
    const closes = bars.map(b => b.close);
    const ef = ema(closes, cfg.MACD.fast);
    const es = ema(closes, cfg.MACD.slow);
    const mac = ef.map((v, i) => (ef[i] != null && es[i] != null ? ef[i] - es[i] : null));
    const sig = ema(mac.map(v => v ?? 0), cfg.MACD.signal);
    const his = mac.map((v, i) => (v != null && sig[i] != null ? v - sig[i] : null));
    if (barIdx >= 0) macdVals = { macd: mac[barIdx], signal: sig[barIdx], hist: his[barIdx] };
  }

  let rsiVal = null;
  if (cfg.RSI?.enabled && bars.length > 0) {
    const period = cfg.RSI.period;
    const closes = bars.map(b => b.close);
    const rsi = new Array(bars.length).fill(null);
    if (bars.length > period) {
      let ag = 0,
        al = 0;
      for (let i = 1; i <= period; i++) {
        const d = closes[i] - closes[i - 1];
        if (d > 0) ag += d;
        else al -= d;
      }
      ag /= period;
      al /= period;
      rsi[period] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
      for (let i = period + 1; i < bars.length; i++) {
        const d = closes[i] - closes[i - 1];
        ag = (ag * (period - 1) + (d > 0 ? d : 0)) / period;
        al = (al * (period - 1) + (d < 0 ? -d : 0)) / period;
        rsi[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
      }
    }
    if (barIdx >= 0) rsiVal = rsi[barIdx];
  }

  const volVal = bar?.volume ?? null;

  return (
    <>
      {slots.map((id, slotIdx) => {
        const topPct = (boundaries[slotIdx] + GAP) * 100;
        let items = [];
        if (id === "volume" && volVal != null) {
          const color =
            bar?.close >= bar?.open
              ? cfg.Volume?.colorBull || "#26a69a"
              : cfg.Volume?.colorBear || "#ef5350";
          items = [{ label: "VOL", value: fmtSub(volVal), color }];
        }
        if (id === "macd" && macdVals) {
          const histColor =
            (macdVals.hist ?? 0) >= 0 ? cfg.MACD?.colorHistUp || "#26a69a" : cfg.MACD?.colorHistDown || "#ef5350";
          items = [
            { label: "MACD", value: fmtSub(macdVals.macd), color: cfg.MACD?.colorMACD || "#2196f3" },
            { label: "SIG", value: fmtSub(macdVals.signal), color: cfg.MACD?.colorSignal || "#e040fb" },
            { label: "HIST", value: fmtSub(macdVals.hist), color: histColor },
          ];
        }
        if (id === "rsi" && rsiVal != null) {
          const color =
            rsiVal >= (cfg.RSI?.overbought || 70)
              ? "#ef4444"
              : rsiVal <= (cfg.RSI?.oversold || 30)
              ? "#22c55e"
              : cfg.RSI?.color || "#f59e0b";
          items = [{ label: `RSI(${cfg.RSI?.period || 14})`, value: rsiVal.toFixed(2), color }];
        }
        if (!items.length) return null;
        return (
          <div
            key={id}
            style={{
              position: "absolute",
              top: `${topPct}%`,
              left: 10,
              zIndex: 20,
              pointerEvents: "none",
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              gap: 8,
              paddingTop: 5,
            }}
          >
            {items.map(({ label, value, color }) => (
              <span
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  fontFamily: "'JetBrains Mono','Fira Code',monospace",
                  fontSize: 10,
                }}
              >
                <span style={{ color: "#3f3f46", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {label}
                </span>
                <span style={{ color, fontWeight: 600 }}>{value}</span>
              </span>
            ))}
          </div>
        );
      })}
    </>
  );
}

// ================================================================
// CandleInfoOverlay component
// ================================================================

function fmtNum(n) {
  if (n == null || !isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(3)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(3)}K`;
  if (n >= 1) return `$${n.toFixed(4)}`;
  if (n >= 0.01) return `$${n.toFixed(6)}`;
  const s = n.toFixed(20),
    dec = s.split(".")[1] || "";
  let z = 0;
  for (const ch of dec) {
    if (ch === "0") z++;
    else break;
  }
  if (z >= 3) {
    const sig = dec.slice(z).replace(/0+$/, "").slice(0, 4) || "0";
    return `$0.0${sig}`;
  }
  return `$${n.toFixed(z + 6).replace(/0+$/, "")}`;
}

function fmtMcap(price, supply) {
  if (!price || !supply) return null;
  const mc = price * supply;
  if (mc >= 1_000_000_000) return `$${(mc / 1_000_000_000).toFixed(2)}B`;
  if (mc >= 1_000_000) return `$${(mc / 1_000_000).toFixed(2)}M`;
  if (mc >= 1_000) return `$${(mc / 1_000).toFixed(1)}K`;
  return `$${mc.toFixed(0)}`;
}

function fmtVolume(v) {
  if (!v) return null;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

function CandleInfoOverlay({ crosshair, lastBar, indicatorConfig, barsSnap, totalSupply, priceView }) {
  const bar = crosshair || lastBar;
  if (!bar) return null;

  const sup = totalSupply || 0;
  const isMcap = priceView === "mcap" && sup > 0;

  const isFromCrosshair = !!crosshair;
  const o = isFromCrosshair ? bar.o : isMcap ? bar.o * sup : bar.o;
  const h = isFromCrosshair ? bar.h : isMcap ? bar.h * sup : bar.h;
  const l = isFromCrosshair ? bar.l : isMcap ? bar.l * sup : bar.l;
  const c = isFromCrosshair ? bar.c : isMcap ? bar.c * sup : bar.c;

  const isBull = c >= o;
  const pct = o ? ((c - o) / o) * 100 : 0;
  const color = isBull ? "#26a69a" : "#ef5350";

  const cfg = indicatorConfig;
  const bars = barsSnap;
  const idx = bar.time ? bars.findLastIndex(b => b.time <= bar.time) : bars.length - 1;

  const scale = isMcap && sup > 0 ? sup : 1;

  const indLines = [];

  if (cfg.MA?.enabled) {
    cfg.MA.lines.forEach(ln => {
      if (!ln.enabled || !ln.period) return;
      const vals = calcMA(bars, ln.period);
      const v = vals[idx];
      if (v != null) indLines.push({ label: `MA${ln.period}`, value: v * scale, rawPrice: v, color: ln.color });
    });
  }

  if (cfg.EMA?.enabled) {
    cfg.EMA.lines.forEach(ln => {
      if (!ln.enabled || !ln.period) return;
      const vals = calcEMA(bars, ln.period);
      const v = vals[idx];
      if (v != null) indLines.push({ label: `EMA${ln.period}`, value: v * scale, rawPrice: v, color: ln.color });
    });
  }

  if (cfg.BOLL?.enabled) {
    const { mid, upper, lower } = calcBOLL(bars, cfg.BOLL.period, cfg.BOLL.mult);
    if (mid[idx] != null) indLines.push({ label: "BB Mid", value: mid[idx] * scale, rawPrice: mid[idx], color: cfg.BOLL.colorMid });
    if (upper[idx] != null) indLines.push({ label: "BB Up", value: upper[idx] * scale, rawPrice: upper[idx], color: cfg.BOLL.colorMid });
    if (lower[idx] != null) indLines.push({ label: "BB Lo", value: lower[idx] * scale, rawPrice: lower[idx], color: cfg.BOLL.colorMid });
  }

  if (cfg.SAR?.enabled) {
    const vals = calcSARFull(bars, cfg.SAR.step, cfg.SAR.max);
    const v = vals[idx];
    if (v != null) indLines.push({ label: "SAR", value: v * scale, rawPrice: v, color: cfg.SAR.color });
  }

  if (cfg.SUPER?.enabled) {
    const { values } = calcSupertrend(bars, cfg.SUPER.period, cfg.SUPER.mult);
    const v = values[idx];
    if (v != null) indLines.push({ label: "ST", value: v * scale, rawPrice: v, color: cfg.SUPER.colorBull });
  }

  const mcapDisplay = isMcap ? fmtNum(c) : sup > 0 ? fmtMcap(bar.c, sup) : null;

  const vol = fmtVolume(isFromCrosshair ? bar.vol : bar.volume);
  const tx = isFromCrosshair ? bar.tx : bar.txCount ?? null;

  const row = (label, val, col) => (
    <div key={label} className="lwc-info-row">
      <span className="lwc-info-lbl">{label}</span>
      <span className="lwc-info-val" style={{ color: col || "#e4e4e7" }}>
        {val}
      </span>
    </div>
  );

  return (
    <div className="lwc-info-overlay">
      <div className="lwc-info-ohlcv">
        {row("O", fmtNum(o), color)}
        {row("H", fmtNum(h), "#26a69a")}
        {row("L", fmtNum(l), "#ef5350")}
        {row("C", fmtNum(c), color)}
        {vol && row("V", vol, "#71717a")}
        {tx != null && tx > 0 && row("TX", Number(tx).toLocaleString(), "#52525b")}
        <span className="lwc-info-pct" style={{ color }}>
          {pct >= 0 ? "+" : ""}
          {pct.toFixed(2)}%
        </span>
      </div>
      {mcapDisplay && <div className="lwc-info-mc">{row("MC", mcapDisplay, "#a1a1aa")}</div>}
      {indLines.map(({ label, value, rawPrice, color: ic }) => (
        <div key={label} className="lwc-info-ind-row">
          <span className="lwc-info-ind-dot" style={{ background: ic }} />
          <span className="lwc-info-lbl">{label}</span>
          {isMcap ? (
            <>
              <span className="lwc-info-val" style={{ color: ic }}>
                {fmtNum(value)}
              </span>
              <span className="lwc-info-val lwc-info-val--muted">{fmtNum(rawPrice)}</span>
            </>
          ) : (
            <>
              <span className="lwc-info-val" style={{ color: ic }}>
                {fmtNum(value)}
              </span>
              {sup > 0 && <span className="lwc-info-val lwc-info-val--muted">{fmtMcap(value, sup)}</span>}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ================================================================
// AvgBuyOverlay component
// ================================================================

function AvgBuyOverlay({ avgBuyPrice, currentPrice, priceView, totalSupply }) {
  if (!avgBuyPrice || avgBuyPrice <= 0) return null;

  const sup = totalSupply || 0;
  const isMcap = priceView === "mcap" && sup > 0;

  const refPrice = isMcap ? avgBuyPrice * sup : avgBuyPrice;
  const curPrice = currentPrice > 0 ? (isMcap ? currentPrice * sup : currentPrice) : 0;

  const hasPnl = curPrice > 0 && refPrice > 0;
  const pnlPct = hasPnl ? ((curPrice - refPrice) / refPrice) * 100 : null;
  const isPos = pnlPct !== null && pnlPct >= 0;

  return (
    <div style={{ position: "absolute", bottom: 36, right: 72, zIndex: 20, pointerEvents: "none" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(15,15,18,0.9)",
          border: "1px solid rgba(249,115,22,0.4)",
          borderRadius: 5,
          padding: "3px 8px",
          backdropFilter: "blur(8px)",
          whiteSpace: "nowrap",
        }}
      >
        <svg width="18" height="8" viewBox="0 0 18 8" style={{ flexShrink: 0 }}>
          <line x1="0" y1="4" x2="18" y2="4" stroke="#f97316" strokeWidth="1.5" strokeDasharray="3 2" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#f97316", fontFamily: "'JetBrains Mono','Fira Code',monospace" }}>
          Avg Buy {fmtNum(refPrice)}
        </span>
        {pnlPct !== null && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: isPos ? "#22c55e" : "#ef4444",
              fontFamily: "'JetBrains Mono','Fira Code',monospace",
            }}
          >
            {isPos ? "+" : ""}
            {pnlPct.toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function loadImageBlob(url) {
  return fetch(url)
    .then(r => r.blob())
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(blobUrl); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(); };
        img.src = blobUrl;
      });
    });
}

// ================================================================
// Main ChartWindows Component
// ================================================================

export default function ChartWindows({
  tokenAddress,
  tokenSymbol,
  totalSupply,
  filterAddr,
  onSubIndCountChange,
  token,       
  liveStats,
  onCandleClick
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const sarRef = useRef(null);
  const wsRef = useRef(null);
  const destroyRef = useRef(false);
  const barsRef = useRef([]);
  const priceFmtRef = useRef({ type: "price", precision: 8, minMove: 0.00000001 });
  const drawEngineRef = useRef(null);
  const lcRef = useRef(null);
  const mainIndSeriesRef = useRef([]);
  const subIndSeriesRef = useRef([]);
  const avgBuyLineRef = useRef(null);
  const avgBuyPriceRef = useRef(null);
  const chartTypeRef = useRef("candlestick");
  const indCfgRef = useRef(null);

  if (indCfgRef.current === null) {
    try {
      const saved = localStorage.getItem("lwc_indicator_config");
      indCfgRef.current = saved ? { ...DEFAULT_INDICATOR_CONFIG, ...JSON.parse(saved) } : DEFAULT_INDICATOR_CONFIG;
    } catch {
      indCfgRef.current = DEFAULT_INDICATOR_CONFIG;
    }
  }

  const wsReadyRef = useRef(false);
  const wsBufferRef = useRef([]);
  const devMarkersRef = useRef([]);
  const walletMarkersRef = useRef([]);
  const migMarkersRef = useRef([]);
  const rawEventsRef = useRef([]);
  const rawWalletEventsRef = useRef([]);

  const [tf, setTf] = useState("1m");
  const [range, setRange] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [crosshair, setCrosshair] = useState(null);
  const [activeTool, setActiveTool] = useState("cursor");
  const [scaleMode, setScaleMode] = useState("normal");
  const [priceView, setPriceView] = useState("price");
  const priceViewRef = useRef("price");
  const [chartType, setChartType] = useState("candlestick");
  const [display, setDisplay] = useState({ sar: true, grid: true, wm: true });
  const [utcTime, setUtcTime] = useState(() => {
    const d = new Date();
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(
      d.getUTCSeconds()
    ).padStart(2, "0")} UTC`;
  });
  const [indicatorOpen, setIndicatorOpen] = useState(false);
  const [indicatorConfig, setIndicatorConfig] = useState(() => {
    try {
      const saved = localStorage.getItem("lwc_indicator_config");
      if (saved) return { ...DEFAULT_INDICATOR_CONFIG, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_INDICATOR_CONFIG;
  });
  const [barsSnap, setBarsSnap] = useState([]);
  const [eventTooltip, setEventTooltip] = useState(null);
  const [displayOptions, setDisplayOptions] = useState(DEFAULT_DISPLAY_OPTIONS);
  const [avgBuyPrice, setAvgBuyPrice] = useState(null);

  useEffect(() => {
    chartTypeRef.current = chartType;
  }, [chartType]);
  useEffect(() => {
    indCfgRef.current = indicatorConfig;
  }, [indicatorConfig]);
  useEffect(() => {
    try {
      localStorage.setItem("lwc_indicator_config", JSON.stringify(indicatorConfig));
    } catch {}
  }, [indicatorConfig]);

  // Update price scale when priceView or totalSupply changes
  useEffect(() => {
    priceViewRef.current = priceView;
    const bars = barsRef.current;
    if (!bars.length || !candleRef.current) return;
    const sup = totalSupply || 0;
    const isMcap = priceView === "mcap" && sup > 0;
    const isLine = chartTypeRef.current === "line" || chartTypeRef.current === "area";
    const pf = isMcap ? { type: "price", precision: 2, minMove: 0.01 } : buildPriceFormat(bars);
    candleRef.current.applyOptions({ priceFormat: pf });
    candleRef.current.setData(
      bars.map(b => {
        const o = isMcap ? b.open * sup : b.open;
        const h = isMcap ? b.high * sup : b.high;
        const l = isMcap ? b.low * sup : b.low;
        const c = isMcap ? b.close * sup : b.close;
        return isLine ? { time: b.time, value: c } : { time: b.time, open: o, high: h, low: l, close: c };
      })
    );
    requestAnimationFrame(() => applyAllMarkers());
    applyMainIndicators(bars, indCfgRef.current);
    applySubIndicators(bars, indCfgRef.current);
    setTimeout(() => {
      if (!candleRef.current || (!avgBuyLineRef.current && !avgBuyPriceRef.current)) return;
      if (avgBuyLineRef.current) {
        try {
          candleRef.current.removePriceLine(avgBuyLineRef.current);
        } catch {}
        avgBuyLineRef.current = null;
      }
      const avg = avgBuyPriceRef.current;
      if (!avg || avg <= 0) return;
      const _sup = totalSupply || 0;
      const _isMcap = priceViewRef.current === "mcap" && _sup > 0;
      avgBuyLineRef.current = candleRef.current.createPriceLine({
        price: _isMcap ? avg * _sup : avg,
        color: "#f97316",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "Avg Buy",
      });
    }, 50);
  }, [priceView, totalSupply]);

  // Update UTC time every second
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setUtcTime(
        `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(
          d.getUTCSeconds()
        ).padStart(2, "0")} UTC`
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Apply scale mode
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.priceScale("right").applyOptions({ mode: scaleMode === "log" ? 1 : scaleMode === "%" ? 2 : 0 });
  }, [scaleMode]);

  // Update time scale visibility
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      timeScale: {
        timeVisible: true,
        secondsVisible: tf === "1s" || tf === "30s",
        visible: true,
      },
    });
  }, [tf]);

  // Set visible range based on selected range
  useEffect(() => {
    if (!chartRef.current || !range) return;
    const opt = RANGE_OPTIONS.find(r => r.value === range);
    if (!opt) return;
    chartRef.current
      .timeScale()
      .setVisibleRange({ from: Math.floor(Date.now() / 1000) - opt.seconds, to: Math.floor(Date.now() / 1000) });
  }, [range]);

  // Set cursor style based on active tool
  useEffect(() => {
    drawEngineRef.current?.setTool(activeTool);
    const el = containerRef.current;
    if (!el) return;
    const cursors = { cursor: "default", eraser: "cell", text: "text", zoom: "zoom-in" };
    el.style.cursor = cursors[activeTool] ?? "crosshair";
  }, [activeTool]);

  // Fetch avg buy price
  const fetchAvgBuy = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !tokenAddress) return;
    try {
      const data = await userApi.getPosition(tokenAddress);
      const avg = data?.avgBuyPrice ?? 0;
      setAvgBuyPrice(avg > 0 ? avg : null);
    } catch (err) {
      console.error("[ChartWindows] fetchAvgBuy error:", err);
      setAvgBuyPrice(null);
    }
  }, [tokenAddress]);

  useEffect(() => {
    fetchAvgBuy();
  }, [fetchAvgBuy]);

  const applyAvgBuyLine = useCallback(
    avg => {
      if (!candleRef.current) return;
      if (avgBuyLineRef.current) {
        try {
          candleRef.current.removePriceLine(avgBuyLineRef.current);
        } catch {}
        avgBuyLineRef.current = null;
      }
      if (!avg || avg <= 0) return;
      const sup = totalSupply || 0;
      const isMcap = priceViewRef.current === "mcap" && sup > 0;
      const linePrice = isMcap ? avg * sup : avg;
      avgBuyLineRef.current = candleRef.current.createPriceLine({
        price: linePrice,
        color: "#f97316",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "Avg Buy",
      });
    },
    [totalSupply]
  );

  // Subscribe to chart click events (not series click)
useEffect(() => {
  if (!chartRef.current || !onCandleClick) return;

  const handleChartClick = (param) => {
    // param.time tersedia ketika klik pada area chart (bukan area kosong)
    if (param && param.time) {
      onCandleClick(param.time, tf);
    }
  };

  chartRef.current.subscribeClick(handleChartClick);

  return () => {
    if (chartRef.current) {
      chartRef.current.unsubscribeClick(handleChartClick);
    }
  };
}, [chartRef.current, onCandleClick, tf]);

  useEffect(() => {
    avgBuyPriceRef.current = avgBuyPrice;
    applyAvgBuyLine(displayOptions.avgBuyLine ? avgBuyPrice : null);
  }, [avgBuyPrice, displayOptions.avgBuyLine, applyAvgBuyLine]);

  const displayOptsRef = useRef(DEFAULT_DISPLAY_OPTIONS);
  useEffect(() => {
    displayOptsRef.current = displayOptions;
  }, [displayOptions]);

  const applyAllMarkers = useCallback(() => {
    if (!candleRef.current) return;
    const opts = displayOptsRef.current;
    const all = [
      ...(opts.devActivity ? devMarkersRef.current : []),
      ...(opts.myOrders ? walletMarkersRef.current : []),
      ...(opts.migration ? migMarkersRef.current : []),
    ].sort((a, b) => a.time - b.time);
    candleRef.current.setMarkers(all);
  }, []);

  const applyMainIndicators = useCallback(
    (bars, cfg) => {
      const chart = chartRef.current;
      if (!chart || !bars?.length) return;
      mainIndSeriesRef.current.forEach(s => {
        try {
          chart.removeSeries(s);
        } catch {}
      });
      mainIndSeriesRef.current = [];

      const pf = { type: "price", precision: 8, minMove: 0.00000001 };
      const list = [];
      const toD = vals => vals.map((v, i) => (v != null ? { time: bars[i].time, value: v } : null)).filter(Boolean);
      const addL = (opts, data) => {
        const s = chart.addLineSeries({
          crosshairMarkerVisible: false,
          lastValueVisible: false,
          priceLineVisible: false,
          priceFormat: pf,
          ...opts,
        });
        s.setData(data);
        list.push(s);
        return s;
      };

      const sup = totalSupply || 0;
      const isMcap = priceViewRef.current === "mcap" && sup > 0;
      const scaledBars = isMcap
        ? bars.map(b => ({ ...b, open: b.open * sup, high: b.high * sup, low: b.low * sup, close: b.close * sup }))
        : bars;

      if (cfg.MA.enabled) {
        cfg.MA.lines.forEach(l => {
          if (!l.enabled || !l.period) return;
          addL({ color: l.color, lineWidth: 1.5, lineStyle: l.style }, toD(calcMA(srcBars(scaledBars, l.src), l.period)));
        });
      }

      if (cfg.EMA.enabled) {
        cfg.EMA.lines.forEach(l => {
          if (!l.enabled || !l.period) return;
          addL({ color: l.color, lineWidth: 1.5, lineStyle: l.style }, toD(calcEMA(srcBars(scaledBars, l.src), l.period)));
        });
      }

      if (cfg.BOLL.enabled) {
        const { mid, upper, lower } = calcBOLL(srcBars(scaledBars, cfg.BOLL.src), cfg.BOLL.period, cfg.BOLL.mult);
        addL({ color: cfg.BOLL.colorMid, lineWidth: 1 }, toD(mid));
        addL({ color: cfg.BOLL.colorMid, lineWidth: 1, lineStyle: 2 }, toD(upper));
        addL({ color: cfg.BOLL.colorMid, lineWidth: 1, lineStyle: 2 }, toD(lower));
      }

      if (cfg.SAR.enabled) {
        const vals = calcSARFull(scaledBars, cfg.SAR.step, cfg.SAR.max);
        const s = chart.addLineSeries({
          color: cfg.SAR.color,
          lineVisible: false,
          crosshairMarkerVisible: false,
          lastValueVisible: false,
          priceLineVisible: false,
          pointMarkersVisible: true,
          pointMarkersRadius: 1,
          priceFormat: pf,
        });
        const data = vals.map((v, i) => (v != null ? { time: scaledBars[i].time, value: v } : null)).filter(Boolean);
        s.setData(data);
        list.push(s);
      }

      if (cfg.SUPER.enabled) {
        const { values, bull } = calcSupertrend(scaledBars, cfg.SUPER.period, cfg.SUPER.mult);
        const bullData = [],
          bearData = [];
        for (let i = 0; i < values.length; i++) {
          const v = values[i];
          if (v == null) continue;
          const pt = { time: scaledBars[i].time, value: v };
          if (bull[i]) {
            bullData.push(pt);
            if (i > 0 && !bull[i - 1] && values[i - 1] != null) bearData.push(pt);
          } else {
            bearData.push(pt);
            if (i > 0 && bull[i - 1] && values[i - 1] != null) bullData.push(pt);
          }
        }
        const sBull = chart.addLineSeries({
          color: cfg.SUPER.colorBull,
          lineWidth: 2,
          crosshairMarkerVisible: false,
          lastValueVisible: false,
          priceLineVisible: false,
          priceFormat: pf,
        });
        const sBear = chart.addLineSeries({
          color: cfg.SUPER.colorBear,
          lineWidth: 2,
          crosshairMarkerVisible: false,
          lastValueVisible: false,
          priceLineVisible: false,
          priceFormat: pf,
        });
        sBull.setData(bullData);
        sBear.setData(bearData);
        list.push(sBull, sBear);
      }
      mainIndSeriesRef.current = list;
    },
    [totalSupply]
  );

  const applySubIndicators = useCallback(
    (bars, cfg) => {
      const chart = chartRef.current;
      if (!chart || !bars?.length) return;
      subIndSeriesRef.current.forEach(s => {
        try {
          chart.removeSeries(s);
        } catch {}
      });
      subIndSeriesRef.current = [];
      const list = [];
      const base = { crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false };
      const active = [cfg.Volume?.enabled, cfg.MACD?.enabled, cfg.RSI?.enabled].filter(Boolean).length;
      const GAP = 0.01;
      const SUB_BOUNDARIES = { 0: [], 1: [0.65], 2: [0.6, 0.8], 3: [0.6, 0.75, 0.875] };
      const boundaries = SUB_BOUNDARIES[active] || [];
      const MAIN_FRAC = active === 0 ? 1.0 : boundaries[0];
      const slots = [];
      if (cfg.Volume?.enabled) slots.push("volume");
      if (cfg.MACD?.enabled) slots.push("macd");
      if (cfg.RSI?.enabled) slots.push("rsi");
      const getMargins = slotIdx => {
        const topFrac = boundaries[slotIdx] + GAP;
        const endFrac = slotIdx + 1 < boundaries.length ? boundaries[slotIdx + 1] : 1.0;
        const bottomFrac = 1.0 - endFrac + GAP;
        return { top: Math.max(0, Math.min(0.98, topFrac)), bottom: Math.max(0, Math.min(0.98, bottomFrac)) };
      };
      const mainBottom = active > 0 ? 1.0 - MAIN_FRAC + GAP : 0.02;
      chart.applyOptions({ rightPriceScale: { scaleMargins: { top: 0.05, bottom: mainBottom } } });
      if (candleRef.current)
        candleRef.current.priceScale().applyOptions({ scaleMargins: { top: 0.05, bottom: mainBottom } });
      if (cfg.Volume?.enabled) {
        const margins = getMargins(slots.indexOf("volume"));
        chart.applyOptions({ leftPriceScale: { visible: false, scaleMargins: margins } });
        const s = chart.addHistogramSeries({ ...base, priceScaleId: "left", priceFormat: { type: "volume" } });
        s.setData(
          bars.map(b => ({
            time: b.time,
            value: b.volume || 0,
            color: b.close >= b.open ? cfg.Volume.colorBull : cfg.Volume.colorBear,
          }))
        );
        list.push(s);
      } else {
        chart.applyOptions({ leftPriceScale: { visible: false } });
      }
      if (cfg.MACD?.enabled) {
        const margins = getMargins(slots.indexOf("macd"));
        const closes = bars.map(b => b.close);
        const ema = (arr, p) => {
          const k = 2 / (p + 1),
            out = new Array(arr.length).fill(null);
          let e = null;
          for (let i = 0; i < arr.length; i++) {
            if (e === null) {
              if (i >= p - 1) {
                let s = 0;
                for (let j = 0; j < p; j++) s += arr[i - j];
                e = s / p;
                out[i] = e;
              }
            } else {
              e = arr[i] * k + e * (1 - k);
              out[i] = e;
            }
          }
          return out;
        };
        const ef = ema(closes, cfg.MACD.fast);
        const es = ema(closes, cfg.MACD.slow);
        const mac = ef.map((v, i) => (ef[i] != null && es[i] != null ? ef[i] - es[i] : null));
        const sig = ema(mac.map(v => v ?? 0), cfg.MACD.signal);
        const his = mac.map((v, i) => (v != null && sig[i] != null ? v - sig[i] : null));
        const scaleId = "macd";
        const sH = chart.addHistogramSeries({ ...base, priceScaleId: scaleId });
        sH.setData(
          his
            .map((v, i) =>
              v != null
                ? {
                    time: bars[i].time,
                    value: v,
                    color: v >= 0 ? cfg.MACD.colorHistUp : cfg.MACD.colorHistDown,
                  }
                : null
            )
            .filter(Boolean)
        );
        const sM = chart.addLineSeries({ ...base, priceScaleId: scaleId, color: cfg.MACD.colorMACD, lineWidth: 1.5 });
        const sS = chart.addLineSeries({ ...base, priceScaleId: scaleId, color: cfg.MACD.colorSignal, lineWidth: 1.5 });
        sM.setData(mac.map((v, i) => (v != null ? { time: bars[i].time, value: v } : null)).filter(Boolean));
        sS.setData(sig.map((v, i) => (v != null ? { time: bars[i].time, value: v } : null)).filter(Boolean));
        sH.priceScale().applyOptions({ scaleMargins: margins });
        list.push(sH, sM, sS);
      }
      if (cfg.RSI?.enabled) {
        const margins = getMargins(slots.indexOf("rsi"));
        const period = cfg.RSI.period;
        const closes = bars.map(b => b.close);
        const rsi = new Array(bars.length).fill(null);
        if (bars.length > period) {
          let ag = 0,
            al = 0;
          for (let i = 1; i <= period; i++) {
            const d = closes[i] - closes[i - 1];
            if (d > 0) ag += d;
            else al -= d;
          }
          ag /= period;
          al /= period;
          rsi[period] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
          for (let i = period + 1; i < bars.length; i++) {
            const d = closes[i] - closes[i - 1];
            ag = (ag * (period - 1) + (d > 0 ? d : 0)) / period;
            al = (al * (period - 1) + (d < 0 ? -d : 0)) / period;
            rsi[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
          }
        }
        const scaleId = "rsi";
        const sR = chart.addLineSeries({ ...base, priceScaleId: scaleId, color: cfg.RSI.color, lineWidth: 1.5 });
        sR.setData(rsi.map((v, i) => (v != null ? { time: bars[i].time, value: v } : null)).filter(Boolean));
        const lvl = (val, color) => {
          const s = chart.addLineSeries({ ...base, priceScaleId: scaleId, color, lineWidth: 1, lineStyle: 2 });
          s.setData(bars.map(b => ({ time: b.time, value: val })));
          list.push(s);
        };
        lvl(cfg.RSI.overbought, "rgba(239,83,80,0.4)");
        lvl(cfg.RSI.oversold, "rgba(38,166,154,0.4)");
        lvl(50, "rgba(255,255,255,0.07)");
        sR.priceScale().applyOptions({ scaleMargins: margins, autoScale: false, minValue: 0, maxValue: 100 });
        list.push(sR);
      }
      subIndSeriesRef.current = list;
    },
    []
  );

  const buildChart = useCallback(
    initialBars => {
      if (!containerRef.current || !window.LightweightCharts) return;
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch {}
        chartRef.current = null;
        candleRef.current = null;
        sarRef.current = null;
      }
      if (drawEngineRef.current) {
        drawEngineRef.current.destroy();
        drawEngineRef.current = null;
      }
      mainIndSeriesRef.current = [];
      const LC = window.LightweightCharts;
      const el = containerRef.current;
      const pf = initialBars?.length ? buildPriceFormat(initialBars) : priceFmtRef.current;
      priceFmtRef.current = pf;
      const chart = LC.createChart(el, {
        width: el.clientWidth || 900,
        height: el.clientHeight || 400,
        layout: {
          background: { type: "solid", color: "#0a0a0c" },
          textColor: "#52525b",
          fontFamily: "'JetBrains Mono','Fira Code',monospace",
          fontSize: window.innerWidth <= 640 ? 9 : 11,
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.03)", visible: display.grid },
          horzLines: { color: "rgba(255,255,255,0.03)", visible: display.grid },
        },
        crosshair: {
          mode: 1,
          vertLine: {
            color: "rgba(255,255,255,0.18)",
            width: 1,
            style: 3,
            labelBackgroundColor: "#1c1c1f",
            labelVisible: false,
          },
          horzLine: {
            color: "rgba(255,255,255,0.18)",
            width: 1,
            style: 3,
            labelBackgroundColor: "#26a69a",
          },
        },
        rightPriceScale: {
          borderColor: "rgba(255,255,255,0.05)",
          textColor: "#71717a",
          scaleMargins: { top: 0.05, bottom: 0.02 },
          mode: scaleMode === "log" ? 1 : scaleMode === "%" ? 2 : 0,
          minimumWidth: window.innerWidth <= 640 ? 68 : 90,
        },
        timeScale: {
          borderColor: "rgba(255,255,255,0.05)",
          timeVisible: true,
          secondsVisible: tf === "1s" || tf === "30s",
          rightOffset: 8,
          barSpacing: 8,
          lockVisibleTimeRangeOnResize: true,
        },
        watermark: { visible: false },
      });
      chartRef.current = chart;
      const ct = chartTypeRef.current;
      let ms;
      if (ct === "bar") ms = chart.addBarSeries({ upColor: "#26a69a", downColor: "#ef5350", thinBars: false, priceFormat: pf });
      else if (ct === "line") ms = chart.addLineSeries({ color: "#26a69a", lineWidth: 2, crosshairMarkerVisible: true, lastValueVisible: true, priceLineVisible: true, priceFormat: pf });
      else if (ct === "area") ms = chart.addAreaSeries({ lineColor: "#26a69a", topColor: "rgba(38,166,154,0.28)", bottomColor: "rgba(38,166,154,0.02)", lineWidth: 2, priceFormat: pf });
      else if (ct === "hollow") ms = chart.addCandlestickSeries({ upColor: "transparent", downColor: "transparent", borderUpColor: "#26a69a", borderDownColor: "#ef5350", wickUpColor: "#26a69a", wickDownColor: "#ef5350", priceFormat: pf });
      else ms = chart.addCandlestickSeries({ upColor: "#26a69a", downColor: "#ef5350", borderUpColor: "#26a69a", borderDownColor: "#ef5350", wickUpColor: "#26a69a", wickDownColor: "#ef5350", priceFormat: pf });
      candleRef.current = ms;
      const sarS = chart.addLineSeries({
        color: "rgba(0,0,0,0)",
        lineVisible: false,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
        pointMarkersVisible: false,
        visible: false,
        priceFormat: pf,
      });
      sarRef.current = sarS;
      chart.subscribeCrosshairMove(param => {
        if (!param?.time || !param.seriesData) {
          setCrosshair(null);
          setEventTooltip(null);
          return;
        }
        const c = param.seriesData.get(ms);
        if (!c) {
          setCrosshair(null);
          setEventTooltip(null);
          return;
        }
        const isOHLC = c.open !== undefined;
        const cl = isOHLC ? c.close : c.value;
        const op = isOHLC ? c.open : c.value;
        const rawBar = barsRef.current.find(b => b.time === param.time);
        setCrosshair({
          time: param.time,
          o: op,
          h: isOHLC ? c.high : c.value,
          l: isOHLC ? c.low : c.value,
          c: cl,
          vol: rawBar?.volume ?? 0,
          tx: rawBar?.txCount ?? null,
          sar: null,
        });
        const barTime = param.time;
        const matchedDev = rawEventsRef.current.find(ev => ev.snapped === barTime);
        const matchedWallet = rawWalletEventsRef.current.find(ev => ev.snapped === barTime);
        if ((matchedDev || matchedWallet) && param.point) {
          const allEvents = [...(matchedDev?.events || []), ...(matchedWallet?.events || [])];
          const ds = matchedDev?.stats || {};
          const ws = matchedWallet?.stats || {};
          const mergedStats = {
            buyTxCount: (ds.buyTxCount || 0) + (ws.buyTxCount || 0),
            buyTotalUsd: (ds.buyTotalUsd || 0) + (ws.buyTotalUsd || 0),
            buyTotalToken: (ds.buyTotalToken || 0) + (ws.buyTotalToken || 0),
            sellTxCount: (ds.sellTxCount || 0) + (ws.sellTxCount || 0),
            sellTotalUsd: (ds.sellTotalUsd || 0) + (ws.sellTotalUsd || 0),
            sellTotalToken: (ds.sellTotalToken || 0) + (ws.sellTotalToken || 0),
            avgMcUsd: ds.avgMcUsd || ws.avgMcUsd || 0,
          };
          setEventTooltip({ x: param.point.x, y: param.point.y, events: allEvents, stats: mergedStats });
        } else {
          setEventTooltip(null);
        }
      });
      const ro = new ResizeObserver(() => {
        if (chartRef.current && containerRef.current)
          chartRef.current.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
        drawEngineRef.current?.redraw();
      });
      ro.observe(el);
      const eng = new DrawingEngine(chart, el);
      eng.setTool(activeTool);
      drawEngineRef.current = eng;
      return () => ro.disconnect();
    },
    [tf, scaleMode, display.grid, display.wm, display.sar, activeTool]
  );

  useEffect(() => {
    const chart = chartRef.current,
      bars = barsRef.current;
    if (!chart || !bars.length) return;
    const pf = priceFmtRef.current;
    const isLine = chartType === "line" || chartType === "area";
    if (candleRef.current) {
      try {
        chart.removeSeries(candleRef.current);
      } catch {}
      candleRef.current = null;
    }
    let ns;
    if (chartType === "bar") ns = chart.addBarSeries({ upColor: "#26a69a", downColor: "#ef5350", thinBars: false, priceFormat: pf });
    else if (chartType === "line") ns = chart.addLineSeries({ color: "#26a69a", lineWidth: 2, crosshairMarkerVisible: true, lastValueVisible: true, priceLineVisible: true, priceFormat: pf });
    else if (chartType === "area") ns = chart.addAreaSeries({ lineColor: "#26a69a", topColor: "rgba(38,166,154,0.28)", bottomColor: "rgba(38,166,154,0.02)", lineWidth: 2, priceFormat: pf });
    else if (chartType === "hollow") ns = chart.addCandlestickSeries({ upColor: "transparent", downColor: "transparent", borderUpColor: "#26a69a", borderDownColor: "#ef5350", wickUpColor: "#26a69a", wickDownColor: "#ef5350", priceFormat: pf });
    else ns = chart.addCandlestickSeries({ upColor: "#26a69a", downColor: "#ef5350", borderUpColor: "#26a69a", borderDownColor: "#ef5350", wickUpColor: "#26a69a", wickDownColor: "#ef5350", priceFormat: pf });
    candleRef.current = ns;
    const sup = totalSupply || 0;
    const isMcap = priceViewRef.current === "mcap" && sup > 0;
    ns.setData(
      bars.map(b => {
        const o = isMcap ? b.open * sup : b.open,
          h = isMcap ? b.high * sup : b.high;
        const l = isMcap ? b.low * sup : b.low,
          c = isMcap ? b.close * sup : b.close;
        return isLine ? { time: b.time, value: c } : { time: b.time, open: o, high: h, low: l, close: c };
      })
    );
    applyAllMarkers();
    chart.timeScale().scrollToRealTime();
  }, [chartType, applyAllMarkers, totalSupply]);

  const applyData = useCallback(
    bars => {
      if (!candleRef.current || !bars.length) return;
      const sup = totalSupply || 0;
      const isMcap = priceViewRef.current === "mcap" && sup > 0;
      const pf = isMcap ? { type: "price", precision: 2, minMove: 0.01 } : buildPriceFormat(bars);
      priceFmtRef.current = pf;
      candleRef.current.applyOptions({ priceFormat: pf });
      const isLine = chartTypeRef.current === "line" || chartTypeRef.current === "area";
      candleRef.current.setData(
        bars.map(b => {
          const o = isMcap ? b.open * sup : b.open,
            h = isMcap ? b.high * sup : b.high;
          const l = isMcap ? b.low * sup : b.low,
            c = isMcap ? b.close * sup : b.close;
          return isLine ? { time: b.time, value: c } : { time: b.time, open: o, high: h, low: l, close: c };
        })
      );
      chartRef.current?.timeScale().scrollToRealTime();
      requestAnimationFrame(() => applyAllMarkers());
    },
    [applyAllMarkers, totalSupply]
  );

  const fetchEvents = useCallback(
    async bars => {
      if (!tokenAddress || !bars.length) return;
      devMarkersRef.current = [];
      migMarkersRef.current = [];
      try {
        const events = await tokensApi.getEvents(tokenAddress, 500);
        if (!Array.isArray(events) || !events.length) {
          applyAllMarkers();
          return;
        }
        const devList = [];
        const migList = [];
        const rawMap = new Map();
        for (const ev of events) {
          const snapped = snapToBar(bars, ev.time);
          if (snapped === null) continue;
          if (ev.type === "DEV_BUY") {
            devList.push({ time: snapped, position: "belowBar", color: ev.color ?? "#22c55e", shape: "arrowUp", text: ev.label ?? "DB", size: 1 });
          }
          if (ev.type === "DEV_SELL") {
            devList.push({ time: snapped, position: "aboveBar", color: ev.color ?? "#ef4444", shape: "arrowDown", text: ev.label ?? "DS", size: 1 });
          }
          if (ev.type === "MIGRATE") {
            migList.push({ time: snapped, position: "aboveBar", color: ev.color ?? "#3b82f6", shape: "arrowDown", text: "M", size: 2 });
          }
          if (!rawMap.has(snapped)) {
            rawMap.set(snapped, { snapped, events: [], stats: { buyTxCount: 0, buyTotalUsd: 0, buyTotalToken: 0, sellTxCount: 0, sellTotalUsd: 0, sellTotalToken: 0, avgMcUsdSum: 0, avgMcCount: 0 } });
          }
          const bucket = rawMap.get(snapped);
          bucket.events.push(ev);
          const s = ev.stats || {};
          if (ev.type === "DEV_BUY") {
            bucket.stats.buyTxCount += s.buy?.txCount || 0;
            bucket.stats.buyTotalUsd += s.buy?.totalUsd || 0;
            bucket.stats.buyTotalToken += s.buy?.totalToken || 0;
          }
          if (ev.type === "DEV_SELL") {
            bucket.stats.sellTxCount += s.sell?.txCount || 0;
            bucket.stats.sellTotalUsd += s.sell?.totalUsd || 0;
            bucket.stats.sellTotalToken += s.sell?.totalToken || 0;
          }
          if (s.avgMcUsd > 0) {
            bucket.stats.avgMcUsdSum += s.avgMcUsd;
            bucket.stats.avgMcCount += 1;
          }
        }
        const finalRaw = [];
        for (const [, val] of rawMap) {
          const avgMc = val.stats.avgMcCount > 0 ? val.stats.avgMcUsdSum / val.stats.avgMcCount : 0;
          finalRaw.push({
            snapped: val.snapped,
            events: val.events,
            stats: {
              buyTxCount: val.stats.buyTxCount,
              buyTotalUsd: val.stats.buyTotalUsd,
              buyTotalToken: val.stats.buyTotalToken,
              sellTxCount: val.stats.sellTxCount,
              sellTotalUsd: val.stats.sellTotalUsd,
              sellTotalToken: val.stats.sellTotalToken,
              avgMcUsd: avgMc,
            },
          });
        }
        devList.sort((a, b) => a.time - b.time);
        migList.sort((a, b) => a.time - b.time);
        devMarkersRef.current = devList;
        migMarkersRef.current = migList;
        rawEventsRef.current = finalRaw;
        applyAllMarkers();
      } catch (err) {
        console.error("[ChartWindows] fetchEvents:", err.message);
        applyAllMarkers();
      }
    },
    [tokenAddress, applyAllMarkers]
  );

  const fetchWalletMarks = useCallback(
    async walletAddr => {
      if (!tokenAddress || !walletAddr) {
        walletMarkersRef.current = [];
        rawWalletEventsRef.current = [];
        applyAllMarkers();
        return;
      }
      const currentBars = barsRef.current;
      if (!currentBars.length) return;
      try {
        const events = await tokensApi.getEventsByWallet(tokenAddress, walletAddr, 500);
        if (!Array.isArray(events) || !events.length) {
          walletMarkersRef.current = [];
          rawWalletEventsRef.current = [];
          applyAllMarkers();
          return;
        }
        const marks = events.map(e => ({
          time: e.time,
          position: e.type === "BUY" ? "BUY" : "SELL",
          totalUsd: e.stats?.buy?.totalUsd || e.stats?.sell?.totalUsd || 0,
        }));
        walletMarkersRef.current = buildLWCMarkers(marks, currentBars, {
          buyColor: "#22c55e",
          sellColor: "#ef4444",
          buyShape: "circle",
          sellShape: "circle",
          buyPos: "belowBar",
          sellPos: "aboveBar",
          prefix: "",
        });
        const walletRawMap = new Map();
        for (const ev of events) {
          const snapped = snapToBar(currentBars, ev.time);
          if (snapped === null) continue;
          if (!walletRawMap.has(snapped))
            walletRawMap.set(snapped, {
              snapped,
              events: [],
              stats: { buyTxCount: 0, buyTotalUsd: 0, buyTotalToken: 0, sellTxCount: 0, sellTotalUsd: 0, sellTotalToken: 0 },
            });
          const bucket = walletRawMap.get(snapped);
          bucket.events.push(ev);
          const s = ev.stats || {};
          if (ev.type === "BUY") {
            bucket.stats.buyTxCount += s.buy?.txCount || 1;
            bucket.stats.buyTotalUsd += s.buy?.totalUsd || 0;
            bucket.stats.buyTotalToken += s.buy?.totalToken || 0;
          } else {
            bucket.stats.sellTxCount += s.sell?.txCount || 1;
            bucket.stats.sellTotalUsd += s.sell?.totalUsd || 0;
            bucket.stats.sellTotalToken += s.sell?.totalToken || 0;
          }
        }
        rawWalletEventsRef.current = Array.from(walletRawMap.values());
        applyAllMarkers();
      } catch (err) {
        console.error("[ChartWindows] wallet marks:", err.message);
      }
    },
    [tokenAddress, applyAllMarkers]
  );

  const fetchUserWalletMarks = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const userData = await userApi.getMe();
      const wallet = userData?.wallets?.[0]?.address;
      if (wallet) fetchWalletMarks(wallet);
    } catch (err) {
      console.error("[ChartWindows] fetchUserWalletMarks:", err.message);
    }
  }, [fetchWalletMarks]);

  useEffect(() => {
    if (!tokenAddress) return;
    if (!filterAddr) {
      walletMarkersRef.current = [];
      rawWalletEventsRef.current = [];
      applyAllMarkers();
      fetchUserWalletMarks();
      return;
    }
    if (!barsRef.current.length) return;
    const fetchFilterMarks = async () => {
      try {
        const events = await tokensApi.getEventsByWallet(tokenAddress, filterAddr, 500);
        if (!Array.isArray(events) || !events.length) {
          walletMarkersRef.current = [];
          rawWalletEventsRef.current = [];
          applyAllMarkers();
          return;
        }
        const marks = events.map(e => ({
          time: e.time,
          position: e.type === "BUY" ? "BUY" : "SELL",
          totalUsd: e.stats?.buy?.totalUsd || e.stats?.sell?.totalUsd || 0,
        }));
        walletMarkersRef.current = buildLWCMarkers(marks, barsRef.current, {
          buyColor: "#22c55e",
          sellColor: "#ef4444",
          buyShape: "square",
          sellShape: "square",
          buyPos: "belowBar",
          sellPos: "aboveBar",
          prefix: "",
        });
        const walletRawMap = new Map();
        for (const ev of events) {
          const snapped = snapToBar(barsRef.current, ev.time);
          if (snapped === null) continue;
          if (!walletRawMap.has(snapped))
            walletRawMap.set(snapped, {
              snapped,
              events: [],
              stats: { buyTxCount: 0, buyTotalUsd: 0, buyTotalToken: 0, sellTxCount: 0, sellTotalUsd: 0, sellTotalToken: 0 },
            });
          const bucket = walletRawMap.get(snapped);
          bucket.events.push(ev);
          const s = ev.stats || {};
          if (ev.type === "BUY") {
            bucket.stats.buyTxCount += s.buy?.txCount || 1;
            bucket.stats.buyTotalUsd += s.buy?.totalUsd || 0;
            bucket.stats.buyTotalToken += s.buy?.totalToken || 0;
          } else {
            bucket.stats.sellTxCount += s.sell?.txCount || 1;
            bucket.stats.sellTotalUsd += s.sell?.totalUsd || 0;
            bucket.stats.sellTotalToken += s.sell?.totalToken || 0;
          }
        }
        rawWalletEventsRef.current = Array.from(walletRawMap.values());
        applyAllMarkers();
      } catch (err) {
        console.error("[ChartWindows] filterAddr marks:", err.message);
      }
    };
    fetchFilterMarks();
  }, [filterAddr, tokenAddress, applyAllMarkers, fetchUserWalletMarks]);

  const fetchCandles = useCallback(async () => {
    if (!tokenAddress) return;
    wsReadyRef.current = false;
    wsBufferRef.current = [];
    devMarkersRef.current = [];
    walletMarkersRef.current = [];
    migMarkersRef.current = [];
    setLoading(true);
    setError(null);
    try {
      const data = await tokensApi.getCandles(tokenAddress, tf, 500);
      if (!Array.isArray(data)) throw new Error("invalid_data");
      const bars = data.filter(c => c.time && c.open > 0 && c.close > 0).sort((a, b) => a.time - b.time);
      barsRef.current = bars;
      const sup = totalSupply || 0;
      const isMcap = priceViewRef.current === "mcap" && sup > 0;
      const pf = isMcap ? { type: "price", precision: 2, minMove: 0.01 } : buildPriceFormat(bars);
      priceFmtRef.current = pf;
      candleRef.current?.applyOptions({ priceFormat: pf });
      const isLine = chartTypeRef.current === "line" || chartTypeRef.current === "area";
      candleRef.current?.setData(
        bars.map(b => {
          const o = isMcap ? b.open * sup : b.open,
            h = isMcap ? b.high * sup : b.high;
          const l = isMcap ? b.low * sup : b.low,
            c = isMcap ? b.close * sup : b.close;
          return isLine ? { time: b.time, value: c } : { time: b.time, open: o, high: h, low: l, close: c };
        })
      );
      chartRef.current?.timeScale().scrollToRealTime();
      applyMainIndicators(bars, indCfgRef.current);
      applySubIndicators(bars, indCfgRef.current);
      const buf = wsBufferRef.current.splice(0);
      for (const c of buf) {
        if (c.timeframe !== tf || !c.time) continue;
        const supBuf = totalSupply || 0;
        const isMcapBuf = priceViewRef.current === "mcap" && supBuf > 0;
        const isLineNow = chartTypeRef.current === "line" || chartTypeRef.current === "area";
        const co = isMcapBuf ? c.open * supBuf : c.open,
          ch = isMcapBuf ? c.high * supBuf : c.high;
        const cl = isMcapBuf ? c.low * supBuf : c.low,
          cc = isMcapBuf ? c.close * supBuf : c.close;
        const bar = isLineNow ? { time: c.time, value: cc } : { time: c.time, open: co, high: ch, low: cl, close: cc };
        if (candleRef.current) candleRef.current.update(bar);
        const last = barsRef.current[barsRef.current.length - 1];
        if (last?.time === c.time)
          barsRef.current[barsRef.current.length - 1] = {
            ...last,
            volume: c.volume || last?.volume || 0,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          };
        else {
          barsRef.current.push({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume || 0,
          });
          if (barsRef.current.length > 600) barsRef.current.shift();
        }
      }
      setBarsSnap([...barsRef.current]);
      wsReadyRef.current = true;
      fetchEvents(barsRef.current);
      fetchUserWalletMarks();
      if (avgBuyPriceRef.current) {
        requestAnimationFrame(() => {
          if (!candleRef.current || !avgBuyPriceRef.current) return;
          if (avgBuyLineRef.current) {
            try {
              candleRef.current.removePriceLine(avgBuyLineRef.current);
            } catch {}
            avgBuyLineRef.current = null;
          }
          const avg = avgBuyPriceRef.current;
          const _sup = totalSupply || 0;
          const _isMcap = priceViewRef.current === "mcap" && _sup > 0;
          avgBuyLineRef.current = candleRef.current.createPriceLine({
            price: _isMcap ? avg * _sup : avg,
            color: "#f97316",
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: "Avg Buy",
          });
        });
      }
    } catch (err) {
      console.error("[ChartWindows] fetch:", err);
      setError("Failed to load candle data");
    } finally {
      setLoading(false);
    }
  }, [tokenAddress, tf, applyMainIndicators, fetchEvents, fetchUserWalletMarks, totalSupply]);

  const connectWs = useCallback(() => {
    if (!tokenAddress || destroyRef.current) return;
    if (wsRef.current && wsRef.current.readyState <= 2) return;

    const ws = new WebSocket(import.meta.env.VITE_WS_URL || "ws://localhost:3000/ws");
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ action: "subscribe", channel: `candle:${tokenAddress}` }));
    };
    ws.onmessage = ev => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.channel !== `candle:${tokenAddress}`) return;
        const c = msg.data;
        if (c.timeframe !== tf || !c.time) return;
        if (!wsReadyRef.current) {
          wsBufferRef.current.push(c);
          return;
        }
        if (!candleRef.current) return;
        const sup = totalSupply || 0;
        const isMcap = priceViewRef.current === "mcap" && sup > 0;
        const isLine = chartTypeRef.current === "line" || chartTypeRef.current === "area";
        const co = isMcap ? c.open * sup : c.open,
          ch = isMcap ? c.high * sup : c.high;
        const cl = isMcap ? c.low * sup : c.low,
          cc = isMcap ? c.close * sup : c.close;
        const bar = isLine ? { time: c.time, value: cc } : { time: c.time, open: co, high: ch, low: cl, close: cc };
        const bars = barsRef.current;
        const last = bars[bars.length - 1];
        const isNew = last?.time !== c.time;
        candleRef.current.update(bar);
        if (last?.time === c.time) {
          bars[bars.length - 1] = {
            ...last,
            ...bar,
            volume: c.volume || last?.volume || 0,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            txCount: c.txCount ?? last?.txCount ?? 0,
          };
        } else {
          bars.push({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume || 0,
            txCount: c.txCount ?? 0,
          });
          if (bars.length > 600) bars.shift();
        }
        barsRef.current = bars;
        if (isNew) requestAnimationFrame(() => applyAllMarkers());
      } catch {}
    };
    ws.onerror = () => {};
    ws.onclose = () => {
      setTimeout(() => {
        if (!destroyRef.current && wsRef.current === ws) connectWs();
      }, 3000);
    };
  }, [tokenAddress, tf, applyAllMarkers, totalSupply]);

  useEffect(() => {
    destroyRef.current = false;
    loadScript(LC_CDN)
      .then(() => {
        if (destroyRef.current) return;
        lcRef.current = window.LightweightCharts;
        buildChart(barsRef.current);
        fetchCandles();
      })
      .catch(() => setError("Failed to load Lightweight Charts"));
    connectWs();
    return () => {
      destroyRef.current = true;
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        try {
          ws.close();
        } catch {}
      }
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch {}
        chartRef.current = null;
        candleRef.current = null;
        sarRef.current = null;
      }
      if (drawEngineRef.current) {
        drawEngineRef.current.destroy();
        drawEngineRef.current = null;
      }
    };
  }, [tokenAddress, tf, buildChart, fetchCandles, connectWs]);

  useEffect(() => {
    applyAllMarkers();
  }, [displayOptions, applyAllMarkers]);

  useEffect(() => {
    const bars = barsRef.current;
    if (!bars.length || !chartRef.current) return;
    applyMainIndicators(bars, indicatorConfig);
    applySubIndicators(bars, indicatorConfig);
    setBarsSnap([...bars]);
  }, [indicatorConfig, applyMainIndicators, applySubIndicators]);

  useEffect(() => {
    const cfg = indicatorConfig;
    const count = [cfg.Volume?.enabled, cfg.MACD?.enabled, cfg.RSI?.enabled].filter(Boolean).length;
    onSubIndCountChange?.(count);
  }, [indicatorConfig, onSubIndCountChange]);

  const handleMouseDown = useCallback(e => drawEngineRef.current?.onMouseDown(e), []);
  const handleMouseMove = useCallback(e => drawEngineRef.current?.onMouseMove(e), []);
  const handleMouseUp = useCallback(e => drawEngineRef.current?.onMouseUp(e), []);
  const handleAutoScale = useCallback(() => chartRef.current?.priceScale("right").applyOptions({ autoScale: true }), []);
  const handleScreenshot = useCallback(async () => {
  if (!chartRef.current) return;

  const chartCanvas = chartRef.current.takeScreenshot();
  const cw = chartCanvas.width;
  const ch = chartCanvas.height;

  const INFO_H  = 80;
  const WM_H    = 32;
  const TOTAL_H = INFO_H + ch + WM_H;
  const PAD     = 16;
  const FONT    = "'Inter','Segoe UI',Arial,sans-serif";
  const MONO    = "'JetBrains Mono','Fira Code',monospace";

  const price    = liveStats?.price     ?? token?.price     ?? 0;
  const mcap     = liveStats?.marketcap ?? token?.marketCap ?? 0;
  const vol      = liveStats?.volume24h ?? token?.volume24h ?? 0;
  const name     = token?.name          ?? "";
  const symbol   = token?.symbol        ?? tokenSymbol      ?? "";
  const addr     = token?.tokenAddress  ?? tokenAddress     ?? "";
  const change1h = liveStats?.change1h  ?? null;
  const imageUrl = token?.imageUrl      ?? null;
  const platform = token?.sourceFrom    ?? "";
  const holders  = liveStats?.holderCnt ?? token?.holderCnt ?? 0;

  const fmtP = (v) => {
    const n = Number(v || 0);
    if (!n) return "$0.00";
    if (n < 0.000001) return `$${n.toExponential(3)}`;
    if (n < 0.0001)   return `$${n.toFixed(8)}`;
    if (n < 1)        return `$${n.toFixed(6)}`;
    return `$${n.toFixed(4)}`;
  };
  const fmtM = (v) => {
    const n = Number(v || 0);
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  };
  const shortA = (a) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";

  let tokenImg = null;
  let swanLogo = null;

  await Promise.allSettled([
    imageUrl
      ? loadImageBlob(imageUrl).then(img => { tokenImg = img; }).catch(() => {})
      : Promise.resolve(),
    loadImageBlob("/favicon.png").then(img => { swanLogo = img; }).catch(() => {}),
  ]);

  const out = document.createElement("canvas");
  out.width  = cw;
  out.height = TOTAL_H;
  const ctx  = out.getContext("2d");

  // background
  ctx.fillStyle = "#09090b";
  ctx.fillRect(0, 0, cw, TOTAL_H);

  ctx.strokeStyle = "#27272a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, INFO_H - 0.5);
  ctx.lineTo(cw, INFO_H - 0.5);
  ctx.stroke();

  // token logo
  const LOGO_SIZE = 48;
  const LOGO_X    = PAD;
  const LOGO_Y    = (INFO_H - LOGO_SIZE) / 2;

  if (tokenImg) {
    ctx.save();
    roundRect(ctx, LOGO_X, LOGO_Y, LOGO_SIZE, LOGO_SIZE, 10);
    ctx.clip();
    ctx.drawImage(tokenImg, LOGO_X, LOGO_Y, LOGO_SIZE, LOGO_SIZE);
    ctx.restore();
  } else {
    ctx.fillStyle = "#27272a";
    roundRect(ctx, LOGO_X, LOGO_Y, LOGO_SIZE, LOGO_SIZE, 10);
    ctx.fill();
    ctx.fillStyle = "#52525b";
    ctx.font = `bold 18px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((symbol || "?").slice(0, 1).toUpperCase(), LOGO_X + LOGO_SIZE / 2, LOGO_Y + LOGO_SIZE / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  // nama, symbol, address
  const TEXT_X = LOGO_X + LOGO_SIZE + 10;

  ctx.fillStyle = "#fafafa";
  ctx.font      = `bold 14px ${FONT}`;
  ctx.fillText(name || symbol, TEXT_X, LOGO_Y + 16);

  ctx.fillStyle = "#ffd400";
  ctx.font      = `bold 12px ${FONT}`;
  ctx.fillText(`$${symbol}`, TEXT_X, LOGO_Y + 32);

  ctx.fillStyle = "#52525b";
  ctx.font      = `10px ${MONO}`;
  ctx.fillText(shortA(addr), TEXT_X, LOGO_Y + 46);

  // platform chip
  if (platform) {
    ctx.font = `9px ${FONT}`;
    const chipLabel = platform === "four_meme" ? "four.meme" : platform;
    const chipW = ctx.measureText(chipLabel).width + 10;
    const chipX = TEXT_X + ctx.measureText(shortA(addr)).width + 8;
    const chipY = LOGO_Y + 36;
    ctx.fillStyle = "#18181b";
    roundRect(ctx, chipX, chipY, chipW, 14, 3);
    ctx.fill();
    ctx.strokeStyle = "#3f3f46";
    ctx.lineWidth   = 0.5;
    roundRect(ctx, chipX, chipY, chipW, 14, 3);
    ctx.stroke();
    ctx.fillStyle = "#a1a1aa";
    ctx.font      = `9px ${FONT}`;
    ctx.fillText(chipLabel, chipX + 5, chipY + 9.5);
  }

  // stats columns
  const stats = [
    { label: "PRICE",   value: fmtP(price), color: "#e4e4e7" },
    { label: "MCAP",    value: fmtM(mcap),  color: "#c4b5fd" },
    { label: "VOL 24H", value: fmtM(vol),   color: "#60a5fa" },
    { label: "HOLDERS", value: holders > 0
        ? (holders >= 1000 ? `${(holders / 1000).toFixed(1)}k` : String(holders))
        : "—",                               color: "#e4e4e7" },
  ];

  if (change1h !== null) {
    const isPos = change1h >= 0;
    stats.push({
      label: "1H",
      value: `${isPos ? "+" : ""}${Number(change1h).toFixed(2)}%`,
      color: isPos ? "#22c55e" : "#ef4444",
    });
  }

  const COL_W  = 96;
  const startX = cw - PAD - stats.length * COL_W;

  ctx.strokeStyle = "#27272a";
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(startX - 12, 12);
  ctx.lineTo(startX - 12, INFO_H - 12);
  ctx.stroke();

  stats.forEach((s, i) => {
    const x = startX + i * COL_W;
    ctx.fillStyle = "#52525b";
    ctx.font      = `9px ${FONT}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(s.label, x, LOGO_Y + 16);
    ctx.fillStyle = s.color;
    ctx.font      = `bold 12px ${FONT}`;
    ctx.fillText(s.value, x, LOGO_Y + 33);
  });

  // chart
  ctx.drawImage(chartCanvas, 0, INFO_H);

  // watermark tengah chart
  const WM_CENTER_X = cw / 2;
  const WM_CENTER_Y = INFO_H + ch / 2;

  ctx.save();

  if (swanLogo) {
    ctx.globalAlpha = 0.07;
    const WM_LOGO_SIZE = 48;
    ctx.drawImage(
      swanLogo,
      WM_CENTER_X - WM_LOGO_SIZE / 2,
      WM_CENTER_Y - WM_LOGO_SIZE - 4,
      WM_LOGO_SIZE,
      WM_LOGO_SIZE
    );
  }

  ctx.globalAlpha  = 0.08;
  ctx.fillStyle    = "#ffffff";
  ctx.font         = `bold 28px ${FONT}`;
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SWANFI", WM_CENTER_X, WM_CENTER_Y + (swanLogo ? 24 : 0));

  ctx.restore();
  ctx.textAlign    = "left";
  ctx.textBaseline = "alphabetic";

  // bottom watermark bar
  const WY = INFO_H + ch;

  ctx.strokeStyle = "#27272a";
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(0, WY + 0.5);
  ctx.lineTo(cw, WY + 0.5);
  ctx.stroke();

  ctx.fillStyle = "#0c0c0e";
  ctx.fillRect(0, WY, cw, WM_H);

  if (swanLogo) {
    ctx.drawImage(swanLogo, PAD, WY + (WM_H - 16) / 2, 16, 16);
  }
  const WM_TEXT_X = swanLogo ? PAD + 20 : PAD;

  ctx.fillStyle = "#ffd400";
  ctx.font      = `bold 12px ${FONT}`;
  ctx.fillText("SWANFI", WM_TEXT_X, WY + WM_H / 2 + 4);

  ctx.fillStyle = "#3f3f46";
  ctx.font      = `11px ${FONT}`;
  ctx.fillText("swanfi.pro", WM_TEXT_X + 56, WY + WM_H / 2 + 4);

  const ts  = new Date().toUTCString().replace(" GMT", " UTC");
  ctx.fillStyle = "#3f3f46";
  ctx.font      = `10px ${MONO}`;
  const tsW = ctx.measureText(ts).width;
  ctx.fillText(ts, cw - tsW - PAD, WY + WM_H / 2 + 4);

  // download
  const a    = document.createElement("a");
  a.download = `swanfi-${symbol || "chart"}-${Date.now()}.png`;
  a.href     = out.toDataURL("image/png");
  a.click();
}, [tokenSymbol, tokenAddress, token, liveStats]);
  const handleFullscreen = useCallback(() => {
    const el = containerRef.current?.closest(".lwc-wrap");
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  const lastBar = barsRef.current[barsRef.current.length - 1];
  const cfg = indicatorConfig;

  return (
    <div className="lwc-wrap">
      <HeaderChart
        tf={tf}
        setTf={setTf}
        chartType={chartType}
        setChartType={setChartType}
        priceView={priceView}
        setPriceView={setPriceView}
        onScreenshot={handleScreenshot}
        onFullscreen={handleFullscreen}
        onIndicators={() => setIndicatorOpen(true)}
        displayOptions={displayOptions}
        onDisplayChange={setDisplayOptions}
      />
      <IndicatorModal open={indicatorOpen} onClose={() => setIndicatorOpen(false)} config={indicatorConfig} onChange={c => setIndicatorConfig(c)} />
      <div className="lwc-body">
        <div className="lwc-chart-col">
          <div className="lwc-container" ref={containerRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
            <CandleInfoOverlay
              crosshair={crosshair}
              lastBar={lastBar}
              indicatorConfig={indicatorConfig}
              barsSnap={barsSnap}
              totalSupply={totalSupply}
              priceView={priceView}
            />
            {display.wm && (
              <div className="lwc-watermark">
                <div className="lwc-watermark-inner">
                  <img src="/favicon.png" alt="" className="lwc-watermark-logo" />
                  <span className="lwc-watermark-text">SWANFI</span>
                </div>
              </div>
            )}
            {loading && (
              <div className="lwc-overlay">
                <div className="lwc-spinner" />
                <span>Loading candle data</span>
              </div>
            )}
            {!loading && error && (
              <div className="lwc-overlay lwc-overlay--error">
                <span>⚠ {error}</span>
                <button className="lwc-retry-btn" onClick={fetchCandles}>
                  Retry
                </button>
              </div>
            )}
            <SubIndicatorOverlay crosshair={crosshair} barsSnap={barsSnap} indicatorConfig={indicatorConfig} />
            {eventTooltip && (
              <EventTooltip
                x={eventTooltip.x}
                y={eventTooltip.y}
                events={eventTooltip.events}
                stats={eventTooltip.stats}
                containerRef={containerRef}
                isFilterMode={!!filterAddr}
              />
            )}
          </div>
          <BottomChart
            range={range}
            setRange={setRange}
            utcTime={utcTime}
            crosshair={crosshair}
            tf={tf}
            scaleMode={scaleMode}
            setScaleMode={setScaleMode}
            onAutoScale={handleAutoScale}
          />
        </div>
      </div>
    </div>
  );
}