// ================================================================
// pages/trade/tab/TabMyPosition.jsx
// Tab: My Position — shows user's position & trade history
// ================================================================

import { useEffect, useState } from "react";
import { shortAddr, CopyBtn, IconExternal, BasePairIcon } from "./tabHelpers";
import { user as userApi } from "../../../services/api";
import { formatUsd, formatTokenAmount, formatPrice, timeAgo } from "../../../utils/format";
import "./tabs.css";

export default function TabMyPosition({
  token, tokenAddress, currentPrice,
  transactions,
  formatUsd, formatTokenAmount, formatPrice, timeAgo,
  refreshKey = 0,
}) {
  const [myData, setMyData] = useState(null);
  const [myTxs, setMyTxs] = useState([]);
  const [loading, setLoading] = useState(true);

  const jwtToken = localStorage.getItem("token");

  useEffect(() => {
    if (!jwtToken || !tokenAddress) {
      setLoading(false);
      return;
    }
    setLoading(true);

    Promise.all([
      userApi.getPosition(tokenAddress).catch(() => null),
      userApi.getPositionTxs(tokenAddress).catch(() => []),
    ]).then(([pos, txs]) => {
      // Transform backend response to match frontend expected structure
      if (pos) {
        setMyData({
          balance: pos.holdings ?? 0,
          avgBuyPrice: pos.avgBuyPrice ?? 0,
          realizedPnl: pos.realizedPnl ?? 0,
          buyCount: pos.buyCount ?? 0,
          sellCount: pos.sellCount ?? 0,
          buyUsd: pos.buyVolumeUsd ?? 0,
          sellUsd: pos.sellVolumeUsd ?? 0,
          walletAddress: null, // backend doesn't send this
        });
      } else {
        setMyData(null);
      }
      setMyTxs(Array.isArray(txs) ? txs : []);
    }).finally(() => setLoading(false));
  }, [jwtToken, tokenAddress, refreshKey]);

  const walletAddress = myData?.walletAddress ?? null;
  const myLiveTxs = walletAddress && transactions.length > 0
    ? transactions.filter(tx => tx.wallet?.toLowerCase() === walletAddress.toLowerCase())
    : [];

  const displayTxs = myTxs.length > 0 ? myTxs : myLiveTxs;

  // Stats
  const balance = myData?.balance ?? 0;
  const avgBuyPrice = myData?.avgBuyPrice ?? 0;
  const realizedPnl = myData?.realizedPnl ?? 0;
  const buyCount = myData?.buyCount ?? 0;
  const sellCount = myData?.sellCount ?? 0;
  const buyUsd = myData?.buyUsd ?? 0;
  const sellUsd = myData?.sellUsd ?? 0;

  const unrealizedPnl = (balance > 0 && avgBuyPrice > 0 && currentPrice > 0)
    ? (currentPrice - avgBuyPrice) * balance
    : null;

  const totalPnl = realizedPnl + (unrealizedPnl ?? 0);
  const pnlPct = buyUsd > 0 ? (totalPnl / buyUsd) * 100 : null;

  const hasPosition = balance > 0 || buyCount > 0;

  const fmtPnl = (val) => {
    if (val === null) return "—";
    const abs = Math.abs(val);
    const sign = val < 0 ? "-" : "+";
    if (abs === 0) return "$0";
    if (abs < 0.000001) return sign + "$" + abs.toExponential(2);
    if (abs < 0.01) return sign + "$" + abs.toFixed(6);
    if (abs < 1) return sign + "$" + abs.toFixed(4);
    return (val >= 0 ? "+" : "") + formatUsd(val);
  };

  if (loading) {
    return (
      <div className="tr-pos-wrap">
        <div className="tr-pos-empty">
          <div className="tr-spinner" />
          <p className="tr-pos-empty-sub">Loading position…</p>
        </div>
      </div>
    );
  }

  if (!hasPosition) {
    return (
      <div className="tr-pos-wrap">
        <div className="tr-pos-empty">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.2 }}>
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <p className="tr-pos-empty-title">No position</p>
          <p className="tr-pos-empty-sub">You haven't traded this token yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tr-pos-wrap">

      <div className="tr-pos-summary">
        <div className="tr-pos-stat">
          <span className="tr-pos-stat-label">Balance</span>
          <span className="tr-pos-stat-val">
            {balance > 0 ? formatTokenAmount(balance) : <span className="tr-pos-stat-val--dim">—</span>}
          </span>
          {balance > 0 && currentPrice > 0 && (
            <span className="tr-pos-stat-val" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
              ≈ {formatUsd(balance * currentPrice)}
            </span>
          )}
        </div>

        <div className="tr-pos-stat">
          <span className="tr-pos-stat-label">Avg Buy</span>
          <span className="tr-pos-stat-val">
            {avgBuyPrice > 0 ? formatPrice(avgBuyPrice) : <span className="tr-pos-stat-val--dim">—</span>}
          </span>
          <span className="tr-pos-stat-val" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
            {buyCount}B / {sellCount}S
          </span>
        </div>

        <div className="tr-pos-stat">
          <span className="tr-pos-stat-label">Unrealized PnL</span>
          <span className={`tr-pos-stat-val ${
            unrealizedPnl === null ? "tr-pos-stat-val--dim"
            : unrealizedPnl >= 0 ? "tr-pos-stat-val--pos"
            : "tr-pos-stat-val--neg"
          }`}>
            {fmtPnl(unrealizedPnl)}
          </span>
        </div>

        <div className="tr-pos-stat">
          <span className="tr-pos-stat-label">Realized PnL</span>
          <span className={`tr-pos-stat-val ${
            realizedPnl > 0 ? "tr-pos-stat-val--pos"
            : realizedPnl < 0 ? "tr-pos-stat-val--neg"
            : "tr-pos-stat-val--dim"
          }`}>
            {realizedPnl !== 0 ? fmtPnl(realizedPnl) : "—"}
          </span>
          {pnlPct !== null && (
            <span className={`tr-pos-pnl-pct ${totalPnl >= 0 ? "tr-pos-pnl-pct--pos" : "tr-pos-pnl-pct--neg"}`}>
              {totalPnl >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
            </span>
          )}
        </div>
      </div>

      <div className="tr-pos-section-header">
        <span className="tr-pos-section-title">My Trades</span>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{displayTxs.length} txs</span>
      </div>

      <div className="tr-pos-history">
        {displayTxs.length === 0 ? (
          <div className="tr-pos-empty" style={{ flex: "none", padding: "24px 16px" }}>
            <p className="tr-pos-empty-sub">No transactions found</p>
          </div>
        ) : (
          <table className="tr-table">
            <thead>
              <tr>
                <th>AGE</th>
                <th>TYPE</th>
                <th>PRICE</th>
                <th>AMOUNT</th>
                <th>VALUE</th>
                <th>TX</th>
              </tr>
            </thead>
            <tbody>
              {displayTxs.map((tx, i) => {
                const isBuy = (tx.position ?? tx.type ?? "").toUpperCase() === "BUY";
                const txHash = tx.txHash ?? tx.tx_hash ?? "";
                const amount = tx.amountToken ?? tx.amount ?? 0;
                const usd = tx.amountUsd ?? tx.value_usdt ?? 0;
                const price = tx.priceUsd ?? tx.price_usdt ?? 0;
                const ts = tx.time ?? tx.created_at ?? null;
                return (
                  <tr key={txHash || i} className={`tr-tx-row tr-tx-row--${isBuy ? "buy" : "sell"}`}>
                    <td>{ts ? timeAgo(ts) : "—"}</td>
                    <td>
                      <span className={`tr-type-badge tr-type-badge--${isBuy ? "buy" : "sell"}`}>
                        {isBuy ? "Buy" : "Sell"}
                      </span>
                    </td>
                    <td className="tr-num">{price > 0 ? formatPrice(price) : "—"}</td>
                    <td className="tr-num">{formatTokenAmount(amount)}</td>
                    <td className={`tr-num ${isBuy ? "tr-pos" : "tr-neg"}`}>
                      {usd > 0 ? formatUsd(usd) : "—"}
                    </td>
                    <td>
                      {txHash ? (
                        <a href={`https://bscscan.com/tx/${txHash}`} target="_blank"
                          rel="noreferrer" className="tr-scan-link">
                          <IconExternal />
                        </a>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}