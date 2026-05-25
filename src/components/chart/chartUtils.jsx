// ================================================================
// chartUtils.js — Utility functions, DrawingEngine, SAR
// ================================================================

// ----------------------------------------------------------------
// PARABOLIC SAR
// ----------------------------------------------------------------
export function calcSAR(bars, a0 = 0.02, aMax = 0.2) {
  if (!bars || bars.length < 2) return [];
  const res = new Array(bars.length).fill(null);
  let bull = true, a = a0, sar = bars[0].low, ep = bars[0].high;
  for (let i = 1; i < bars.length; i++) {
    const p = bars[i-1], c = bars[i];
    let ns = sar + a * (ep - sar);
    if (bull) {
      ns = Math.min(ns, p.low, i >= 2 ? bars[i-2].low : p.low);
      if (c.low < ns)       { bull = false; ns = ep; ep = c.low;  a = a0; }
      else if (c.high > ep) { ep = c.high; a = Math.min(a + a0, aMax); }
    } else {
      ns = Math.max(ns, p.high, i >= 2 ? bars[i-2].high : p.high);
      if (c.high > ns)      { bull = true;  ns = ep; ep = c.high; a = a0; }
      else if (c.low < ep)  { ep = c.low;   a = Math.min(a + a0, aMax); }
    }
    sar = ns; res[i] = sar;
  }
  return res;
}

// ----------------------------------------------------------------
// PRICE FORMATTING
// ----------------------------------------------------------------
export function countLeadingZeros(n) {
  if (n <= 0 || n >= 0.1) return 0;
  const s = n.toFixed(20), dec = s.split(".")[1] || "";
  let c = 0; for (const ch of dec) { if (ch === "0") c++; else break; } return c;
}

export function fmtPriceParts(v) {
  const n = Number(v ?? 0);
  if (!isFinite(n) || n === 0) return [{ type:"text", val:"—" }];
  if (n >= 1_000_000) return [{ type:"text", val:`$${(n/1_000_000).toFixed(2)}M` }];
  if (n >= 1_000)     return [{ type:"text", val:`$${(n/1_000).toFixed(2)}K` }];
  if (n >= 1)         return [{ type:"text", val:`$${n.toFixed(4)}` }];
  if (n >= 0.01)      return [{ type:"text", val:`$${n.toFixed(6)}` }];
  const zeros = countLeadingZeros(n);
  if (zeros >= 3) {
    const s = n.toFixed(zeros+6), dec = s.split(".")[1] || "";
    const sig = dec.slice(zeros).replace(/0+$/,"").slice(0,4) || "0";
    return [{ type:"text", val:"$0.0" }, { type:"sub", val: String(zeros) }, { type:"text", val: sig }];
  }
  return [{ type:"text", val:`$${n.toFixed(zeros+6).replace(/0+$/,"")}` }];
}

export function buildPriceFormat(bars) {
  if (!bars?.length) return { type:"price", precision:8, minMove:0.00000001 };
  const prices = bars.flatMap(b => [b.open,b.high,b.low,b.close]).filter(x => x > 0);
  if (!prices.length) return { type:"price", precision:8, minMove:0.00000001 };
  const m = Math.min(...prices);
  if (m >= 1000)    return { type:"price", precision:2, minMove:0.01 };
  if (m >= 1)       return { type:"price", precision:4, minMove:0.0001 };
  if (m >= 0.1)     return { type:"price", precision:5, minMove:0.00001 };
  if (m >= 0.01)    return { type:"price", precision:6, minMove:0.000001 };
  if (m >= 0.001)   return { type:"price", precision:7, minMove:0.0000001 };
  if (m >= 0.0001)  return { type:"price", precision:8, minMove:0.00000001 };
  if (m >= 0.00001) return { type:"price", precision:9, minMove:0.000000001 };
  const z = countLeadingZeros(m), prec = Math.min(z+5, 10);
  return { type:"price", precision: prec, minMove: Math.pow(10,-prec) };
}

