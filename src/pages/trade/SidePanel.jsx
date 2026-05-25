// src/pages/trade/SidePanel.jsx
// Collapsible left panel — Tokens | Migrated | Favorites
// Uses centralized API and WebSocket services

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useRefCode } from "../../hooks/useRefCode";
import { tokens as tokensApi } from "../../services/api";
import {
  subscribeNewToken,
  subscribeTokenUpdate,
  subscribeMigrate,
} from "../../services/ws";
import { getPlatformLogo } from "../../services/config";

// Import icons from central index
import { CopyIcon, ExternalLinkIcon, StarIcon } from "../../assets/icons";

// Import format utilities
import { formatUsd, truncateAddress } from "../../utils/format";

const LIMIT = 50;
const VOL_MIN = 100;

// ================================================================
// Local helpers
// ================================================================

function fmtMC(n) {
  const v = Number(n || 0);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

function calcAge(ts) {
  if (!ts) return "-";
  const ms = typeof ts === "string" ? new Date(ts).getTime() : (ts > 1e12 ? ts : ts * 1000);
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 0) return "0s";
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

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

// ================================================================
// Base Pair Icon (local, using public assets)
// ================================================================

function BasePairIcon({ basePair, size = 12 }) {
  if (!basePair) return null;
  const key = basePair.toUpperCase();
  const tokenMap = {
    BNB: '/assets/tokens/bnb.svg',
    WBNB: '/assets/tokens/bnb.svg',
    USDT: '/assets/tokens/usdt.svg',
    USDC: '/assets/tokens/usdc.svg',
    CAKE: '/assets/tokens/cake.svg',
    ASTER: '/assets/tokens/aster.svg',
    UUSD: '/assets/tokens/uusd.svg',
    USD1: '/assets/tokens/usd1.svg',
  };
  if (tokenMap[key]) {
    return (
      <img
        src={tokenMap[key]}
        width={size}
        height={size}
        style={{ borderRadius: '50%', flexShrink: 0, display: 'block' }}
        alt={key}
      />
    );
  }
  return (
    <span style={{ fontSize: '7px', fontWeight: 800, color: '#a1a1aa', background: 'var(--border-subtle)', borderRadius: '3px', padding: '1px 3px' }}>
      {key.slice(0, 4)}
    </span>
  );
}

// ================================================================
// Normalise token data
// ================================================================

function normalise(t) {
  const mode = t.mode || (t.migrated ? "dex" : "bonding");
  return {
    tokenAddress: t.tokenAddress,
    symbol: t.symbol || t.tokenSymbol || "?",
    name: t.name || t.tokenName || "?",
    imageUrl: t.imageUrl || null,
    sourceFrom: t.source || t.platform || t.sourceFrom || null,
    basePair: t.basePair || t.base_pair || t.baseSymbol || null,
    launchTime: t.launchTime || t.timestamp || null,
    migrated: t.migrated ?? false,
    migratedTime: t.migratedTime || null,
    marketCap: t.marketcap ?? t.marketCap ?? 0,
    volumeUsdt: t.volume24h ?? t.volumeUsdt ?? 0,
    priceUsdt: t.price ?? t.priceUsdt ?? 0,
    txCount: t.txCount || 0,
    holderCount: t.holderCount || 0,
    twitter: t.twitter || null,
    website: t.website || null,
    telegram: t.telegram || null,
    holderStats: {
      devHoldPct: t.holderStats?.devHoldPct ?? 0,
      paperHandPct: t.holderStats?.paperHandPct ?? 0,
      top10: t.holderStats?.top10 ?? [],
    },
    tax: {
      buy: t.tax?.buy ?? t.taxBuy ?? 0,
      sell: t.tax?.sell ?? t.taxSell ?? 0,
    },
    mode,
    progress: mode !== "dex" ? (t.progress ?? null) : null,
    targetUSD: mode !== "dex" ? (t.targetUSD ?? 0) : null,
    bondingLiquidity: mode !== "dex" ? {
      base: t.bondingLiquidity?.base ?? 0,
      usd: t.bondingLiquidity?.usd ?? 0,
    } : null,
    liquidity: mode === "dex" ? {
      base: t.liquidity?.base ?? 0,
      usd: t.liquidity?.usd ?? 0,
    } : null,
  };
}

// ================================================================
// Rounded rect progress ring
// ================================================================

function RoundedRectProgress({ progress, size = 38, rx = 9 }) {
  const pct = Math.min(Math.max(Number(progress || 0), 0), 100);
  const stroke = 2;
  const pad = stroke / 2;
  const w = size - stroke;
  const h = size - stroke;
  const perim = 2 * (w + h) - (8 - 2 * Math.PI) * rx;
  const offset = perim - (pct / 100) * perim;
  const color = pct >= 80 ? "#ef4444" : pct >= 50 ? "var(--color-primary)" : "#22c55e";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
      <rect x={pad} y={pad} width={w} height={h} rx={rx} fill="none" stroke="var(--border-subtle)" strokeWidth={stroke} />
      <rect x={pad} y={pad} width={w} height={h} rx={rx} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={perim} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }} />
    </svg>
  );
}

