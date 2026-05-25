// src/pages/address/AddressPage.jsx
// Public wallet profile — /address/:wallet
// 3 tabs: Holdings · Activity · Deployed
// API: wallets.getOverview + wallets.getTransactions + tokens.getOne

import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { appendRef } from "../../hooks/useRefCode";
import { wallets as walletsApi, tokens as tokensApi } from "../../services/api";
import {
  CopyIcon,
  ExternalLinkIcon,
  CheckIcon,
  WalletIcon,
  IconExternal,
} from "../../assets/icons";
import {
  formatUsd,
  formatTokenAmount,
  formatPrice,
  truncateAddress,
  timeAgo,
  formatDate,
  calcAge,
  formatNumber,
  formatPercent,
} from "../../utils/format";
import "./addressPage.css";

// ================================================================
// Reusable components (UI specific, not moved to format)
// ================================================================

function fmtSigned(n) {
  const v = Number(n ?? 0);
  return (v >= 0 ? "+" : "") + formatUsd(v);
}

function fmtNum(n) {
  return formatNumber(n);
}

function fmtDur(sec) {
  if (!sec || sec <= 0) return "—";
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h`;
  return `${Math.round(sec / 86400)}d`;
}

function toMs(ts) {
  if (!ts) return 0;
  const n = Number(ts);
  return !isNaN(n) && n > 0 ? (n < 2_000_000_000 ? n * 1000 : n) : new Date(ts).getTime() || 0;
}

function TokenLogo({ symbol, logo, size = 32, radius = 8 }) {
  const [err, setErr] = useState(false);
  const PALETTE = ["#627EEA","#9945FF","#F3BA2F","#28A0F0","#45D483","#FF6B6B","#4ECDC4","#375BD2"];
  const color   = PALETTE[(symbol || "?").charCodeAt(0) % PALETTE.length];
  if (logo && !err)
    return (
      <img src={logo} alt={symbol} onError={() => setErr(true)}
        style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", flexShrink: 0 }}/>
    );
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: color + "22", color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.3, fontWeight: 800,
    }}>
      {(symbol || "?").slice(0, 3)}
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div className="ap3-stat-pill">
      <span className="ap3-stat-pill-label">{label}</span>
      <span className="ap3-stat-pill-val" style={color ? { color } : {}}>{value}</span>
    </div>
  );
}

function WinRing({ rate = 0 }) {
  const r = 18, circ = 2 * Math.PI * r;
  const c = rate >= 55 ? "#26a69a" : rate >= 40 ? "#f59e0b" : "#ef5350";
  return (
    <div className="ap3-winring">
      <svg width={48} height={48} viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5"/>
        <circle cx="24" cy="24" r={r} fill="none" stroke={c} strokeWidth="3.5"
          strokeDasharray={`${(rate / 100) * circ} ${circ * (1 - rate / 100)}`}
          strokeDashoffset={circ / 4} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.7s ease" }}/>
      </svg>
      <div className="ap3-winring-label">
        <span style={{ color: c, fontSize: 11, fontWeight: 800 }}>{rate.toFixed(0)}%</span>
        <span style={{ fontSize: 8, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Win</span>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="ap3-spinner"/>;
}

function EmptyState({ text }) {
  return (
    <div className="ap3-empty">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.25">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{text}</span>
    </div>
  );
}

// ================================================================
// Holdings Tab
// ================================================================

function computeHoldings(txs) {
  const map = {};
  const sorted = [...txs].sort((a, b) => toMs(a.time) - toMs(b.time));

  for (const tx of sorted) {
    const addr = (tx.tokenAddress || tx.token_address || "").toLowerCase();
    if (!addr) continue;
    if (!map[addr]) map[addr] = {
      address:   addr,
      symbol:    tx.symbol || truncateAddress(addr),
      logo:      tx.logo   || null,
      name:      tx.name   || null,
      buyUsd:    0, sellUsd:    0,
      buyTokens: 0, sellTokens: 0,
      txCount:   0,
      firstTime: tx.time,
      lastTime:  tx.time,
    };
    const m   = map[addr];
    if (tx.symbol && tx.symbol !== truncateAddress(addr)) m.symbol = tx.symbol;
    if (tx.logo)   m.logo = tx.logo;
    if (tx.name)   m.name = tx.name;

    const usd = Number(tx.amountUsd   || 0);
    const tok = Number(tx.amountToken || 0);
    if (tx.position === "BUY")  { m.buyUsd  += usd; m.buyTokens  += tok; }
    if (tx.position === "SELL") { m.sellUsd += usd; m.sellTokens += tok; }
    m.txCount++;
    if (toMs(tx.time) < toMs(m.firstTime)) m.firstTime = tx.time;
    if (toMs(tx.time) > toMs(m.lastTime))  m.lastTime  = tx.time;
  }

  return Object.values(map).map(m => {
    const avgBuy      = m.buyTokens > 0 ? m.buyUsd / m.buyTokens : 0;
    const remain      = Math.max(m.buyTokens - m.sellTokens, 0);
    const realizedPnl = m.buyTokens > 0 && m.sellTokens > 0
      ? m.sellUsd - avgBuy * Math.min(m.sellTokens, m.buyTokens)
      : 0;
    const roi     = m.buyUsd > 0 ? (realizedPnl / m.buyUsd) * 100 : 0;
    const isOpen  = remain > 1;
    const holdPct = m.buyTokens > 0 ? (remain / m.buyTokens) * 100 : 0;
    return { ...m, avgBuy, remain, realizedPnl, roi, isOpen, holdPct };
  });
}

function HoldingsTab({ txs, loading, onTrade }) {
  const [filter, setFilter] = useState("open");
  const [sortK,  setSortK]  = useState("realizedPnl");
  const [sortD,  setSortD]  = useState("desc");

  const holdings = useMemo(() => computeHoldings(txs), [txs]);

  const rows = useMemo(() => {
    let out = filter === "open" ? holdings.filter(h => h.isOpen) : holdings;
    return [...out].sort((a, b) => {
      const va = a[sortK] ?? 0, vb = b[sortK] ?? 0;
      return sortD === "asc" ? va - vb : vb - va;
    });
  }, [holdings, filter, sortK, sortD]);

  const doSort = k => {
    if (k === sortK) setSortD(d => d === "asc" ? "desc" : "asc");
    else { setSortK(k); setSortD("desc"); }
  };

  const COLS = [
    { k: "symbol",      l: "Token"        },
    { k: "realizedPnl", l: "Realized PnL" },
    { k: "roi",         l: "ROI"          },
    { k: "buyUsd",      l: "Invested"     },
    { k: "sellUsd",     l: "Returned"     },
    { k: "remain",      l: "Remaining"    },
    { k: "txCount",     l: "TXs"          },
  ];

  if (loading) return <div className="ap3-loading"><Spinner/><span>Loading holdings…</span></div>;

  return (
    <div className="ap3-tab-body">
      <div className="ap3-toolbar">
        <div className="ap3-seg">
          {[["open","Open Positions"],["all","All Tokens"]].map(([v, l]) => (
            <button key={v}
              className={`ap3-seg-btn ${filter === v ? "ap3-seg-btn--on" : ""}`}
              onClick={() => setFilter(v)}>{l}
            </button>
          ))}
        </div>
        <span className="ap3-toolbar-count">{rows.length} token{rows.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="ap3-table">
        <div className="ap3-thead ap3-grid--holdings">
          {COLS.map(({ k, l }) => (
            <button key={k} className={`ap3-th ${sortK === k ? "ap3-th--on" : ""}`}
              onClick={() => doSort(k)}>
              {l}{sortK === k && <span className="ap3-th-arrow">{sortD === "asc" ? "↑" : "↓"}</span>}
            </button>
          ))}
        </div>

        <div className="ap3-tbody">
          {rows.length === 0
            ? <EmptyState text={filter === "open" ? "No open positions" : "No holdings found"}/>
            : rows.map(h => {
              const pnlC = h.realizedPnl >= 0 ? "#26a69a" : "#ef5350";
              const roiC = h.roi >= 0 ? "#26a69a" : "#ef5350";
              return (
                <div key={h.address}
                  className="ap3-tr ap3-grid--holdings ap3-tr--click"
                  onClick={() => onTrade(h.address)}>

                  <div className="ap3-td ap3-token-cell">
                    <TokenLogo symbol={h.symbol} logo={h.logo} size={30} radius={7}/>
                    <div className="ap3-token-meta">
                      <span className="ap3-token-sym">{h.symbol}</span>
                      <span className={`ap3-pos-dot ${h.isOpen ? "ap3-pos-dot--open" : "ap3-pos-dot--closed"}`}>
                        {h.isOpen ? "Open" : "Closed"}
                      </span>
                    </div>
                  </div>

                  <span className="ap3-td ap3-mono" style={{ color: pnlC, fontWeight: 700 }}>
                    {fmtSigned(h.realizedPnl)}
                  </span>

                  <span className="ap3-td">
                    <span className="ap3-roi-chip" style={{ color: roiC, background: roiC + "18" }}>
                      {h.roi >= 0 ? "+" : ""}{h.roi.toFixed(1)}%
                    </span>
                  </span>

                  <span className="ap3-td ap3-mono ap3-muted">{formatUsd(h.buyUsd)}</span>
                  <span className="ap3-td ap3-mono ap3-muted">{formatUsd(h.sellUsd)}</span>

                  <div className="ap3-td ap3-remain-cell">
                    {h.isOpen ? (
                      <>
                        <span className="ap3-mono ap3-muted" style={{ fontSize: 11 }}>{fmtNum(h.remain)}</span>
                        <div className="ap3-holdbar">
                          <div className="ap3-holdbar-fill"
                            style={{
                              width: `${Math.min(h.holdPct, 100)}%`,
                              background: h.holdPct > 50 ? "#f59e0b" : "#26a69a",
                            }}/>
                        </div>
                      </>
                    ) : (
                      <span className="ap3-mono ap3-muted" style={{ fontSize: 11 }}>—</span>
                    )}
                  </div>

                  <span className="ap3-td ap3-mono ap3-muted">{h.txCount}</span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// Activity Tab
// ================================================================

function ActivityTab({ txs, loading, onTrade }) {
  const [typeF,  setTypeF]  = useState("all");
  const [tokenF, setTokenF] = useState("");

  const tokenOpts = useMemo(() => {
    const m = new Map();
    txs.forEach(t => {
      const addr = t.tokenAddress || t.token_address || "";
      if (addr && !m.has(addr)) m.set(addr, t.symbol || truncateAddress(addr));
    });
    return [...m.entries()].slice(0, 50);
  }, [txs]);

  const rows = useMemo(() => {
    let out = txs;
    if (typeF === "buy")  out = out.filter(t => t.position === "BUY");
    if (typeF === "sell") out = out.filter(t => t.position === "SELL");
    if (tokenF) out = out.filter(t => (t.tokenAddress || t.token_address || "") === tokenF);
    return [...out].sort((a, b) => toMs(b.time) - toMs(a.time));
  }, [txs, typeF, tokenF]);

  if (loading) return <div className="ap3-loading"><Spinner/><span>Loading activity…</span></div>;

  return (
    <div className="ap3-tab-body">
      <div className="ap3-toolbar">
        <div className="ap3-seg">
          {[["all","All"],["buy","Buy"],["sell","Sell"]].map(([v, l]) => (
            <button key={v}
              className={`ap3-seg-btn ${typeF === v ? "ap3-seg-btn--on" : ""}`}
              onClick={() => setTypeF(v)}>{l}
            </button>
          ))}
        </div>
        <select className="ap3-token-sel" value={tokenF} onChange={e => setTokenF(e.target.value)}>
          <option value="">All Tokens</option>
          {tokenOpts.map(([addr, sym]) => (
            <option key={addr} value={addr}>{sym}</option>
          ))}
        </select>
        <span className="ap3-toolbar-count">{rows.length} txs</span>
      </div>

      <div className="ap3-table">
        <div className="ap3-thead ap3-grid--activity">
          {["Token","Type","Amount","Value","Price","Age","Tx"].map(l => (
            <span key={l} className="ap3-th ap3-th--static">{l}</span>
          ))}
        </div>
        <div className="ap3-tbody">
          {rows.length === 0
            ? <EmptyState text="No transactions match the filter"/>
            : rows.map((tx, i) => {
              const isBuy = tx.position === "BUY";
              const addr  = tx.tokenAddress || tx.token_address || "";
              const price = Number(tx.amountToken) > 0 && Number(tx.amountUsd) > 0
                ? Number(tx.amountUsd) / Number(tx.amountToken) : 0;
              const sym   = tx.symbol || truncateAddress(addr);
              return (
                <div key={tx.txHash || i}
                  className={`ap3-tr ap3-grid--activity ap3-tr--click ap3-tr--${isBuy ? "buy" : "sell"}`}
                  onClick={() => addr && onTrade(addr)}>

                  <div className="ap3-td ap3-token-cell">
                    <TokenLogo symbol={sym} logo={tx.logo} size={26} radius={6}/>
                    <div className="ap3-token-meta">
                      <span className="ap3-token-sym" style={{ fontSize: 12 }}>{sym}</span>
                      {!tokenF && (
                        <span className="ap3-mono ap3-muted" style={{ fontSize: 10 }}>{truncateAddress(addr)}</span>
                      )}
                    </div>
                  </div>

                  <span className="ap3-td">
                    <span className={`ap3-type-chip ap3-type-chip--${isBuy ? "buy" : "sell"}`}>
                      {isBuy ? "Buy" : "Sell"}
                    </span>
                  </span>

                  <span className="ap3-td ap3-mono">{fmtNum(tx.amountToken)}</span>
                  <span className="ap3-td ap3-mono">{formatUsd(tx.amountUsd)}</span>
                  <span className="ap3-td ap3-mono ap3-muted" style={{ fontSize: 11 }}>
                    {price > 0 ? formatPrice(price) : "—"}
                  </span>
                  <span className="ap3-td ap3-muted" style={{ fontSize: 11, fontFamily: "var(--font-sans,inherit)" }}>
                    {timeAgo(tx.time)}
                  </span>
                  <span className="ap3-td" onClick={e => e.stopPropagation()}>
                    {tx.txHash
                      ? (
                        <a href={`https://bscscan.com/tx/${tx.txHash}`}
                          target="_blank" rel="noreferrer" className="ap3-ext-link">
                          {tx.txHash.slice(0, 6)}…<ExternalLinkIcon size={10}/>
                        </a>
                      ) : <span className="ap3-muted">—</span>}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// Deployed Tab
