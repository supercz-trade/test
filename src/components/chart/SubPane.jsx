// ================================================================
// SubPane.jsx — Volume / MACD / RSI sub-indicator panes
// ================================================================

import { useEffect, useRef, useState } from "react";
import "./lwchart.css";

function fmtNum(v, d = 2) {
  if (v == null || !isFinite(Number(v))) return "—";
  const n = Number(v);
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(d)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(d)}K`;
  return n.toFixed(d);
}

function fmtVol(v) {
  const n = Number(v || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}

export default function SubPane({ type, config, bars, mainChartRef, LC, isLast }) {
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const [info,      setInfo]      = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !LC || !bars?.length) return;

    if (chartRef.current) {
      try { chartRef.current.remove(); } catch {}
      chartRef.current = null;
    }

    const chart = LC.createChart(el, {
      width:  el.clientWidth  || 600,
      height: el.clientHeight || 80,
      layout: {
        background: { type: "solid", color: "var(--bg-base)" },
        textColor:  "var(--text-muted)",
        fontFamily: "var(--font-mono)",
        fontSize:   10,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)" },
        horzLines: { color: "rgba(255,255,255,0.03)" },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: "rgba(255,255,255,0.15)", width: 1, style: 3, labelVisible: false },
        horzLine: { color: "rgba(255,255,255,0.15)", width: 1, style: 3, labelBackgroundColor: "var(--bg-elevated)" },
      },
      rightPriceScale: {
        borderColor:  "rgba(255,255,255,0.05)",
        textColor:    "var(--text-muted)",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor:    "rgba(255,255,255,0.05)",
        timeVisible:    isLast,
        secondsVisible: false,
        visible:        isLast,
      },
      leftPriceScale: { visible: false },
      handleScroll:   { mouseWheel: true, pressedMouseMove: true },
      handleScale:    { mouseWheel: true, pinch: true },
    });
    chartRef.current = chart;

    // Bidirectional sync with main chart
    let syncing = false;
    const onMain = (range) => {
      if (syncing || !range || !chartRef.current) return;
      syncing = true;
      try { chartRef.current.timeScale().setVisibleLogicalRange(range); } catch {}
      syncing = false;
    };
    const onSub = (range) => {
      if (syncing || !range || !mainChartRef?.current) return;
      syncing = true;
      try { mainChartRef.current.timeScale().setVisibleLogicalRange(range); } catch {}
      syncing = false;
    };
    const mainTS = mainChartRef?.current?.timeScale();
    mainTS?.subscribeVisibleLogicalRangeChange(onMain);
    chart.timeScale().subscribeVisibleLogicalRangeChange(onSub);
    const initRange = mainTS?.getVisibleLogicalRange();
    if (initRange) try { chart.timeScale().setVisibleLogicalRange(initRange); } catch {}

    const rawData = {};

    // VOLUME
    if (type === "volume") {
      const s = chart.addHistogramSeries({
        lastValueVisible: true,
        priceLineVisible: false,
        priceFormat: { type: "volume" },
      });
      s.setData(bars.map(b => ({
        time:  b.time,
        value: b.volume || 0,
        color: b.close >= b.open ? config.colorBull : config.colorBear,
      })));
    }

    // MACD
    if (type === "macd") {
      const closes = bars.map(b => b.close);
      const ema = (arr, p) => {
        const k = 2 / (p + 1), out = new Array(arr.length).fill(null);
        let e = null;
        for (let i = 0; i < arr.length; i++) {
          if (e === null) {
            if (i >= p - 1) { let s = 0; for (let j = 0; j < p; j++) s += arr[i - j]; e = s / p; out[i] = e; }
          } else { e = arr[i] * k + e * (1 - k); out[i] = e; }
        }
        return out;
      };
      const ef  = ema(closes, config.fast);
      const es  = ema(closes, config.slow);
      const mac = ef.map((v, i) => ef[i] != null && es[i] != null ? ef[i] - es[i] : null);
      const sig = ema(mac.map(v => v ?? 0), config.signal);
      const his = mac.map((v, i) => v != null && sig[i] != null ? v - sig[i] : null);
      rawData.mac = mac; rawData.sig = sig; rawData.his = his;

      const base = { lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false };
      const sH = chart.addHistogramSeries({ ...base });
      sH.setData(his.map((v, i) => v != null ? { time: bars[i].time, value: v, color: v >= 0 ? config.colorHistUp : config.colorHistDown } : null).filter(Boolean));
      const sM = chart.addLineSeries({ ...base, color: config.colorMACD,   lineWidth: 1.5 });
      const sS = chart.addLineSeries({ ...base, color: config.colorSignal, lineWidth: 1.5 });
      sM.setData(mac.map((v, i) => v != null ? { time: bars[i].time, value: v } : null).filter(Boolean));
      sS.setData(sig.map((v, i) => v != null ? { time: bars[i].time, value: v } : null).filter(Boolean));
    }

    // RSI
    if (type === "rsi") {
      const period = config.period, closes = bars.map(b => b.close);
      const rsi = new Array(bars.length).fill(null);
      if (bars.length > period) {
        let ag = 0, al = 0;
        for (let i = 1; i <= period; i++) { const d = closes[i] - closes[i-1]; if (d > 0) ag += d; else al -= d; }
        ag /= period; al /= period;
        rsi[period] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
        for (let i = period + 1; i < bars.length; i++) {
          const d = closes[i] - closes[i-1];
          ag = (ag * (period - 1) + (d > 0 ? d : 0)) / period;
          al = (al * (period - 1) + (d < 0 ? -d : 0)) / period;
          rsi[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
        }
      }
      rawData.rsi = rsi;
      const base = { lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false };
      chart.addLineSeries({ ...base, color: config.color, lineWidth: 1.5 })
        .setData(rsi.map((v, i) => v != null ? { time: bars[i].time, value: v } : null).filter(Boolean));
      const lvl = (val, color) => chart.addLineSeries({ ...base, color, lineWidth: 1, lineStyle: 2 })
        .setData(bars.map(b => ({ time: b.time, value: val })));
      lvl(config.overbought, "rgba(239,83,80,0.4)");
      lvl(config.oversold,   "rgba(38,166,154,0.4)");
      lvl(50,                "rgba(255,255,255,0.07)");
      chart.priceScale("right").applyOptions({ autoScale: false, minValue: 0, maxValue: 100 });
    }

    // Crosshair info
    chart.subscribeCrosshairMove(param => {
      if (!param?.time) { setInfo(null); return; }
      const idx = bars.findIndex(b => b.time === param.time);
      if (idx < 0) return;
      const b = bars[idx];
      if (type === "volume") setInfo({ vol: b.volume || 0, bull: b.close >= b.open });
      if (type === "macd")   setInfo({ mac: rawData.mac?.[idx], sig: rawData.sig?.[idx], his: rawData.his?.[idx] });
      if (type === "rsi")    setInfo({ rsi: rawData.rsi?.[idx] });
    });

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (!chartRef.current || !containerRef.current) return;
      chartRef.current.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
    });
    ro.observe(el);

    return () => {
      mainTS?.unsubscribeVisibleLogicalRangeChange(onMain);
      ro.disconnect();
      try { chart.remove(); } catch {}
      chartRef.current = null;
    };
  }, [type, config, bars, LC, isLast]);

  const infoItems = () => {
    if (type === "volume") {
      const vol  = info?.vol ?? bars?.[bars.length - 1]?.volume ?? 0;
      const bull = info != null ? info.bull : (bars?.[bars.length - 1]?.close >= bars?.[bars.length - 1]?.open);
      return [{ label: "Vol", value: fmtVol(vol), color: bull ? config.colorBull : config.colorBear }];
    }
    if (type === "macd") {
      const his = info?.his ?? 0;
      return [
        { label: `MACD(${config.fast},${config.slow},${config.signal})`, value: fmtNum(info?.mac, 6), color: config.colorMACD },
        { label: "Signal", value: fmtNum(info?.sig, 6), color: config.colorSignal },
        { label: "Hist",   value: fmtNum(info?.his, 6), color: his >= 0 ? config.colorHistUp : config.colorHistDown },
      ];
    }
    if (type === "rsi") {
      const v = info?.rsi;
      const c = v == null ? config.color : v >= config.overbought ? "#ef5350" : v <= config.oversold ? "#26a69a" : config.color;
      return [
        { label: `RSI(${config.period})`, value: fmtNum(v, 2), color: c },
        { label: "OB", value: String(config.overbought), color: "rgba(239,83,80,0.6)" },
        { label: "OS", value: String(config.oversold),   color: "rgba(38,166,154,0.6)" },
      ];
    }
    return [];
  };

  const label = { volume: "Vol", macd: "MACD", rsi: "RSI" }[type];

  return (
    <div className={`lwc-subpane${collapsed ? " lwc-subpane--collapsed" : ""}`}>
      <div className="lwc-subpane-infobar">
        <button className="lwc-subpane-toggle" onClick={() => setCollapsed(v => !v)}>
          <svg width="7" height="5" viewBox="0 0 7 5" fill="none"
            className={`lwc-subpane-arrow${collapsed ? " lwc-subpane-arrow--up" : ""}`}>
            <path d="M1 1L3.5 4L6 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="lwc-subpane-label">{label}</span>
        </button>
        <span className="lwc-subpane-dot">·</span>
        {infoItems().map((it, i) => (
          <span key={i} className="lwc-subpane-info-item">
            {it.label && <span className="lwc-subpane-info-lbl">{it.label}</span>}
            <span className="lwc-subpane-info-val" style={{ color: it.color }}>{it.value}</span>
          </span>
        ))}
      </div>
      {!collapsed && <div ref={containerRef} className="lwc-subpane-chart" />}
    </div>
  );
}