// ================================================================
// IndicatorModal.jsx — Indicator settings popup
// Desktop: centered modal, sidebar left + panel right
// Mobile:  bottom sheet, horizontal scrollable nav, compact panel
// ================================================================

import { useState, useEffect, useRef } from "react";
import "./lwchart.css";

const SRC_OPTIONS = ["close","open","high","low","hl2","hlc3","ohlc4"];
const LINE_STYLES = [
  { label: "────", value: 0 },
  { label: "╌╌╌╌", value: 1 },
  { label: "┄┄┄┄", value: 2 },
  { label: "╴╴╴╴", value: 3 },
];
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

// ── Shared components ────────────────────────────────────────────
function NumInput({ value, onChange, min=1, max=9999, step=1 }) {
  return (
    <input type="number" value={value} min={min} max={max} step={step}
      onChange={e => onChange(Number(e.target.value))}
      className="imd-num" />
  );
}
function Sel({ value, onChange, options }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)} className="imd-sel">
      {options.map(o => <option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
    </select>
  );
}
function ColorPick({ value, onChange }) {
  const ref = useRef();
  return (
    <div className="imd-color">
      <div className="imd-color-swatch" style={{background:value}} onClick={()=>ref.current.click()}/>
      <input ref={ref} type="color" value={value} onChange={e=>onChange(e.target.value)}
        style={{position:"absolute",opacity:0,width:0,height:0,top:0,left:0}}/>
    </div>
  );
}
function Toggle({ value, onChange }) {
  return (
    <button className={`imd-toggle${value?" on":""}`} onClick={()=>onChange(!value)}>
      <span className="imd-toggle-k"/>
    </button>
  );
}
function Chk({ value, onChange }) {
  return (
    <button className={`imd-chk${value?" on":""}`} onClick={()=>onChange(!value)}>
      {value && <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
        <path d="M1 3.5L3.5 6L8 1" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>}
    </button>
  );
}
function SecHead({ title, enabled, onToggle }) {
  return (
    <div className="imd-sechead">
      <span className="imd-sectitle">{title}</span>
      <Toggle value={enabled} onChange={onToggle}/>
    </div>
  );
}
function F({ label, children }) {
  return (
    <div className="imd-f">
      <span className="imd-flbl">{label}</span>
      <div className="imd-fctl">{children}</div>
    </div>
  );
}