// ================================================================
// Token row component
// ================================================================

function SpTokenRow({ t, isActive, onClose }) {
  const navigate = useNavigate();
  const { appendRef } = useRefCode();
  const age = useLiveAge(t.launchTime);
  const [cp, setCp] = useState(false);

  const hs = t.holderStats || {};
  const top10Pct = hs.top10?.reduce((s, h) => s + (h.pct || 0), 0) ?? 0;
  const devHoldPct = hs.devHoldPct ?? 0;
  const paperPct = hs.paperHandPct ?? 0;
  const threshold = (pct) => pct >= 20 ? "#ef4444" : "#22c55e";
  const rawTax = Number(t?.tax?.buy ?? 0) + 1;
  const isBonding = t.mode !== "dex";
  const progress = isBonding ? (t.progress ?? null) : null;
  const RING_SIZE = 38;
  const platformLogoSrc = getPlatformLogo(t.sourceFrom);
  const platformLogo = platformLogoSrc !== "/unknown.jpg" ? platformLogoSrc : null;

  const handleClick = () => {
    if (t?.tokenAddress) {
      onClose?.();
      navigate(appendRef(`/trade/${t.tokenAddress}`));
    }
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(t.tokenAddress).catch(() => {});
    setCp(true);
    setTimeout(() => setCp(false), 1200);
  };

  const handleLens = (e) => {
    e.stopPropagation();
    if (t.imageUrl) window.open(`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(t.imageUrl)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={`sp-row${isActive ? " active" : ""}`} onClick={handleClick}>
      <div className="sp-row-logo-wrap"
        style={progress != null ? { position: "relative", width: RING_SIZE, height: RING_SIZE } : { position: "relative" }}>
        {progress != null && <RoundedRectProgress progress={progress} size={RING_SIZE} rx={9} />}
        <div className="sp-logo-inner"
          style={progress != null ? { position: "absolute", inset: 4, width: "auto", height: "auto", borderRadius: "7px", overflow: "hidden" } : {}}>
          <img
            src={t.imageUrl || "/unknown.jpg"}
            className="sp-row-logo"
            alt={t.symbol}
            onError={e => (e.target.src = "/unknown.jpg")}
            onClick={handleLens}
            title="Search with Google Lens"
            style={progress != null ? { width: "100%", height: "100%" } : {}}
          />
          {rawTax > 0 && (
            <span className="sp-tax-overlay"
              style={{ background: rawTax > 5 ? "rgba(239,68,68,0.85)" : "rgba(34,197,94,0.85)" }}>
              {rawTax}%
            </span>
          )}
        </div>
        {progress != null && (
          <div className="sp-logo-hover-overlay" onClick={handleLens}
            style={{ inset: 4, borderRadius: "7px" }}>
            <span className="sp-logo-hover-pct">
              {Math.min(Math.max(Number(progress), 0), 100).toFixed(0)}%
            </span>
          </div>
        )}
        {platformLogo && (
          <img src={platformLogo} className="sp-source-logo" alt={t.sourceFrom} title={t.sourceFrom}
            onError={e => (e.target.style.display = "none")} />
        )}
      </div>

      <div className="sp-row-meta">
        <div className="sp-row-title">
          <span className="sp-row-symbol">{t.symbol}</span>
          <button className="sp-row-copy" onClick={handleCopy}>
            {cp ? "✓" : <CopyIcon size={10} />}
          </button>
          {t.basePair && (
            <span className="sp-basepair-icon" title={t.basePair}>
              <BasePairIcon basePair={t.basePair} size={12} />
            </span>
          )}
        </div>

        <div className="sp-row-sub">
          <span className="sp-row-age">{age}</span>
          {t.twitter && (
            <a href={t.twitter} target="_blank" rel="noreferrer" className="sp-row-link" onClick={e => e.stopPropagation()}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          )}
          {t.telegram && (
            <a href={t.telegram} target="_blank" rel="noreferrer" className="sp-row-link" onClick={e => e.stopPropagation()}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.97 14.28l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.836.95l-.618-.671z"/>
              </svg>
            </a>
          )}
          {t.website && (
            <a href={t.website} target="_blank" rel="noreferrer" className="sp-row-link" onClick={e => e.stopPropagation()}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/>
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
              </svg>
            </a>
          )}
        </div>

        <div className="sp-row-inds">
          <span className="sp-ind" title={`Top10: ${top10Pct.toFixed(1)}%`} style={{ color: threshold(top10Pct) }}>
            <span className="sp-ind-circle" style={{ borderColor: threshold(top10Pct) }}>10</span>
            {top10Pct.toFixed(0)}%
          </span>
          <span className="sp-ind" title={`Dev: ${devHoldPct.toFixed(1)}%`} style={{ color: threshold(devHoldPct) }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
            </svg>
            {devHoldPct.toFixed(0)}%
          </span>
          <span className="sp-ind" title={`Paper: ${paperPct.toFixed(1)}%`} style={{ color: paperPct > 30 ? "#ef4444" : "#9ca3af" }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>
            </svg>
            {paperPct.toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="sp-row-right">
        <span className="sp-row-mc">MC {fmtMC(t.marketCap)}</span>
        <span className="sp-row-vol">VOL {fmtMC(t.volumeUsdt)}</span>
        {t.holderCount > 0 && (
          <span className="sp-row-vol" style={{ color: "var(--text-muted)", fontSize: 9 }}>
            {t.holderCount} holders
          </span>
        )}
      </div>
    </div>
  );
}

// ================================================================
// Skeleton and Empty state
// ================================================================

function SkeletonRow() {
  return (
    <div className="sp-skel-row">
      <div className="tr-skeleton sp-skel-logo" />
      <div className="sp-skel-mid">
        <div className="tr-skeleton" style={{ width: "60%", height: 11, borderRadius: 3 }} />
        <div className="tr-skeleton" style={{ width: "40%", height: 9, borderRadius: 3 }} />
      </div>
      <div className="sp-skel-right">
        <div className="tr-skeleton" style={{ width: 44, height: 11, borderRadius: 3 }} />
        <div className="tr-skeleton" style={{ width: 36, height: 9, borderRadius: 3 }} />
      </div>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="sp-empty">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ opacity: 0.2 }}>
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <span>{label}</span>
    </div>
  );
}

// ================================================================
// Main SidePanel Component
// ================================================================

export default function SidePanel({ activeTokenAddress, favorites = [], open = false, onSelectToken, onClose }) {
  const [activeTab, setActiveTab] = useState("tokens");

  const tokensMapRef = useRef(new Map());
  const migratedMapRef = useRef(new Map());

  const [tokens, setTokens] = useState([]);
  const [migrated, setMigrated] = useState([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [loadingMigrated, setLoadingMigrated] = useState(false);

  const timerTRef = useRef(null);
  const timerMRef = useRef(null);

  const rebuildTokens = useCallback(() => {
    if (timerTRef.current) return;
    timerTRef.current = setTimeout(() => {
      timerTRef.current = null;
      setTokens(
        [...tokensMapRef.current.values()]
          .filter(t => Number(t.volumeUsdt) >= VOL_MIN)
          .sort((a, b) => Number(b.volumeUsdt) - Number(a.volumeUsdt))
      );
    }, 100);
  }, []);

  const rebuildMigrated = useCallback(() => {
    if (timerMRef.current) return;
    timerMRef.current = setTimeout(() => {
      timerMRef.current = null;
      setMigrated(
        [...migratedMapRef.current.values()]
          .sort((a, b) => new Date(b.migratedTime || 0) - new Date(a.migratedTime || 0))
      );
    }, 100);
  }, []);

  const fetchedRef = useRef(false);

  // Initial data fetch using centralized API
  useEffect(() => {
    if (!open || fetchedRef.current) return;
    fetchedRef.current = true;

    setLoadingTokens(true);
    Promise.all([
      tokensApi.getNew(LIMIT).catch(() => []),
      tokensApi.getMigrating(LIMIT).catch(() => []),
    ]).then(([newList, migList]) => {
      for (const t of [...(Array.isArray(newList) ? newList : []), ...(Array.isArray(migList) ? migList : [])]) {
        if (t.tokenAddress) tokensMapRef.current.set(t.tokenAddress, normalise(t));
      }
      rebuildTokens();
      setLoadingTokens(false);
    });

    setLoadingMigrated(true);
    tokensApi.getMigrated(LIMIT)
      .then(list => {
        for (const t of (Array.isArray(list) ? list : [])) {
          if (t.tokenAddress) migratedMapRef.current.set(t.tokenAddress, normalise(t));
        }
        rebuildMigrated();
        setLoadingMigrated(false);
      })
      .catch(() => {
        setLoadingMigrated(false);
      });
  }, [open, rebuildTokens, rebuildMigrated]);

  // WebSocket subscriptions using centralized ws.js
  useEffect(() => {
    if (!open) return;

    const handleNewToken = (t) => {
      if (!t.tokenAddress) return;
      if (!tokensMapRef.current.has(t.tokenAddress)) {
        tokensMapRef.current.set(t.tokenAddress, normalise(t));
        rebuildTokens();
      }
    };

    const handleTokenUpdate = (u) => {
      if (!u.tokenAddress) return;
      const updateMap = (map, rebuild) => {
        const ex = map.get(u.tokenAddress);
        if (!ex) return;
        const mode = u.mode || ex.mode || "bonding";
        map.set(u.tokenAddress, {
          ...ex,
          priceUsdt: u.price ?? ex.priceUsdt,
          marketCap: u.marketcap ?? ex.marketCap,
          volumeUsdt: u.volume24h ?? ex.volumeUsdt,
          txCount: u.txCount ?? ex.txCount,
          holderCount: u.holderCount ?? ex.holderCount,
          mode,
          basePair: u.baseSymbol || ex.basePair,
          ...(mode !== "dex" && {
            progress: u.progress ?? ex.progress ?? null,
            targetUSD: u.targetUSD ?? ex.targetUSD ?? 0,
            bondingLiquidity: {
              base: u.bondingLiquidity?.base ?? ex.bondingLiquidity?.base ?? 0,
              usd: u.bondingLiquidity?.usd ?? ex.bondingLiquidity?.usd ?? 0,
            },
          }),
          ...(mode === "dex" && {
            liquidity: {
              base: u.liquidity?.base ?? ex.liquidity?.base ?? 0,
              usd: u.liquidity?.usd ?? ex.liquidity?.usd ?? 0,
            },
          }),
        });
        rebuild();
      };
      updateMap(tokensMapRef.current, rebuildTokens);
      updateMap(migratedMapRef.current, rebuildMigrated);
    };

    const handleMigrate = (m) => {
      if (!m.tokenAddress) return;
      const src = tokensMapRef.current.get(m.tokenAddress);
      if (src) {
        const updated = {
          ...src,
          migrated: true,
          migratedTime: new Date().toISOString(),
          mode: "dex",
          basePair: m.baseSymbol || src.basePair,
          priceUsdt: m.priceUSDT ?? src.priceUsdt,
          progress: null,
          targetUSD: null,
          bondingLiquidity: null,
          liquidity: {
            base: m.baseLiquidity ?? 0,
            usd: m.priceUSDT != null ? (m.baseLiquidity ?? 0) * m.priceUSDT : 0,
          },
        };
        tokensMapRef.current.delete(m.tokenAddress);
        migratedMapRef.current.set(m.tokenAddress, updated);
        rebuildTokens();
        rebuildMigrated();
      }
    };

    const unsubNew = subscribeNewToken(handleNewToken);
    const unsubUpdate = subscribeTokenUpdate(handleTokenUpdate);
    const unsubMigrate = subscribeMigrate(handleMigrate);

    return () => {
      unsubNew();
      unsubUpdate();
      unsubMigrate();
    };
  }, [open, rebuildTokens, rebuildMigrated]);

  const TABS = [
    { key: "tokens", label: "Tokens" },
    { key: "migrated", label: "Migrated" },
    { key: "favorit", label: "Favorites" },
  ];

  const listMap = {
    tokens: { data: tokens, loading: loadingTokens },
    migrated: { data: migrated, loading: loadingMigrated },
    favorit: { data: favorites, loading: false },
  };

  const { data: currentList, loading: currentLoading } = listMap[activeTab];

  const emptyLabel = {
    tokens: "No tokens (vol > $100)",
    migrated: "No migrated tokens",
    favorit: "No favorites yet",
  }[activeTab];

  const handleBackdropClick = () => {
    if (typeof onClose === "function") onClose();
  };

  return (
    <div className={`sp-wrapper${open ? " open" : ""}`}>
      {open && (
        <div className="sp-backdrop" onClick={handleBackdropClick} />
      )}

      <div className="sp-panel">
        <div className="sp-drag-handle">
          <div className="sp-drag-bar" />
        </div>

        <div className="sp-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`sp-tab${activeTab === t.key ? " active" : ""}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="sp-list">
          {currentLoading
            ? Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)
            : currentList.length === 0
              ? <EmptyState label={emptyLabel} />
              : currentList.map(t => (
                  <SpTokenRow
                    key={t.tokenAddress ?? t.symbol}
                    t={t}
                    isActive={t.tokenAddress === activeTokenAddress}
                    onClose={onClose}
                  />
                ))
          }
        </div>
      </div>
    </div>
  );
}