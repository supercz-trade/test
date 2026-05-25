// src/pages/trade/Trade.jsx
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTrade } from "../../hooks/useTrade";
import { user as userApi } from "../../services/api";
import { STORAGE_KEYS } from "../../services/config";

import TradeHeader from "./TradeHeader";
import SidePanel from "./SidePanel";
import TradePanel from "./TradePanel";
import TradeNotif from "../../components/TradeNotif/TradeNotif";
import PageTitle from "../../components/PageTitle";
import TabActivity from "./tab/TabActivity";
import TabMyPosition from "./tab/TabMyPosition";
import TabHolders from "./tab/TabHolders";
import TabTopTraders from "./tab/TabTopTraders";
import TabDeployTokens from "./tab/TabDeployTokens";
import "./trade.css";

import ChartWindows from "../../components/chart/ChartWindows";

import {
  CopyIcon,
  ExternalLinkIcon,
  StarIcon,
  PanelIcon,
  TradeIcon,
  GlobeIcon,
  RefreshIcon,
  ChevronDownIcon,
  CloseIcon,
  SettingsIcon,
  SwapIcon1,
  GasIcon,
  WalletIcon,
  CoinIcon,
  BackIcon,
  CheckIcon,
  DragIcon,
} from "../../assets/icons";

import {
  formatUsd,
  formatTokenAmount,
  formatPrice,
  timeAgo,
  formatAge,
  truncateAddress,
  formatNumber,
  formatPercent,
  calcAge,
} from "../../utils/format";

function fmtTitleMC(n) {
  const v = Number(n || 0);
  if (!v) return null;
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return null;
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => { });
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button className="ti-copy-btn" onClick={copy} title="Copy">
      {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
    </button>
  );
}

const Icons = {
  Price: () => <SwapIcon1 size={13} />,
  MarketCap: () => <StarIcon size={13} />,
  Volume: () => <RefreshIcon size={13} />,
  Transactions: () => <SwapIcon1 size={13} />,
  Holders: () => <StarIcon size={13} />,
  Age: () => <RefreshIcon size={13} />,
  Platform: () => <GlobeIcon size={13} />,
  Supply: () => <CoinIcon size={13} />,
  Status: () => <CheckIcon size={13} />,
  Tax: () => <SettingsIcon size={13} />,
  Dev: () => <StarIcon size={13} />,
  PaperHand: () => <StarIcon size={13} />,
  Liquidity: () => <WalletIcon size={13} />,
  Website: () => <GlobeIcon size={13} />,
  Twitter: () => <StarIcon size={13} />,
  Telegram: () => <StarIcon size={13} />,
  Scan: () => <ExternalLinkIcon size={13} />,
  ExternalLink: () => <ExternalLinkIcon size={11} />,
  Contract: () => <CopyIcon size={13} />,
  About: () => <SettingsIcon size={13} />,
  Shield: () => <SettingsIcon size={13} />,
};

function StatCard({ icon: Icon, label, value, accent, loading, badge }) {
  return (
    <div className="ti-stat-card" data-accent={accent}>
      <div className="ti-stat-header">
        <span className="ti-stat-icon" data-accent={accent}><Icon /></span>
        <span className="ti-stat-label">{label}</span>
        {badge && <span className="ti-stat-badge" data-type={badge.type}>{badge.text}</span>}
      </div>
      <div className="ti-stat-value">
        {loading ? <span className="ti-pulse">···</span> : value}
      </div>
    </div>
  );
}

function RiskBar({ label, pct, color, icon: Icon }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const level = clamped < 10 ? "low" : clamped < 30 ? "medium" : "high";
  return (
    <div className="ti-risk-row">
      <div className="ti-risk-meta">
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {Icon && <span style={{ color: "#52525b", display: "flex" }}><Icon /></span>}
          <span className="ti-risk-label">{label}</span>
        </div>
        <span className={`ti-risk-pct ti-risk-${level}`}>
          {clamped > 0 ? `${clamped.toFixed(1)}%` : "—"}
        </span>
      </div>
      <div className="ti-risk-track">
        <div className="ti-risk-fill" style={{ width: `${clamped}%`, background: color }} />
      </div>
    </div>
  );
}