export function fmtVol(v) {
  const n = Number(v||0);
  if (n >= 1_000_000) return `$${(n/1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n/1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export function fmtChange(o, c) {
  if (!o||!c) return null;
  const pct = ((c-o)/o)*100;
  return { pct: `${pct>=0?"+":""}${pct.toFixed(2)}%`, bull: pct>=0 };
}

export function fmtUTCNow() {
  const d = new Date();
  return `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}:${String(d.getUTCSeconds()).padStart(2,"0")} UTC`;
}

// ----------------------------------------------------------------
// SCRIPT LOADER
// ----------------------------------------------------------------
export function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (window.LightweightCharts) return resolve();
    const ex = document.getElementById("lw-script");
    if (ex) { if (window.LightweightCharts) return resolve(); ex.addEventListener("load", resolve); ex.addEventListener("error", reject); return; }
    const s = document.createElement("script");
    s.id = "lw-script"; s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ----------------------------------------------------------------
// DRAWING ENGINE
// ----------------------------------------------------------------
export class DrawingEngine {
  constructor(chart, container) {
    this.chart     = chart;
    this.container = container;
    this.drawings  = [];
    this.current   = null;
    this.tool      = "cursor";
    this.locked    = false;
    this.hidden    = false;

    this.canvas = document.createElement("canvas");
    Object.assign(this.canvas.style, {
      position:"absolute", top:0, left:0,
      width:"100%", height:"100%",
      pointerEvents:"none", zIndex:10,
    });
    container.appendChild(this.canvas);

    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(container);
    this._resize();
  }

  _resize() {
    const r = this.container.getBoundingClientRect();
    this.canvas.width  = r.width;
    this.canvas.height = r.height;
    this._render();
  }

  setTool(t) { this.tool = t; }

  _coord(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _price(y) {
    try { return this.chart.priceScale("right").coordinateToPrice(y); } catch { return null; }
  }

  _remap(pt) {
    // remap stored canvas coords — for simplicity store raw px coords
    return pt;
  }

  onMouseDown(e) {
    if (this.locked || this.tool === "cursor" || this.tool === "eraser") return;
    const pt = this._coord(e);
    pt.price = this._price(pt.y);
    if (this.tool === "brush" || this.tool === "highlighter") {
      this.current = { type: this.tool, pts: [pt] };
    } else {
      this.current = { type: this.tool, p1: pt, p2: pt };
    }
  }

  onMouseMove(e) {
    if (!this.current) return;
    const pt = this._coord(e);
    pt.price = this._price(pt.y);
    if (this.current.pts) {
      this.current.pts.push(pt);
    } else {
      this.current.p2 = pt;
    }
    this._render();
  }

  onMouseUp(e) {
    if (!this.current) return;
    const pt = this._coord(e);
    pt.price = this._price(pt.y);
    if (this.current.pts) {
      this.current.pts.push(pt);
    } else {
      this.current.p2 = pt;
    }
    if (this.tool === "text") {
      const label = window.prompt("Enter label:", "");
      if (label !== null) { this.current.text = label; this.drawings.push({ ...this.current }); }
    } else {
      this.drawings.push({ ...this.current });
    }
    this.current = null;
    this._render();
  }

  _render() {
    const c = this.canvas.getContext("2d");
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.hidden) return;
    [...this.drawings, ...(this.current ? [this.current] : [])].forEach(d => this._draw(c, d));
  }

  _draw(c, d) {
    const p1 = d.p1, p2 = d.p2;
    c.save();
    c.strokeStyle = "var(--color-primary)";
    c.lineWidth   = 1.5;
    c.setLineDash([]);

    switch (d.type) {
      case "trendline": case "ray": case "extline": case "infoline":
      case "trendangle": case "parallel": case "regtrend":
      case "flattop":   case "disjoint":
        if (!p1||!p2) break;
        c.beginPath(); c.moveTo(p1.x,p1.y); c.lineTo(p2.x,p2.y); c.stroke();
        c.beginPath(); c.arc(p1.x,p1.y,3,0,Math.PI*2); c.fillStyle="var(--color-primary)"; c.fill();
        c.beginPath(); c.arc(p2.x,p2.y,3,0,Math.PI*2); c.fill();
        break;

      case "hline":
        if (!p1) break;
        c.setLineDash([4,3]);
        c.beginPath(); c.moveTo(0,p1.y); c.lineTo(this.canvas.width,p1.y); c.stroke();
        break;

      case "vline":
        if (!p1) break;
        c.setLineDash([4,3]);
        c.beginPath(); c.moveTo(p1.x,0); c.lineTo(p1.x,this.canvas.height); c.stroke();
        break;

      case "hray":
        if (!p1||!p2) break;
        c.beginPath(); c.moveTo(p1.x,p1.y); c.lineTo(this.canvas.width,p1.y); c.stroke();
        break;

      case "rect":
        if (!p1||!p2) break;
        c.strokeRect(Math.min(p1.x,p2.x), Math.min(p1.y,p2.y), Math.abs(p2.x-p1.x), Math.abs(p2.y-p1.y));
        c.fillStyle="rgba(255,212,0,0.06)";
        c.fillRect(Math.min(p1.x,p2.x), Math.min(p1.y,p2.y), Math.abs(p2.x-p1.x), Math.abs(p2.y-p1.y));
        break;

      case "circle":
        if (!p1||!p2) break;
        { const r=Math.hypot(p2.x-p1.x,p2.y-p1.y);
          c.beginPath(); c.arc(p1.x,p1.y,r,0,Math.PI*2); c.stroke(); }
        break;

      case "fibret": case "fibext": case "fibchan": {
        if (!p1||!p2) break;
        const fibs=[0,0.236,0.382,0.5,0.618,0.786,1];
        const dy=p2.y-p1.y;
        fibs.forEach(f => {
          const fy=p2.y-dy*f;
          c.globalAlpha=0.6; c.setLineDash([3,3]);
          c.beginPath(); c.moveTo(0,fy); c.lineTo(this.canvas.width,fy); c.stroke();
          c.globalAlpha=1; c.setLineDash([]);
          c.fillStyle="var(--color-primary)"; c.font="10px monospace";
          c.fillText(`${(f*100).toFixed(1)}%`, 4, fy-3);
        });
        c.beginPath(); c.moveTo(p1.x,p1.y); c.lineTo(p2.x,p2.y); c.stroke();
        break;
      }

      case "longpos": case "shortpos": {
        if (!p1||!p2) break;
        const midX=(p1.x+p2.x)/2, minY=Math.min(p1.y,p2.y), maxY=Math.max(p1.y,p2.y);
        c.strokeStyle=d.type==="longpos"?"#26a69a":"#ef5350";
        c.fillStyle  =d.type==="longpos"?"rgba(38,166,154,0.1)":"rgba(239,83,80,0.1)";
        c.strokeRect(Math.min(p1.x,p2.x), minY, Math.abs(p2.x-p1.x), maxY-minY);
        c.fillRect(Math.min(p1.x,p2.x), minY, Math.abs(p2.x-p1.x), maxY-minY);
        if (d.p1?.price && d.p2?.price) {
          const diff=Math.abs(d.p1.price-d.p2.price), pct=(diff/Math.min(d.p1.price,d.p2.price)*100).toFixed(2);
          c.fillStyle="var(--color-primary)"; c.font="11px 'JetBrains Mono',monospace"; c.textAlign="center";
          c.fillText(`Δ ${diff.toFixed(6)} (${pct}%)`, midX, (minY+maxY)/2+4);
          c.textAlign="left";
        }
        break;
      }

      case "brush": case "highlighter":
        if (!d.pts||d.pts.length<2) break;
        { c.strokeStyle=d.type==="highlighter"?"var(--border-default)":"var(--color-primary)";
          c.lineWidth=d.type==="highlighter"?10:1.5;
          c.beginPath();
          const mp=d.pts.map(p=>this._remap(p));
          c.moveTo(mp[0].x,mp[0].y);
          mp.slice(1).forEach(p=>c.lineTo(p.x,p.y));
          c.stroke(); }
        break;

      case "arrowup": case "arrowdown":
        if (!p1) break;
        { const dir=d.type==="arrowup"?-1:1;
          c.fillStyle=d.type==="arrowup"?"#26a69a":"#ef5350";
          c.beginPath();
          c.moveTo(p1.x, p1.y-dir*12);
          c.lineTo(p1.x-7, p1.y+dir*2);
          c.lineTo(p1.x+7, p1.y+dir*2);
          c.closePath(); c.fill(); }
        break;

      case "text":
        if (!p1) break;
        c.fillStyle="var(--color-primary)"; c.font="13px 'JetBrains Mono',monospace";
        c.fillText(d.text||"Label", p1.x, p1.y);
        c.beginPath(); c.arc(p1.x,p1.y,2.5,0,Math.PI*2); c.fill();
        break;

      case "path": case "polyline": case "curve": case "doublecurve":
      case "arc":  case "triangle_sh": case "rotrect":
        if (!p1||!p2) break;
        c.beginPath(); c.moveTo(p1.x,p1.y); c.lineTo(p2.x,p2.y); c.stroke();
        c.beginPath(); c.arc(p1.x,p1.y,3,0,Math.PI*2); c.fillStyle="var(--color-primary)"; c.fill();
        c.beginPath(); c.arc(p2.x,p2.y,3,0,Math.PI*2); c.fill();
        break;

      default:
        if (!p1||!p2) break;
        c.beginPath(); c.moveTo(p1.x,p1.y); c.lineTo(p2.x,p2.y); c.stroke();
        break;
    }
    c.restore();
  }

  redraw()       { this._render(); }
  toggleLock()   { this.locked = !this.locked; return this.locked; }
  toggleHide()   { this.hidden = !this.hidden; this._render(); return this.hidden; }
  clearAll()     { this.drawings = []; this._render(); }
  destroy()      { this._ro?.disconnect(); this.canvas?.remove(); }
}

// ================================================================
// PRICE CHART — Floating OHLCV overlay
// ================================================================

export function PriceParts({ parts, className }) {
  return (
    <b className={className}>
      {parts.map((p, i) => p.type === "sub"
        ? <sub key={i} className="lwc-price-sub">{p.val}</sub>
        : <span key={i}>{p.val}</span>)}
    </b>
  );
}

function fmtMcap(v) {
  const n = Number(v || 0);
  if (!isFinite(n) || n === 0) return [{ type:"text", val:"—" }];
  if (n >= 1_000_000_000) return [{ type:"text", val:`$${(n/1_000_000_000).toFixed(3)}B` }];
  if (n >= 1_000_000)     return [{ type:"text", val:`$${(n/1_000_000).toFixed(3)}M` }];
  if (n >= 1_000)         return [{ type:"text", val:`$${(n/1_000).toFixed(2)}K` }];
  return [{ type:"text", val:`$${n.toFixed(2)}` }];
}

export default function PriceChart({ crosshair, lastBar, tf, tokenSymbol, priceView, totalSupply }) {
  const ch     = crosshair;
  const isMcap = priceView === "mcap";
  const sup    = totalSupply || 0;
  const bull   = ch ? ch.c >= ch.o : (lastBar ? lastBar.close >= lastBar.open : true);
  const change = ch ? fmtChange(ch.o, ch.c) : (lastBar ? fmtChange(lastBar.open, lastBar.close) : null);

  if (!ch && !lastBar) return null;

  const mcapVal = (v) => isMcap && sup > 0 && !ch ? v * sup : v;
  const fmtVal  = isMcap ? fmtMcap : fmtPriceParts;

  const O   = ch ? ch.o   : mcapVal(lastBar?.open);
  const H   = ch ? ch.h   : mcapVal(lastBar?.high);
  const L   = ch ? ch.l   : mcapVal(lastBar?.low);
  const C   = ch ? ch.c   : mcapVal(lastBar?.close);
  const vol = ch ? ch.vol : lastBar?.volume;
  const tx  = ch ? ch.tx  : lastBar?.txCount;

  return (
    <div className="lwc-price-box">

      {/* Symbol + TF badge */}
      <div className="lwc-price-box-header">
        <span className="lwc-price-box-symbol">{tokenSymbol || "—"}</span>
        <span className="lwc-price-box-tf">{tf.toUpperCase()}</span>
        {isMcap && <span className="lwc-price-box-mcap-badge">MCAP</span>}
      </div>

      {/* OHLC rows */}
      {[
        { lbl: "O", val: O, cls: bull ? "lwc-pos" : "lwc-neg" },
        { lbl: "H", val: H, cls: "lwc-pos" },
        { lbl: "L", val: L, cls: "lwc-neg" },
        { lbl: "C", val: C, cls: bull ? "lwc-pos" : "lwc-neg" },
      ].map(({ lbl, val, cls }) => (
        <div key={lbl} className="lwc-price-box-row">
          <span className="lwc-price-box-lbl">{lbl}</span>
          <PriceParts parts={fmtVal(val)} className={`lwc-price-box-val ${cls}`} />
          {lbl === "C" && change && (
            <span className={`lwc-price-box-chg ${change.bull ? "lwc-pos" : "lwc-neg"}`}>
              {change.pct}
            </span>
          )}
        </div>
      ))}

      {/* Divider */}
      <div className="lwc-price-box-divider" />

      {/* Vol */}
      <div className="lwc-price-box-row">
        <span className="lwc-price-box-lbl">V</span>
        <span className="lwc-price-box-val lwc-muted">{fmtVol(vol)}</span>
      </div>

      {/* Tx count */}
      {tx != null && tx > 0 && (
        <div className="lwc-price-box-row">
          <span className="lwc-price-box-lbl">T</span>
          <span className="lwc-price-box-val lwc-muted">{Number(tx).toLocaleString()}</span>
        </div>
      )}

    </div>
  );
}