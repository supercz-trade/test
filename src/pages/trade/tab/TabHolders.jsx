import { useState } from "react";
import { shortAddr, CopyBtn, Skeleton, IconExternal, RefreshBtn, WalletTooltip } from "./tabHelpers";
import WalletDetailPanel from "./WalletDetailPanel";
import { formatTokenAmount, formatPrice, formatUsd } from "../../../utils/format";
import "./tabs.css";

export default function TabHolders({
  holders, loadingHolders, fetchHolders,
  token, formatTokenAmount, formatPrice, formatUsd, currentPrice,
  onFilterAddr,
  onSwitchTab,
}) {
  const [selectedAddr, setSelectedAddr] = useState(null);

  const handleFilter = (address) => {
    onFilterAddr(address);
    onSwitchTab("activity");
  };

  const handleRowClick = (address) => {
    setSelectedAddr(prev => prev === address ? null : address);
  };

  const formatPnl = (val) => {
    if (val === null) return null;
    const abs = Math.abs(val);
    const sign = val < 0 ? "-" : "+";
    if (val === 0) return "$0";
    if (abs < 0.000001) return sign + "$" + abs.toExponential(2);
    if (abs < 0.01) return sign + "$" + abs.toFixed(6);
    if (abs < 1) return sign + "$" + abs.toFixed(4);
    return formatUsd(val);
  };

  // [FIXED] Get tokenAddress safely
  const tokenAddress = token?.tokenAddress ?? null;

  return (
    <div className="tr-panel-section">
      <div className="tr-panel-subbar">
        <span className="tr-subbar-info">
          {holders.length > 0 ? `Top ${holders.length} holders` : ""}
        </span>
        <RefreshBtn onClick={fetchHolders} />
      </div>
      <div className="tr-holders-table tr-table-scroll">
        {loadingHolders && holders.length === 0 ? (
          <div className="tr-loading-rows">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="tr-loading-row">
                <Skeleton w={20} h={12} /><Skeleton w={100} h={12} />
                <Skeleton w={55} h={12} /><Skeleton w={65} h={12} />
                <Skeleton w={55} h={12} /><Skeleton w={60} h={12} />
              </div>
            ))}
          </div>
        ) : (
          <>
            <table className="tr-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>WALLET</th>
                  <th>%</th>
                  <th>BALANCE</th>
                  <th>BUY / SELL</th>
                  <th>AVG BUY</th>
                  <th>REALIZED PNL</th>
                  <th>UNREALIZED PNL</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {holders.length === 0 ? (
                  <tr><td colSpan={9} className="tr-empty-row">No holder data</td></tr>
                ) : (
                  holders.map(h => {
                    const TOTAL_SUPPLY = token?.totalSupply || 1_000_000_000;
                    const pct = TOTAL_SUPPLY > 0 ? (Number(h.balance || 0) / TOTAL_SUPPLY) * 100 : 0;
                    const isDev = h.isDev || false;
                    const remainTokens = Math.max((h.buyTokens || 0) - (h.sellTokens || 0), 0);
                    const unrealizedPnl = (remainTokens > 0 && h.avgBuyPrice > 0 && currentPrice > 0)
                      ? (currentPrice - h.avgBuyPrice) * remainTokens
                      : null;
                    const isSelected = selectedAddr === h.holderAddress;
                    return (
                      <tr
                        key={h.holderAddress}
                        className="tr-holder-row"
                        onClick={() => handleRowClick(h.holderAddress)}
                        style={{
                          cursor: "pointer",
                          background: isSelected ? "var(--bg-elevated)" : undefined,
                        }}
                      >
                        <td className="tr-muted">{h.rank}</td>
                        <td>
                          <div className="tr-trader-cell">
                            <WalletTooltip address={h.holderAddress}>
                              <span className="tr-wallet" style={{ cursor: "pointer" }}>{shortAddr(h.holderAddress)}</span>
                            </WalletTooltip>
                            <CopyBtn text={h.holderAddress} />
                            {isDev && <span className="tr-holder-tag tr-holder-tag--dev">DEV</span>}
                            {h.isPaperhand && <span className="tr-holder-tag tr-holder-tag--paper">PAPER</span>}
                          </div>
                        </td>
                        <td>
                          <div className="tr-pct-bar-wrap">
                            <div className="tr-pct-bar-bg">
                              <div className="tr-pct-bar-fill" style={{ width: `${Math.min(pct * 3, 100)}%` }} />
                            </div>
                            <span className="tr-num">{pct.toFixed(2)}%</span>
                          </div>
                        </td>
                        <td className="tr-num">{formatTokenAmount(h.balance)}</td>
                        <td className="tr-num tr-muted">
                          <span className="tr-pos">{h.buyCount}B</span>{" / "}
                          <span className="tr-neg">{h.sellCount}S</span>
                        </td>
                        <td className="tr-num tr-muted">
                          {h.avgBuyPrice > 0 ? formatPrice(h.avgBuyPrice) : "—"}
                        </td>
                        <td className="tr-num" style={{ color: h.realizedPnl === 0 ? "var(--text-muted)" : h.realizedPnl > 0 ? "#26a69a" : "#ef5350" }}>
                          {h.realizedPnl !== 0 ? formatUsd(h.realizedPnl) : "—"}
                        </td>
                        <td className="tr-num" style={{ color: unrealizedPnl === null ? "var(--text-muted)" : unrealizedPnl > 0 ? "#26a69a" : unrealizedPnl < 0 ? "#ef5350" : "var(--text-muted)" }}>
                          {unrealizedPnl === null ? <span className="tr-muted">—</span> : formatPnl(unrealizedPnl)}
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={e => e.stopPropagation()}>
                            <a href={`https://bscscan.com/address/${h.holderAddress}`} target="_blank" rel="noreferrer" className="tr-scan-link">
                              <IconExternal />
                            </a>
                            <button
                              onClick={() => handleFilter(h.holderAddress)}
                              title="Filter activity by this address"
                              style={{
                                background: "none", border: "none", cursor: "pointer",
                                padding: "2px 3px", display: "flex", alignItems: "center",
                                borderRadius: 4, color: "var(--text-muted)", transition: "color 0.15s",
                              }}
                              onMouseEnter={e => (e.currentTarget.style.color = "#f97316")}
                              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
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
            <div className="tr-holder-card-list">
              {holders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: 13 }}>No holder data</div>
              ) : (
                holders.map(h => {
                  const TOTAL_SUPPLY = token?.totalSupply || 1_000_000_000;
                  const pct = TOTAL_SUPPLY > 0 ? (Number(h.balance || 0) / TOTAL_SUPPLY) * 100 : 0;
                  const isDev = h.isDev || false;
                  const remainTokens = Math.max((h.buyTokens || 0) - (h.sellTokens || 0), 0);
                  const unrealizedPnl = (remainTokens > 0 && h.avgBuyPrice > 0 && currentPrice > 0)
                    ? (currentPrice - h.avgBuyPrice) * remainTokens : null;
                  const upnlClass = unrealizedPnl === null ? "" : unrealizedPnl > 0 ? "tr-holder-card-val--pos" : unrealizedPnl < 0 ? "tr-holder-card-val--neg" : "";
                  const isSelected = selectedAddr === h.holderAddress;
                  return (
                    <div
                      key={h.holderAddress}
                      className="tr-holder-card"
                      onClick={() => handleRowClick(h.holderAddress)}
                      style={{ cursor: "pointer", background: isSelected ? "var(--bg-elevated)" : undefined }}
                    >
                      <div className="tr-holder-card-rank">{h.rank}</div>
                      <div className="tr-holder-card-body">
                        <div className="tr-holder-card-row">
                          <span className="tr-holder-card-lbl">Bal</span>
                          <span className="tr-holder-card-val">{formatTokenAmount(h.balance)}</span>
                          <div className="tr-holder-card-sep" />
                          <span className="tr-holder-card-lbl">%</span>
                          <div className="tr-pct-bar-wrap" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <div className="tr-pct-bar-bg" style={{ width: 36, height: 4 }}>
                              <div className="tr-pct-bar-fill" style={{ width: `${Math.min(pct * 3, 100)}%` }} />
                            </div>
                            <span className="tr-holder-card-val">{pct.toFixed(2)}%</span>
                          </div>
                        </div>
                        <div className="tr-holder-card-row">
                          <span className="tr-holder-card-lbl">Trades</span>
                          <span className="tr-holder-card-val">
                            <span className="tr-pos">{h.buyCount}B</span>
                            <span className="tr-muted"> / </span>
                            <span className="tr-neg">{h.sellCount}S</span>
                          </span>
                          <div className="tr-holder-card-sep" />
                          <span className="tr-holder-card-lbl">Avg</span>
                          <span className="tr-holder-card-val">{h.avgBuyPrice > 0 ? formatPrice(h.avgBuyPrice) : "—"}</span>
                        </div>
                        <div className="tr-holder-card-row">
                          <span className="tr-holder-card-lbl">R.PnL</span>
                          <span className={`tr-holder-card-val ${h.realizedPnl === 0 ? "" : h.realizedPnl > 0 ? "tr-holder-card-val--pos" : "tr-holder-card-val--neg"}`}>
                            {h.realizedPnl !== 0 ? formatUsd(h.realizedPnl) : "—"}
                          </span>
                          <div className="tr-holder-card-sep" />
                          <span className="tr-holder-card-lbl">U.PnL</span>
                          <span className={`tr-holder-card-val ${upnlClass}`}>
                            {unrealizedPnl === null ? "—" : formatPnl(unrealizedPnl)}
                          </span>
                        </div>
                        <div className="tr-holder-card-addr">
                          <WalletTooltip address={h.holderAddress}>
                            <span className="tr-wallet" style={{ fontSize: 10 }}>{shortAddr(h.holderAddress)}</span>
                          </WalletTooltip>
                          {isDev && <span className="tr-holder-tag tr-holder-tag--dev">DEV</span>}
                          {h.isPaperhand && <span className="tr-holder-tag tr-holder-tag--paper">PAPER</span>}
                          <CopyBtn text={h.holderAddress} />
                          <a href={`https://bscscan.com/address/${h.holderAddress}`} target="_blank" rel="noreferrer" className="tr-scan-link" onClick={e => e.stopPropagation()}>
                            <IconExternal />
                          </a>
                          <button
                            onClick={e => { e.stopPropagation(); handleFilter(h.holderAddress); }}
                            style={{
                              background: "none", border: "none", cursor: "pointer",
                              padding: "2px 3px", display: "flex", alignItems: "center",
                              borderRadius: 4, color: "var(--text-muted)", transition: "color 0.15s",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#f97316")}
                            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
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