function SectionHead({ icon: Icon, title }) {
  return (
    <div className="ti-section-head">
      <span className="ti-section-icon"><Icon /></span>
      <span className="ti-section-title">{title}</span>
    </div>
  );
}

function taxLevel(pct) {
  if (pct <= 1) return { label: "Normal", color: "#22c55e", bg: "rgba(34,197,94,0.08)" };
  if (pct <= 3) return { label: "Low", color: "#86efac", bg: "rgba(134,239,172,0.08)" };
  if (pct <= 7) return { label: "Moderate", color: "#fbbf24", bg: "rgba(251,191,36,0.08)" };
  if (pct <= 15) return { label: "High", color: "#f97316", bg: "rgba(249,115,22,0.08)" };
  return { label: "Danger", color: "#ef4444", bg: "rgba(239,68,68,0.08)" };
}

function TokenInfoTab({ token, tokenAddress, loadingToken, formatUsd, formatTokenAmount, formatPrice, formatAge, price, marketcap, volume24h, txCount, holderCnt, devPct, paperPct, TOTAL_SUPPLY }) {
  const buyTax = (token?.tax?.buy ?? 0) + 1;
  const sellTax = (token?.tax?.sell ?? 0) + 1;
  const buyLevel = taxLevel(buyTax);
  const sellLevel = taxLevel(sellTax);
  const liq = token?.liquidity ?? token?.bondingLiquidity ?? null;
  const liqUsd = liq?.usd ?? 0;
  const liqBase = liq?.base ?? 0;
  const baseSym = token?.basePair ?? "BNB";

  return (
    <div className="ti-root">
      {token?.description && (
        <section className="ti-section">
          <SectionHead icon={Icons.About} title="About" />
          <p className="ti-about-text">{token.description}</p>
        </section>
      )}

      <section className="ti-section">
        <SectionHead icon={Icons.Contract} title="Contract Address" />
        <div className="ti-addr-row">
          <div className="ti-addr-chip">
            <span className="ti-addr-text">{tokenAddress}</span>
          </div>
          <CopyBtn text={tokenAddress} />
          <a href={`https://bscscan.com/token/${tokenAddress}`} target="_blank" rel="noreferrer" className="ti-addr-scan" title="View on BSCScan">
            <ExternalLinkIcon size={11} />
          </a>
        </div>
      </section>

      <section className="ti-section">
        <SectionHead icon={Icons.MarketCap} title="Market Stats" />
        <div className="ti-stats-grid">
          <StatCard icon={Icons.Price} label="Price" value={formatPrice(price)} accent="yellow" loading={loadingToken} />
          <StatCard icon={Icons.MarketCap} label="Market Cap" value={formatUsd(marketcap)} accent="purple" loading={loadingToken} />
          <StatCard icon={Icons.Volume} label="Volume 24h" value={formatUsd(volume24h)} accent="blue" loading={loadingToken} />
          <StatCard icon={Icons.Transactions} label="Transactions" value={txCount.toLocaleString()} accent="teal" loading={loadingToken} />
          <StatCard icon={Icons.Holders} label="Holders" value={holderCnt.toLocaleString()} accent="green" loading={loadingToken} />
          <StatCard icon={Icons.Supply} label="Total Supply" value={formatTokenAmount(TOTAL_SUPPLY)} accent="gray" loading={loadingToken} />
          <StatCard icon={Icons.Age} label="Age" value={formatAge(token?.launchTime)} accent="orange" loading={loadingToken} />
          <StatCard icon={Icons.Platform} label="Platform" value={token?.sourceFrom || "—"} accent="indigo" loading={loadingToken} />
          <StatCard icon={Icons.Status} label="Status" value={token?.migrated ? "Migrated" : "bonding"} accent={token?.migrated ? "teal" : "green"} loading={loadingToken} badge={token?.migrated ? { type: "migrated", text: "✓" } : { type: "bonding", text: "●" }} />
        </div>
      </section>

      {liqUsd > 0 && (
        <section className="ti-section">
          <SectionHead icon={Icons.Liquidity} title="Liquidity" />
          <div className="ti-stats-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <StatCard icon={Icons.Liquidity} label="USD Value" value={formatUsd(liqUsd)} accent="blue" loading={loadingToken} />
            <StatCard icon={Icons.Liquidity} label={baseSym} value={`${Number(liqBase).toFixed(4)} ${baseSym}`} accent="teal" loading={loadingToken} />
          </div>
        </section>
      )}

      <section className="ti-section">
        <SectionHead icon={Icons.Tax} title="Transaction Tax" />
        <div className="ti-tax-row">
          <div className="ti-tax-card ti-tax-buy" style={{ background: buyLevel.bg }}>
            <span className="ti-tax-label">Buy Tax</span>
            <span className="ti-tax-value" style={{ color: buyLevel.color }}>
              {loadingToken ? "···" : `${buyTax}%`}
            </span>
            <span className="ti-tax-level" style={{ color: buyLevel.color }}>{buyLevel.label}</span>
          </div>
          <div className="ti-tax-divider" />
          <div className="ti-tax-card ti-tax-sell" style={{ background: sellLevel.bg }}>
            <span className="ti-tax-label">Sell Tax</span>
            <span className="ti-tax-value" style={{ color: sellLevel.color }}>
              {loadingToken ? "···" : `${sellTax}%`}
            </span>
            <span className="ti-tax-level" style={{ color: sellLevel.color }}>{sellLevel.label}</span>
          </div>
        </div>
        <div className="ti-tax-note">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Includes 1% platform fee. Token contract tax: Buy {(token?.tax?.buy ?? 0)}% / Sell {(token?.tax?.sell ?? 0)}%
        </div>
      </section>

      <section className="ti-section">
        <SectionHead icon={Icons.Shield} title="Risk Assessment" />
        <div className="ti-risk-bars">
          <RiskBar label="Dev Holdings" pct={devPct} color="linear-gradient(90deg,#f87171,#fca5a5)" icon={Icons.Dev} />
          <RiskBar label="Paper Hands" pct={paperPct} color="linear-gradient(90deg,#fbbf24,#fde68a)" icon={Icons.PaperHand} />
        </div>
      </section>

      {(token?.website || token?.twitter || token?.telegram) && (
        <section className="ti-section ti-section--last">
          <SectionHead icon={Icons.Website} title="Links" />
          <div className="ti-links-row">
            {token.website && (
              <a href={token.website} target="_blank" rel="noreferrer" className="ti-link-btn ti-link-web">
                <GlobeIcon size={13} /><span>Website</span><ExternalLinkIcon size={11} />
              </a>
            )}
            {token.twitter && (
              <a href={token.twitter} target="_blank" rel="noreferrer" className="ti-link-btn ti-link-twitter">
                <StarIcon size={13} /><span>Twitter</span><ExternalLinkIcon size={11} />
              </a>
            )}
            {token.telegram && (
              <a href={token.telegram} target="_blank" rel="noreferrer" className="ti-link-btn ti-link-telegram">
                <StarIcon size={13} /><span>Telegram</span><ExternalLinkIcon size={11} />
              </a>
            )}
            <a href={`https://bscscan.com/token/${tokenAddress}`} target="_blank" rel="noreferrer" className="ti-link-btn ti-link-scan">
              <ExternalLinkIcon size={13} /><span>BSCScan</span><ExternalLinkIcon size={11} />
            </a>
          </div>
        </section>
      )}
    </div>
  );
}

