// src/pages/trade/tab/tabHelpers.jsx
// Shared helpers for trade tabs

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { wallets as walletsApi } from "../../../services/api";
import { truncateAddress, formatUsd, formatNumber, timeAgo } from "../../../utils/format";
import { CopyIcon, ExternalLinkIcon } from "../../../assets/icons";

// ================================================================
// Utility hooks and components
// ================================================================

export function useTick(ms = 1000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}

export function shortAddr(a = "") {
  return truncateAddress(a, 6, 4);
}

export function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button className="tr-copy-btn" onClick={copy} title="Copy">
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <CopyIcon size={12} />
      )}
    </button>
  );
}

export function Skeleton({ w = "100%", h = 14, radius = 6 }) {
  return <div className="tr-skeleton" style={{ width: w, height: h, borderRadius: radius }} />;
}

export function IconExternal() {
  return <ExternalLinkIcon size={13} />;
}

export function RefreshBtn({ onClick }) {
  return (
    <button className="tr-icon-btn" onClick={onClick} title="Refresh">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
    </button>
  );
}

// ================================================================
// Base Pair Icon (using public assets)
// ================================================================

export function BasePairIcon({ basePair, size = 11 }) {
  if (!basePair) return null;
  const key = (basePair || '').toUpperCase();
  const tokenLogos = {
    BNB: '/assets/tokens/bnb.svg',
    WBNB: '/assets/tokens/bnb.svg',
    USDT: '/assets/tokens/usdt.svg',
    USDC: '/assets/tokens/usdc.svg',
    CAKE: '/assets/tokens/cake.svg',
    ASTER: '/assets/tokens/aster.svg',
    UUSD: '/assets/tokens/uusd.svg',
    USD1: '/assets/tokens/usd1.svg',
  };
  if (tokenLogos[key]) {
    return (
      <img
        src={tokenLogos[key]}
        width={size}
        height={size}
        style={{ borderRadius: '50%', flexShrink: 0, display: 'block' }}
        alt={key}
      />
    );
  }
  if (key === 'BNB' || key === 'WBNB') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0, display: 'block' }}>
        <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
        <path fill="var(--bg-elevated)" d="M12.116 14.404L16 10.52l3.886 3.886 2.26-2.26L16 6l-6.144 6.144 2.26 2.26zM6 16l2.26-2.26L10.52 16l-2.26 2.26L6 16zm6.116 1.596L16 21.48l3.886-3.886 2.26 2.259L16 26l-6.144-6.144-.003-.003 2.263-2.257zM21.48 16l2.26-2.26L26 16l-2.26 2.26L21.48 16zm-3.188-.002h.002V16L16 18.294l-2.291-2.29-.004-.004.004-.003.401-.402.195-.195L16 13.706l2.293 2.293z" />
      </svg>
    );
  }
  if (key === 'USDT') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0, display: 'block' }}>
        <circle cx="16" cy="16" r="16" fill="#26A17B" />
        <path fill="#FFF" d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117" />
      </svg>
    );
  }
  if (key === 'USDC') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0, display: 'block' }}>
        <circle cx="16" cy="16" r="16" fill="#2775CA" />
        <path fill="#fff" d="M20.022 18.124c0-2.124-1.28-2.852-3.84-3.156-1.828-.243-2.193-.728-2.193-1.578 0-.85.61-1.396 1.828-1.396 1.097 0 1.707.364 2.011 1.275a.458.458 0 00.427.303h.975a.416.416 0 00.427-.425v-.06a3.04 3.04 0 00-2.743-2.489V9.142c0-.243-.183-.425-.487-.486h-.915c-.243 0-.426.182-.487.486v1.396c-1.829.242-2.986 1.456-2.986 2.974 0 2.002 1.218 2.791 3.778 3.095 1.707.303 2.255.668 2.255 1.639 0 .97-.853 1.638-2.011 1.638-1.585 0-2.133-.667-2.316-1.578-.06-.242-.244-.364-.427-.364h-1.036a.416.416 0 00-.426.425v.06c.243 1.518 1.219 2.61 3.23 2.914v1.457c0 .242.183.425.487.485h.915c.243 0 .426-.182.487-.485V21.34c1.829-.303 3.047-1.578 3.047-3.217z" />
      </svg>
    );
  }
  if (key === 'ASTER') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink: 0, display: 'block' }}>
        <circle cx="50" cy="50" r="50" fill="#e8a96a" />
        <path d="M50,0 C50,0 42,20 42,50 C42,80 50,100 50,100 C50,100 58,80 58,50 C58,20 50,0 50,0Z" fill="#1a1008" />
        <path d="M0,50 C0,50 20,42 50,42 C80,42 100,50 100,50 C100,50 80,58 50,58 C20,58 0,50 0,50Z" fill="#1a1008" />
      </svg>
    );
  }
  if (key === 'CAKE') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="var(--color-primary)" style={{ flexShrink: 0, display: 'block' }}>
        <path fillRule="evenodd" d="M8.569 3c-1.48 0-2.475 1.35-2.194 2.812l.562 3.375C4.721 10.144 3 11.887 3 13.97v1.293c0 1.744 1.136 3.207 2.728 4.163C7.371 20.437 9.525 21 11.972 21s4.601-.563 6.244-1.575C19.864 18.469 21 17.006 21 15.262V13.97c0-2.081-1.721-3.77-3.937-4.725l.562-3.432C17.85 4.35 16.798 3 15.319 3c-1.305 0-2.194 1.069-2.194 2.362V8.39a9 9 0 0 0-1.153-.057h-1.283l.186-2.97C10.875 4.07 9.868 3 8.569 3m.337 12.375c.473 0 .844-.647.844-1.406c0-.76-.371-1.407-.844-1.407s-.844.647-.844 1.407s.371 1.406.844 1.406m6.187 0c.473 0 .844-.647.844-1.406c0-.76-.371-1.407-.844-1.407c-.472 0-.843.647-.843 1.407s.37 1.406.843 1.406" clipRule="evenodd" />
      </svg>
    );
  }
  if (key === 'USD1') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, display: 'block' }}>
        <defs>
          <radialGradient id="th-usd1-rim2" cx="40%" cy="30%" r="70%"><stop offset="0%" stopColor="#f5d060"/><stop offset="50%" stopColor="#d4900a"/><stop offset="100%" stopColor="#a06800"/></radialGradient>
          <radialGradient id="th-usd1-body2" cx="38%" cy="32%" r="68%"><stop offset="0%" stopColor="#c98b10"/><stop offset="45%" stopColor="#9a6200"/><stop offset="100%" stopColor="#7a4c00"/></radialGradient>
          <filter id="th-usd1-shadow2"><feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#5a3a00" floodOpacity="0.6"/></filter>
        </defs>
        <circle cx="50" cy="50" r="49" fill="url(#th-usd1-rim2)"/>
        <circle cx="50" cy="50" r="41" fill="url(#th-usd1-body2)"/>
        <text x="50" y="67" textAnchor="middle" fontFamily="Georgia,serif" fontWeight="bold" fontSize="46" fill="#fffae0" filter="url(#th-usd1-shadow2)">1</text>
      </svg>
    );
  }
  if (key === 'UUSD') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0, display: 'block' }}>
        <circle cx="16" cy="16" r="16" fill="#1c3d20"/>
        <circle cx="16" cy="16" r="14.5" fill="#e8e8d0"/>
        <rect x="8.5" y="8" width="3.8" height="13" rx="0.8" fill="#1c3d20"/>
        <rect x="19.7" y="8" width="3.8" height="13" rx="0.8" fill="#1c3d20"/>
        <path d="M8.5,21 Q8.5,26 16,26 Q23.5,26 23.5,21 L19.7,21 Q19.7,23.5 16,23.5 Q12.3,23.5 12.3,21 Z" fill="#1c3d20"/>
      </svg>
    );
  }
  return <span style={{ fontSize: '8px', fontWeight: 700, color: '#a1a1aa' }}>{key.slice(0, 4)}</span>;
}

