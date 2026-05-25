// ================================================================
// bottomChart.jsx — Bottom Bar (Range, UTC clock, Scale modes)
// ================================================================

import { RANGE_OPTIONS } from "./chartConstants";
import "./lwchart.css";

function fmtBarTime(ts, tf) {
  if (!ts) return null;
  const d = new Date(ts * 1000);
  const pad = n => String(n).padStart(2, "0");
  const date = `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
  const time = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  const secs = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  // For second-level TFs show full time with seconds
  if (tf === "1s" || tf === "30s") return `${date} ${secs} UTC`;
  // For minute/hour TFs show date + time
  if (tf === "1m" || tf === "5m" || tf === "15m" || tf === "30m" || tf === "1h" || tf === "4h")
    return `${date} ${time} UTC`;
  // Daily+
  return `${date} UTC`;
}

export default function BottomChart({
  range,
  setRange,
  utcTime,
  crosshair,
  tf,
  scaleMode,
  setScaleMode,
  onAutoScale,
}) {
  const barTime = crosshair?.time ? fmtBarTime(crosshair.time, tf) : null;

  return (
    <div className="lwc-bottom-bar">

      {/* Range selector */}
      <div className="lwc-range-group">
        {RANGE_OPTIONS.map(r => (
          <button
            key={r.value}
            className={`lwc-range-btn ${range===r.value?"lwc-range-btn--active":""}`}
            onClick={() => setRange(p => p===r.value ? null : r.value)}>
            {r.label}
          </button>
        ))}

        {/* Go to date icon */}
        <button className="lwc-range-icon" title="Go to date">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="0.5" y="2" width="11" height="9.5" rx="1.2" stroke="currentColor" strokeWidth="1.1"/>
            <line x1="0.5"  y1="5" x2="11.5" y2="5"   stroke="currentColor" strokeWidth="0.9"/>
            <line x1="3.5"  y1="0.5" x2="3.5" y2="3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
            <line x1="8.5"  y1="0.5" x2="8.5" y2="3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
            <path d="M6.5 7.5H8.5M8.5 7.5L7.5 6.5M8.5 7.5L7.5 8.5" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div style={{flex:1}}/>

      {/* Crosshair bar time — shown when hovering, else UTC clock */}
      {barTime
        ? <span className="lwc-bottom-bar-time lwc-bottom-bar-time--active">{barTime}</span>
        : <span className="lwc-bottom-utc">{utcTime}</span>
      }

      {/* % scale toggle */}
      <button
        className={`lwc-bottom-btn ${scaleMode==="%"?"lwc-bottom-btn--active":""}`}
        onClick={() => setScaleMode(s => s==="%"?"normal":"%")}
        title="Percentage scale">
        %
      </button>

      {/* Log scale toggle */}
      <button
        className={`lwc-bottom-btn ${scaleMode==="log"?"lwc-bottom-btn--active":""}`}
        onClick={() => setScaleMode(s => s==="log"?"normal":"log")}
        title="Logarithmic scale">
        log
      </button>

      {/* Auto scale */}
      <button
        className="lwc-bottom-btn lwc-bottom-btn--green"
        onClick={onAutoScale}
        title="Auto scale">
        auto
      </button>

    </div>
  );
}