function BottomPanel({ token, tokenAddress, liveStats, loadingToken, devInfo, transactions, filteredTx = [], loadingFilteredTx = false, holders, loadingTx, loadingHolders, fetchTransactions, fetchHolders, formatUsd, formatTokenAmount, formatPrice, formatAge, timeAgo, isConnected, refreshKey = 0, filterAddr, onFilterAddr, activeTab, onSetActiveTab, candleTimeFilter, onClearCandleFilter }) {
  const [txFilter, setTxFilter] = useState("all");

  const price = liveStats?.price ?? token?.priceUsdt ?? 0;
  const marketcap = liveStats?.marketcap ?? token?.marketCap ?? 0;
  const volume24h = liveStats?.volume24h ?? token?.volumeUsdt ?? 0;
  const txCount = liveStats?.txCount ?? token?.txCount ?? 0;
  const holderCnt = liveStats?.holderCount ?? token?.holderCount ?? 0;

  const ALL_TABS = [
    { key: "activity", label: "Activity", count: transactions.length || null, icon: <SwapIcon1 size={12} /> },
    { key: "position", label: "My Position", count: null, requiresAuth: true, icon: <WalletIcon size={12} /> },
    { key: "holders", label: "Holders", count: holderCnt > 0 ? holderCnt : null, icon: <StarIcon size={12} /> },
    { key: "top_traders", label: "Top Traders", count: null, icon: <StarIcon size={12} /> },
    { key: "dev", label: "Developer Tokens", count: null, icon: <StarIcon size={12} /> },
  ];

  const TABS = ALL_TABS.filter(t => !t.requiresAuth || isConnected);

  return (
    <div className="tr-bottom-panel">
      <div className="tr-bottom-tabs" style={{ display: "flex", alignItems: "stretch", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0a0a0c", padding: "0 4px", height: 38 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tr-btab ${activeTab === t.key ? "tr-btab--active" : ""}`}
            onClick={() => onSetActiveTab(t.key)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px", position: "relative" }}
          >
            <span style={{ opacity: activeTab === t.key ? 1 : 0.4, display: "flex", alignItems: "center", transition: "opacity 0.15s" }}>
              {t.icon}
            </span>
            <span>{t.label}</span>
            {t.count != null && t.count > 0 && (
              <span className="tr-btab-count">{t.count}</span>
            )}
            {t.key === "activity" && filterAddr && (
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f97316", flexShrink: 0, boxShadow: "0 0 6px rgba(249,115,22,0.6)" }} />
            )}
          </button>
        ))}
        <div className="tr-btab-spacer" />
      </div>

      <div className="tr-bottom-content">
        {activeTab === "activity" && (
          <TabActivity
            transactions={filterAddr ? filteredTx : transactions}
            loadingTx={filterAddr ? loadingFilteredTx : loadingTx}
            txFilter={txFilter}
            setTxFilter={setTxFilter}
            fetchTransactions={fetchTransactions}
            formatUsd={formatUsd}
            formatTokenAmount={formatTokenAmount}
            formatPrice={formatPrice}
            timeAgo={timeAgo}
            filterAddr={filterAddr}
            onFilterAddr={onFilterAddr}
            token={token}
            tokenAddress={tokenAddress}
            currentPrice={price}
            timeFilter={candleTimeFilter}
            onClearTimeFilter={onClearCandleFilter}
          />
        )}
        {activeTab === "position" && (
          <TabMyPosition
            token={token}
            tokenAddress={tokenAddress}
            currentPrice={price}
            transactions={transactions}
            formatUsd={formatUsd}
            formatTokenAmount={formatTokenAmount}
            formatPrice={formatPrice}
            timeAgo={timeAgo}
            refreshKey={refreshKey}
          />
        )}
        {activeTab === "holders" && (
          <TabHolders
            holders={holders}
            loadingHolders={loadingHolders}
            fetchHolders={fetchHolders}
            token={token}
            formatTokenAmount={formatTokenAmount}
            formatPrice={formatPrice}
            formatUsd={formatUsd}
            currentPrice={price}
            onFilterAddr={onFilterAddr}
            onSwitchTab={onSetActiveTab}
          />
        )}
        {activeTab === "top_traders" && (
          <TabTopTraders
            tokenAddress={tokenAddress}
            formatUsd={formatUsd}
            formatTokenAmount={formatTokenAmount}
            formatPrice={formatPrice}
            currentPrice={price}
            onFilterAddr={onFilterAddr}
            onSwitchTab={onSetActiveTab}
            filterAddr={filterAddr}
          />
        )}
        {activeTab === "dev" && (
          <TabDeployTokens devInfo={devInfo} token={token} />
        )}
      </div>
    </div>
  );
}

