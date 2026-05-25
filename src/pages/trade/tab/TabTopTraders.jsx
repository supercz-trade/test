import { useState, useEffect, useCallback } from "react";
import { shortAddr, CopyBtn, IconExternal, Skeleton, WalletTooltip } from "./tabHelpers";
import { tokens as tokensApi } from "../../../services/api";
import WalletDetailPanel from "./WalletDetailPanel";
import { formatUsd, formatTokenAmount, formatPrice } from "../../../utils/format";
import "./tabs.css";

const MEDALS = ["🥇", "🥈", "🥉"];
const SORT_OPTIONS = [
  { key: "realized_pnl", label: "PnL" },
  { key: "volume",       label: "Volume" },
  { key: "buy_count",    label: "Buys" },
  { key: "sell_count",   label: "Sells" },
];

export default function TabTopTraders({
  tokenAddress,
  token,
  formatUsd,
  formatTokenAmount,
  formatPrice,
  currentPrice,
  onFilterAddr,
  onSwitchTab,
  filterAddr,
}) {
  const [traders, setTraders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("realized_pnl");
  const [selectedAddr, setSelectedAddr] = useState(null);

  const fetchTraders = useCallback(async () => {
    if (!tokenAddress) return;
    setLoading(true);
    try {
      const data = await tokensApi.getTopTraders(tokenAddress, 50, sort);
      setTraders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[TabTopTraders]", err.message);
      setTraders([]);
    } finally {
      setLoading(false);
    }
  }, [tokenAddress, sort]);

  useEffect(() => {
    fetchTraders();
  }, [fetchTraders]);

  const handleFilter = (wallet) => {
  if (wallet) {
    onFilterAddr(wallet.toLowerCase());
  } else {
    onFilterAddr(null);
  }
  onSwitchTab("activity");
};

  const handleRowClick = (wallet) => {
    setSelectedAddr(prev => prev === wallet ? null : wallet);
  };

  const formatPnl = (val) => {
    if (val === null || val === undefined) return null;
    const abs = Math.abs(val);
    const sign = val < 0 ? "-" : "+";
    if (abs === 0) return "$0";
    if (abs < 0.000001) return sign + "$" + abs.toExponential(2);
    if (abs < 0.01) return sign + "$" + abs.toFixed(6);
    if (abs < 1) return sign + "$" + abs.toFixed(4);
    return formatUsd(val);
  };

  return (
    <div className="tr-panel-section">
      <div className="tr-panel-subbar">
        <span className="tr-subbar-info">
          {traders.length > 0 ? `${traders.length} traders` : ""}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {SORT_OPTIONS.map(o => (
            <button
              key={o.key}
              onClick={() => setSort(o.key)}
              className={`tr-filter-pill${sort === o.key ? " tr-filter-pill--active" : ""}`}
            >
              {o.label}
            </button>
          ))}
          <button
            onClick={fetchTraders}
            style={{
              background: "none", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6, cursor: "pointer", padding: "3px 7px",
              color: "#52525b", display: "flex", alignItems: "center", transition: "color 0.15s",
            }}
            title="Refresh"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="tr-toptraders-table tr-table-scroll">
        {loading && traders.length === 0 ? (
          <div className="tr-loading-rows">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="tr-loading-row">
                <Skeleton w={20} h={12} /><Skeleton w={100} h={12} />
                <Skeleton w={60} h={12} /><Skeleton w={60} h={12} />
                <Skeleton w={70} h={12} /><Skeleton w={70} h={12} />
              </div>
            ))}
          </div>
        ) : (
          <>
            <table className="tr-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>TRADER</th>
                  <th>BUY</th>
                  <th>SELL</th>
                  <th>BALANCE</th>
                  <th>AVG BUY</th>
                  <th>AVG SELL</th>
                  <th>REALIZED PNL</th>
                  <th>UNREALIZED PNL</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {traders.length === 0 ? (
                  <tr><td colSpan={10} className="tr-empty-row">No trader data yet</td></tr>
                ) : (
                  traders.map((h, i) => {
                    const remainTokens = Math.max((h.buyTokens || 0) - (h.sellTokens || 0), 0);
                    const unrealizedPnl = (h.balance > 0 && h.avgBuyPrice > 0 && currentPrice > 0)
                      ? (currentPrice - h.avgBuyPrice) * Math.min(h.balance, remainTokens)
                      : null;
                    const isExited = h.balance <= 0;
                    const isFiltered = filterAddr === h.wallet;
                    const isSelected = selectedAddr === h.wallet;
                    return (
                      <tr
                        key={h.wallet}
                        className="tr-holder-row"
                        onClick={() => handleRowClick(h.wallet)}
                        style={{
                          cursor: "pointer",
                          background: isSelected ? "rgba(255,255,255,0.04)" : undefined,
                        }}
                      >
                        <td><span className="tr-rank">{i < 3 ? MEDALS[i] : i + 1}</span></td>
                        <td>
                          <div className="tr-trader-cell">
                            <WalletTooltip address={h.wallet}>
                              <span className="tr-wallet" style={{ cursor: "pointer" }}>{shortAddr(h.wallet)}</span>
                            </WalletTooltip>
                            <CopyBtn text={h.wallet} />
                            {h.isDev && <span className="tr-holder-tag tr-holder-tag--dev">DEV</span>}
                            {h.tagAddress && <span className="tr-tag">{h.tagAddress}</span>}
                            {h.isPaperhand && <span className="tr-holder-tag tr-holder-tag--paper">PAPER</span>}
                          </div>
                        </td>
                        <td>
                          <div className="tr-vol-col">
                            <span className="tr-pos tr-num">{h.buyCount}×</span>
                            <span className="tr-muted tr-num-sm">{formatUsd(h.buyUsd)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="tr-vol-col">
                            <span className="tr-neg tr-num">{h.sellCount}×</span>
                            <span className="tr-muted tr-num-sm">{formatUsd(h.sellUsd)}</span>
                          </div>
                        </td>
                        <td className="tr-num">
                          {isExited ? <span className="tr-status tr-status--exit">Exited</span> : formatTokenAmount(h.balance)}
                        </td>
                        <td className="tr-num tr-muted">
                          {h.avgBuyPrice > 0 ? formatPrice(h.avgBuyPrice) : "—"}
                        </td>
                        <td className="tr-num tr-muted">
                          {h.avgSellPrice > 0 ? formatPrice(h.avgSellPrice) : "—"}
                        </td>
                        <td className="tr-num" style={{ color: h.realizedPnl === 0 ? "var(--text-muted)" : h.realizedPnl > 0 ? "#26a69a" : "#ef5350" }}>
                          {h.realizedPnl !== 0 ? formatUsd(h.realizedPnl) : "—"}
                        </td>
                        <td className={`tr-num ${unrealizedPnl === null ? "tr-muted" : unrealizedPnl > 0 ? "tr-pos" : unrealizedPnl < 0 ? "tr-neg" : "tr-muted"}`}>
                          {unrealizedPnl === null ? <span className="tr-muted">—</span> : formatPnl(unrealizedPnl)}
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={e => e.stopPropagation()}>
                            <a href={`https://bscscan.com/address/${h.wallet}`} target="_blank" rel="noreferrer" className="tr-scan-link">
                              <IconExternal />
                            </a>
                            <button
                              onClick={() => handleFilter(h.wallet)}
                              title={isFiltered ? "Clear filter" : "Filter activity by this address"}
                              style={{
                                background: isFiltered ? "rgba(251,191,36,0.15)" : "none",
                                border: "none", cursor: "pointer", padding: "2px 3px",
                                display: "flex", alignItems: "center", borderRadius: 4,
                                color: isFiltered ? "#fbbf24" : "#3f3f46", transition: "color 0.15s",
                              }}
                              onMouseEnter={e => { if (!isFiltered) e.currentTarget.style.color = "#f97316"; }}
                              onMouseLeave={e => { if (!isFiltered) e.currentTarget.style.color = "#3f3f46"; }}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                                <path fillRule="evenodd" clipRule="evenodd" d="M5.78584 3C4.24726 3 3 4.24726 3 5.78584C3 6.59295 3.28872 7.37343 3.81398 7.98623L6.64813 11.2927C7.73559 12.5614 8.33333 14.1773 8.33333 15.8483V18C8.33333 19.6569 9.67648 21 11.3333 21H12.6667C14.3235 21 15.6667 19.6569 15.6667 18V15.8483C15.6667 14.1773 16.2644 12.5614 17.3519 11.2927L20.186 7.98624C20.7113 7.37343 21 6.59294 21 5.78584C21 4.24726 19.7527 3 18.2142 3H5.78584Z"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Mobile card list */}
            <div className="tr-trader-card-list">
              {traders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#3f3f46", fontSize: 13 }}>No trader data yet</div>
              ) : (
                traders.map((h, i) => {
                  const remainTokens = Math.max((h.buyTokens || 0) - (h.sellTokens || 0), 0);
                  const unrealizedPnl = (h.balance > 0 && h.avgBuyPrice > 0 && currentPrice > 0)
                    ? (currentPrice - h.avgBuyPrice) * Math.min(h.balance, remainTokens) : null;
                  const isExited = h.balance <= 0;
                  const isSelected = selectedAddr === h.wallet;
                  const upnlClass = unrealizedPnl === null ? "" : unrealizedPnl > 0 ? "tr-trader-card-val--pos" : unrealizedPnl < 0 ? "tr-trader-card-val--neg" : "";
                  return (
                    <div
                      key={h.wallet}
                      className="tr-trader-card"
                      onClick={() => handleRowClick(h.wallet)}
                      style={{ cursor: "pointer", background: isSelected ? "rgba(255,255,255,0.04)" : undefined }}
                    >
                      <div className="tr-trader-card-rank">{i < 3 ? MEDALS[i] : i + 1}</div>
                      <div className="tr-trader-card-body">
                        <div className="tr-trader-card-row">
                          <span className="tr-trader-card-lbl">Buy</span>
                          <span className="tr-trader-card-val">
                            <span className="tr-pos">{h.buyCount}×</span>
                            <span className="tr-muted" style={{ fontSize: 10 }}> {formatUsd(h.buyUsd)}</span>
                          </span>
                          <div className="tr-trader-card-sep" />
                          <span className="tr-trader-card-lbl">Sell</span>
                          <span className="tr-trader-card-val">
                            <span className="tr-neg">{h.sellCount}×</span>
                            <span className="tr-muted" style={{ fontSize: 10 }}> {formatUsd(h.sellUsd)}</span>
                          </span>
                        </div>
                        <div className="tr-trader-card-row">
                          <span className="tr-trader-card-lbl">Bal</span>
                          <span className="tr-trader-card-val">
                            {isExited ? <span className="tr-status tr-status--exit">Exited</span> : formatTokenAmount(h.balance)}
                          </span>
                          <div className="tr-trader-card-sep" />
                          <span className="tr-trader-card-lbl">Avg B</span>
                          <span className="tr-trader-card-val">{h.avgBuyPrice > 0 ? formatPrice(h.avgBuyPrice) : "—"}</span>
                        </div>
                        <div className="tr-trader-card-row">
                          <span className="tr-trader-card-lbl">Avg S</span>
                          <span className="tr-trader-card-val">{h.avgSellPrice > 0 ? formatPrice(h.avgSellPrice) : "—"}</span>
                          <div className="tr-trader-card-sep" />
                          <span className="tr-trader-card-lbl">R.PnL</span>
                          <span className={`tr-trader-card-val ${h.realizedPnl === 0 ? "" : h.realizedPnl > 0 ? "tr-trader-card-val--pos" : "tr-trader-card-val--neg"}`}>
                            {h.realizedPnl !== 0 ? formatUsd(h.realizedPnl) : "—"}
                          </span>
                        </div>
                        <div className="tr-trader-card-row">
                          <span className="tr-trader-card-lbl">U.PnL</span>
                          <span className={`tr-trader-card-val ${upnlClass}`}>
                            {unrealizedPnl === null ? "—" : formatPnl(unrealizedPnl)}
                          </span>
                        </div>
                        <div className="tr-trader-card-addr">
                          <WalletTooltip address={h.wallet}>
                            <span className="tr-wallet" style={{ fontSize: 10 }}>{shortAddr(h.wallet)}</span>
                          </WalletTooltip>
                          {h.isDev && <span className="tr-holder-tag tr-holder-tag--dev">DEV</span>}
                          {h.tagAddress && <span className="tr-tag">{h.tagAddress}</span>}
                          <CopyBtn text={h.wallet} />
                          <a href={`https://bscscan.com/address/${h.wallet}`} target="_blank" rel="noreferrer" className="tr-scan-link" onClick={e => e.stopPropagation()}>
                            <IconExternal />
                          </a>
                          <button
                            onClick={e => { e.stopPropagation(); handleFilter(h.wallet); }}
                            style={{
                              background: "none", border: "none", cursor: "pointer",
                              padding: "2px 3px", display: "flex", alignItems: "center",
                              borderRadius: 4, color: "#3f3f46",
                            }}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                              <path fillRule="evenodd" clipRule="evenodd" d="M5.78584 3C4.24726 3 3 4.24726 3 5.78584C3 6.59295 3.28872 7.37343 3.81398 7.98623L6.64813 11.2927C7.73559 12.5614 8.33333 14.1773 8.33333 15.8483V18C8.33333 19.6569 9.67648 21 11.3333 21H12.6667C14.3235 21 15.6667 19.6569 15.6667 18V15.8483C15.6667 14.1773 16.2644 12.5614 17.3519 11.2927L20.186 7.98624C20.7113 7.37343 21 6.59294 21 5.78584C21 4.24726 19.7527 3 18.2142 3H5.78584Z"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* Wallet Detail Panel */}
      {selectedAddr && (
        <WalletDetailPanel
          address={selectedAddr}
          tokenAddress={tokenAddress}
          token={token}
          currentPrice={currentPrice}
          formatPrice={formatPrice}
          formatTokenAmount={formatTokenAmount}
          onClose={() => setSelectedAddr(null)}
        />
      )}
    </div>
  );
}