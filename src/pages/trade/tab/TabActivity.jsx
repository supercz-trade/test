// src/pages/trade/tab/TabActivity.jsx

import { useState, useEffect, useRef, useMemo } from "react";
import { useTick, shortAddr, CopyBtn, Skeleton, IconExternal, BasePairIcon, WalletTooltip } from "./tabHelpers";
import WalletDetailPanel from "./WalletDetailPanel";
import { timeAgo, formatUsd, formatTokenAmount, formatPrice } from "../../../utils/format";
import "./tabs.css";

function toSeconds(ts) {
  if (!ts) return 0;
  const num = Number(ts);
  return num > 1e12 ? Math.floor(num / 1000) : num;
}

export default function TabActivity({
  transactions,
  loadingTx,
  txFilter,
  setTxFilter,
  fetchTransactions,
  formatUsd,
  formatTokenAmount,
  formatPrice,
  timeAgo,
  filterAddr,
  onFilterAddr,
  token,
  tokenAddress,
  currentPrice,
  timeFilter,          // { start, end, tf }
  onClearTimeFilter,
}) {
  useTick(1000);
  const [valueMode, setValueMode] = useState("usd");
  const [priceMode, setPriceMode] = useState("price");
  const [selectedAddr, setSelectedAddr] = useState(null);

  // Apply time filter (candle range) to transactions
  const filteredByTime = useMemo(() => {
    if (!timeFilter || !transactions.length) return transactions;
    const { start, end } = timeFilter;
    return transactions.filter(tx => {
      const txTimeSec = toSeconds(tx.time);
      return txTimeSec >= start && txTimeSec <= end;
    });
  }, [transactions, timeFilter]);

  // Combine with address filter
  const filtered = filterAddr
    ? filteredByTime.filter(tx => tx.wallet?.toLowerCase() === filterAddr.toLowerCase())
    : filteredByTime;

  const seenHashes = useRef(new Set());
  const [newHashes, setNewHashes] = useState(new Set());

  useEffect(() => {
    const incoming = transactions.map(tx => tx.txHash);
    const fresh = incoming.filter(h => !seenHashes.current.has(h));
    if (fresh.length === 0) return;
    setNewHashes(prev => new Set([...prev, ...fresh]));
    const timer = setTimeout(() => {
      setNewHashes(prev => {
        const next = new Set(prev);
        fresh.forEach(h => next.delete(h));
        return next;
      });
    }, 600);
    fresh.forEach(h => seenHashes.current.add(h));
    return () => clearTimeout(timer);
  }, [transactions]);

  const handleRowClick = (wallet) => {
    setSelectedAddr(prev => prev === wallet ? null : wallet);
  };

  return (
    <div className="tr-panel-section">
      {/* Subbar with filter indicators */}
      <div className="tr-panel-subbar">
        <span className="tr-subbar-info">
          {timeFilter && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginRight: 8 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {new Date(timeFilter.start * 1000).toLocaleTimeString()} – {new Date(timeFilter.end * 1000).toLocaleTimeString()} ({timeFilter.tf})
              <button
                onClick={onClearTimeFilter}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                title="Clear time filter"
              >
                ✕
              </button>
            </span>
          )}
          {filterAddr && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M5.78584 3C4.24726 3 3 4.24726 3 5.78584C3 6.59295 3.28872 7.37343 3.81398 7.98623L6.64813 11.2927C7.73559 12.5614 8.33333 14.1773 8.33333 15.8483V18C8.33333 19.6569 9.67648 21 11.3333 21H12.6667C14.3235 21 15.6667 19.6569 15.6667 18V15.8483C15.6667 14.1773 16.2644 12.5614 17.3519 11.2927L20.186 7.98624C20.7113 7.37343 21 6.59294 21 5.78584C21 4.24726 19.7527 3 18.2142 3H5.78584Z" />
              </svg>
              {shortAddr(filterAddr)}
              <button
                onClick={() => onFilterAddr(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                title="Clear address filter"
              >
                ✕
              </button>
            </span>
          )}
        </span>
      </div>

      <div className="tr-activity-table tr-table-scroll">
        {loadingTx && transactions.length === 0
          ? <div className="tr-loading-rows">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="tr-loading-row">
                  <Skeleton w={28} h={12} /><Skeleton w={52} h={18} />
                  <Skeleton w={85} h={12} /><Skeleton w={60} h={12} />
                  <Skeleton w={60} h={12} /><Skeleton w={55} h={12} />
                </div>
              ))}
            </div>
          : <>
              <table className="tr-table">
                <colgroup>
                  <col className="col-age"/>
                  <col className="col-type"/>
                  <col className="col-price"/>
                  <col className="col-amount"/>
                  <col className="col-value"/>
                  <col className="col-trader"/>
                </colgroup>
                <thead>
                  <tr>
                    <th>AGE</th>
                    <th>TYPE</th>
                    <th>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span>{priceMode === "price" ? "PRICE" : "MCAP"}</span>
                        <button
                          onClick={() => setPriceMode(m => m === "price" ? "mcap" : "price")}
                          title={priceMode === "price" ? "Switch to Market Cap" : "Switch to Price"}
                          style={{
                            background: "var(--border-subtle)", border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 3, cursor: "pointer", display: "flex", alignItems: "center",
                            justifyContent: "center", width: 15, height: 15, padding: 0,
                            color: priceMode === "price" ? "#a78bfa" : "#34d399", flexShrink: 0,
                            transition: "color 0.15s, background 0.15s",
                          }}>
                          {priceMode === "price"
                            ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M21.8839 9.38388C22.372 8.89573 22.372 8.10427 21.8839 7.61612C21.3957 7.12796 20.6043 7.12796 20.1161 7.61612L21.8839 9.38388ZM18 11.5L17.1161 12.3839C17.3505 12.6183 17.6685 12.75 18 12.75C18.3315 12.75 18.6495 12.6183 18.8839 12.3839L18 11.5ZM15.8839 7.61612C15.3957 7.12796 14.6043 7.12796 14.1161 7.61612C13.628 8.10427 13.628 8.89573 14.1161 9.38388L15.8839 7.61612ZM4.75 8.5C4.75 9.19036 5.30964 9.75 6 9.75C6.69036 9.75 7.25 9.19036 7.25 8.5L4.75 8.5ZM18 5.5L19.25 5.5L18 5.5ZM20.1161 7.61612L17.1161 10.6161L18.8839 12.3839L21.8839 9.38388L20.1161 7.61612ZM18.8839 10.6161L15.8839 7.61612L14.1161 9.38388L17.1161 12.3839L18.8839 10.6161ZM19.25 11.5L19.25 5.5L16.75 5.5L16.75 11.5L19.25 11.5ZM17 3.25L7 3.25L7 5.75L17 5.75L17 3.25ZM4.75 5.5L4.75 8.5L7.25 8.5L7.25 5.5L4.75 5.5ZM7 3.25C5.75736 3.25 4.75 4.25736 4.75 5.5L7.25 5.5C7.25 5.63807 7.13807 5.75 7 5.75L7 3.25ZM19.25 5.5C19.25 4.25736 18.2426 3.25 17 3.25L17 5.75C16.8619 5.75 16.75 5.63807 16.75 5.5L19.25 5.5Z" fill="currentColor"/><path d="M3 15.5L6 12.5M6 12.5L9 15.5M6 12.5V18.5C6 19.0523 6.44772 19.5 7 19.5H17C17.5523 19.5 18 19.0523 18 18.5V15.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            : <svg width="9" height="9" viewBox="0 0 512 512" fill="none"><path d="M396.625,140.625c-63.719,0-115.406,51.656-115.406,115.375s51.688,115.375,115.406,115.375S512,319.719,512,256S460.344,140.625,396.625,140.625z M396.625,342.531c-47.719,0-86.547-38.813-86.547-86.531s38.828-86.531,86.547-86.531s86.531,38.813,86.531,86.531S444.344,342.531,396.625,342.531z" fill="currentColor"/><path d="M230.781,256c0-63.719-51.672-115.375-115.406-115.375C51.656,140.625,0,192.281,0,256s51.656,115.375,115.375,115.375C179.109,371.375,230.781,319.719,230.781,256z" fill="currentColor"/></svg>
                          }
                        </button>
                      </div>
                    </th>
                    <th>AMOUNT</th>
                    <th>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span>VALUE</span>
                        <button
                          onClick={() => setValueMode(m => m === "usd" ? "base" : "usd")}
                          title={valueMode === "usd" ? "Show base token" : "Show USD"}
                          style={{
                            background: "var(--border-subtle)", border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 3, cursor: "pointer", display: "flex", alignItems: "center",
                            justifyContent: "center", width: 15, height: 15, padding: 0,
                            color: valueMode === "usd" ? "var(--color-primary)" : "#60a5fa", flexShrink: 0,
                          }}>
                          <svg width="9" height="9" viewBox="0 0 512 512" fill="none"><path d="M396.625,140.625c-63.719,0-115.406,51.656-115.406,115.375s51.688,115.375,115.406,115.375S512,319.719,512,256S460.344,140.625,396.625,140.625z" fill="currentColor"/><path d="M230.781,256c0-63.719-51.672-115.375-115.406-115.375C51.656,140.625,0,192.281,0,256s51.656,115.375,115.375,115.375C179.109,371.375,230.781,319.719,230.781,256z" fill="currentColor"/></svg>
                        </button>
                      </div>
                    </th>
                    <th>TRADER</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0
                    ? <tr><td colSpan={6} className="tr-empty-row">No transactions yet</td></tr>
                    : filtered.map(tx => {
                        const isSelected = selectedAddr === tx.wallet;
                        return (
                          <tr
                            key={tx.txHash}
                            className={`tr-tx-row tr-tx-row--${tx.position.toLowerCase()}${newHashes.has(tx.txHash) ? " tr-tx-row--new" : ""}`}
                            onClick={() => handleRowClick(tx.wallet)}
                            style={{
                              cursor: "pointer",
                              background: isSelected ? "var(--bg-elevated)" : undefined,
                            }}
                          >
                            <td className="tr-muted tr-time">{timeAgo(tx.time)}</td>
                            <td>
                              <span className={`tr-type-badge tr-type-badge--${tx.position.toLowerCase()}`}>
                                {tx.position === "BUY" ? "Buy" : "Sell"}
                              </span>
                            </td>
                            <td className="tr-num tr-muted">
                              {priceMode === "price"
                                ? formatPrice(tx.priceUsd)
                                : tx.marketCap != null
                                  ? formatUsd(tx.marketCap)
                                  : tx.priceUsd > 0
                                    ? formatUsd(tx.priceUsd * 1_000_000_000)
                                    : "—"
                              }
                            </td>
                            <td className="tr-num">{formatTokenAmount(tx.amountToken)}</td>
                            <td className={`tr-num ${tx.position === "BUY" ? "tr-pos" : "tr-neg"}`}>
                              {valueMode === "usd"
                                ? formatUsd(tx.amountUsd)
                                : tx.amountBase > 0
                                  ? <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                                      <BasePairIcon basePair={tx.baseSymbol || "BNB"} size={11}/>
                                      {tx.amountBase.toFixed(4)}
                                    </span>
                                  : "—"
                              }
                            </td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={e => e.stopPropagation()}>
                                {tx.isDev && (
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" title="Developer" style={{ flexShrink: 0, opacity: 0.85 }}>
                                    <path d="M5 18H19" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
                                    <path d="M5 14.584C5.75 14.286 5.573 14.016 5.3 13.897M19 14.584C18.25 14.286 18.427 14.016 18.7 13.897M5 18V14.584M19 18V14.584" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
                                    <path d="M9 22.75H15" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
                                  </svg>
                                )}
                                <WalletTooltip address={tx.wallet}>
                                  <span
                                    className="tr-wallet"
                                    style={{ cursor: "pointer" }}
                                    onClick={e => { e.stopPropagation(); handleRowClick(tx.wallet); }}
                                  >
                                    {shortAddr(tx.wallet)}
                                  </span>
                                </WalletTooltip>
                                {tx.tagAddress && !tx.isDev && <span className="tr-tag">{tx.tagAddress}</span>}
                                <CopyBtn text={tx.wallet}/>
                                <a href={`https://bscscan.com/tx/${tx.txHash}`} target="_blank" rel="noreferrer" className="tr-scan-link" style={{ marginLeft: 2 }}>
                                  <IconExternal/>
                                </a>
                                <button
                                  onClick={() => onFilterAddr(filterAddr === tx.wallet ? null : tx.wallet)}
                                  title={filterAddr === tx.wallet ? "Clear filter" : "Filter by this address"}
                                  style={{
                                    background: filterAddr === tx.wallet ? "rgba(251,191,36,0.15)" : "none",
                                    border: "none", cursor: "pointer", padding: "2px 3px",
                                    display: "flex", alignItems: "center", borderRadius: 4,
                                    color: filterAddr === tx.wallet ? "#fbbf24" : "var(--text-muted)",
                                    transition: "color 0.15s, background 0.15s", flexShrink: 0,
                                  }}
                                  className="tr-filter-addr-btn"
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
                  }
                </tbody>
              </table>

              <div className="tr-tx-card-list">
                {filtered.length === 0
                  ? <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: 13 }}>No transactions yet</div>
                  : filtered.map(tx => {
                      const isSelected = selectedAddr === tx.wallet;
                      return (
                        <div
                          key={tx.txHash}
                          className={`tr-tx-card tr-tx-card--${tx.position.toLowerCase()}${newHashes.has(tx.txHash) ? " tr-tx-card--new" : ""}`}
                          onClick={() => handleRowClick(tx.wallet)}
                          style={{ cursor: "pointer", background: isSelected ? "var(--bg-elevated)" : undefined }}
                        >
                          <div className="tr-tx-card-badge">
                            <span className={`tr-type-badge tr-type-badge--${tx.position.toLowerCase()}`}>
                              {tx.position === "BUY" ? "Buy" : "Sell"}
                            </span>
                          </div>
                          <div className="tr-tx-card-body">
                            <div className="tr-tx-card-row">
                              <span className="tr-tx-card-lbl">Amt</span>
                              <span className="tr-tx-card-val">{formatTokenAmount(tx.amountToken)}</span>
                              <div className="tr-tx-card-sep"/>
                              <span className="tr-tx-card-lbl">Val</span>
                              <span className={`tr-tx-card-val ${tx.position === "BUY" ? "tr-tx-card-val--pos" : "tr-tx-card-val--neg"}`}>
                                {valueMode === "usd"
                                  ? formatUsd(tx.amountUsd)
                                  : tx.amountBase > 0
                                    ? <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                                        <BasePairIcon basePair={tx.baseSymbol || "BNB"} size={10}/>
                                        {tx.amountBase.toFixed(4)}
                                      </span>
                                    : "—"
                                }
                              </span>
                            </div>
                            <div className="tr-tx-card-row">
                              <span className="tr-tx-card-lbl">Price</span>
                              <span className="tr-tx-card-val">{formatPrice(tx.priceUsd)}</span>
                              <div className="tr-tx-card-sep"/>
                              <span className="tr-tx-card-lbl">MCap</span>
                              <span className="tr-tx-card-val">
                                {tx.marketCap != null
                                  ? formatUsd(tx.marketCap)
                                  : tx.priceUsd > 0
                                    ? formatUsd(tx.priceUsd * 1_000_000_000)
                                    : "—"
                                }
                              </span>
                            </div>
                            <div className="tr-tx-card-addr" onClick={e => e.stopPropagation()}>
                              {tx.isDev && (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                                  <path d="M5 18H19" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M5 14.584C5.75 14.286 5.573 14.016 5.3 13.897M19 14.584C18.25 14.286 18.427 14.016 18.7 13.897M5 18V14.584M19 18V14.584" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                              )}
                              <WalletTooltip address={tx.wallet}>
                                <span className="tr-wallet" style={{ fontSize: 10 }}>{shortAddr(tx.wallet)}</span>
                              </WalletTooltip>
                              {tx.tagAddress && !tx.isDev && <span className="tr-tag">{tx.tagAddress}</span>}
                              <CopyBtn text={tx.wallet}/>
                              <a href={`https://bscscan.com/tx/${tx.txHash}`} target="_blank" rel="noreferrer" className="tr-scan-link">
                                <IconExternal/>
                              </a>
                              <button
                                onClick={() => onFilterAddr(filterAddr === tx.wallet ? null : tx.wallet)}
                                style={{
                                  background: filterAddr === tx.wallet ? "rgba(251,191,36,0.15)" : "none",
                                  border: "none", cursor: "pointer", padding: "2px 3px",
                                  display: "flex", alignItems: "center", borderRadius: 4,
                                  color: filterAddr === tx.wallet ? "#fbbf24" : "var(--text-muted)",
                                  transition: "color 0.15s, background 0.15s", flexShrink: 0,
                                }}
                                className="tr-filter-addr-btn"
                              >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                  <path fillRule="evenodd" clipRule="evenodd" d="M5.78584 3C4.24726 3 3 4.24726 3 5.78584C3 6.59295 3.28872 7.37343 3.81398 7.98623L6.64813 11.2927C7.73559 12.5614 8.33333 14.1773 8.33333 15.8483V18C8.33333 19.6569 9.67648 21 11.3333 21H12.6667C14.3235 21 15.6667 19.6569 15.6667 18V15.8483C15.6667 14.1773 16.2644 12.5614 17.3519 11.2927L20.186 7.98624C20.7113 7.37343 21 6.59294 21 5.78584C21 4.24726 19.7527 3 18.2142 3H5.78584Z"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="tr-tx-card-age">{timeAgo(tx.time)}</div>
                        </div>
                      );
                    })
                }
              </div>
            </>
        }
      </div>

      {selectedAddr && (
        <WalletDetailPanel
          address={selectedAddr}
          tokenAddress={tokenAddress}
          token={token}
          currentPrice={currentPrice}
          formatPrice={formatPrice}
          formatTokenAmount={formatTokenAmount}
          onClose={() => setSelectedAddr(null)}
          initialTxs={transactions.filter(tx => tx.wallet === selectedAddr)}
        />
      )}
    </div>
  );
}