// ── Panels ───────────────────────────────────────────────────────
function MAPanel({ cfg, onChange }) {
  const upd = (i,k,v) => onChange({...cfg, lines: cfg.lines.map((l,idx)=>idx===i?{...l,[k]:v}:l)});
  return (
    <div>
      <SecHead title="MA — Moving Average" enabled={cfg.enabled} onToggle={v=>onChange({...cfg,enabled:v})}/>
      {cfg.lines.map((l,i) => (
        <div key={i} className="imd-marow">
          <Chk value={l.enabled} onChange={v=>upd(i,"enabled",v)}/>
          <span className="imd-flbl">MA{i+1}</span>
          <NumInput value={l.period} onChange={v=>upd(i,"period",v)} min={1} max={500}/>
          <Sel value={l.src}   onChange={v=>upd(i,"src",v)}          options={SRC_OPTIONS.map(s=>({label:s,value:s}))}/>
          <Sel value={l.style} onChange={v=>upd(i,"style",Number(v))} options={LINE_STYLES}/>
          <ColorPick value={l.color} onChange={v=>upd(i,"color",v)}/>
        </div>
      ))}
    </div>
  );
}
function EMAPanel({ cfg, onChange }) {
  const upd = (i,k,v) => onChange({...cfg, lines: cfg.lines.map((l,idx)=>idx===i?{...l,[k]:v}:l)});
  return (
    <div>
      <SecHead title="EMA — Exponential MA" enabled={cfg.enabled} onToggle={v=>onChange({...cfg,enabled:v})}/>
      {cfg.lines.map((l,i) => (
        <div key={i} className="imd-marow">
          <Chk value={l.enabled} onChange={v=>upd(i,"enabled",v)}/>
          <span className="imd-flbl">EMA{i+1}</span>
          <NumInput value={l.period} onChange={v=>upd(i,"period",v)} min={1} max={500}/>
          <Sel value={l.src}   onChange={v=>upd(i,"src",v)}          options={SRC_OPTIONS.map(s=>({label:s,value:s}))}/>
          <Sel value={l.style} onChange={v=>upd(i,"style",Number(v))} options={LINE_STYLES}/>
          <ColorPick value={l.color} onChange={v=>upd(i,"color",v)}/>
        </div>
      ))}
    </div>
  );
}
function BOLLPanel({ cfg, onChange }) {
  const s = k => v => onChange({...cfg,[k]:v});
  return (
    <div>
      <SecHead title="Bollinger Bands" enabled={cfg.enabled} onToggle={v=>onChange({...cfg,enabled:v})}/>
      <F label="Period"><NumInput value={cfg.period} onChange={s("period")} min={2} max={500}/></F>
      <F label="Mult"><NumInput value={cfg.mult} onChange={s("mult")} min={0.1} max={10} step={0.1}/></F>
      <F label="Source"><Sel value={cfg.src} onChange={s("src")} options={SRC_OPTIONS.map(x=>({label:x,value:x}))}/></F>
      <F label="Mid"><ColorPick value={cfg.colorMid}  onChange={s("colorMid")}/></F>
      <F label="Band"><ColorPick value={cfg.colorBand} onChange={s("colorBand")}/></F>
    </div>
  );
}
function SARPanel({ cfg, onChange }) {
  const s = k => v => onChange({...cfg,[k]:v});
  return (
    <div>
      <SecHead title="Parabolic SAR" enabled={cfg.enabled} onToggle={v=>onChange({...cfg,enabled:v})}/>
      <F label="Step"><NumInput value={cfg.step} onChange={s("step")} min={0.001} max={0.5} step={0.001}/></F>
      <F label="Max"><NumInput value={cfg.max}   onChange={s("max")}  min={0.1}   max={1}   step={0.01}/></F>
      <F label="Color"><ColorPick value={cfg.color} onChange={s("color")}/></F>
    </div>
  );
}
function SUPERPanel({ cfg, onChange }) {
  const s = k => v => onChange({...cfg,[k]:v});
  return (
    <div>
      <SecHead title="Supertrend" enabled={cfg.enabled} onToggle={v=>onChange({...cfg,enabled:v})}/>
      <F label="Period"><NumInput value={cfg.period} onChange={s("period")} min={1} max={500}/></F>
      <F label="Mult"><NumInput value={cfg.mult}   onChange={s("mult")}   min={0.1} max={20} step={0.1}/></F>
      <F label="Bull"><ColorPick value={cfg.colorBull} onChange={s("colorBull")}/></F>
      <F label="Bear"><ColorPick value={cfg.colorBear} onChange={s("colorBear")}/></F>
    </div>
  );
}
function VolumePanel({ cfg, onChange }) {
  const s = k => v => onChange({...cfg,[k]:v});
  return (
    <div>
      <SecHead title="Volume" enabled={cfg.enabled} onToggle={v=>onChange({...cfg,enabled:v})}/>
      <F label="Bull"><ColorPick value={cfg.colorBull} onChange={s("colorBull")}/></F>
      <F label="Bear"><ColorPick value={cfg.colorBear} onChange={s("colorBear")}/></F>
    </div>
  );
}
function MACDPanel({ cfg, onChange }) {
  const s = k => v => onChange({...cfg,[k]:v});
  return (
    <div>
      <SecHead title="MACD" enabled={cfg.enabled} onToggle={v=>onChange({...cfg,enabled:v})}/>
      <F label="Fast"><NumInput value={cfg.fast}   onChange={s("fast")}   min={1} max={200}/></F>
      <F label="Slow"><NumInput value={cfg.slow}   onChange={s("slow")}   min={1} max={500}/></F>
      <F label="Signal"><NumInput value={cfg.signal} onChange={s("signal")} min={1} max={100}/></F>
      <F label="Source"><Sel value={cfg.src} onChange={s("src")} options={SRC_OPTIONS.map(x=>({label:x,value:x}))}/></F>
      <F label="MACD"><ColorPick value={cfg.colorMACD}     onChange={s("colorMACD")}/></F>
      <F label="Signal"><ColorPick value={cfg.colorSignal}  onChange={s("colorSignal")}/></F>
      <F label="H.Bull"><ColorPick value={cfg.colorHistUp}   onChange={s("colorHistUp")}/></F>
      <F label="H.Bear"><ColorPick value={cfg.colorHistDown} onChange={s("colorHistDown")}/></F>
    </div>
  );
}
function RSIPanel({ cfg, onChange }) {
  const s = k => v => onChange({...cfg,[k]:v});
  return (
    <div>
      <SecHead title="RSI" enabled={cfg.enabled} onToggle={v=>onChange({...cfg,enabled:v})}/>
      <F label="Period"><NumInput value={cfg.period} onChange={s("period")} min={2} max={500}/></F>
      <F label="Source"><Sel value={cfg.src} onChange={s("src")} options={SRC_OPTIONS.map(x=>({label:x,value:x}))}/></F>
      <F label="Color"><ColorPick value={cfg.color} onChange={s("color")}/></F>
      <F label="OB"><NumInput value={cfg.overbought} onChange={s("overbought")} min={50} max={100}/></F>
      <F label="OS"><NumInput value={cfg.oversold}   onChange={s("oversold")}   min={1}  max={49}/></F>
    </div>
  );
}