export default function Trade({ isConnected, onConnectClick, bnbBalance = "0.0000", walletId = null, onRefreshBalance = null }) {
  const { address: tokenAddress } = useParams();
  const navigate = useNavigate();

  // ======================= DUMMY ADDRESS DETECTION =======================
  const isDummy = tokenAddress && tokenAddress.toLowerCase() === "0x0000000000000000000000000000000000000000";

  // State hooks (used for both real and dummy, but dummy will have simplified render)
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth > 640);
  const [tradeOpen, setTradeOpen] = useState(true);
  const [notif, setNotif] = useState(null);
  const [filterAddr, setFilterAddr] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [bottomTab, setBottomTab] = useState("activity");
  const [candleTimeFilter, setCandleTimeFilter] = useState(null);
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.favorites ?? "sp_favorites") || "[]"); }
    catch { return []; }
  });

  // For real token, use useTrade hook; for dummy, use mock data
  let hookData = null;
  if (!isDummy) {
    hookData = useTrade(tokenAddress);
  }

  const {
    token,
    liveStats,
    transactions,
    filteredTx,
    holders,
    devInfo,
    loadingToken,
    loadingTx,
    loadingFilteredTx,
    loadingHolders,
    fetchTransactions,
    fetchTransactionsByWallet,
    fetchHolders,
    formatUsd: formatUsdHook,
    formatTokenAmount: formatTokenAmountHook,
    formatAge: formatAgeHook,
    formatPrice: formatPriceHook,
    timeAgo: timeAgoHook,
  } = hookData || {};

  useEffect(() => {
    if (!isDummy && filterAddr) {
      fetchTransactionsByWallet?.(filterAddr);
    }
  }, [filterAddr, fetchTransactionsByWallet, isDummy]);

  useEffect(() => {
    if (isDummy) return;
    if (!tokenAddress || !isConnected) {
      setTokenBalance(0);
      return;
    }
    userApi.getPosition(tokenAddress)
      .then(data => {
        const balance = Number(data?.holdings || 0);
        setTokenBalance(balance);
      })
      .catch(() => setTokenBalance(0));
  }, [tokenAddress, isConnected, refreshKey, isDummy]);

  const handleNotif = useCallback((n) => setNotif(n), []);
  const handleTradeSuccess = useCallback(() => {
    setRefreshKey(k => k + 1);
    onRefreshBalance?.();
  }, [onRefreshBalance]);

  const handleToggleFavorite = (tokenItem) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.tokenAddress === tokenItem.tokenAddress);
      const next = exists
        ? prev.filter(f => f.tokenAddress !== tokenItem.tokenAddress)
        : [...prev, tokenItem];
      localStorage.setItem(STORAGE_KEYS.favorites ?? "sp_favorites", JSON.stringify(next));
      return next;
    });
  };

  const handleSelectToken = (selectedToken) => {
    if (selectedToken?.tokenAddress) navigate(`/trade/${selectedToken.tokenAddress}`);
  };

  const tfToSeconds = (tf) => {
    const unit = tf.slice(-1);
    const val = parseInt(tf.slice(0, -1));
    switch (unit) {
      case 's': return val;
      case 'm': return val * 60;
      case 'h': return val * 3600;
      case 'd': return val * 86400;
      default: return 60;
    }
  };

  const handleCandleClick = (timestamp, tf) => {
    const seconds = tfToSeconds(tf);
    setCandleTimeFilter({ start: timestamp, end: timestamp + seconds, tf });
    setBottomTab("activity");
  };

  const handleFabClick = () => {
    if (isConnected) setTradeOpen(p => !p);
    else onConnectClick?.();
  };

  // ---------- DUMMY RENDER ----------
  if (isDummy) {
    const dummyToken = {
      symbol: "SWAN",
      name: "SwanFi Token",
      tokenAddress: "0x0000000000000000000000000000000000000000",
      imageUrl: "/main-logo-swan.png",
      sourceFrom: "SWANFI",
      totalSupply: 1_000_000_000,
      launchTime: new Date().toISOString(),
      tax: { buy: 0, sell: 0 },
      description: "This is a demo page. Select a real token from Discover.",
    };
    const dummyLiveStats = {
      price: 0,
      marketcap: 0,
      volume24h: 0,
      holderCount: 0,
      txCount: 0,
      devSupply: 0,
      top10Pct: 0,
      change1h: 0,
      mode: "bonding",
      progress: 0,
    };
    const dummyDevInfo = null;
    const dummyTransactions = [];
    const dummyHolders = [];

    const dummyFormatUsd = (v) => formatUsd(v);
    const dummyFormatTokenAmount = (v) => formatTokenAmount(v);
    const dummyFormatPrice = (v) => formatPrice(v);
    const dummyFormatAge = (t) => formatAge(t);
    const dummyTimeAgo = (t) => timeAgo(t);

    return (
      <div className="tr-page">
        <PageTitle title="SwanFi Trade" />
        <TradeHeader
          token={dummyToken}
          tokenAddress="0x0000000000000000000000000000000000000000"
          liveStats={dummyLiveStats}
          loadingToken={false}
          favorites={favorites}
          onToggleFavorite={() => {}}
          formatAge={dummyFormatAge}
          panelOpen={panelOpen}
          onTogglePanel={() => setPanelOpen(p => !p)}
          tradeOpen={tradeOpen}
          onToggleTrade={() => setTradeOpen(p => !p)}
          isConnected={isConnected}
          onConnectClick={onConnectClick}
          bnbBalance={bnbBalance}
          walletId={walletId}
          tokenBalance={0}
          onNotif={handleNotif}
          onTradeSuccess={handleTradeSuccess}
          devInfo={dummyDevInfo}
        />
        <div className="tr-body">
          <SidePanel
            open={panelOpen}
            activeTokenAddress="0x0dead"
            favorites={favorites}
            onSelectToken={handleSelectToken}
            onClose={() => setPanelOpen(false)}
          />
          <div className="tr-left-col">
            <div className="tr-chart-box" style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No chart data for token
            </div>
            <BottomPanel
              token={dummyToken}
              tokenAddress="0x0000000000000000000000000000000000000000"
              liveStats={dummyLiveStats}
              loadingToken={false}
              devInfo={dummyDevInfo}
              transactions={dummyTransactions}
              filteredTx={[]}
              loadingFilteredTx={false}
              holders={dummyHolders}
              loadingTx={false}
              loadingHolders={false}
              fetchTransactions={() => {}}
              fetchHolders={() => {}}
              formatUsd={dummyFormatUsd}
              formatTokenAmount={dummyFormatTokenAmount}
              formatPrice={dummyFormatPrice}
              formatAge={dummyFormatAge}
              timeAgo={dummyTimeAgo}
              isConnected={isConnected}
              refreshKey={refreshKey}
              filterAddr={filterAddr}
              onFilterAddr={setFilterAddr}
              activeTab={bottomTab}
              onSetActiveTab={setBottomTab}
              candleTimeFilter={candleTimeFilter}
              onClearCandleFilter={() => setCandleTimeFilter(null)}
            />
            <button
              className={`tr-trade-fab${tradeOpen && isConnected ? " active" : ""}`}
              onClick={handleFabClick}
              aria-label="Trade"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M15 15.5C15 19.09 12.09 22 8.5 22C4.91 22 2 19.09 2 15.5C2 11.91 4.91 9 8.5 9C8.67 9 8.85 9.01 9.02 9.02C12.19 9.27 14.73 11.81 14.98 14.98C14.99 15.15 15 15.33 15 15.5Z" fill="currentColor" />
                <path d="M22.0001 8.5C22.0001 11.76 19.6001 14.45 16.4801 14.92V14.86C16.1701 10.98 13.0201 7.83 9.11008 7.52H9.08008C9.55008 4.4 12.2401 2 15.5001 2C19.0901 2 22.0001 4.91 22.0001 8.5Z" fill="currentColor" />
                <path d="M5.59 2H3C2.45 2 2 2.45 2 3V5.59C2 6.48 3.08 6.93 3.71 6.3L6.3 3.71C6.92 3.08 6.48 2 5.59 2Z" fill="currentColor" />
                <path d="M18.4097 22.0003H20.9997C21.5497 22.0003 21.9997 21.5503 21.9997 21.0003V18.4103C21.9997 17.5203 20.9197 17.0703 20.2897 17.7003L17.6997 20.2903C17.0797 20.9203 17.5197 22.0003 18.4097 22.0003Z" fill="currentColor" />
              </svg>
              <span>{isConnected ? "Trade" : "Login"}</span>
            </button>
            {tradeOpen && isConnected && (
              <div className="tr-trade-sheet-backdrop" onClick={() => setTradeOpen(false)} />
            )}
            {tradeOpen && isConnected && (
              <div className="tr-trade-sheet">
                <div className="tr-trade-sheet-handle"><div className="tr-trade-sheet-bar" /></div>
                <TradePanel
                  token={dummyToken}
                  onClose={() => setTradeOpen(false)}
                  mobile
                  bnbBalance={bnbBalance}
                  walletId={walletId}
                  tokenBalance={0}
                  onNotif={handleNotif}
                  onTradeSuccess={handleTradeSuccess}
                />
              </div>
            )}
          </div>
        </div>
        <TradeNotif notif={notif} onDismiss={() => setNotif(null)} onAction={() => navigate("/referral")} />
      </div>
    );
  }

  // ---------- REAL TOKEN RENDER ----------
  if (!tokenAddress) {
    return (
      <div className="tr-empty">
        <p>No token selected.</p>
        <button className="tr-back-btn" onClick={() => navigate("/discover")}>
          ← Back to Discover
        </button>
      </div>
    );
  }

  const mc = fmtTitleMC(liveStats?.marketcap ?? token?.marketCap);
  const tradeTitle = token?.symbol
    ? token.symbol + (mc ? " " + mc : "") + " - BSC Trade"
    : "BSC Trade";

  return (
    <div className="tr-page">
      <PageTitle title={tradeTitle} />

      <TradeHeader
        token={token}
        tokenAddress={tokenAddress}
        liveStats={liveStats}
        loadingToken={loadingToken}
        formatAge={formatAgeHook}
        favorites={favorites}
        onToggleFavorite={handleToggleFavorite}
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen(p => !p)}
        tradeOpen={tradeOpen}
        onToggleTrade={() => setTradeOpen(p => !p)}
        isConnected={isConnected}
        onConnectClick={onConnectClick}
        bnbBalance={bnbBalance}
        walletId={walletId}
        tokenBalance={tokenBalance}
        onNotif={handleNotif}
        onTradeSuccess={handleTradeSuccess}
        devInfo={devInfo}
      />

      <div className="tr-body">
        <SidePanel
          open={panelOpen}
          activeTokenAddress={tokenAddress}
          favorites={favorites}
          onSelectToken={handleSelectToken}
          onClose={() => setPanelOpen(false)}
        />

        <div className="tr-left-col">
          <div className="tr-chart-box">
            <ChartWindows
              tokenAddress={tokenAddress}
              tokenSymbol={token?.symbol}
              totalSupply={token?.totalSupply ?? 0}
              filterAddr={filterAddr}
              onSubIndCountChange={() => {}}
              token={token}
              liveStats={liveStats}
              onCandleClick={handleCandleClick}
            />
          </div>

          <BottomPanel
            token={token}
            tokenAddress={tokenAddress}
            liveStats={liveStats}
            loadingToken={loadingToken}
            devInfo={devInfo}
            transactions={transactions}
            filteredTx={filteredTx}
            loadingFilteredTx={loadingFilteredTx}
            holders={holders}
            loadingTx={loadingTx}
            loadingHolders={loadingHolders}
            fetchTransactions={fetchTransactions}
            fetchHolders={fetchHolders}
            formatUsd={formatUsdHook}
            formatTokenAmount={formatTokenAmountHook}
            formatPrice={formatPriceHook}
            formatAge={formatAgeHook}
            timeAgo={timeAgoHook}
            isConnected={isConnected}
            refreshKey={refreshKey}
            filterAddr={filterAddr}
            onFilterAddr={setFilterAddr}
            activeTab={bottomTab}
            onSetActiveTab={setBottomTab}
            candleTimeFilter={candleTimeFilter}
            onClearCandleFilter={() => setCandleTimeFilter(null)}
          />

          <button
            className={`tr-trade-fab${tradeOpen && isConnected ? " active" : ""}`}
            onClick={handleFabClick}
            aria-label="Trade"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 15.5C15 19.09 12.09 22 8.5 22C4.91 22 2 19.09 2 15.5C2 11.91 4.91 9 8.5 9C8.67 9 8.85 9.01 9.02 9.02C12.19 9.27 14.73 11.81 14.98 14.98C14.99 15.15 15 15.33 15 15.5Z" fill="currentColor" />
              <path d="M22.0001 8.5C22.0001 11.76 19.6001 14.45 16.4801 14.92V14.86C16.1701 10.98 13.0201 7.83 9.11008 7.52H9.08008C9.55008 4.4 12.2401 2 15.5001 2C19.0901 2 22.0001 4.91 22.0001 8.5Z" fill="currentColor" />
              <path d="M5.59 2H3C2.45 2 2 2.45 2 3V5.59C2 6.48 3.08 6.93 3.71 6.3L6.3 3.71C6.92 3.08 6.48 2 5.59 2Z" fill="currentColor" />
              <path d="M18.4097 22.0003H20.9997C21.5497 22.0003 21.9997 21.5503 21.9997 21.0003V18.4103C21.9997 17.5203 20.9197 17.0703 20.2897 17.7003L17.6997 20.2903C17.0797 20.9203 17.5197 22.0003 18.4097 22.0003Z" fill="currentColor" />
            </svg>
            <span>{isConnected ? "Trade" : "Login"}</span>
          </button>

          {tradeOpen && isConnected && (
            <div className="tr-trade-sheet-backdrop" onClick={() => setTradeOpen(false)} />
          )}
          {tradeOpen && isConnected && (
            <div className="tr-trade-sheet">
              <div className="tr-trade-sheet-handle"><div className="tr-trade-sheet-bar" /></div>
              <TradePanel
                token={token}
                onClose={() => setTradeOpen(false)}
                mobile
                bnbBalance={bnbBalance}
                walletId={walletId}
                tokenBalance={tokenBalance}
                onNotif={handleNotif}
                onTradeSuccess={handleTradeSuccess}
              />
            </div>
          )}
        </div>
      </div>

      <TradeNotif notif={notif} onDismiss={() => setNotif(null)} onAction={() => navigate("/referral")} />
    </div>
  );
}