// ================================================================

function DeployedTab({ tokens, loading, onTrade }) {
  const [sortK, setSortK] = useState("allTimeHigh");
  const [sortD, setSortD] = useState("desc");

  const rows = useMemo(() => {
    return [...tokens].sort((a, b) => {
      const va = a[sortK] ?? 0, vb = b[sortK] ?? 0;
      if (typeof va === "string") return sortD === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortD === "asc" ? va - vb : vb - va;
    });
  }, [tokens, sortK, sortD]);

  const doSort = k => {
    if (k === sortK) setSortD(d => d === "asc" ? "desc" : "asc");
    else { setSortK(k); setSortD("desc"); }
  };

  if (loading) return <div className="ap3-loading"><Spinner/><span>Loading deployed tokens…</span></div>;
  if (!rows.length) return <EmptyState text="No deployed tokens found for this wallet"/>;

  return (
    <div className="ap3-tab-body">
      <div className="ap3-table">
        <div className="ap3-thead ap3-grid--deployed">
          {[
            { k: "symbol",      l: "Token"     },
            { k: "allTimeHigh", l: "ATH Price" },
            { k: "migrated",    l: "Status"    },
            { k: "address",     l: "Contract"  },
          ].map(({ k, l }) => (
            <button key={k} className={`ap3-th ${sortK === k ? "ap3-th--on" : ""}`}
              onClick={() => k !== "address" && doSort(k)}>
              {l}{sortK === k && <span className="ap3-th-arrow">{sortD === "asc" ? "↑" : "↓"}</span>}
            </button>
          ))}
        </div>
        <div className="ap3-tbody">
          {rows.map((t, i) => (
            <div key={t.address || i}
              className="ap3-tr ap3-grid--deployed ap3-tr--click"
              onClick={() => onTrade(t.address)}>

              <div className="ap3-td ap3-token-cell">
                <TokenLogo symbol={t.symbol} logo={t.imageUrl} size={32} radius={8}/>
                <div className="ap3-token-meta">
                  <span className="ap3-token-sym">{t.symbol || "?"}</span>
                  <span className="ap3-mono ap3-muted" style={{ fontSize: 10 }}>
                    {t.name || truncateAddress(t.address)}
                  </span>
                </div>
              </div>

              <span className="ap3-td ap3-mono" style={{ fontWeight: 700 }}>
                {t.allTimeHigh > 0 ? formatPrice(t.allTimeHigh) : "—"}
              </span>

              <span className="ap3-td">
                <span className={`ap3-status-chip ${t.migrated ? "ap3-status-chip--migrated" : "ap3-status-chip--active"}`}>
                  {t.migrated ? "Migrated" : "Active"}
                </span>
              </span>

              <div className="ap3-td ap3-contract-cell" onClick={e => e.stopPropagation()}>
                <span className="ap3-mono ap3-muted" style={{ fontSize: 11 }}>{truncateAddress(t.address)}</span>
                <a href={`https://bscscan.com/token/${t.address}`}
                  target="_blank" rel="noreferrer" className="ap3-ext-link">
                  <ExternalLinkIcon size={11}/>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// Main Page
// ================================================================

export default function AddressPage() {
  const { wallet } = useParams();
  const navigate   = useNavigate();

  const [overview,    setOverview]    = useState(null);
  const [txs,         setTxs]         = useState([]);
  const [overviewErr, setOverviewErr] = useState(false);
  const [loadingOv,   setLoadingOv]   = useState(true);
  const [loadingTx,   setLoadingTx]   = useState(false);
  const [txFetched,   setTxFetched]   = useState(false);
  const [tab,         setTab]         = useState("holdings");
  const [copied,      setCopied]      = useState(false);
  const [bnbBalance,  setBnbBalance]  = useState(null);
  const [bnbLoading,  setBnbLoading]  = useState(false);

  const isValid = /^0x[a-fA-F0-9]{40}$/i.test(wallet || "");

  // Reset state when wallet changes
  useEffect(() => {
    setOverview(null);
    setTxs([]);
    setTxFetched(false);
    setOverviewErr(false);
    setLoadingOv(true);
  }, [wallet]);

  // Fetch BNB balance directly from BSC RPC
  useEffect(() => {
    if (!isValid) return;
    setBnbBalance(null);
    setBnbLoading(true);

    async function fetchBnb() {
      try {
        const BSC_RPC = "https://bsc-dataseed1.binance.org/";
        const res = await fetch(BSC_RPC, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0", id: 1,
            method: "eth_getBalance",
            params: [wallet, "latest"],
          }),
        });
        const json = await res.json();
        if (json.result) {
          const wei = BigInt(json.result);
          const bnb = Number(wei) / 1e18;
          setBnbBalance(bnb);
        }
      } catch {
        setBnbBalance(null);
      } finally {
        setBnbLoading(false);
      }
    }

    fetchBnb();
  }, [wallet, isValid]);

  // Fetch overview
  useEffect(() => {
    if (!isValid) return;
    setLoadingOv(true);
    setOverviewErr(false);
    walletsApi.getOverview(wallet)
      .then(d  => setOverview(d))
      .catch(() => setOverviewErr(true))
      .finally(() => setLoadingOv(false));
  }, [wallet, isValid]);

  // Fetch txs + batch enrich with token symbol/logo/name
  useEffect(() => {
    const needsTx = tab === "holdings" || tab === "activity";
    if (!needsTx || txFetched || !isValid) return;
    setTxFetched(true);
    setLoadingTx(true);

    async function fetchAndEnrich() {
      try {
        const d = await walletsApi.getTransactions(wallet, 500);
        const list = Array.isArray(d)
          ? d
          : (Array.isArray(d?.transactions) ? d.transactions : []);

        if (!list.length) {
          setTxs([]);
          return;
        }

        setTxs(list);

        const uniqueAddrs = [
          ...new Set(
            list.map(tx => tx.tokenAddress || tx.token_address || "").filter(Boolean)
          ),
        ];

        const tokenMap = {};
        await Promise.allSettled(
          uniqueAddrs.map(addr =>
            tokensApi.getOne(addr)
              .then(t => { tokenMap[addr.toLowerCase()] = t; })
              .catch(() => {})
          )
        );

        const enriched = list.map(tx => {
          const addr = (tx.tokenAddress || tx.token_address || "").toLowerCase();
          const meta = tokenMap[addr];
          if (!meta) return tx;
          return {
            ...tx,
            symbol: meta.symbol   || tx.symbol || null,
            logo:   meta.imageUrl || tx.logo   || null,
            name:   meta.name     || tx.name   || null,
          };
        });

        setTxs(enriched);
      } catch {
        setTxs([]);
      } finally {
        setLoadingTx(false);
      }
    }

    fetchAndEnrich();
  }, [tab, wallet, isValid, txFetched]);

  const handleCopy = () => {
    navigator.clipboard.writeText(wallet).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleTrade = addr => navigate(appendRef(`/trade/${addr}`));

  const trading  = overview?.trading  ?? {};
  const behavior = overview?.behavior ?? {};
  const deploy   = overview?.deploy   ?? {};
  const winRate  = behavior.winRate   ?? 0;
  const pnl      = Number(trading.totalRealizedPnl || 0);
  const pnlColor = pnl >= 0 ? "#26a69a" : "#ef5350";
  const firstSeen  = toMs(trading.firstSeenAt);
  const lastActive = toMs(trading.lastSeenAt);

  const holdings  = useMemo(() => computeHoldings(txs), [txs]);
  const openCount = holdings.filter(h => h.isOpen).length;

  if (!isValid) {
    return (
      <div className="ap3-root">
        <div className="ap3-error">Invalid wallet address</div>
      </div>
    );
  }

  return (
    <div className="ap3-root">

      {/* PROFILE HEADER */}
      <div className="ap3-header">

        <div className="ap3-identity-row">

          {/* Avatar + BNB block */}
          <div className="ap3-avatar-bnb">
            <div className="ap3-avatar">
              <img src="/swanfi-logo.png" alt="wallet"
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}/>
            </div>
            <div className="ap3-bnb-block">
              <div className="ap3-bnb-icon-wrap">
                <svg width="14" height="14" viewBox="0 0 32 32" fill="#F3BA2F">
                  <path d="M16 0L9.9 6.1 13.1 9.3 16 6.4 18.9 9.3 22.1 6.1zM6.1 9.9L0 16l6.1 6.1 3.2-3.2L6.1 16l3.2-3.2zM22.7 12.8L16 19.5l-6.7-6.7-3.2 3.2L16 26l9.9-9.9zM25.9 12.8l-3.2 3.2L25.9 19.2 32 16z"/>
                </svg>
              </div>
              {bnbLoading && !bnbBalance
                ? <span className="ap3-bnb-val ap3-bnb-val--loading">—</span>
                : <span className="ap3-bnb-val">
                    {bnbBalance === null ? "—"
                      : bnbBalance < 0.0001 ? "< 0.0001"
                      : bnbBalance >= 1000  ? bnbBalance.toFixed(1)
                      : bnbBalance.toFixed(4)}
                  </span>
              }
              <span className="ap3-bnb-label">BNB</span>
            </div>
          </div>

          {/* Address + meta */}
          <div className="ap3-identity-info">
            <div className="ap3-addr-row">
              <span className="ap3-addr ap3-addr--full">{wallet}</span>
              <span className="ap3-addr ap3-addr--short">{truncateAddress(wallet)}</span>
              <button className="ap3-icon-btn" onClick={handleCopy} title="Copy address">
                {copied ? <CheckIcon size={12}/> : <CopyIcon size={12}/>}
              </button>
              <a href={`https://bscscan.com/address/${wallet}`}
                target="_blank" rel="noreferrer" className="ap3-bscscan-link">
                <IconExternal size={11}/>
                <span>BscScan</span>
              </a>
            </div>
            <div className="ap3-addr-meta">
              <span className="ap3-chip ap3-chip--wallet">BSC Wallet</span>
              {firstSeen  > 0 && <span className="ap3-chip ap3-chip--meta">Since {formatDate(firstSeen)}</span>}
              {lastActive > 0 && <span className="ap3-chip ap3-chip--meta">Active {timeAgo(lastActive)}</span>}
              {loadingOv  && <span className="ap3-pulse"/>}
            </div>
          </div>

          {!loadingOv && overview && (
            <div className="ap3-winring-wrap">
              <WinRing rate={winRate}/>
            </div>
          )}
        </div>

        {/* Stats */}
        {loadingOv ? (
          <div className="ap3-stats-skeleton">
            {[...Array(7)].map((_, i) => <div key={i} className="ap3-skel"/>)}
          </div>
        ) : overviewErr ? (
          <div className="ap3-stats-error">Failed to load wallet data</div>
        ) : overview ? (
          <div className="ap3-stats-row">
            <StatPill label="Realized PnL"
              value={(pnl >= 0 ? "+" : "") + formatUsd(pnl)} color={pnlColor}/>
            <div className="ap3-stats-div"/>
            <StatPill label="Buy Volume"     value={formatUsd(trading.buyVolumeUsd)}  color="#26a69a"/>
            <div className="ap3-stats-div"/>
            <StatPill label="Sell Volume"    value={formatUsd(trading.sellVolumeUsd)} color="#ef5350"/>
            <div className="ap3-stats-div"/>
            <StatPill label="Total TXs"      value={formatNumber(trading.totalTxCount)}/>
            <div className="ap3-stats-div"/>
            <StatPill label="Tokens Traded"  value={behavior.uniqueTokensTraded ?? 0}/>
            <div className="ap3-stats-div"/>
            <StatPill label="Avg Hold"       value={fmtDur(behavior.avgHoldTimeSeconds)}/>
            <div className="ap3-stats-div"/>
            <StatPill label="Deployed"       value={deploy.deployCount ?? 0}/>
          </div>
        ) : null}
      </div>

      {/* TAB CARD */}
      <div className="ap3-card">

        <div className="ap3-tabbar">
          {[
            { k: "holdings", l: "Holdings",       badge: txFetched ? openCount    : null },
            { k: "activity", l: "Activity",        badge: txFetched ? txs.length  : null },
            { k: "deployed", l: "Deployed Tokens", badge: deploy.deployCount || null },
          ].map(({ k, l, badge }) => (
            <button key={k}
              className={`ap3-tabbar-btn ${tab === k ? "ap3-tabbar-btn--active" : ""}`}
              onClick={() => setTab(k)}>
              {l}
              {badge > 0 && <span className="ap3-tabbar-badge">{badge}</span>}
            </button>
          ))}
        </div>

        {tab === "holdings" && (
          <HoldingsTab
            txs={txs}
            loading={loadingTx && !txFetched}
            onTrade={handleTrade}
          />
        )}
        {tab === "activity" && (
          <ActivityTab
            txs={txs}
            loading={loadingTx && !txFetched}
            onTrade={handleTrade}
          />
        )}
        {tab === "deployed" && (
          <DeployedTab
            tokens={deploy.deployData ?? []}
            loading={loadingOv}
            onTrade={handleTrade}
          />
        )}

      </div>
    </div>
  );
}