// ── Main modal ───────────────────────────────────────────────────
const MAIN_TABS = ["MA","EMA","BOLL","SAR","SUPER"];
const SUB_TABS  = ["Volume","MACD","RSI"];

export default function IndicatorModal({ open, onClose, config, onChange }) {
  const [tab,     setTab]     = useState("main");
  const [sel,     setSel]     = useState("MA");
  const [pending, setPending] = useState(config);

  useEffect(() => { if (open) setPending(config); }, [open]);
  if (!open) return null;

  const upd       = (k,v) => setPending(p=>({...p,[k]:v}));
  const handleSave  = () => { onChange(pending); onClose(); };
  const handleReset = () => setPending(DEFAULT_INDICATOR_CONFIG);
  const items = tab==="main" ? MAIN_TABS : SUB_TABS;

  const renderPanel = () => {
    const cfg = pending[sel], u = v => upd(sel, v);
    switch(sel){
      case "MA":     return <MAPanel     cfg={cfg} onChange={u}/>;
      case "EMA":    return <EMAPanel    cfg={cfg} onChange={u}/>;
      case "BOLL":   return <BOLLPanel   cfg={cfg} onChange={u}/>;
      case "SAR":    return <SARPanel    cfg={cfg} onChange={u}/>;
      case "SUPER":  return <SUPERPanel  cfg={cfg} onChange={u}/>;
      case "Volume": return <VolumePanel cfg={cfg} onChange={u}/>;
      case "MACD":   return <MACDPanel   cfg={cfg} onChange={u}/>;
      case "RSI":    return <RSIPanel    cfg={cfg} onChange={u}/>;
      default:       return null;
    }
  };

  return (
    <div className="imd-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
      <div className="imd-panel">

        {/* Header */}
        <div className="imd-header">
          <div className="imd-tabs">
            {["main","sub"].map(t=>(
              <button key={t} className={`imd-tab${tab===t?" imd-tab--on":""}`}
                onClick={()=>{ setTab(t); setSel(t==="main"?"MA":"Volume"); }}>
                {t==="main"?"Main Indicators":"Sub Indicators"}
              </button>
            ))}
          </div>
          <button className="imd-close-btn" onClick={onClose}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 2L11 11M11 2L2 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="imd-body">
          {/* Sidebar (desktop) / Horizontal pill nav (mobile) */}
          <div className="imd-nav">
            {items.map(name=>{
              const on = pending[name]?.enabled;
              return (
                <button key={name} className={`imd-nav-item${sel===name?" imd-nav-item--on":""}`}
                  onClick={()=>setSel(name)}>
                  <span className={`imd-nav-dot${on?" imd-nav-dot--on":""}`}/>
                  <span>{name}</span>
                  {/* chevron only on desktop */}
                  <svg className="imd-nav-chevron" width="5" height="8" viewBox="0 0 5 8" fill="none">
                    <path d="M1 1L4 4L1 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              );
            })}
          </div>

          {/* Panel content */}
          <div className="imd-content">
            {renderPanel()}
          </div>
        </div>

        {/* Footer */}
        <div className="imd-footer">
          <button className="imd-btn imd-btn--reset" onClick={handleReset}>Reset</button>
          <button className="imd-btn imd-btn--save"  onClick={handleSave}>Save</button>
        </div>

      </div>
    </div>
  );
}