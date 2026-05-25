// src/pages/trade/tab/WalletDetailPanel.jsx
// Detailed panel showing wallet activity and position for a specific token

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { appendRef } from "../../../hooks/useRefCode";
import { tokens as tokensApi } from "../../../services/api";
import { truncateAddress, timeAgo, formatUsd, formatTokenAmount, formatPrice } from "../../../utils/format";
import { CopyIcon, ExternalLinkIcon } from "../../../assets/icons";
import "./tabs.css";

// ================================================================
// Helper functions (local, specific to this component)
// ================================================================

function fmtUsd(n, sign = false) {
  const v = Number(n || 0);
  if (v === 0) return "$0";
  const abs = Math.abs(v);
  const s = sign ? (v >= 0 ? "+" : "-") : v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${s}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${s}$${(abs / 1_000).toFixed(1)}K`;
  if (abs >= 1) return `${s}$${abs.toFixed(2)}`;
  if (abs >= 0.01) return `${s}$${abs.toFixed(4)}`;
  return `${s}$${abs.toExponential(2)}`;
}

function fmtToken(n) {
  const v = Number(n || 0);
  if (v === 0) return "0";
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
}

function fmtPriceLocal(n) {
  const v = Number(n || 0);
  if (v === 0) return "$0";
  if (v >= 1) return `$${v.toFixed(4)}`;
  if (v >= 0.001) return `$${v.toFixed(6)}`;
  const s = v.toFixed(12).replace(/0+$/, "");
  const match = s.match(/^0\.(0+)(\d+)/);
  if (match) {
    const zeros = match[1].length;
    const sig = match[2].slice(0, 4);
    return `$0.0${zeros}${sig}`;
  }
  return `$${v.toExponential(2)}`;
}

function timeAgoShort(ts) {
  const ms = toMs(ts);
  if (!ms) return "";
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

function toMs(ts) {
  if (!ts) return 0;
  const n = Number(ts);
  if (!isNaN(n) && n > 0) return n < 2_000_000_000 ? n * 1000 : n;
  return new Date(ts).getTime() || 0;
}

function holdDuration(firstTx, lastTx) {
  const from = toMs(firstTx);
  if (!from) return "–";
  const to = lastTx ? toMs(lastTx) : Date.now();
  const sec = Math.floor((to - from) / 1000);
  if (sec <= 0) return "–";
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
  return `${Math.floor(sec / 86400)}d`;
}

// ================================================================
// Sparkline component
// ================================================================

function Sparkline({ data = [], color = "#26a69a", width = 120, height = 40 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - 2 - ((v - min) / rng) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const pathD = "M" + pts.join(" L");
  const areaD = `${pathD} L${width},${height} L0,${height} Z`;
  const id = `wdp-sg-${color.replace("#", "")}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${id})`} />
      <path d={pathD} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ================================================================
// MiniStat component
// ================================================================

function MiniStat({ label, value, color, sub }) {
  return (
    <div className="wdp2-mini-stat">
      <span className="wdp2-mini-label">{label}</span>
      <span className="wdp2-mini-value" style={color ? { color } : {}}>{value}</span>
      {sub && <span className="wdp2-mini-sub">{sub}</span>}
    </div>
  );
}

// ================================================================
// MetricCard component
// ================================================================

function MetricCard({ label, value, pct, pctPos, accent, children }) {
  return (
    <div className="wdp2-metric-card" style={accent ? { "--mc-accent": accent } : {}}>
      <span className="wdp2-metric-label">{label}</span>
      <span className="wdp2-metric-value">{children ?? value}</span>
      {pct !== undefined && (
        <span className={`wdp2-metric-pct ${pctPos ? "wdp2-metric-pct--pos" : "wdp2-metric-pct--neg"}`}>
          {pctPos ? "+" : ""}{typeof pct === "number" ? pct.toFixed(0) : pct}%
        </span>
      )}
    </div>
  );
}

// ================================================================
// ProgressBar component
// ================================================================

function ProgressBar({ pct = 0, color = "#26a69a", height = 4 }) {
  return (
    <div className="wdp2-progress-bg" style={{ height }}>
      <div
        className="wdp2-progress-fill"
        style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, background: color }}
      />
    </div>
  );
}

// ================================================================
// BuySellBar component
// ================================================================

function BuySellBar({ buyPct }) {
  return (
    <div className="wdp2-bsbar">
      <div className="wdp2-bsbar-track">
        <div className="wdp2-bsbar-buy" style={{ width: `${buyPct}%` }} />
        <div className="wdp2-bsbar-sell" style={{ width: `${100 - buyPct}%` }} />
      </div>
      <div className="wdp2-bsbar-labels">
        <span style={{ color: "#26a69a" }}>Buy {buyPct.toFixed(0)}%</span>
        <span style={{ color: "#ef5350" }}>Sell {(100 - buyPct).toFixed(0)}%</span>
      </div>
    </div>
  );
}

// ================================================================
// Main Component
// ================================================================

export default function WalletDetailPanel({
  address,
  tokenAddress,
  token,
  currentPrice = 0,
  formatPrice: formatPriceProp,
  formatTokenAmount: formatTokenAmountProp,
  onClose,
  initialTxs = null,
}) {
  const [txs, setTxs] = useState(() => initialTxs ?? []);
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(initialTxs === null);
  const [tab, setTab] = useState("overview");
  const panelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!address || !tokenAddress) return;
    const hasTxs = initialTxs !== null;
    if (hasTxs) {
      setTxs(initialTxs);
      tokensApi.getCandles(tokenAddress, "1h", 24).catch(() => []).then(d => setCandles(Array.isArray(d) ? d : []));
      return;
    }
    setLoading(true);
    setTxs([]);
    Promise.all([
      tokensApi.getTransactionsByWallet(tokenAddress, address, 200).catch(() => []),
      tokensApi.getCandles(tokenAddress, "1h", 24).catch(() => []),
    ]).then(([txData, candleData]) => {
      setTxs(Array.isArray(txData) ? txData : []);
      setCandles(Array.isArray(candleData) ? candleData : []);
    }).finally(() => setLoading(false));
  }, [address, tokenAddress, initialTxs]);

  useEffect(() => {
    const handler = e => { if (panelRef.current && !panelRef.current.contains(e.target)) onClose?.(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Compute stats
  const buys = txs.filter(t => t.position === "BUY");
  const sells = txs.filter(t => t.position === "SELL");

  const buyUsd = buys.reduce((s, t) => s + Number(t.amountUsd || 0), 0);
  const sellUsd = sells.reduce((s, t) => s + Number(t.amountUsd || 0), 0);
  const buyTokens = buys.reduce((s, t) => s + Number(t.amountToken || 0), 0);
  const sellTokens = sells.reduce((s, t) => s + Number(t.amountToken || 0), 0);

  const avgBuyPrice = buyTokens > 0 ? buyUsd / buyTokens : 0;
  const avgSellPrice = sellTokens > 0 ? sellUsd / sellTokens : 0;

  const realizedPnl = buyTokens > 0 && sellTokens > 0
    ? sellUsd - (buyUsd / buyTokens) * Math.min(sellTokens, buyTokens)
    : 0;

  const remainTokens = Math.max(buyTokens - sellTokens, 0);
  const unrealizedPnl = (remainTokens > 0 && avgBuyPrice > 0 && currentPrice > 0)
    ? (currentPrice - avgBuyPrice) * remainTokens
    : null;

  const totalSupply = token?.totalSupply || 1_000_000_000;
  const holdPct = remainTokens > 0 ? (remainTokens / totalSupply) * 100 : 0;
  const holdValue = remainTokens > 0 && currentPrice > 0 ? remainTokens * currentPrice : 0;

  const totalPnl = realizedPnl + (unrealizedPnl ?? 0);
  const pnlPct = buyUsd > 0 ? (totalPnl / buyUsd) * 100 : 0;
  const isExited = remainTokens <= 0 && sells.length > 0;
  const hasPos = remainTokens > 0;

  const txsSorted = txs.length > 1 ? [...txs].sort((a, b) => toMs(a.time) - toMs(b.time)) : txs;
  const firstTxTime = txsSorted.length > 0 ? txsSorted[0].time : null;
  const lastTxTime = txsSorted.length > 0 ? txsSorted[txsSorted.length - 1].time : null;

  const pricePts = candles.map(c => Number(c.close || 0)).filter(Boolean);
  const sparkColor = pricePts.length >= 2
    ? (pricePts[pricePts.length - 1] >= pricePts[0] ? "#26a69a" : "#ef5350")
    : "#26a69a";

  const pnlColor = totalPnl >= 0 ? "#26a69a" : "#ef5350";
  const upnlColor = unrealizedPnl === null ? "var(--text-muted)" : unrealizedPnl >= 0 ? "#26a69a" : "#ef5350";

  const statusLabel = hasPos ? "Holding" : isExited ? "Exited" : "No Position";
  const statusClass = hasPos ? "wdp2-badge--hold" : isExited ? "wdp2-badge--exit" : "wdp2-badge--none";

  const buyPct = (buyUsd + sellUsd) > 0 ? (buyUsd / (buyUsd + sellUsd)) * 100 : 50;

  const handleViewPortfolio = () => {
    navigate(appendRef(`/address/${address}`));
    onClose?.();
  };

  const shortAddr = truncateAddress(address, 6, 4);

  return createPortal(
    <div className="wdp2-overlay">
      <div className="wdp2-panel" ref={panelRef}>
        {/* Header */}
        <div className="wdp2-header">
          <div className="wdp2-header-top">
            <div className="wdp2-header-identity">
              <div className="wdp2-avatar">
                <img
                  src="/swanfi-logo.png"
                  alt="wallet"
                  style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                />
              </div>
              <div className="wdp2-header-meta">
                <div className="wdp2-header-addr">
                  <span className="wdp2-addr-text">{shortAddr}</span>
                  <button className="tr-copy-btn" onClick={() => navigator.clipboard.writeText(address)} title="Copy">
                    <CopyIcon size={12} />
                  </button>
                  <a
                    href={`https://bscscan.com/address/${address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="wdp2-addr-link"
                  >
                    <ExternalLinkIcon size={11} />
                  </a>
                </div>
                <div className="wdp2-header-badges">
                  <span className={`wdp2-badge ${statusClass}`}>{statusLabel}</span>
                  {txs.length > 0 && (
                    <span className="wdp2-badge wdp2-badge--txcount">{txs.length} TXs</span>
                  )}
                </div>
              </div>
            </div>

            {token && (
              <div className="wdp2-header-token">
                {pricePts.length >= 2 && (
                  <Sparkline data={pricePts} color={sparkColor} width={100} height={34} />
                )}
                <div className="wdp2-header-token-info">
                  <span className="wdp2-token-symbol">{token.symbol}</span>
                  {currentPrice > 0 && (
                    <span className="wdp2-token-price" style={{ color: sparkColor }}>
                      {fmtPriceLocal(currentPrice)}
                    </span>
                  )}
                </div>
              </div>
            )}

            <button className="wdp2-close" onClick={onClose} aria-label="Close">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Quick stat strip */}
          {!loading && txs.length > 0 && (
            <div className="wdp2-stat-strip">
              <MiniStat label="Total PnL" value={fmtUsd(totalPnl, true)} color={pnlColor} />
              <div className="wdp2-strip-divider" />
              <MiniStat label="Invested" value={fmtUsd(buyUsd)} />
              <div className="wdp2-strip-divider" />
              <MiniStat label="Holding" value={holdValue > 0 ? fmtUsd(holdValue) : "–"} />
              <div className="wdp2-strip-divider" />
              <MiniStat label="Duration" value={holdDuration(firstTxTime, hasPos ? null : lastTxTime)} />
            </div>
          )}

          {/* Tab bar */}
          {txs.length > 0 && !loading && (
            <div className="wdp2-tab-bar">
              <button
                className={`wdp2-tab ${tab === "overview" ? "wdp2-tab--active" : ""}`}
                onClick={() => setTab("overview")}
              >
                Overview
              </button>
              <button
                className={`wdp2-tab ${tab === "txs" ? "wdp2-tab--active" : ""}`}
                onClick={() => setTab("txs")}
              >
                Transactions <span className="wdp2-tab-count">{txs.length}</span>
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="wdp2-body">
          {loading ? (
            <div className="wdp2-loading">
              <div className="wdp2-spinner" />
              <span>Loading wallet data...</span>
            </div>
          ) : txs.length === 0 ? (
            <div className="wdp2-empty">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>No transactions found</span>
            </div>
          ) : tab === "overview" ? (
            <div className="wdp2-overview">
              {/* PnL Section */}
              <div className="wdp2-section">
                <div className="wdp2-section-header">
                  <span className="wdp2-section-title">PnL Summary</span>
                  <span className={`wdp2-pnl-pct ${totalPnl >= 0 ? "wdp2-pnl-pct--pos" : "wdp2-pnl-pct--neg"}`}>
                    {totalPnl >= 0 ? "+" : ""}{pnlPct.toFixed(0)}%
                  </span>
                </div>
                <div className="wdp2-pnl-grid">
                  <MetricCard
                    label="Realized PnL"
                    pct={buyUsd > 0 ? (realizedPnl / buyUsd) * 100 : 0}
                    pctPos={realizedPnl >= 0}
                    accent={realizedPnl >= 0 ? "#26a69a" : "#ef5350"}
                  >
                    <span style={{ color: realizedPnl >= 0 ? "#26a69a" : "#ef5350", fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700 }}>
                      {fmtUsd(realizedPnl, true)}
                    </span>
                  </MetricCard>
                  <MetricCard
                    label="Unrealized PnL"
                    pct={unrealizedPnl !== null && buyUsd > 0 ? (unrealizedPnl / buyUsd) * 100 : undefined}
                    pctPos={unrealizedPnl !== null && unrealizedPnl >= 0}
                    accent={unrealizedPnl !== null ? upnlColor : undefined}
                  >
                    <span style={{ color: upnlColor, fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700 }}>
                      {unrealizedPnl === null ? "–" : fmtUsd(unrealizedPnl, true)}
                    </span>
                  </MetricCard>
                </div>
              </div>

              {/* Position Section */}
              <div className="wdp2-section">
                <div className="wdp2-section-header">
                  <span className="wdp2-section-title">Position</span>
                  {holdPct > 0 && (
                    <span className="wdp2-section-sub">{holdPct.toFixed(3)}% of supply</span>
                  )}
                </div>

                <div className="wdp2-pos-grid">
                  <div className="wdp2-pos-big">
                    <span className="wdp2-pos-big-label">Tokens Held</span>
                    <span className="wdp2-pos-big-val">{fmtToken(remainTokens)}</span>
                    <span className="wdp2-pos-big-sub">{holdValue > 0 ? fmtUsd(holdValue) : "no value"}</span>
                  </div>
                  <div className="wdp2-pos-stats">
                    <div className="wdp2-pos-row">
                      <span className="wdp2-pos-row-label">Avg Buy</span>
                      <span className="wdp2-pos-row-val" style={{ color: "#26a69a" }}>
                        {avgBuyPrice > 0 ? fmtPriceLocal(avgBuyPrice) : "–"}
                      </span>
                    </div>
                    <div className="wdp2-pos-row">
                      <span className="wdp2-pos-row-label">Avg Sell</span>
                      <span className="wdp2-pos-row-val" style={{ color: "#ef5350" }}>
                        {avgSellPrice > 0 ? fmtPriceLocal(avgSellPrice) : "–"}
                      </span>
                    </div>
                    <div className="wdp2-pos-row">
                      <span className="wdp2-pos-row-label">Hold Time</span>
                      <span className="wdp2-pos-row-val">
                        {holdDuration(firstTxTime, hasPos ? null : lastTxTime)}
                      </span>
                    </div>
                    <div className="wdp2-pos-row">
                      <span className="wdp2-pos-row-label">Current Price</span>
                      <span className="wdp2-pos-row-val">
                        {currentPrice > 0 ? fmtPriceLocal(currentPrice) : "–"}
                      </span>
                    </div>
                  </div>
                </div>

                {holdPct > 0 && (
                  <div className="wdp2-hold-bar">
                    <ProgressBar pct={Math.min(holdPct * 10, 100)} color="var(--color-primary)" height={5} />
                  </div>
                )}
              </div>

              {/* Buy / Sell Section */}
              <div className="wdp2-section">
                <div className="wdp2-section-header">
                  <span className="wdp2-section-title">Trade Volume</span>
                  <span className="wdp2-section-sub">{buys.length + sells.length} trades total</span>
                </div>

                <div className="wdp2-vol-grid">
                  <div className="wdp2-vol-card wdp2-vol-card--buy">
                    <div className="wdp2-vol-icon">▲</div>
                    <span className="wdp2-vol-label">Total Buy</span>
                    <span className="wdp2-vol-val">{fmtUsd(buyUsd)}</span>
                    <span className="wdp2-vol-tokens">{fmtToken(buyTokens)} tokens</span>
                    <span className="wdp2-vol-count">{buys.length} TXs</span>
                  </div>
                  <div className="wdp2-vol-card wdp2-vol-card--sell">
                    <div className="wdp2-vol-icon">▼</div>
                    <span className="wdp2-vol-label">Total Sell</span>
                    <span className="wdp2-vol-val">{fmtUsd(sellUsd)}</span>
                    <span className="wdp2-vol-tokens">{fmtToken(sellTokens)} tokens</span>
                    <span className="wdp2-vol-count">{sells.length} TXs</span>
                  </div>
                </div>

                {(buyUsd + sellUsd) > 0 && <BuySellBar buyPct={buyPct} />}
              </div>

              {/* 24h Chart Section */}
              {pricePts.length >= 2 && (
                <div className="wdp2-section">
                  <div className="wdp2-section-header">
                    <span className="wdp2-section-title">24h Price</span>
                    <span className="wdp2-section-sub" style={{ color: sparkColor }}>
                      {pricePts[0] > 0
                        ? ((pricePts[pricePts.length - 1] / pricePts[0] - 1) * 100).toFixed(2) + "%"
                        : ""}
                    </span>
                  </div>
                  <div className="wdp2-chart-wrap">
                    <Sparkline data={pricePts} color={sparkColor} width={370} height={60} />
                  </div>
                  <div className="wdp2-chart-range">
                    <span style={{ color: "var(--text-muted)", fontSize: 9 }}>
                      Low: {fmtPriceLocal(Math.min(...pricePts))}
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: 9 }}>
                      High: {fmtPriceLocal(Math.max(...pricePts))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Transactions tab */
            <div className="wdp2-tx-section">
              <div className="wdp2-tx-list">
                {[...txs]
                  .sort((a, b) => toMs(b.time) - toMs(a.time))
                  .map((tx, i) => {
                    const isBuy = tx.position === "BUY";
                    const txHash = tx.txHash || "";
                    const usd = Number(tx.amountUsd || 0);
                    const tokens = Number(tx.amountToken || 0);
                    const price = tokens > 0 && usd > 0 ? usd / tokens : 0;
                    return (
                      <div key={txHash || i} className={`wdp2-tx-row wdp2-tx-row--${isBuy ? "buy" : "sell"}`}>
                        <div className={`wdp2-tx-badge wdp2-tx-badge--${isBuy ? "buy" : "sell"}`}>
                          {isBuy ? "B" : "S"}
                        </div>
                        <div className="wdp2-tx-main">
                          <span className="wdp2-tx-usd">{usd > 0 ? fmtUsd(usd) : "–"}</span>
                          {tokens > 0 && <span className="wdp2-tx-tokens">{fmtToken(tokens)}</span>}
                        </div>
                        <div className="wdp2-tx-right">
                          {price > 0 && <span className="wdp2-tx-price">{fmtPriceLocal(price)}</span>}
                          <span className="wdp2-tx-age">{timeAgoShort(tx.time)}</span>
                        </div>
                        {txHash && (
                          <a
                            href={`https://bscscan.com/tx/${txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="wdp2-tx-link"
                          >
                            <ExternalLinkIcon size={11} />
                          </a>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!loading && (
          <div className="wdp2-footer">
            <a
              href={`https://bscscan.com/address/${address}`}
              target="_blank"
              rel="noreferrer"
              className="wdp2-action-btn wdp2-action-btn--secondary"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 5 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              BscScan
            </a>
            <button className="wdp2-action-btn wdp2-action-btn--primary" onClick={handleViewPortfolio}>
              View Portfolio →
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}