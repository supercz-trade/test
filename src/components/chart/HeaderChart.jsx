// src/components/chart/HeaderChart.jsx
// Top Toolbar for Chart

import { useEffect, useRef, useState } from "react";
import "./lwchart.css";

const ALL_TF = [
  { label: "1s", value: "1s" },
  { label: "15s", value: "15s" },
  { label: "30s", value: "30s" },
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "30m", value: "30m" },
  { label: "1H", value: "1h" },
  { label: "4H", value: "4h" },
  { label: "1D", value: "1d" },
];

const DEFAULT_PINNED = ["1m", "5m", "1h", "4h", "1d"];
const MIN_PINNED = 1;
const MAX_PINNED = 6;
const MOBILE_FULL_COUNT = 3;
// Only these timeframes appear as buttons on mobile toolbar (others are in dropdown)
const MOBILE_ALLOWED_TFS = ["1m", "5m", "1d"];

// Dropdown helper (same as before)
function Dropdown({ open, onClose, children, style, stayOpen = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const fn = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", fn);
    document.addEventListener("touchstart", fn, { passive: true });
    return () => {
      document.removeEventListener("mousedown", fn);
      document.removeEventListener("touchstart", fn);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      ref={ref}
      onMouseDown={stayOpen ? (e) => e.stopPropagation() : undefined}
      style={{
        position: "fixed",
        zIndex: 9999,
        background: "#141416",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 8,
        boxShadow: "0 12px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Chart type config (unchanged)
const CHART_TYPES = [
  {
    id: "candlestick",
    label: "Candlestick",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="2.5" y="4" width="2.5" height="6.5" rx="0.4" stroke="currentColor" strokeWidth="1.1" />
        <line x1="3.75" y1="2" x2="3.75" y2="4" stroke="currentColor" strokeWidth="1.1" />
        <line x1="3.75" y1="10.5" x2="3.75" y2="12.5" stroke="currentColor" strokeWidth="1.1" />
        <rect x="8.5" y="5.5" width="2.5" height="5" rx="0.4" stroke="currentColor" strokeWidth="1.1" />
        <line x1="9.75" y1="3" x2="9.75" y2="5.5" stroke="currentColor" strokeWidth="1.1" />
        <line x1="9.75" y1="10.5" x2="9.75" y2="12.5" stroke="currentColor" strokeWidth="1.1" />
      </svg>
    ),
  },
  {
    id: "bar",
    label: "Bar",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <line x1="4" y1="2" x2="4" y2="12" stroke="currentColor" strokeWidth="1.2" />
        <line x1="4" y1="4" x2="2" y2="4" stroke="currentColor" strokeWidth="1.2" />
        <line x1="4" y1="8" x2="6" y2="8" stroke="currentColor" strokeWidth="1.2" />
        <line x1="10" y1="3" x2="10" y2="11" stroke="currentColor" strokeWidth="1.2" />
        <line x1="10" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1.2" />
        <line x1="10" y1="9" x2="12" y2="9" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    id: "line",
    label: "Line",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M1 10L4.5 6L7.5 8L13 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "area",
    label: "Area",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M1 10L4.5 6L7.5 8L13 3V12H1Z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.18" />
      </svg>
    ),
  },
  {
    id: "hollow",
    label: "Hollow Candle",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="2.5" y="4" width="2.5" height="6.5" rx="0.4" stroke="currentColor" strokeWidth="1.1" fill="none" />
        <line x1="3.75" y1="2" x2="3.75" y2="4" stroke="currentColor" strokeWidth="1.1" />
        <line x1="3.75" y1="10.5" x2="3.75" y2="12.5" stroke="currentColor" strokeWidth="1.1" />
        <rect x="8.5" y="5.5" width="2.5" height="5" rx="0.4" stroke="currentColor" strokeWidth="1.1" fill="none" />
        <line x1="9.75" y1="3" x2="9.75" y2="5.5" stroke="currentColor" strokeWidth="1.1" />
        <line x1="9.75" y1="10.5" x2="9.75" y2="12.5" stroke="currentColor" strokeWidth="1.1" />
      </svg>
    ),
  },
];

// Icon-only TF button with tooltip (unchanged)
function TfIconBtn({ label, active, onClick }) {
  const [tipVisible, setTipVisible] = useState(false);
  return (
    <div className="lwc-tf-icon-wrap">
      <button
        className={`lwc-tf-btn lwc-tf-btn--icon-only${active ? " lwc-tf-btn--active" : ""}`}
        onClick={onClick}
        onMouseEnter={() => setTipVisible(true)}
        onMouseLeave={() => setTipVisible(false)}
        onTouchStart={() => setTipVisible(true)}
        onTouchEnd={() => setTimeout(() => setTipVisible(false), 800)}
      >
        {label}
      </button>
      {tipVisible && <div className="lwc-tf-tooltip">{label}</div>}
    </div>
  );
}

// Display overlay options (unchanged)
export const DEFAULT_DISPLAY_OPTIONS = {
  devActivity: true,
  migration: true,
  myOrders: true,
  avgBuyLine: true,
};

export default function HeaderChart({
  tf,
  setTf,
  chartType,
  setChartType,
  priceView,
  setPriceView,
  onScreenshot,
  onFullscreen,
  onIndicators,
  displayOptions = DEFAULT_DISPLAY_OPTIONS,
  onDisplayChange = null,
}) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [pinnedTf, setPinnedTf] = useState(DEFAULT_PINNED);
  const [editMode, setEditMode] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 640);
  const [dropdownPos, setDropdownPos] = useState({ top: 38, left: 0 });
  const tfMoreRef = useRef(null);
  const ctBtnRef = useRef(null);
  const dispBtnRef = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Filter pinned options for mobile: only allowed timeframes appear as buttons
  const mobileAllowedTFs = MOBILE_ALLOWED_TFS;
  const visiblePinnedOptions = isMobile
    ? pinnedTf.filter(v => mobileAllowedTFs.includes(v))
    : pinnedTf;

  const pinnedOptions = ALL_TF.filter(o => visiblePinnedOptions.includes(o.value));
  const dropdownOptions = ALL_TF.filter(o => !pinnedTf.includes(o.value));
  const activeIsInDropdown = !pinnedTf.includes(tf);
  const moreBtnLabel = activeIsInDropdown ? ALL_TF.find(o => o.value === tf)?.label ?? "···" : null;

  const mobileFull = pinnedOptions.slice(0, MOBILE_FULL_COUNT);
  const mobileIconOnly = pinnedOptions.slice(MOBILE_FULL_COUNT);

  const handlePickTf = (value) => {
    setTf(value);
    setOpenDropdown(null);
    setEditMode(false);
  };

  const handleTogglePin = (value) => {
    setPinnedTf(prev => {
      if (prev.includes(value)) {
        if (prev.length <= MIN_PINNED) return prev;
        const next = prev.filter(v => v !== value);
        if (tf === value) setTf(next[0]);
        return next;
      } else {
        if (prev.length >= MAX_PINNED) return prev;
        const allVals = ALL_TF.map(o => o.value);
        const next = [...prev, value].sort((a, b) => allVals.indexOf(a) - allVals.indexOf(b));
        return next;
      }
    });
  };

  const closeDropdown = () => {
    setOpenDropdown(null);
    setEditMode(false);
  };

  return (
    <div className="lwc-toolbar">
      {/* Timeframe pills */}
      <div className="lwc-tf-group">
        {mobileFull.map(o => (
          <button
            key={o.value}
            className={`lwc-tf-btn${tf === o.value ? " lwc-tf-btn--active" : ""}`}
            onClick={() => setTf(o.value)}
          >
            {o.label}
          </button>
        ))}
        {mobileIconOnly.map(o => (
          <TfIconBtn key={o.value} label={o.label} active={tf === o.value} onClick={() => setTf(o.value)} />
        ))}
        {/* More dropdown */}
        <div className="lwc-dropdown-wrap" style={{ position: "relative" }}>
          <button
            ref={tfMoreRef}
            className={`lwc-tf-btn lwc-tf-more${activeIsInDropdown ? " lwc-tf-btn--active" : ""}`}
            title="More timeframes"
            onClick={() => {
              if (openDropdown === "tf") {
                closeDropdown();
                return;
              }
              const r = tfMoreRef.current?.getBoundingClientRect();
              if (r) setDropdownPos({ top: r.bottom + 4, left: r.left });
              setOpenDropdown("tf");
              setEditMode(false);
            }}
            style={{ display: "flex", alignItems: "center", gap: 3, paddingRight: 6 }}
          >
            {moreBtnLabel && <span style={{ fontSize: 11 }}>{moreBtnLabel}</span>}
            <svg
              width="8"
              height="5"
              viewBox="0 0 8 5"
              fill="none"
              style={{
                transition: "transform 0.15s",
                transform: openDropdown === "tf" ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              <path d="M1 1L4 4L7 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <Dropdown
            open={openDropdown === "tf"}
            onClose={closeDropdown}
            style={{ top: dropdownPos.top, left: dropdownPos.left, minWidth: 210 }}
          >
            {!editMode ? (
              <>
                <div
                  style={{
                    padding: "10px 14px 5px",
                    fontSize: 9,
                    color: "var(--text-muted)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  Timeframe
                </div>
                {dropdownOptions.map(o => (
                  <button
                    key={o.value}
                    className={`lwc-dd-item${tf === o.value ? " lwc-dd-item--active" : ""}`}
                    onClick={() => handlePickTf(o.value)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}
                  >
                    <span>{o.label}</span>
                    {tf === o.value && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1 4L3.2 6.5L7 1.5" stroke="var(--color-primary)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                ))}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "4px 0" }} />
                <button
                  className="lwc-dd-item"
                  onClick={() => setEditMode(true)}
                  style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 11 }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" fill="none" />
                    <line x1="6.5" y1="3" x2="8.5" y2="5" stroke="currentColor" strokeWidth="1.1" />
                  </svg>
                  <span style={{ fontSize: 11 }}>Edit toolbar...</span>
                </button>
              </>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "2px 10px 6px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      color: "var(--text-muted)",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      fontWeight: 700,
                    }}
                  >
                    Edit Toolbar
                  </div>
                  <button
                    onClick={() => setEditMode(false)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      padding: 2,
                      lineHeight: 1,
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <div style={{ padding: "2px 14px 6px", fontSize: 10, color: "var(--text-muted)" }}>
                  Min {MIN_PINNED} · Max {MAX_PINNED} pinned
                </div>
                {ALL_TF.map(o => {
                  const pinned = pinnedTf.includes(o.value);
                  const isMin = pinned && pinnedTf.length <= MIN_PINNED;
                  const isMax = !pinned && pinnedTf.length >= MAX_PINNED;
                  const disabled = isMin || isMax;
                  return (
                    <button
                      key={o.value}
                      className="lwc-dd-item"
                      disabled={disabled}
                      onClick={() => !disabled && handleTogglePin(o.value)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        opacity: disabled ? 0.35 : 1,
                        cursor: disabled ? "not-allowed" : "pointer",
                      }}
                    >
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 3,
                          flexShrink: 0,
                          border: pinned ? "none" : "1.5px solid #3f3f46",
                          background: pinned ? "var(--color-primary)" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "background 0.12s",
                        }}
                      >
                        {pinned && (
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3.5L3.2 6L8 1" stroke="#000" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span style={{ fontSize: 12, color: pinned ? "var(--text-primary)" : "#71717a" }}>{o.label}</span>
                      {tf === o.value && (
                        <span
                          style={{
                            marginLeft: "auto",
                            fontSize: 9,
                            background: "rgba(255,212,0,0.1)",
                            color: "var(--color-primary)",
                            borderRadius: 4,
                            padding: "1px 6px",
                          }}
                        >
                          active
                        </span>
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </Dropdown>
        </div>
      </div>

      <div className="lwc-tb-divider" />

      {/* Chart type button */}
      <div className="lwc-dropdown-wrap">
        <button
          ref={ctBtnRef}
          className="lwc-tb-icon-btn lwc-tb-icon-only"
          title="Chart type"
          onClick={() => {
            if (openDropdown === "ct") {
              setOpenDropdown(null);
              return;
            }
            const r = ctBtnRef.current?.getBoundingClientRect();
            if (r) setDropdownPos({ top: r.bottom + 4, left: r.left });
            setOpenDropdown("ct");
          }}
          style={{ color: openDropdown === "ct" ? "var(--text-primary)" : undefined }}
        >
          {CHART_TYPES.find(c => c.id === chartType)?.icon ?? CHART_TYPES[0].icon}
        </button>
        <Dropdown
          open={openDropdown === "ct"}
          onClose={() => setOpenDropdown(null)}
          style={{ top: dropdownPos.top, left: dropdownPos.left, minWidth: 175 }}
        >
          <div
            style={{
              padding: "10px 14px 5px",
              fontSize: 9,
              color: "var(--text-muted)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Chart Type
          </div>
          {CHART_TYPES.map(ct => (
            <button
              key={ct.id}
              className={`lwc-dd-item${chartType === ct.id ? " lwc-dd-item--active" : ""}`}
              onClick={() => {
                setChartType(ct.id);
                setOpenDropdown(null);
              }}
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <span style={{ color: chartType === ct.id ? "var(--text-primary)" : "#71717a", display: "flex", alignItems: "center" }}>
                {ct.icon}
              </span>
              <span>{ct.label}</span>
              {chartType === ct.id && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ marginLeft: "auto" }}>
                  <path d="M1 4L3.2 6.5L7 1.5" stroke="var(--color-primary)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </Dropdown>
      </div>

      {/* Indicators button */}
      <button
        className="lwc-tb-icon-btn"
        title="Indicators"
        onClick={onIndicators}
        style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 8px" }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 10L4 6.5L7 8.5L10.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <text x="0" y="13.5" fontSize="6" fill="currentColor" fontFamily="serif" fontStyle="italic" fontWeight="bold">
            fx
          </text>
        </svg>
        <span className="lwc-tb-label-desktop" style={{ fontSize: 11, letterSpacing: "0.01em" }}>
          Indicators
        </span>
      </button>

      {/* Display overlay dropdown */}
      <div className="lwc-dropdown-wrap">
        <button
          ref={dispBtnRef}
          className="lwc-tb-icon-btn"
          title="Display overlays"
          onClick={() => {
            if (openDropdown === "disp") {
              setOpenDropdown(null);
              return;
            }
            const r = dispBtnRef.current?.getBoundingClientRect();
            if (r) setDropdownPos({ top: r.bottom + 4, left: r.left });
            setOpenDropdown("disp");
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "0 8px",
            color: openDropdown === "disp" ? "var(--text-primary)" : undefined,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2" />
            <line x1="7" y1="1.5" x2="7" y2="4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="7" y1="9.5" x2="7" y2="12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="1.5" y1="7" x2="4.5" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="9.5" y1="7" x2="12.5" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span className="lwc-tb-label-desktop" style={{ fontSize: 11, letterSpacing: "0.01em" }}>
            Display
          </span>
        </button>
        <Dropdown
          open={openDropdown === "disp"}
          onClose={() => setOpenDropdown(null)}
          style={{ top: dropdownPos.top, left: dropdownPos.left, minWidth: 220 }}
          stayOpen={true}
        >
          <div
            style={{
              padding: "10px 14px 5px",
              fontSize: 9,
              color: "var(--text-muted)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Chart Overlays
          </div>
          {[
            {
              key: "devActivity",
              label: "Developer Activity",
              desc: "Show buy/sell markers from the token developer",
              color: "#22c55e",
            },
            {
              key: "migration",
              label: "Migration Event",
              desc: "Show liquidity migration marker on chart",
              color: "#3b82f6",
            },
            {
              key: "myOrders",
              label: "My Trade History",
              desc: "Highlight your personal buy/sell transactions",
              color: "#f97316",
            },
            {
              key: "avgBuyLine",
              label: "Avg Buy Price Line",
              desc: "Display your average entry price as a dashed line",
              color: "#f97316",
            },
          ].map(item => {
            const active = displayOptions[item.key] ?? true;
            return (
              <button
                key={item.key}
                className="lwc-dd-item"
                onMouseDown={e => e.stopPropagation()}
                onClick={e => {
                  e.stopPropagation();
                  const next = { ...displayOptions, [item.key]: !active };
                  onDisplayChange?.(next);
                }}
                style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 14px" }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    marginTop: 2,
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    border: active ? "none" : "1.5px solid #3f3f46",
                    background: active ? item.color : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 0.12s",
                  }}
                >
                  {active && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3.5L3.2 6L8 1" stroke="#000" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span style={{ display: "flex", flexDirection: "column", gap: 2, textAlign: "left" }}>
                  <span
                    style={{
                      fontSize: 12,
                      color: active ? "var(--text-primary)" : "var(--text-muted)",
                      fontWeight: 600,
                      transition: "color 0.12s",
                    }}
                  >
                    {item.label}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.4 }}>{item.desc}</span>
                </span>
              </button>
            );
          })}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "6px 0 4px" }} />
          <div style={{ padding: "4px 14px 8px", fontSize: 10, color: "var(--text-muted)", lineHeight: 1.5 }}>
            Overlays apply to the current chart view only.
          </div>
        </Dropdown>
      </div>

      <div className="lwc-tb-divider" />

      {/* Price / Market Cap toggle */}
      <div className="lwc-tb-pair">
        <button
          className={`lwc-tb-pair-btn${priceView === "price" ? " lwc-tb-pair-btn--active" : ""}`}
          title="Show Price"
          onClick={() => setPriceView("price")}
        >
          <span className="lwc-tb-label-desktop">Price</span>
          <span className="lwc-tb-label-mobile">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </span>
        </button>
        <span className="lwc-tb-pair-sep">/</span>
        <button
          className={`lwc-tb-pair-btn${priceView === "mcap" ? " lwc-tb-pair-btn--active" : ""}`}
          title="Show Market Cap"
          onClick={() => setPriceView("mcap")}
        >
          <span className="lwc-tb-label-desktop">Market Cap</span>
          <span className="lwc-tb-label-mobile" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.03em" }}>
            MC
          </span>
        </button>
      </div>

      <div style={{ flex: 1 }} />

      {/* Screenshot button */}
      <button className="lwc-tb-action-btn" title="Screenshot" onClick={onScreenshot}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="1" y="3" width="12" height="9.5" rx="1.4" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="7" cy="7.5" r="2.3" stroke="currentColor" strokeWidth="1.2" />
          <path d="M4.5 3L5.2 1.5H8.8L9.5 3" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Fullscreen button */}
      <button className="lwc-tb-action-btn" title="Fullscreen" onClick={onFullscreen}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 8.5V12H5.5M12 8.5V12H8.5M2 5.5V2H5.5M12 5.5V2H8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}