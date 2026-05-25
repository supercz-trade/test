// ===============================================================
// utils/format.js
// Formatting utilities for numbers, currencies, dates, and addresses
// ===============================================================

/**
 * Format USD value with suffix (K, M, B)
 * @param {number|string} val
 * @returns {string}
 */
export function formatUsd(val) {
  const n = Number(val || 0);
  if (n === 0) return "$0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  if (abs >= 1) return `${sign}$${abs.toFixed(2)}`;
  if (abs > 0) return `${sign}$${abs.toFixed(8)}`;
  return "$0";
}

/**
 * Format token amount with suffix (K, M, B)
 * @param {number|string} val
 * @returns {string}
 */
export function formatTokenAmount(val) {
  const n = Number(val || 0);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

/**
 * Format age from launch time (short, without 'ago')
 * @param {string|Date} launchTime
 * @returns {string}
 */
export function formatAge(launchTime) {
  if (!launchTime) return "—";
  const diff = Date.now() - new Date(launchTime).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

/**
 * Format price with appropriate decimals
 * @param {number|string} val
 * @returns {string}
 */
export function formatPrice(val) {
  const n = Number(val || 0);
  if (n === 0) return "$0";
  if (n >= 1) return `$${n.toFixed(4)}`;
  if (n >= 0.001) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(10)}`;
}

/**
 * Format time ago string
 * @param {string|number|Date} ts
 * @returns {string}
 */
export function timeAgo(ts) {
  if (!ts) return "—";
  const num = Number(ts);
  const msTs = !isNaN(num) && num < 1e12 ? num * 1000 : new Date(ts).getTime();
  const diff = Date.now() - msTs;
  const s = Math.floor(diff / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/**
 * Format number with commas
 * @param {number|string} val
 * @returns {string}
 */
export function formatNumber(val) {
  const n = Number(val || 0);
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/**
 * Format percentage
 * @param {number|string} val
 * @returns {string}
 */
export function formatPercent(val) {
  const n = Number(val || 0);
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

/**
 * Truncate wallet address
 * @param {string} address
 * @param {number} start - chars to keep at start
 * @param {number} end - chars to keep at end
 * @returns {string}
 */
export function truncateAddress(address, start = 6, end = 4) {
  if (!address) return "";
  if (address.length <= start + end + 3) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

/**
 * Format date to ISO string
 * Handles both Unix timestamp (seconds) and ISO string input
 * @param {string|number|Date} val
 * @returns {string|null}
 */
export function formatDate(val) {
  if (!val) return null;
  const num = Number(val);
  if (!isNaN(num) && num < 2_000_000_000) {
    return new Date(num * 1000).toISOString();
  }
  return new Date(val).toISOString();
}

/**
 * Format market cap with suffix
 * @param {number|string} val
 * @returns {string}
 */
export function formatMarketCap(val) {
  return formatUsd(val);
}

/**
 * Format volume with suffix
 * @param {number|string} val
 * @returns {string}
 */
export function formatVolume(val) {
  return formatUsd(val);
}

/**
 * Format BNB balance
 * @param {number|string} val
 * @returns {string}
 */
export function formatBnb(val) {
  const n = Number(val || 0);
  if (n === 0) return "0 BNB";
  if (n < 0.001) return `${n.toFixed(8)} BNB`;
  if (n < 1) return `${n.toFixed(4)} BNB`;
  return `${n.toFixed(2)} BNB`;
}

/**
 * Format percentage change with color indicator
 * @param {number|string} val
 * @returns {{ text: string, isPositive: boolean, isNeutral: boolean }}
 */
export function formatChange(val) {
  const n = Number(val || 0);
  return {
    text: `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`,
    isPositive: n > 0,
    isNeutral: n === 0,
  };
}

/**
 * Calculate age string from timestamp
 * @param {string|number|Date} ts
 * @returns {string}
 */
export function calcAge(ts) {
  if (!ts) return "-";
  const ms = typeof ts === "string" ? new Date(ts).getTime() : (ts > 1e12 ? ts : ts * 1000);
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 0) return "0s";
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

/**
 * Calculate age in minutes from timestamp
 * @param {string|number|Date} ts
 * @returns {number|null}
 */
export function calcAgeMinutes(ts) {
  if (!ts) return null;
  const ms = typeof ts === "string" ? new Date(ts).getTime() : (ts > 1e12 ? ts : ts * 1000);
  return (Date.now() - ms) / 60000;
}

/**
 * Format market cap / volume with suffix (K, M, B)
 * @param {number|string} n
 * @returns {string}
 */
export function fmtMC(n) {
  const v = Number(n || 0);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

/**
 * Format balance with suffix (K, M, B)
 * @param {number|string} n
 * @returns {string}
 */
export function fmtBalance(n) {
  const v = Number(n || 0);
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)         return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
}

/**
 * Format price for ATH display (compact exponential)
 * @param {number|string} val
 * @returns {string}
 */
export function formatPriceCompact(val) {
  const n = Number(val || 0);
  if (n === 0) return "—";
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  if (n >= 0.0001) return `$${n.toFixed(6)}`;
  return `$${n.toExponential(2)}`;
}

/**
 * Format win rate percentage
 * @param {number|string} val
 * @returns {string}
 */
export function formatWinRate(val) {
  const n = Number(val || 0);
  return `${n.toFixed(0)}%`;
}

/**
 * Format PnL with K suffix
 * @param {number|string} val
 * @returns {string}
 */
export function formatPnl(val) {
  const n = Number(val || 0);
  const sign = n >= 0 ? "+" : "-";
  const abs = Math.abs(n);
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

/**
 * Format price with 2 decimals (for BNB price display)
 * @param {number|string|null} n
 * @returns {string}
 */
export function fmtPrice2(n) {
  if (!n && n !== 0) return "—";
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Format percentage with +/- sign
 * @param {number|string|null} n
 * @returns {string|null}
 */
export function fmtPct2(n) {
  if (n == null) return null;
  return `${n >= 0 ? "+" : ""}${Number(n).toFixed(2)}%`;
}

/**
 * Format compact number with suffix (K, M, B) — for market stats
 * @param {number|string|null} n
 * @returns {string}
 */
export function fmtCompact(n) {
  if (!n && n !== 0) return "—";
  const v = Number(n);
  if (v >= 1_000_000_000) return "$" + (v / 1_000_000_000).toFixed(2) + "B";
  if (v >= 1_000_000) return "$" + (v / 1_000_000).toFixed(2) + "M";
  if (v >= 1_000) return "$" + (v / 1_000).toFixed(1) + "K";
  return "$" + v.toFixed(2);
}

/**
 * Format count with suffix (K, M) — for transaction counts
 * @param {number|string|null} n
 * @returns {string}
 */
export function fmtCount(n) {
  if (!n && n !== 0) return "—";
  const v = Number(n);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return String(v);
}

/**
 * Format BNB amount with up to 10 decimal places, trim trailing zeros
 * @param {number|string} val
 * @returns {string}
 */
export function formatBnbNotif(val) {
  const n = Number(val);
  if (!n || isNaN(n)) return "0";
  return n.toFixed(10).replace(/\.?0+$/, "");
}