// ================================================================
// WalletTooltip component
// ================================================================

const _walletCache = new Map();

export function WalletTooltip({ address, children }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const hideTimer = useRef(null);

  const fmtVol = (n) => {
    const v = Number(n || 0);
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(2)}`;
  };

  const fetchData = async () => {
    if (!address) return;
    if (_walletCache.has(address)) { setData(_walletCache.get(address)); return; }
    setLoading(true);
    try {
      const json = await walletsApi.getOverview(address);
      _walletCache.set(address, json);
      setData(json);
    } catch {}
    finally { setLoading(false); }
  };

  const handleMouseEnter = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const tipW = 220;
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, tipW / 2 + 8),
      window.innerWidth - tipW / 2 - 8
    );
    setPos({ left, top: rect.bottom + 6 });
    setShow(true);
    if (!data && !loading) fetchData();
  };

  const handleMouseLeave = () => {
    hideTimer.current = setTimeout(() => setShow(false), 150);
  };

  const handleTooltipEnter = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  };

  const handleTooltipLeave = () => {
    hideTimer.current = setTimeout(() => setShow(false), 150);
  };

  const t = data?.trading;
  const b = data?.behavior;
  const d = data?.deploy;

  const winRate = b?.winRate ?? 0;
  const avgHold = b?.avgHoldTimeSeconds ?? 0;
  const avgHoldFmt = avgHold < 60
    ? `${Math.round(avgHold)}s`
    : avgHold < 3600
    ? `${Math.round(avgHold / 60)}m`
    : avgHold < 86400
    ? `${Math.round(avgHold / 3600)}h`
    : `${Math.round(avgHold / 86400)}d`;

  return (
    <>
      <span
        ref={ref}
        style={{ display: "inline-flex", alignItems: "center" }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </span>

      {show && pos && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            left: pos.left,
            top: pos.top,
            transform: "translateX(-50%)",
            zIndex: 9999,
            background: "var(--bg-surface)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.65)",
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            width: 220,
            animation: "tc-tt-drop 0.12s cubic-bezier(0.34,1.1,0.64,1)",
            pointerEvents: "auto",
          }}
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 6, borderBottom: "1px solid var(--border-subtle)" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Wallet</span>
            <a
              href={`https://bscscan.com/address/${address}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 9, color: "#60a5fa", textDecoration: "none" }}
              onClick={e => e.stopPropagation()}
            >
              BscScan
            </a>
          </div>

          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
            {shortAddr(address)}
          </div>

          {loading && !data && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {[80, 60, 70, 50].map((w, i) => (
                <div key={i} className="tr-skeleton" style={{ width: w, height: 10, borderRadius: 4 }} />
              ))}
            </div>
          )}

          {data && (
            <>
              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 4 }} />

              <Row label="Total trades" value={t?.totalTxCount?.toLocaleString() ?? "0"} />
              <Row label="Buy vol"  value={fmtVol(t?.buyVolumeUsd)}  color="#22c55e" />
              <Row label="Sell vol" value={fmtVol(t?.sellVolumeUsd)} color="#ef4444" />
              <Row
                label="Win rate"
                value={`${winRate.toFixed(1)}% (${b?.winCount ?? 0}/${b?.totalCount ?? 0})`}
                color={winRate >= 50 ? "#22c55e" : "#ef4444"}
              />
              {avgHold > 0 && <Row label="Avg hold" value={avgHoldFmt} />}
              <Row label="Deployed" value={d?.deployCount ?? 0} />
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

function Row({ label, value, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <span style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: color || "var(--text-primary)" }}>{value}</span>
    </div>
  );
}