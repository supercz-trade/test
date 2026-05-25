// ================================================================
// chartIndicators.js — Indicator math, config, and manager
// ================================================================

// ── MA (Simple Moving Average) ───────────────────────────────────
export function calcMA(bars, period, src = "close") {
  const res = new Array(bars.length).fill(null);
  for (let i = period - 1; i < bars.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += bars[i - j][src];
    res[i] = sum / period;
  }
  return res;
}

// ── EMA (Exponential Moving Average) ────────────────────────────
export function calcEMA(bars, period, src = "close") {
  const res = new Array(bars.length).fill(null);
  const k = 2 / (period + 1);
  let ema = null;
  for (let i = 0; i < bars.length; i++) {
    const v = bars[i][src];
    if (ema === null) {
      if (i >= period - 1) {
        let sum = 0;
        for (let j = 0; j < period; j++) sum += bars[i - j][src];
        ema = sum / period;
        res[i] = ema;
      }
    } else {
      ema = v * k + ema * (1 - k);
      res[i] = ema;
    }
  }
  return res;
}

// ── WMA (Weighted Moving Average) ────────────────────────────────
export function calcWMA(bars, period, src = "close") {
  const res = new Array(bars.length).fill(null);
  const w = (period * (period + 1)) / 2;
  for (let i = period - 1; i < bars.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += bars[i - j][src] * (period - j);
    res[i] = sum / w;
  }
  return res;
}

// ── Bollinger Bands ───────────────────────────────────────────────
export function calcBOLL(bars, period = 20, mult = 2, src = "close") {
  const mid = calcMA(bars, period, src);
  const upper = new Array(bars.length).fill(null);
  const lower = new Array(bars.length).fill(null);
  for (let i = period - 1; i < bars.length; i++) {
    let variance = 0;
    for (let j = 0; j < period; j++) variance += Math.pow(bars[i - j][src] - mid[i], 2);
    const sd = Math.sqrt(variance / period);
    upper[i] = mid[i] + mult * sd;
    lower[i] = mid[i] - mult * sd;
  }
  return { mid, upper, lower };
}

// ── Parabolic SAR ─────────────────────────────────────────────────
export function calcSARFull(bars, step = 0.02, max = 0.2) {
  if (!bars || bars.length < 2) return [];
  const res = new Array(bars.length).fill(null);
  let bull = true, a = step, sar = bars[0].low, ep = bars[0].high;
  for (let i = 1; i < bars.length; i++) {
    const p = bars[i - 1], c = bars[i];
    let ns = sar + a * (ep - sar);
    if (bull) {
      ns = Math.min(ns, p.low, i >= 2 ? bars[i - 2].low : p.low);
      if (c.low < ns)        { bull = false; ns = ep; ep = c.low;  a = step; }
      else if (c.high > ep)  { ep = c.high; a = Math.min(a + step, max); }
    } else {
      ns = Math.max(ns, p.high, i >= 2 ? bars[i - 2].high : p.high);
      if (c.high > ns)       { bull = true;  ns = ep; ep = c.high; a = step; }
      else if (c.low < ep)   { ep = c.low;   a = Math.min(a + step, max); }
    }
    sar = ns; res[i] = sar;
  }
  return res;
}

// ── Supertrend ────────────────────────────────────────────────────
export function calcSupertrend(bars, period = 10, mult = 3) {
  const n   = bars.length;
  const res = new Array(n).fill(null);
  const bull = new Array(n).fill(true);
  if (n < period + 1) return { values: res, bull };

  const tr  = new Array(n).fill(0);
  const atr = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    tr[i] = Math.max(
      bars[i].high - bars[i].low,
      Math.abs(bars[i].high - bars[i-1].close),
      Math.abs(bars[i].low  - bars[i-1].close)
    );
  }
  let sum = 0;
  for (let i = 1; i <= period; i++) sum += tr[i];
  atr[period] = sum / period;
  for (let i = period + 1; i < n; i++) {
    atr[i] = (atr[i-1] * (period - 1) + tr[i]) / period;
  }

  const upperArr = new Array(n).fill(0);
  const lowerArr = new Array(n).fill(0);
  for (let i = period; i < n; i++) {
    const hl2   = (bars[i].high + bars[i].low) / 2;
    const rawUp = hl2 + mult * atr[i];
    const rawDn = hl2 - mult * atr[i];
    upperArr[i] = (i > period && bars[i-1].close < upperArr[i-1]) ? Math.min(rawUp, upperArr[i-1]) : rawUp;
    lowerArr[i] = (i > period && bars[i-1].close > lowerArr[i-1]) ? Math.max(rawDn, lowerArr[i-1]) : rawDn;
  }

  let isBull = true;
  for (let i = period; i < n; i++) {
    if (i === period) {
      isBull = bars[i].close > upperArr[i];
    } else {
      if (isBull) { if (bars[i].close < lowerArr[i]) isBull = false; }
      else        { if (bars[i].close > upperArr[i]) isBull = true;  }
    }
    res[i]  = isBull ? lowerArr[i] : upperArr[i];
    bull[i] = isBull;
  }

  return { values: res, bull };
}

