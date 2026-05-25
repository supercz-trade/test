// src/pages/portfolio/Portfolio.jsx
// Enhanced portfolio page with header, stats row, sparkline chart, and tabs

import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { appendRef } from "../../hooks/useRefCode";
import { user, trade, wallets as walletsApi, tokens as tokensApi } from "../../services/api";
import {
  CopyIcon,
  ExternalLinkIcon,
  CheckIcon,
  WalletIcon,
  IconExternal,
  RefreshIcon,
} from "../../assets/icons";
import {
  formatUsd,
  formatTokenAmount,
  formatPrice,
  truncateAddress,
  timeAgo,
  formatDate,
  formatNumber,
} from "../../utils/format";
import "./portfolio.css";

function toMs(ts) {
  if (!ts) return 0;
  const n = Number(ts);
  return !isNaN(n) && n > 0 ? (n < 2_000_000_000 ? n * 1000 : n) : new Date(ts).getTime() || 0;
}

function SparkChart({ data, color = "#ffd400" }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 400;
  const H = 100;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 16) - 8;
    return `${x},${y}`;
  });
  const pathD = `M${pts.join(" L")}`;
  const fillD = `M0,${H} L${pts.join(" L")} L${W},${H} Z`;
  const gradId = `pf-grad-${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].split(",")[0]} cy={pts[pts.length - 1].split(",")[1]} r="3" fill={color} />
    </svg>
  );
}

function TokenLogo({ symbol, logo, size = 32, radius = 8 }) {
  const [err, setErr] = useState(false);
  const PALETTE = ["#627EEA","#9945FF","#F3BA2F","#28A0F0","#45D483","#FF6B6B","#4ECDC4","#375BD2"];
  const color = PALETTE[(symbol || "?").charCodeAt(0) % PALETTE.length];
  if (logo && !err)
    return (
      <img src={logo} alt={symbol} onError={() => setErr(true)}
        style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", flexShrink: 0 }} />
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
    <div className="pf-stat-pill">
      <span className="pf-stat-pill-label">{label}</span>
      <span className="pf-stat-pill-val" style={color ? { color } : {}}>{value}</span>
    </div>
  );
}

function Spinner() {
  return <div className="pf-spinner" />;
}

function EmptyState({ text }) {
  return (
    <div className="pf-empty-state">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.25">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{text}</span>
    </div>
  );
}

function computeHoldings(txs) {
  const map = {};
  const sorted = [...txs].sort((a, b) => toMs(a.time) - toMs(b.time));
  for (const tx of sorted) {
    const addr = (tx.tokenAddress || tx.token_address || "").toLowerCase();
    if (!addr) continue;
    if (!map[addr]) map[addr] = {
      address: addr,
      symbol: tx.symbol || truncateAddress(addr),
      logo: tx.logo || null,
      name: tx.name || null,
      buyUsd: 0, sellUsd: 0,
      buyTokens: 0, sellTokens: 0,
      txCount: 0,
      firstTime: tx.time,
      lastTime: tx.time,
    };
    const m = map[addr];
    if (tx.symbol && tx.symbol !== truncateAddress(addr)) m.symbol = tx.symbol;
    if (tx.logo) m.logo = tx.logo;
    if (tx.name) m.name = tx.name;
    const usd = Number(tx.amountUsd || 0);
    const tok = Number(tx.amountToken || 0);
    if (tx.position === "BUY") { m.buyUsd += usd; m.buyTokens += tok; }
    if (tx.position === "SELL") { m.sellUsd += usd; m.sellTokens += tok; }
    m.txCount++;
    if (toMs(tx.time) < toMs(m.firstTime)) m.firstTime = tx.time;
    if (toMs(tx.time) > toMs(m.lastTime)) m.lastTime = tx.time;
  }
  return Object.values(map).map(m => {
    const avgBuy = m.buyTokens > 0 ? m.buyUsd / m.buyTokens : 0;
    const remain = Math.max(m.buyTokens - m.sellTokens, 0);
    const realizedPnl = m.buyTokens > 0 && m.sellTokens > 0
      ? m.sellUsd - avgBuy * Math.min(m.sellTokens, m.buyTokens)
      : 0;
    const roi = m.buyUsd > 0 ? (realizedPnl / m.buyUsd) * 100 : 0;
    const isOpen = remain > 1;
    const holdPct = m.buyTokens > 0 ? (remain / m.buyTokens) * 100 : 0;
    return { ...m, avgBuy, remain, realizedPnl, roi, isOpen, holdPct };
  });
}

function HoldingsTab({ txs, loading, onTrade }) {
  const [filter, setFilter] = useState("open");
  const [sortK, setSortK] = useState("realizedPnl");
  const [sortD, setSortD] = useState("desc");
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
    { k: "symbol", l: "Token" },
    { k: "realizedPnl", l: "Realized PnL" },
    { k: "roi", l: "ROI" },
    { k: "buyUsd", l: "Invested" },
    { k: "sellUsd", l: "Returned" },
    { k: "remain", l: "Remaining" },
    { k: "txCount", l: "TXs" },
  ];
  if (loading) return <div className="pf-loading"><Spinner /><span>Loading holdings...</span></div>;
  return (
    <div className="pf-tab-body">
      <div className="pf-toolbar">
        <div className="pf-seg">
          {[["open", "Open Positions"], ["all", "All Tokens"]].map(([v, l]) => (
            <button key={v} className={`pf-seg-btn ${filter === v ? "pf-seg-btn--on" : ""}`} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
        <span className="pf-toolbar-count">{rows.length} token{rows.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="pf-table">
        <div className="pf-thead pf-grid--holdings">
          {COLS.map(({ k, l }) => (
            <button key={k} className={`pf-th ${sortK === k ? "pf-th--on" : ""}`} onClick={() => doSort(k)}>
              {l}{sortK === k && <span className="pf-th-arrow">{sortD === "asc" ? "↑" : "↓"}</span>}
            </button>
          ))}
        </div>
        <div className="pf-tbody">
          {rows.length === 0 ? <EmptyState text={filter === "open" ? "No open positions" : "No holdings found"} /> :
            rows.map(h => {
              const pnlC = h.realizedPnl >= 0 ? "#26a69a" : "#ef5350";
              const roiC = h.roi >= 0 ? "#26a69a" : "#ef5350";
              const remainDisplay = h.remain >= 1_000_000 ? (h.remain / 1_000_000).toFixed(2) + "M" : h.remain >= 1_000 ? (h.remain / 1_000).toFixed(1) + "K" : h.remain.toFixed(0);
              return (
                <div key={h.address} className="pf-tr pf-grid--holdings pf-tr--click" onClick={() => onTrade(h.address)}>
                  <div className="pf-td pf-token-cell">
                    <TokenLogo symbol={h.symbol} logo={h.logo} size={30} radius={7} />
                    <div className="pf-token-meta">
                      <span className="pf-token-sym">{h.symbol}</span>
                      <span className={`pf-pos-dot ${h.isOpen ? "pf-pos-dot--open" : "pf-pos-dot--closed"}`}>
                        {h.isOpen ? "Open" : "Closed"}
                      </span>
                    </div>
                  </div>
                  <span className="pf-td pf-mono" style={{ color: pnlC, fontWeight: 700 }}>
                    {(h.realizedPnl >= 0 ? "+" : "") + formatUsd(h.realizedPnl)}
                  </span>
                  <span className="pf-td">
                    <span className="pf-roi-chip" style={{ color: roiC, background: roiC + "18" }}>{h.roi >= 0 ? "+" : ""}{h.roi.toFixed(1)}%</span>
                  </span>
                  <span className="pf-td pf-mono pf-muted">{formatUsd(h.buyUsd)}</span>
                  <span className="pf-td pf-mono pf-muted">{formatUsd(h.sellUsd)}</span>
                  <div className="pf-td pf-remain-cell">
                    {h.isOpen ? (
                      <>
                        <span className="pf-mono pf-muted" style={{ fontSize: 11 }}>{remainDisplay}</span>
                        <div className="pf-holdbar"><div className="pf-holdbar-fill" style={{ width: `${Math.min(h.holdPct, 100)}%`, background: h.holdPct > 50 ? "#f59e0b" : "#26a69a" }} /></div>
                      </>
                    ) : <span className="pf-mono pf-muted" style={{ fontSize: 11 }}>—</span>}
                  </div>
                  <span className="pf-td pf-mono pf-muted">{h.txCount}</span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function ActivityTab({ txs, loading, onTrade }) {
  const [typeF, setTypeF] = useState("all");
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
    if (typeF === "buy") out = out.filter(t => t.position === "BUY");
    if (typeF === "sell") out = out.filter(t => t.position === "SELL");
    if (tokenF) out = out.filter(t => (t.tokenAddress || t.token_address || "") === tokenF);
    return [...out].sort((a, b) => toMs(b.time) - toMs(a.time));
  }, [txs, typeF, tokenF]);
  if (loading) return <div className="pf-loading"><Spinner /><span>Loading activity...</span></div>;
  return (
    <div className="pf-tab-body">
      <div className="pf-toolbar">
        <div className="pf-seg">
          {[["all", "All"], ["buy", "Buy"], ["sell", "Sell"]].map(([v, l]) => (
            <button key={v} className={`pf-seg-btn ${typeF === v ? "pf-seg-btn--on" : ""}`} onClick={() => setTypeF(v)}>{l}</button>
          ))}
        </div>
        <select className="pf-token-sel" value={tokenF} onChange={e => setTokenF(e.target.value)}>
          <option value="">All Tokens</option>
          {tokenOpts.map(([addr, sym]) => <option key={addr} value={addr}>{sym}</option>)}
        </select>
        <span className="pf-toolbar-count">{rows.length} txs</span>
      </div>
      <div className="pf-table">
        <div className="pf-thead pf-grid--activity">
          {["Token", "Type", "Amount", "Value", "Price", "Age", "Tx"].map(l => <span key={l} className="pf-th pf-th--static">{l}</span>)}
        </div>
        <div className="pf-tbody">
          {rows.length === 0 ? <EmptyState text="No transactions match the filter" /> :
            rows.map((tx, i) => {
              const isBuy = tx.position === "BUY";
              const addr = tx.tokenAddress || tx.token_address || "";
              const price = Number(tx.amountToken) > 0 && Number(tx.amountUsd) > 0 ? Number(tx.amountUsd) / Number(tx.amountToken) : 0;
              const sym = tx.symbol || truncateAddress(addr);
              return (
                <div key={tx.txHash || i} className={`pf-tr pf-grid--activity pf-tr--click pf-tr--${isBuy ? "buy" : "sell"}`} onClick={() => addr && onTrade(addr)}>
                  <div className="pf-td pf-token-cell">
                    <TokenLogo symbol={sym} logo={tx.logo} size={26} radius={6} />
                    <div className="pf-token-meta">
                      <span className="pf-token-sym" style={{ fontSize: 12 }}>{sym}</span>
                      {!tokenF && <span className="pf-mono pf-muted" style={{ fontSize: 10 }}>{truncateAddress(addr)}</span>}
                    </div>
                  </div>
                  <span className="pf-td"><span className={`pf-type-chip pf-type-chip--${isBuy ? "buy" : "sell"}`}>{isBuy ? "Buy" : "Sell"}</span></span>
                  <span className="pf-td pf-mono">{formatNumber(tx.amountToken)}</span>
                  <span className="pf-td pf-mono">{formatUsd(tx.amountUsd)}</span>
                  <span className="pf-td pf-mono pf-muted" style={{ fontSize: 11 }}>{price > 0 ? formatPrice(price) : "—"}</span>
                  <span className="pf-td pf-muted" style={{ fontSize: 11 }}>{timeAgo(tx.time)}</span>
                  <span className="pf-td" onClick={e => e.stopPropagation()}>
                    {tx.txHash ? <a href={`https://bscscan.com/tx/${tx.txHash}`} target="_blank" rel="noreferrer" className="pf-ext-link">{tx.txHash.slice(0, 6)}…<ExternalLinkIcon size={10} /></a> : <span className="pf-muted">—</span>}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

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
  if (loading) return <div className="pf-loading"><Spinner /><span>Loading deployed tokens...</span></div>;
  if (!rows.length) return <EmptyState text="No deployed tokens found for this wallet" />;
  return (
    <div className="pf-tab-body">
      <div className="pf-table">
        <div className="pf-thead pf-grid--deployed">
          {[
            { k: "symbol", l: "Token" },
            { k: "allTimeHigh", l: "ATH Price" },
            { k: "migrated", l: "Status" },
            { k: "address", l: "Contract" },
          ].map(({ k, l }) => (
            <button key={k} className={`pf-th ${sortK === k ? "pf-th--on" : ""}`} onClick={() => k !== "address" && doSort(k)}>
              {l}{sortK === k && <span className="pf-th-arrow">{sortD === "asc" ? "↑" : "↓"}</span>}
            </button>
          ))}
        </div>
        <div className="pf-tbody">
          {rows.map((t, i) => (
            <div key={t.address || i} className="pf-tr pf-grid--deployed pf-tr--click" onClick={() => onTrade(t.address)}>
              <div className="pf-td pf-token-cell">
                <TokenLogo symbol={t.symbol} logo={t.imageUrl} size={32} radius={8} />
                <div className="pf-token-meta">
                  <span className="pf-token-sym">{t.symbol || "?"}</span>
                  <span className="pf-mono pf-muted" style={{ fontSize: 10 }}>{t.name || truncateAddress(t.address)}</span>
                </div>
              </div>
              <span className="pf-td pf-mono" style={{ fontWeight: 700 }}>{t.allTimeHigh > 0 ? formatPrice(t.allTimeHigh) : "—"}</span>
              <span className="pf-td"><span className={`pf-status-chip ${t.migrated ? "pf-status-chip--migrated" : "pf-status-chip--active"}`}>{t.migrated ? "Migrated" : "Active"}</span></span>
              <div className="pf-td pf-contract-cell" onClick={e => e.stopPropagation()}>
                <span className="pf-mono pf-muted" style={{ fontSize: 11 }}>{truncateAddress(t.address)}</span>
                <a href={`https://bscscan.com/token/${t.address}`} target="_blank" rel="noreferrer" className="pf-ext-link"><ExternalLinkIcon size={11} /></a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Portfolio({ isConnected, onConnectClick, userProfile }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("holdings");
  const [userData, setUserData] = useState(null);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [rewards, setRewards] = useState(null);
  const [portfolioHistory, setPortfolioHistory] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [walletTxs, setWalletTxs] = useState([]);
  const [deployTokens, setDeployTokens] = useState([]);
  const [walletAddress, setWalletAddress] = useState(null);
  const [copied, setCopied] = useState(false);
  const [bnbBalance, setBnbBalance] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const me = await user.getMe();
      setUserData(me);
      const wallets = me.wallets || [];
      const primaryWallet = wallets[0];
      if (primaryWallet) {
        setWalletAddress(primaryWallet.address);
        const bnbBal = primaryWallet.balanceBNB ?? primaryWallet.balanceBnb ?? 0;
        setBnbBalance(bnbBal);
        const txsData = await walletsApi.getTransactions(primaryWallet.address, 500);
        const list = Array.isArray(txsData) ? txsData : (txsData?.transactions || []);
        const uniqueAddrs = [...new Set(list.map(tx => tx.tokenAddress || tx.token_address || "").filter(Boolean))];
        const tokenMap = {};
        await Promise.allSettled(uniqueAddrs.map(addr => tokensApi.getOne(addr).then(t => { tokenMap[addr.toLowerCase()] = t; }).catch(() => { })));
        const enriched = list.map(tx => {
          const addr = (tx.tokenAddress || tx.token_address || "").toLowerCase();
          const meta = tokenMap[addr];
          if (!meta) return tx;
          return { ...tx, symbol: meta.symbol || tx.symbol, logo: meta.imageUrl || tx.logo, name: meta.name || tx.name };
        });
        setWalletTxs(enriched);
        try {
          const overview = await walletsApi.getOverview(primaryWallet.address);
          setDeployTokens(overview?.deploy?.deployData || []);
        } catch { }
      }
      const trades = await trade.getHistory(50);
      setTradeHistory(trades.trades || []);
      const rewardsData = await trade.getRewards();
      setRewards(rewardsData);
      const hist = await user.getPortfolioHistory();
      const snapshots = hist.snapshots || [];
      setPortfolioHistory(snapshots);
      const values = snapshots.map(h => h.totalUsdt || 0);
      setChartData(values);
    } catch (err) {
      console.error("Portfolio fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    fetchData();
  }, [isConnected, fetchData]);

  const handleCopy = () => {
    if (walletAddress) navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleTrade = (tokenAddr) => {
    navigate(appendRef(`/trade/${tokenAddr}`));
  };

  const handleRefresh = () => {
    fetchData();
  };

  const tradeWinRate = useMemo(() => {
    if (!tradeHistory.length) return 0;
    const wins = tradeHistory.filter(t => Number(t.pnl || 0) > 0).length;
    return (wins / tradeHistory.length) * 100;
  }, [tradeHistory]);

  if (!isConnected) {
    return (
      <div className="pf-page">
        <div className="pf-empty">
          <WalletIcon size={36} />
          <h2>Connect Wallet</h2>
          <p>Login to access your portfolio dashboard.</p>
          <button className="pf-connect-btn" onClick={onConnectClick}>Connect Wallet</button>
        </div>
      </div>
    );
  }

  const tradingStats = userData?.trading || {};
  const behaviorStats = userData?.behavior || {};
  const totalPnl = Number(tradingStats.totalRealizedPnl || 0);
  const pnlColor = totalPnl >= 0 ? "#26a69a" : "#ef5350";
  const totalBalance = userData?.totalPortfolioValue || 0;
  const firstSeen = toMs(userData?.firstSeenAt);
  const lastActive = toMs(userData?.lastSeenAt);
  const activeWallets = userData?.wallets?.length || 0;
  const claimableRewards = rewards?.totalClaimable || 0;

  return (
    <div className="pf-page">
      <div className="pf-container">
        <div className="pf-header">
          <div className="pf-identity-row">
            <div className="pf-avatar-bnb">
              <div className="pf-avatar">
                <img src="/swanfi-logo.png" alt="wallet" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
              </div>
              <div className="pf-bnb-block">
                <div className="pf-bnb-icon-wrap">
                  <svg width="14" height="14" viewBox="0 0 32 32" fill="#F3BA2F">
                    <path d="M16 0L9.9 6.1 13.1 9.3 16 6.4 18.9 9.3 22.1 6.1zM6.1 9.9L0 16l6.1 6.1 3.2-3.2L6.1 16l3.2-3.2zM22.7 12.8L16 19.5l-6.7-6.7-3.2 3.2L16 26l9.9-9.9zM25.9 12.8l-3.2 3.2L25.9 19.2 32 16z" />
                  </svg>
                </div>
                <span className="pf-bnb-val">{bnbBalance.toFixed(4)}</span>
                <span className="pf-bnb-label">BNB</span>
              </div>
            </div>
            <div className="pf-identity-info">
              <div className="pf-addr-row">
                <span className="pf-addr pf-addr--full">{walletAddress}</span>
                <span className="pf-addr pf-addr--short">{truncateAddress(walletAddress)}</span>
                <button className="pf-icon-btn" onClick={handleCopy} title="Copy address">
                  {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                </button>
                <a href={`https://bscscan.com/address/${walletAddress}`} target="_blank" rel="noreferrer" className="pf-bscscan-link">
                  <IconExternal size={11} />
                  <span>BscScan</span>
                </a>
              </div>
              <div className="pf-addr-meta">
                <span className="pf-chip pf-chip--wallet">BSC Wallet</span>
                {firstSeen > 0 && <span className="pf-chip pf-chip--meta">Since {formatDate(firstSeen)}</span>}
                {lastActive > 0 && <span className="pf-chip pf-chip--meta">Active {timeAgo(lastActive)}</span>}
              </div>
            </div>
            <div className="pf-refresh-btn-wrap">
              <button className="pf-refresh-btn" onClick={handleRefresh} title="Refresh">
                <RefreshIcon size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="pf-stats-skeleton">{[...Array(8)].map((_, i) => <div key={i} className="pf-skel" />)}</div>
          ) : (
            <div className="pf-stats-row">
              <StatPill label="Total Value" value={formatUsd(totalBalance)} />
              <div className="pf-stats-div" />
              <StatPill label="Realized PnL" value={(totalPnl >= 0 ? "+" : "") + formatUsd(totalPnl)} color={pnlColor} />
              <div className="pf-stats-div" />
              <StatPill label="Buy Volume" value={formatUsd(tradingStats.buyVolumeUsd)} color="#26a69a" />
              <div className="pf-stats-div" />
              <StatPill label="Sell Volume" value={formatUsd(tradingStats.sellVolumeUsd)} color="#ef5350" />
              <div className="pf-stats-div" />
              <StatPill label="Total TXs" value={formatNumber(tradingStats.totalTxCount)} />
              <div className="pf-stats-div" />
              <StatPill label="Win Rate" value={tradeWinRate.toFixed(1) + "%"} />
              <div className="pf-stats-div" />
              <StatPill label="Active Wallets" value={activeWallets} />
              <div className="pf-stats-div" />
              <StatPill label="Claimable Rewards" value={formatUsd(claimableRewards)} />
            </div>
          )}
        </div>

        <div className="pf-chart-section">
          <div className="pf-chart-header">
            <span className="pf-chart-title">Portfolio Value History</span>
            <span className="pf-chart-sub">Last 30 days</span>
          </div>
          <div className="pf-chart-container">
            {chartData.length > 0 ? (
              <SparkChart data={chartData} color={totalPnl >= 0 ? "#4ade80" : "#ef5350"} />
            ) : (
              <div className="pf-chart-placeholder">No history data</div>
            )}
          </div>
        </div>

        <div className="pf-card">
          <div className="pf-tabbar">
            {[
              { k: "holdings", l: "Holdings", badge: walletTxs.length },
              { k: "activity", l: "Activity", badge: walletTxs.length },
              { k: "deployed", l: "Deployed Tokens", badge: deployTokens.length },
            ].map(({ k, l, badge }) => (
              <button key={k} className={`pf-tabbar-btn ${activeTab === k ? "pf-tabbar-btn--active" : ""}`} onClick={() => setActiveTab(k)}>
                {l}
                {badge > 0 && <span className="pf-tabbar-badge">{badge}</span>}
              </button>
            ))}
          </div>
          {activeTab === "holdings" && (
            <HoldingsTab txs={walletTxs} loading={loading && !walletTxs.length} onTrade={handleTrade} />
          )}
          {activeTab === "activity" && (
            <ActivityTab txs={walletTxs} loading={loading && !walletTxs.length} onTrade={handleTrade} />
          )}
          {activeTab === "deployed" && (
            <DeployedTab tokens={deployTokens} loading={loading} onTrade={handleTrade} />
          )}
        </div>
      </div>
    </div>
  );
}