// ===============================================================
// DiscoverColumn.jsx
// UI components: Column, TokenRow, FilterDropdown
// ===============================================================

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useQuickBuy } from "../../context/QuickBuyContext";
import { useRefCode } from "../../hooks/useRefCode";
import { wallets as walletsApi, trade as tradeApi, reward as rewardsApi } from "../../services/api";
import { getPlatformLogo, DISCOVER_DEFAULT_FILTER, DEV_MARK_CONFIG } from "../../services/config";
import {
  FilterIcon,
  CopyIcon,
  SearchIcon,
  XIcon,
  TelegramIcon,
  GlobeIcon,
  UserGroupIcon,
  SwapIcon,
  ChefHatIcon,
  ChartDownIcon,
  LightningIcon,
  RocketIcon,
  ArrowRightIcon,
  StarFilledIcon,
  ChevronDownIcon,
} from "../../assets/icons";
import { calcAge, calcAgeMinutes, fmtMC, fmtBalance } from "../../utils/format";

function playSound(src, volume = 0.5) {
  try {
    if (localStorage.getItem("ui_sound") === "off") return;
    const audio = new Audio(src);
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch {}
}

// ===============================================================
// BASE PAIR ICON
// ===============================================================

function BasePairIcon({ basePair, size = 14 }) {
  if (!basePair) return null;
  const key = basePair.toUpperCase();
  const map = {
    BNB:   "/assets/tokens/bnb.svg",
    WBNB:  "/assets/tokens/bnb.svg",
    USDT:  "/assets/tokens/usdt.svg",
    USDC:  "/assets/tokens/usdc.svg",
    CAKE:  "/assets/tokens/cake.svg",
    ASTER: "/assets/tokens/aster.svg",
    UUSD:  "/assets/tokens/uusd.svg",
    USD1:  "/assets/tokens/usd1.svg",
  };

  if (map[key]) return (
    <img src={map[key]} width={size} height={size}
      style={{ borderRadius: "50%", flexShrink: 0, display: "block" }}
      alt={key} />
  );

  return (
    <span style={{
      fontSize: "8px", fontWeight: 800,
      color: "var(--text-secondary)",
      background: "var(--bg-elevated)",
      borderRadius: "4px", padding: "1px 4px",
      lineHeight: 1.4, flexShrink: 0
    }}>
      {key.slice(0, 4)}
    </span>
  );
}

// ===============================================================
// HELPERS
// ===============================================================

export const DEFAULT_FILTER = DISCOVER_DEFAULT_FILTER;

function useLiveAge(launchTime) {
  const [age, setAge] = useState(() => calcAge(launchTime));
  useEffect(() => {
    if (!launchTime) return;
    const tick = () => setAge(calcAge(launchTime));
    tick();
    const ms = typeof launchTime === "string" ? new Date(launchTime).getTime() : (launchTime > 1e12 ? launchTime : launchTime * 1000);
    const diffSec = (Date.now() - ms) / 1000;
    const id = setInterval(tick, diffSec < 3600 ? 1000 : 10000);
    return () => clearInterval(id);
  }, [launchTime]);
  return age;
}

function applyFilter(tokens, filter) {
  if (!Array.isArray(tokens) || !filter) return [];

  const platformValues = Object.values(filter.platforms);
  const allOff = platformValues.length > 0 && platformValues.every(v => !v);

  return tokens.filter(t => {
    const src = t.sourceFrom || "";

    if (!allOff) {
      if (src in filter.platforms) {
        if (!filter.platforms[src]) return false;
      }
    }

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

// ===============================================================
// ROUNDED RECT PROGRESS RING
// ===============================================================

function RoundedRectProgress({ progress, size = 54, rx = 10 }) {
  const pct = Math.min(Math.max(Number(progress || 0), 0), 100);
  const stroke = 2.5;
  const pad = stroke / 2;
  const w = size - stroke;
  const h = size - stroke;
  const perim = 2 * (w + h) - (8 - 2 * Math.PI) * rx;
  const offset = perim - (pct / 100) * perim;
  const color = pct >= 80 ? "var(--color-danger)" : pct >= 50 ? "var(--color-primary)" : "var(--color-success)";

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <rect x={pad} y={pad} width={w} height={h} rx={rx} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <rect x={pad} y={pad} width={w} height={h} rx={rx} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={perim} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }} />
    </svg>
  );
}

// ===============================================================
// DEX LIQUIDITY
// ===============================================================

function DexLiquidity({ liquidity, basePair }) {
  if (!liquidity || (!liquidity.usd && !liquidity.base)) return null;
  return (
    <div className="dc-dex-liq">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      </svg>
      <span>{fmtMC(liquidity.usd)}</span>
      {liquidity.base > 0 && basePair && (
        <span className="dc-dex-liq-base">{Number(liquidity.base).toFixed(2)} {basePair}</span>
      )}
    </div>
  );
}

// ===============================================================
// TOP 10 HOLDER TOOLTIP
// ===============================================================

function Top10Tooltip({ top10 }) {
  if (!top10?.length) return null;
  const totalPct = top10.reduce((s, h) => s + (h.pct || 0), 0);

  return (
    <div className="dc-ind-tooltip dc-ind-tooltip--wide">
      <div className="dc-ind-tooltip-header">
        <span>Top 10 Holders</span>
        <span className="dc-ind-tooltip-sub">{totalPct.toFixed(1)}% of supply</span>
      </div>
      {top10.map((h, i) => {
        const pct = Number(h.pct || 0);
        const color = h.isDev ? "var(--color-primary)" : pct >= 10 ? "#ef4444" : pct >= 5 ? "#f97316" : "#22c55e";
        const short = h.address ? `${h.address.slice(0, 6)}${h.address.slice(-4)}` : "?";
        return (
          <div key={h.address || i} className="dc-top10-row">
            <span className="dc-top10-rank">{i + 1}</span>
            <span className="dc-top10-addr" style={{ color: h.isDev ? "var(--color-primary)" : "var(--text-secondary)" }}>
              {short}
              {h.isDev && <span className="dc-top10-dev-tag">DEV</span>}
            </span>
            <div className="dc-top10-bar-wrap">
              <div className="dc-top10-bar" style={{ width: `${Math.min(pct * 3, 100)}%`, background: color }} />
            </div>
            <span className="dc-top10-pct" style={{ color }}>{pct.toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ===============================================================
// PAPER HAND TOOLTIP
// ===============================================================

function PaperHandTooltip({ paperPct }) {
  const color = paperPct > 50 ? "#ef4444" : paperPct > 30 ? "#f97316" : "#22c55e";
  const label = paperPct > 50 ? "High" : paperPct > 30 ? "Medium" : "Low";

  return (
    <div className="dc-ind-tooltip">
      <div className="dc-ind-tooltip-header">
        <span>Paper Hands</span>
        <span className="dc-ind-tooltip-badge" style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}>
          {label}
        </span>
      </div>
      <div className="dc-ind-tooltip-row">
        <span className="dc-ind-tooltip-label">Sellers ratio</span>
        <span className="dc-ind-tooltip-val" style={{ color }}>{paperPct.toFixed(2)}%</span>
      </div>
      <div className="dc-ind-tooltip-row">
        <span className="dc-ind-tooltip-label">Signal</span>
        <span className="dc-ind-tooltip-sub2" style={{ color }}>
          {paperPct > 50
            ? "Most holders have sold"
            : paperPct > 30
            ? "Significant selling pressure"
            : "Holders are holding strong"}
        </span>
      </div>
    </div>
  );
}

// ===============================================================
// DEV MARK TOOLTIP
// ===============================================================

function DevMarkTooltip({ devMark, developerAddress, devHoldPct, top10 }) {
  const mark = devMark || "DH";
  const c = DEV_MARK_CONFIG[mark] || DEV_MARK_CONFIG["DH"];
  const devHolder = top10?.find(h => h.isDev);

  return (
    <div className="dc-ind-tooltip">
      <div className="dc-ind-tooltip-header">
        <span>Dev Activity</span>
        <span className="dc-ind-tooltip-badge" style={{ background: `${c.color}22`, color: c.color, border: `1px solid ${c.color}55` }}>
          {mark}
        </span>
      </div>
      <div className="dc-ind-tooltip-row">
        <span className="dc-ind-tooltip-label">Status</span>
        <span className="dc-ind-tooltip-val" style={{ color: c.color }}>{c.label}</span>
      </div>
      {devHoldPct > 0 && (
        <div className="dc-ind-tooltip-row">
          <span className="dc-ind-tooltip-label">Holding</span>
          <span className="dc-ind-tooltip-val" style={{ color: c.color }}>{devHoldPct.toFixed(2)}%</span>
        </div>
      )}
      {devHolder?.address && (
        <div className="dc-ind-tooltip-row">
          <span className="dc-ind-tooltip-label">Wallet</span>
          <span className="dc-ind-tooltip-addr">{devHolder.address.slice(0, 8)}{devHolder.address.slice(-6)}</span>
        </div>
      )}
      <div className="dc-ind-tooltip-desc">{c.desc}</div>
    </div>
  );
}

// ===============================================================
// DEV WALLET OVERVIEW CACHE
// ===============================================================

const _devOverviewCache = new Map();

function useDevOverview(developerAddress) {
  const [overview, setOverview] = useState(
    () => developerAddress ? (_devOverviewCache.get(developerAddress.toLowerCase()) ?? null) : null
  );
  const fetchedRef = useRef(false);

  const trigger = useCallback(() => {
    if (!developerAddress || fetchedRef.current) return;
    const addr = developerAddress.toLowerCase();
    if (_devOverviewCache.has(addr)) {
      setOverview(_devOverviewCache.get(addr));
      fetchedRef.current = true;
      return;
    }
    fetchedRef.current = true;
    walletsApi.getOverview(addr)
      .then(data => {
        if (!data) return;
        _devOverviewCache.set(addr, data);
        setOverview(data);
      })
      .catch(() => {});
  }, [developerAddress]);

  return { overview, trigger };
}

// ===============================================================
// DEV DEPLOY TOOLTIP
// ===============================================================

function DevDeployTooltip({ overview, developerAddress }) {
  if (!overview) return (
    <div className="dc-ind-tooltip dc-dev-deploy-tooltip">
      <div className="dc-ind-tooltip-header">
        <span>Dev Wallet</span>
        {developerAddress && (
          <span className="dc-ind-tooltip-addr">{developerAddress.slice(0, 6)}{developerAddress.slice(-4)}</span>
        )}
      </div>
      <div className="dc-ind-tooltip-desc">Loading...</div>
    </div>
  );

  const { deploy, trading, behavior } = overview;
  const deployCount = deploy?.deployCount ?? 0;
  const migratedCount = deploy?.migratedCount ?? 0;
  const winRate = behavior?.winRate ?? 0;
  const totalPnl = trading?.totalRealizedPnl ?? 0;
  const pnlColor = totalPnl >= 0 ? "#22c55e" : "#ef4444";
  const tokens = deploy?.deployData ?? [];

  return (
    <div className="dc-ind-tooltip dc-dev-deploy-tooltip">
      <div className="dc-ind-tooltip-header">
        <span>Dev Wallet</span>
        {developerAddress && (
          <span className="dc-ind-tooltip-addr">{developerAddress.slice(0, 6)}{developerAddress.slice(-4)}</span>
        )}
      </div>

      <div className="dc-dev-deploy-stats">
        <div className="dc-dev-deploy-stat">
          <span className="dc-ind-tooltip-label">Deployed</span>
          <span className="dc-ind-tooltip-val" style={{ color: "var(--text-primary)" }}>{deployCount}</span>
        </div>
        <div className="dc-dev-deploy-stat">
          <span className="dc-ind-tooltip-label">Migrated</span>
          <span className="dc-ind-tooltip-val" style={{ color: "var(--color-primary)" }}>{migratedCount}</span>
        </div>
        <div className="dc-dev-deploy-stat">
          <span className="dc-ind-tooltip-label">Win rate</span>
          <span className="dc-ind-tooltip-val" style={{ color: winRate >= 50 ? "#22c55e" : "#ef4444" }}>{winRate.toFixed(0)}%</span>
        </div>
        <div className="dc-dev-deploy-stat">
          <span className="dc-ind-tooltip-label">PnL</span>
          <span className="dc-ind-tooltip-val" style={{ color: pnlColor }}>
            {totalPnl >= 0 ? "+" : ""}{Math.abs(totalPnl) >= 1000 ? `$${(totalPnl/1000).toFixed(1)}K` : `$${totalPnl.toFixed(0)}`}
          </span>
        </div>
      </div>
    </div>
  );
}

// ===============================================================
// DEV DEPLOY BADGE
// ===============================================================

const CROWN_PATH = "M115.451,132.818c0,1.487-1.207,2.7-2.699,2.7H32.563c-1.492,0-2.7-1.213-2.7-2.7s1.208-2.7,2.7-2.7h80.188C114.244,130.118,115.451,131.321,115.451,132.818z M145.167,29.627l-31.408,91.626c-0.369,1.092-1.393,1.825-2.553,1.825H34.101c-1.154,0-2.18-0.733-2.552-1.825L0.146,29.627c-0.253-0.741-0.172-1.55,0.216-2.226c0.391-0.675,1.05-1.149,1.817-1.302c17.479-3.472,36.215-0.087,50.838,9.034l17.442-24.282c1.015-1.411,3.37-1.411,4.385,0l17.441,24.282c14.623-9.121,33.37-12.501,50.842-9.034c0.765,0.153,1.429,0.627,1.819,1.302C145.336,28.083,145.421,28.892,145.167,29.627z M46.678,49.082c-6.565-4.485-14.407-7.473-22.667-8.648c-0.936-0.143-1.854,0.227-2.452,0.943c-0.601,0.718-0.789,1.696-0.493,2.582l13.205,39.7c0.377,1.135,1.429,1.846,2.565,1.846c0.28,0,0.567-0.042,0.852-0.131c1.416-0.47,2.184-1.999,1.711-3.412L27.644,46.608c5.816,1.355,11.28,3.723,16,6.945c1.226,0.833,2.906,0.524,3.752-0.707C48.239,51.61,47.909,49.93,46.678,49.082z";

function DevDeployBadge({ developerAddress }) {
  if (!developerAddress) return null;
  const { overview, trigger } = useDevOverview(developerAddress);
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const hideTimer = useRef(null);

  const deployCount = overview?.deploy?.deployCount ?? null;
  const migratedCount = overview?.deploy?.migratedCount ?? null;
  const label = deployCount !== null ? `${migratedCount ?? 0}/${deployCount}` : "·/·";

  const getPos = () => {
    if (!ref.current) return null;
    const rect = ref.current.getBoundingClientRect();
    const flipDown = rect.top < 260;
    return {
      left: rect.left + rect.width / 2,
      top: flipDown ? rect.bottom + 6 : rect.top - 6,
      flipDown,
    };
  };

  const handleBadgeEnter = () => {
    clearTimeout(hideTimer.current);
    trigger();
    setPos(getPos());
  };

  const handleBadgeLeave = () => {
    hideTimer.current = setTimeout(() => setPos(null), 120);
  };

  const handleTooltipEnter = () => clearTimeout(hideTimer.current);
  const handleTooltipLeave = () => {
    hideTimer.current = setTimeout(() => setPos(null), 120);
  };

  return (
    <span
      ref={ref}
      className="dc-dev-deploy-badge dc-ind-wrap--hoverable"
      onMouseEnter={handleBadgeEnter}
      onMouseLeave={handleBadgeLeave}
    >
      <svg width="10" height="10" viewBox="0 0 145.312 145.311" fill="currentColor" style={{ flexShrink: 0 }}>
        <path d={CROWN_PATH} />
      </svg>
      <span className="dc-dev-deploy-count">{label}</span>

      {pos && createPortal(
        <div
          style={{
            position: "fixed",
            left: pos.left,
            top: pos.top,
            transform: pos.flipDown ? "translateX(-50%)" : "translateX(-50%) translateY(-100%)",
            zIndex: 9999,
            pointerEvents: "auto",
          }}
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
        >
          <DevDeployTooltip overview={overview} developerAddress={developerAddress} />
        </div>,
        document.body
      )}
    </span>
  );
}

// ===============================================================
// INDICATOR WRAP WITH TOOLTIP
// ===============================================================

function IndWrap({ children, tooltip }) {
  const [pos, setPos] = useState(null);
  const ref = useRef(null);

  const handleMouseEnter = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const tipH = 220;
    const spaceUp = rect.top;
    const flipDown = spaceUp < tipH + 12;
    setPos({
      left: rect.left + rect.width / 2,
      top: flipDown ? rect.bottom + 8 : rect.top - 8,
      flipDown,
    });
  };

  const handleMouseLeave = () => setPos(null);

  return (
    <span
      ref={ref}
      className="dc-ind-wrap dc-ind-wrap--hoverable"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {pos && createPortal(
        <div
          style={{
            position: "fixed",
            left: pos.left,
            top: pos.top,
            transform: pos.flipDown ? "translateX(-50%)" : "translateX(-50%) translateY(-100%)",
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          {tooltip}
        </div>,
        document.body
      )}
    </span>
  );
}

// ===============================================================
// FILTER DROPDOWN
// ===============================================================

export function FilterDropdown({ filter = DEFAULT_FILTER, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const togglePlatform = (key) =>
    onChange({ ...filter, platforms: { ...filter.platforms, [key]: !filter.platforms[key] } });

  const set = (key, val) => onChange({ ...filter, [key]: val });
  const reset = () => onChange(DEFAULT_FILTER);

  const hasActiveFilter = (
    Object.values(filter.platforms).some(v => !v) ||
    filter.ageMin !== "" || filter.ageMax !== "" ||
    filter.mcMin !== "" || filter.mcMax !== "" ||
    filter.volMin !== "" || filter.volMax !== ""
  );

  return (
    <div className="dc-filter-wrap" ref={ref}>
      <button
        className={`dc-filter-btn ${hasActiveFilter ? "dc-filter-btn--active" : ""}`}
        onClick={() => setOpen(o => !o)}
        title="Filter"
      >
        <FilterIcon size={14} />
      </button>

      {open && (
        <div className="dc-filter-panel">
          <div className="dc-filter-header">
            <span className="dc-filter-title">Filter</span>
            <button className="dc-filter-reset" onClick={reset}>Reset</button>
          </div>

          <div className="dc-filter-section">
            <div className="dc-filter-label">Platform</div>
            <div className="dc-filter-platforms">
              {[
                { key: "flap_sh",   logo: getPlatformLogo("flap_sh"),     label: "Flap.sh"   },
                { key: "four_meme", logo: getPlatformLogo("four_meme"), label: "Four.meme" },
              ].map(({ key, logo, label }) => (
                <button
                  key={key}
                  className={`dc-platform-chip ${filter.platforms[key] ? "dc-platform-chip--on" : "dc-platform-chip--off"}`}
                  onClick={() => togglePlatform(key)}
                >
                  <img src={logo} alt={label} className="dc-platform-chip-logo" onError={e => e.target.style.display = "none"} />
                  <span>{label}</span>
                  <span className="dc-chip-check">{filter.platforms[key] ? "✓" : "—"}</span>
                </button>
              ))}
            </div>
          </div>

          {[
            { label: "Token Age (minutes)", minKey: "ageMin", maxKey: "ageMax" },
            { label: "Market Cap ($)",      minKey: "mcMin",  maxKey: "mcMax"  },
            { label: "Volume ($)",          minKey: "volMin", maxKey: "volMax" },
          ].map(({ label, minKey, maxKey }) => (
            <div className="dc-filter-section" key={minKey}>
              <div className="dc-filter-label">{label}</div>
              <div className="dc-filter-range">
                <input className="dc-filter-input" type="number" min="0" placeholder="Min"
                  value={filter[minKey]} onChange={e => set(minKey, e.target.value)} />
                <span className="dc-filter-dash">—</span>
                <input className="dc-filter-input" type="number" min="0" placeholder="Max"
                  value={filter[maxKey]} onChange={e => set(maxKey, e.target.value)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===============================================================
// TOKEN ROW
// ===============================================================

function getUserTradeSettings() {
  try {
    const s = JSON.parse(localStorage.getItem("tp_settings") || "null");
    return s?.P1 || { slippage: "0.12", gas: "0", anti_mev: false };
  } catch {
    return { slippage: "0.12", gas: "0", anti_mev: false };
  }
}

function usePrevious(value) {
  const ref = useRef(undefined);
  useEffect(() => { ref.current = value; });
  return ref.current;
}

export function TokenRow({ t, walletId, onNotif, useMigratedTime = false }) {
  const [copied, setCopied] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const pollRef = useRef(null);
  const ageTs = useMigratedTime ? (t.migratedTime || t.launchTime) : t.launchTime;
  const age = useLiveAge(ageTs);
  const navigate = useNavigate();
  const { appendRef } = useRefCode();
  const { quickBuyAmount } = useQuickBuy();

  const isNewRef = useRef(true);
  const [rowClass, setRowClass] = useState("dc-row dc-row--enter");
  useEffect(() => {
    if (!isNewRef.current) return;
    isNewRef.current = false;
    const id = setTimeout(() => setRowClass("dc-row"), 500);
    return () => clearTimeout(id);
  }, []);

  const prevDevMark = usePrevious(t.devMark);
  const [flipMark, setFlipMark] = useState(false);
  useEffect(() => {
    if (prevDevMark === undefined) return;
    if (prevDevMark !== t.devMark && t.devMark) {
      setFlipMark(true);
      const id = setTimeout(() => setFlipMark(false), 400);
      return () => clearTimeout(id);
    }
  }, [t.devMark, prevDevMark]);

  const prevMC = usePrevious(t.marketCap);
  const [flashMC, setFlashMC] = useState(false);
  useEffect(() => {
    if (prevMC === undefined || !prevMC) return;
    const pct = Math.abs((t.marketCap - prevMC) / prevMC);
    if (pct > 0.01) {
      setFlashMC(true);
      const id = setTimeout(() => setFlashMC(false), 600);
      return () => clearTimeout(id);
    }
  }, [t.marketCap, prevMC]);

  const prevTxCount = usePrevious(t.txCount);
  const [shaking, setShaking] = useState(false);
  useEffect(() => {
    if (prevTxCount === undefined) return;
    if (prevTxCount !== t.txCount) {
      setShaking(true);
      const id = setTimeout(() => setShaking(false), 500);
      return () => clearTimeout(id);
    }
  }, [t.txCount, prevTxCount]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const pollTrade = (tradeId, jwtToken) => {
    clearInterval(pollRef.current);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 60) {
        clearInterval(pollRef.current);
        onNotif?.({ type: "error", message: "Trade timeout – check transaction history" });
        return;
      }
      try {
        const d = await tradeApi.getStatus(tradeId);
        const isSuccess = d.status === "completed" || d.status === "done" || d.status === "sent";
        if (isSuccess) {
          clearInterval(pollRef.current);
          let cashback = Number(d.cashbackAmount ?? d.cashback_amount ?? d.fee_amount ?? 0);
          if (cashback === 0) {
            try {
              const rewardsRes = await rewardsApi.getPending();
              let rewardsList = [];
              if (Array.isArray(rewardsRes)) rewardsList = rewardsRes;
              else if (rewardsRes?.rewards) rewardsList = rewardsRes.rewards;
              else if (rewardsRes?.data) rewardsList = rewardsRes.data;
              const tradeReward = rewardsList.find(r =>
                r.type === "trade" && r.referenceId === tradeId && r.status === "pending"
              );
              if (tradeReward && tradeReward.amountBNB > 0) {
                cashback = Number(tradeReward.amountBNB);
              }
            } catch (err) {
              console.error("Failed to fetch pending rewards:", err);
            }
          }
          if (cashback > 0) {
            playSound("/sound/reward-trade.mp3", 0.6);
            onNotif?.({ type: "reward", cashback });
          }
        } else if (d.status === "failed") {
          clearInterval(pollRef.current);
          onNotif?.({ type: "error", message: d.last_error || "Trade failed" });
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, 5000);
  };

  const handleRowClick = () => {
    if (!t?.tokenAddress) return;
    navigate(appendRef(`/trade/${t.tokenAddress}`));
  };

  const handleImageSearch = (e) => {
    e.stopPropagation();
    if (!t.imageUrl) return;
    window.open(`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(t.imageUrl)}`, "_blank", "noopener,noreferrer");
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(t.tokenAddress).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const handleBuy = async (e) => {
    e.stopPropagation();

    const jwtToken = localStorage.getItem("token");
    if (!jwtToken) return showToast("Login required", "error");
    if (!walletId) return showToast("Wallet not found", "error");
    if (!quickBuyAmount || Number(quickBuyAmount) <= 0) return showToast("Set buy amount", "error");

    const src = (t.sourceFrom || "").toLowerCase();
    const source = src.includes("four") ? "fourmeme" : src.includes("flap") ? "flap" : "fourmeme";
    const cfg = getUserTradeSettings();

    setBuyLoading(true);
    playSound("/sound/transaction.mp3", 0.4);
    try {
      const data = await tradeApi.request({
        walletId,
        source,
        token_address: t.tokenAddress,
        base_token: t.basePair || "BNB",
        side: "BUY",
        amount: Number(quickBuyAmount),
        slippage: Number(cfg.slippage) || 0.12,
        gas_gwei: Number(cfg.gas) || null,
        anti_mev: cfg.anti_mev ?? false,
      });
      setBuyLoading(false);
      showToast("Buy submitted ✓", "success");
      if (data.id) pollTrade(data.id, jwtToken);
    } catch (err) {
      showToast(err?.data?.error || "Buy failed", "error");
      setBuyLoading(false);
    }
  };

  const hs = t.holderStats || {};
  const top10Pct = hs.top10?.reduce((sum, h) => sum + (h.pct || 0), 0) ?? 0;
  const devHoldPct = hs.devHoldPct ?? 0;
  const paperPct = hs.paperHandPct ?? hs.paperPct ?? 0;
  const threshold = (pct) => pct >= 20 ? "#ef4444" : "#22c55e";
  const rawTax = Number(t?.tax?.buy ?? t?.taxBuy ?? 0) + 1;
  const devMark = t.devMark || null;

  const platformLogo = getPlatformLogo(t.sourceFrom) !== "/unknown.jpg" ? getPlatformLogo(t.sourceFrom) : null;

  const isBonding = t.mode !== "dex";
  const isDex = t.mode === "dex";

  const devMarkColor =
    devMark === "DS" ? "#ef4444" :
    devMark === "DP" ? "#f97316" :
    devMark === "DB" ? "#22c55e" :
    devMark === "DH" ? "#71717a" : null;

  return (
    <div className={`${rowClass}${shaking ? " dc-row--shake" : ""}`} onClick={handleRowClick} style={{ position: "relative" }}>

      <div className="dc-left">
        <div className={`dc-logo-wrap${isBonding && t.progress != null ? " dc-logo-wrap--ring" : ""}`}>
          {isBonding && t.progress != null && (
            <RoundedRectProgress progress={t.progress} size={54} rx={10} />
          )}

          <img
            src={t.imageUrl || "/unknown.jpg"}
            className="dc-logo"
            alt={t.symbol}
            onError={e => e.target.src = "/unknown.jpg"}
            onClick={handleImageSearch}
            style={{ cursor: "zoom-in" }}
            title={t.description || t.symbol}
          />

          {isBonding && t.progress != null && (
            <div className="dc-logo-hover-overlay" onClick={handleImageSearch}>
              <span className="dc-logo-hover-pct">
                {Math.min(Math.max(Number(t.progress || 0), 0), 100).toFixed(0)}%
              </span>
            </div>
          )}

          {rawTax > 0 && (
            <span className="dc-tax-badge-v"
              style={{ background: rawTax > 5 ? "rgba(239,68,68,0.9)" : "rgba(34,197,94,0.9)" }}>
              {rawTax}%
            </span>
          )}
          {platformLogo && (
            <img src={platformLogo} className="dc-source-logo" alt={t.sourceFrom} title={t.sourceFrom} />
          )}
        </div>

        <div className="dc-meta">
          <div className="dc-title-row">
            <span className="dc-symbol">{t.symbol}</span>
            <span className="dc-name">{t.name}</span>
            <button className="dc-copy" onClick={handleCopy} title="Copy address">
              {copied ? "✓" : <CopyIcon size={11} />}
            </button>
          </div>

          <div className="dc-sub-row">
            <span className="dc-age">{age}</span>
            <a href={`https://x.com/search?q=${t.tokenAddress}`} target="_blank" rel="noreferrer" className="dc-icon-link" title="Search on X">
              <SearchIcon size={11} />
            </a>
            {t.twitter && (
              <a href={t.twitter} target="_blank" rel="noreferrer" className="dc-icon-link" title="Twitter/X" onClick={e => e.stopPropagation()}>
                <XIcon size={11} />
              </a>
            )}
            {t.telegram && (
              <a href={t.telegram} target="_blank" rel="noreferrer" className="dc-icon-link" title="Telegram" onClick={e => e.stopPropagation()}>
                <TelegramIcon size={11} />
              </a>
            )}
            {t.website && (
              <a href={t.website} target="_blank" rel="noreferrer" className="dc-icon-link" title="Website" onClick={e => e.stopPropagation()}>
                <GlobeIcon size={11} />
              </a>
            )}
            <span className="dc-stat-pill" data-tooltip={`${Number(t.holderCount || 0).toLocaleString()} holders`}>
              <UserGroupIcon size={11} />
              <span>{Number(t.holderCount || 0).toLocaleString()}</span>
              <span className="dc-stat-tooltip">{Number(t.holderCount || 0).toLocaleString()} holders</span>
            </span>
            <span className="dc-stat-pill">
              <SwapIcon size={11} />
              <span>{Number(t.txCount || 0).toLocaleString()}</span>
              <span className="dc-stat-tooltip">{Number(t.txCount || 0).toLocaleString()} transactions</span>
            </span>
            {t.basePair && (
              <span className="dc-basepair-pill" title={`${t.basePair}${isBonding && t.bondingLiquidity?.base > 0 ? ` · ${Number(t.bondingLiquidity.base).toFixed(3)} ${t.basePair}` : isDex && t.liquidity?.base > 0 ? ` · ${Number(t.liquidity.base).toFixed(3)} ${t.basePair}` : ""}`}>
                {isBonding && t.bondingLiquidity?.base > 0 && (
                  <span className="dc-basepair-liq">{Number(t.bondingLiquidity.base).toFixed(2)}</span>
                )}
                {isDex && t.liquidity?.base > 0 && (
                  <span className="dc-basepair-liq">{Number(t.liquidity.base).toFixed(2)}</span>
                )}
                <BasePairIcon basePair={t.basePair} size={13} />
              </span>
            )}
          </div>

          <div className="dc-tax-row">
            <IndWrap tooltip={<Top10Tooltip top10={hs.top10} />}>
              <span className="dc-indicator-circle" style={{ borderColor: threshold(top10Pct), color: threshold(top10Pct) }}>10</span>
              <span className="dc-indicator-pct" style={{ color: threshold(top10Pct) }}>{top10Pct.toFixed(0)}%</span>
            </IndWrap>

            <IndWrap tooltip={<DevMarkTooltip devMark={devMark} developerAddress={t.developerAddress} devHoldPct={devHoldPct} top10={hs.top10} />}>
              <span
                className="dc-dev-combined"
                style={{ color: devMarkColor || threshold(devHoldPct) }}
              >
                <ChefHatIcon size={10} />
                {devMark && <span className="dc-dev-mark-label">{devMark}</span>}
                {devHoldPct > 0 && <span className="dc-indicator-pct">{devHoldPct.toFixed(0)}%</span>}
              </span>
            </IndWrap>

            <DevDeployBadge developerAddress={t.developerAddress || t.devAddress || null} />

            <IndWrap tooltip={<PaperHandTooltip paperPct={paperPct} />}>
              <ChartDownIcon size={10} className="dc-ind-svg" style={{ color: paperPct > 30 ? "#ef4444" : "var(--text-muted)" }} />
              <span className="dc-indicator-pct" style={{ color: paperPct > 30 ? "#ef4444" : "var(--text-muted)" }}>{paperPct.toFixed(0)}%</span>
            </IndWrap>

            {isDex && (
              <span className="dc-mode-badge dc-mode-badge--dex">DEX</span>
            )}
          </div>
        </div>
      </div>

      <div className="dc-right" style={{ position: "relative" }}>
        {toast && createPortal(
          <div style={{
            position: "fixed",
            top: 80,
            left: 600,
            zIndex: 99999,
            pointerEvents: "none",
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            whiteSpace: "nowrap",
            animation: "dc-toast-in 0.2s ease",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            ...(toast.type === "error"
              ? { background: "#ff5050", color: "#fff" }
              : { background: "#22c55e", color: "#fff" }),
          }}>
            {toast.msg}
          </div>,
          document.body
        )}
        <button className="dc-buy-btn" onClick={handleBuy} disabled={buyLoading} style={{ opacity: buyLoading ? 0.6 : 1 }}>
          {buyLoading ? (
            <span style={{
              width: 13, height: 13, display: "inline-block",
              border: "2px solid rgba(0,0,0,0.2)", borderTopColor: "currentColor",
              borderRadius: "50%", animation: "dc-spin 0.6s linear infinite",
            }} />
          ) : (
            <LightningIcon size={16} className="dc-buy-icon" />
          )}
          <span className="dc-buy-label">{quickBuyAmount}</span>
        </button>
        <div className="dc-mc-vol">
          <div className={`dc-mc${flashMC ? " dc-mc--flash" : ""}`}>MC {fmtMC(t.marketCap)}</div>
          <div className="dc-vol">VOL {fmtMC(t.volumeUsdt)}</div>
        </div>
      </div>

    </div>
  );
}

// ===============================================================
// COLUMN TITLE ICON
// ===============================================================

function ColTitleIcon({ title }) {
  if (title === "New Launched") return <RocketIcon size={15} style={{ flexShrink: 0 }} />;
  if (title === "Migrating") return <ArrowRightIcon size={15} style={{ flexShrink: 0 }} />;
  if (title === "Migrated") return <StarFilledIcon size={15} style={{ flexShrink: 0 }} />;
  return null;
}

// ===============================================================
// COLUMN
// ===============================================================

export function DiscoverColumn({ title, tokens = [], loading, filter, onFilterChange, mobileTabSlot, walletId = null, onNotif = null }) {
  const filtered = applyFilter(tokens, filter ?? DEFAULT_FILTER);

  return (
    <div className="dc-column">
      <div className="dc-col-header">
        {mobileTabSlot
          ? mobileTabSlot
          : <span className="dc-col-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}><ColTitleIcon title={title} />{title}</span>
        }
        <div className="dc-col-header-right">
          <FilterDropdown filter={filter} onChange={onFilterChange} />
        </div>
      </div>
      <div className="dc-col-list">
        {loading && <div className="dc-placeholder">Loading...</div>}
        {!loading && filtered.length === 0 && <div className="dc-placeholder">No tokens</div>}
        {filtered.map(t => <TokenRow key={t.tokenAddress} t={t} walletId={walletId} onNotif={onNotif} useMigratedTime={title === "Migrated"} />)}
      </div>
    </div>
  );
}