// ── MACD ──────────────────────────────────────────────────────────
export function calcMACD(bars, fast = 12, slow = 26, signal = 9, src = "close") {
  const emaFast   = calcEMA(bars, fast, src);
  const emaSlow   = calcEMA(bars, slow, src);
  const macdLine  = bars.map((_, i) =>
    emaFast[i] !== null && emaSlow[i] !== null ? emaFast[i] - emaSlow[i] : null
  );
  const macdBars  = macdLine.map((v, i) => ({ close: v ?? 0, time: bars[i].time }));
  const signalArr = calcEMA(macdBars, signal, "close");
  const histogram = macdLine.map((v, i) =>
    v !== null && signalArr[i] !== null ? v - signalArr[i] : null
  );
  return { macd: macdLine, signal: signalArr, histogram };
}

// ── RSI ───────────────────────────────────────────────────────────
export function calcRSI(bars, period = 14, src = "close") {
  const res = new Array(bars.length).fill(null);
  if (bars.length < period + 1) return res;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = bars[i][src] - bars[i - 1][src];
    if (diff > 0) avgGain += diff; else avgLoss -= diff;
  }
  avgGain /= period; avgLoss /= period;
  res[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < bars.length; i++) {
    const diff = bars[i][src] - bars[i - 1][src];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    res[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return res;
}

// ── Volume colors ─────────────────────────────────────────────────
export function calcVolume(bars) {
  return bars.map(b => ({
    time:  b.time,
    value: b.volume || 0,
    color: b.close >= b.open ? "rgba(38,166,154,0.5)" : "rgba(239,83,80,0.5)",
  }));
}

// ── Default indicator config ──────────────────────────────────────
const MA_COLORS = ["#FFD400","#FF4ECD","#A78BFA","#F43F5E","#4ADE80","#FB923C"];

export const DEFAULT_INDICATOR_CONFIG = {
  MA: {
    enabled: false,
    lines: [
      { enabled:true,  period:7,  src:"close", style:0, color:MA_COLORS[0] },
      { enabled:true,  period:25, src:"close", style:0, color:MA_COLORS[1] },
      { enabled:true,  period:99, src:"close", style:0, color:MA_COLORS[2] },
      { enabled:false, period:0,  src:"close", style:0, color:MA_COLORS[3] },
      { enabled:false, period:0,  src:"close", style:0, color:MA_COLORS[4] },
      { enabled:false, period:0,  src:"close", style:0, color:MA_COLORS[5] },
    ],
  },
  EMA: {
    enabled: false,
    lines: [
      { enabled:true,  period:9,  src:"close", style:0, color:"#60A5FA" },
      { enabled:true,  period:21, src:"close", style:0, color:"#F472B6" },
      { enabled:false, period:50, src:"close", style:0, color:"#34D399" },
    ],
  },
  BOLL:   { enabled:false, period:20, mult:2, src:"close", colorMid:"#94A3B8", colorBand:"rgba(148,163,184,0.15)" },
  SAR:    { enabled:false, step:0.02, max:0.2, color:"#60A5FA" },
  SUPER:  { enabled:false, period:10, mult:3, colorBull:"#26A69A", colorBear:"#EF5350" },
  Volume: { enabled:true,  colorBull:"rgba(38,166,154,0.5)", colorBear:"rgba(239,83,80,0.5)" },
  MACD:   { enabled:false, fast:12, slow:26, signal:9, src:"close", colorMACD:"#60A5FA", colorSignal:"#F472B6", colorHistUp:"rgba(38,166,154,0.7)", colorHistDown:"rgba(239,83,80,0.7)" },
  RSI:    { enabled:false, period:14, src:"close", color:"#A78BFA", overbought:70, oversold:30 },
};

// ── Indicator manager ─────────────────────────────────────────────
function getSrc(bar, src) {
  switch (src) {
    case "open":  return bar.open;
    case "high":  return bar.high;
    case "low":   return bar.low;
    case "hl2":   return (bar.high + bar.low) / 2;
    case "hlc3":  return (bar.high + bar.low + bar.close) / 3;
    case "ohlc4": return (bar.open + bar.high + bar.low + bar.close) / 4;
    default:      return bar.close;
  }
}

function srcBars(bars, src) {
  return bars.map(b => ({ ...b, close: getSrc(b, src) }));
}

export class IndicatorManager {
  constructor(chart) {
    this.chart  = chart;
    this.series = {};
  }

  removeAll() {
    Object.values(this.series).flat().forEach(s => {
      try { this.chart.removeSeries(s); } catch {}
    });
    this.series = {};
  }

  apply(config, bars) {
    this.removeAll();
    if (!bars?.length) return;
    const chart = this.chart;
    const pf    = { type:"price", precision:8, minMove:0.00000001 };

    if (config.MA.enabled) {
      const list = [];
      config.MA.lines.forEach(l => {
        if (!l.enabled || !l.period) return;
        const vals = calcMA(srcBars(bars, l.src), l.period);
        const s = chart.addLineSeries({ color:l.color, lineWidth:1.5, lineStyle:l.style, crosshairMarkerVisible:false, lastValueVisible:false, priceLineVisible:false, priceFormat:pf, title:`MA${l.period}` });
        s.setData(vals.map((v,i)=>v!=null?{time:bars[i].time,value:v}:null).filter(Boolean));
        list.push(s);
      });
      this.series.MA = list;
    }

    if (config.EMA.enabled) {
      const list = [];
      config.EMA.lines.forEach(l => {
        if (!l.enabled || !l.period) return;
        const vals = calcEMA(srcBars(bars, l.src), l.period);
        const s = chart.addLineSeries({ color:l.color, lineWidth:1.5, lineStyle:l.style, crosshairMarkerVisible:false, lastValueVisible:false, priceLineVisible:false, priceFormat:pf, title:`EMA${l.period}` });
        s.setData(vals.map((v,i)=>v!=null?{time:bars[i].time,value:v}:null).filter(Boolean));
        list.push(s);
      });
      this.series.EMA = list;
    }

    if (config.BOLL.enabled) {
      const { mid, upper, lower } = calcBOLL(srcBars(bars, config.BOLL.src), config.BOLL.period, config.BOLL.mult);
      const toD = arr => arr.map((v,i)=>v!=null?{time:bars[i].time,value:v}:null).filter(Boolean);
      const base = { crosshairMarkerVisible:false, lastValueVisible:false, priceLineVisible:false, priceFormat:pf };
      const sMid   = chart.addLineSeries({...base, color:config.BOLL.colorMid, lineWidth:1, title:"BB Mid"});
      const sUpper = chart.addLineSeries({...base, color:config.BOLL.colorMid, lineWidth:1, lineStyle:2, title:"BB Up"});
      const sLower = chart.addLineSeries({...base, color:config.BOLL.colorMid, lineWidth:1, lineStyle:2, title:"BB Lo"});
      sMid.setData(toD(mid)); sUpper.setData(toD(upper)); sLower.setData(toD(lower));
      this.series.BOLL = [sMid, sUpper, sLower];
    }

    if (config.SAR.enabled) {
      const vals = calcSARFull(bars, config.SAR.step, config.SAR.max);
      const s = chart.addLineSeries({ color:"rgba(0,0,0,0)", lineVisible:false, crosshairMarkerVisible:false, lastValueVisible:false, priceLineVisible:false, pointMarkersVisible:true, pointMarkersRadius:2.5, priceFormat:pf, title:"SAR" });
      const data = vals.map((v,i)=>v!=null?{time:bars[i].time,value:v}:null).filter(Boolean);
      s.setData(data);
      s.setMarkers(data.map(d=>({ time:d.time, position:"inBar", color:config.SAR.color, shape:"circle", size:0.4 })));
      this.series.SAR = [s];
    }

    if (config.SUPER.enabled) {
      const { values, bull } = calcSupertrend(bars, config.SUPER.period, config.SUPER.mult);
      const bullData = [], bearData = [];
      values.forEach((v,i) => { if (v==null) return; (bull[i] ? bullData : bearData).push({ time:bars[i].time, value:v }); });
      const base = { crosshairMarkerVisible:false, lastValueVisible:false, priceLineVisible:false, lineWidth:2, priceFormat:pf };
      const sBull = chart.addLineSeries({...base, color:config.SUPER.colorBull, title:"ST Bull"});
      const sBear = chart.addLineSeries({...base, color:config.SUPER.colorBear, title:"ST Bear"});
      sBull.setData(bullData); sBear.setData(bearData);
      this.series.SUPER = [sBull, sBear];
    }
  }
}