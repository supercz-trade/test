// ================================================================
// components/SearchModal/SearchModal.jsx
// Search modal — History + live search via /tokens/:address
// Responsive: desktop (6 cols) | mobile (symbol, price, mcap only)
// ================================================================

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { appendRef } from "../../hooks/useRefCode";
import { tokens as tokensApi } from "../../services/api";
import { SearchIcon, CloseIcon } from "../../assets/icons";
import { fmtMC, formatPercent as fmtPct } from "../../utils/format";
import "./searchModal.css";

const HISTORY_KEY = "swanfi_search_history";
const MAX_HISTORY = 20;

// ── Helpers ────────────────────────────────────────────────────
const isMobile   = () => window.innerWidth < 640;
const isAddress  = (q) => /^0x[0-9a-fA-F]{40}$/.test(q.trim());

// PriceDisplay — React component with subscript for tiny prices
function PriceDisplay({ value, className }) {
  const n = Number(value || 0);
  if (!n) return <span className={className}>$0.00</span>;
  if (n >= 0.01) return <span className={className}>${n.toFixed(n >= 1 ? 2 : 4)}</span>;

  const str  = n.toFixed(20);
  const after = str.split(".")[1] || "";
  let zeros = 0;
  for (const ch of after) { if (ch === "0") zeros++; else break; }
  if (zeros < 2) return <span className={className}>${n.toFixed(6)}</span>;
  const sig = after.slice(zeros, zeros + 4);
  return (
    <span className={className}>
      $0.0<sub style={{ fontSize: "0.7em", verticalAlign: "sub" }}>{zeros - 1}</sub>{sig}
    </span>
  );
}

// ── localStorage history ───────────────────────────────────────
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}
function saveHistory(list) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY))); } catch {}
}
function addHistory(token) {
  const prev = loadHistory().filter(t => t.tokenAddress !== token.tokenAddress);
  saveHistory([token, ...prev]);
}

// ── Progress ring (bonding curve) ─────────────────────────────
function RoundedRectProgress({ progress, size, rx = 9 }) {
  const pct    = Math.min(Math.max(Number(progress || 0), 0), 100);
  const stroke = 2.5;
  const pad    = stroke / 2;
  const w      = size - stroke;
  const h      = size - stroke;
  const perim  = 2 * (w + h) - (8 - 2 * Math.PI) * rx;
  const offset = perim - (pct / 100) * perim;
  const color  = pct >= 80 ? "var(--color-danger)" : pct >= 50 ? "var(--color-primary)" : "var(--color-success)";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
         style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
      <rect x={pad} y={pad} width={w} height={h} rx={rx}
            fill="none" stroke="var(--border-subtle)" strokeWidth={stroke} />
      <rect x={pad} y={pad} width={w} height={h} rx={rx}
            fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={perim} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }} />
    </svg>
  );
}

// ── Token row ──────────────────────────────────────────────────
function TokenRow({ t, query, onClick }) {
  const pct       = Number(t.change24h ?? t.priceChange24h ?? 0);
  const isPos     = pct >= 0;
  const mc        = t.marketCap ?? t.marketcap ?? 0;
  const vol       = t.volumeUsdt ?? t.volume24h ?? 0;
  const price     = t.priceUsdt  ?? t.price     ?? 0;
  const mode      = t.mode || (t.migrated ? "dex" : "bonding");
  const isBonding = mode !== "dex";
  const progress  = isBonding ? (t.progress ?? null) : null;
  const RING_SIZE = 36;

  const highlight = (text) => {
    if (!query || !text) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="sm-highlight">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div className="sm-row" onClick={() => onClick(t)}>
      <div className={`sm-logo-wrap${progress != null ? " sm-logo-wrap--ring" : ""}`}>
        {progress != null && <RoundedRectProgress progress={progress} size={RING_SIZE} rx={8} />}
        <img
          src={t.imageUrl || "/unknown.jpg"}
          className="sm-logo"
          alt={t.symbol}
          onError={e => (e.target.src = "/unknown.jpg")}
        />
        {progress != null && (
          <div className="sm-logo-hover-overlay">
            <span className="sm-logo-hover-pct">
              {Math.min(Math.max(Number(progress), 0), 100).toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      <div className="sm-symbol-col">
        <span className="sm-symbol">{highlight(t.symbol)}</span>
        {t.name && <span className="sm-name">{highlight(t.name)}</span>}
      </div>

      <div className="sm-col">
        <PriceDisplay value={price} className="sm-price" />
      </div>

      <div className="sm-col">
        <span className="sm-mc">{fmtMC(mc)}</span>
      </div>

      <div className="sm-col sm-col-pct">
        <span className={`sm-pct ${isPos ? "pos" : "neg"}`}>{fmtPct(pct)}</span>
      </div>

      <div className="sm-col sm-col-vol">
        <span className="sm-vol">{fmtMC(vol)}</span>
      </div>
    </div>
  );
}

// ── Table header ───────────────────────────────────────────────
function TableHeader() {
  return (
    <div className="sm-table-header">
      <div className="sm-th sm-th-symbol">Symbol</div>
      <div className="sm-th">Price</div>
      <div className="sm-th">Market Cap</div>
      <div className="sm-th sm-th-pct">24h %</div>
      <div className="sm-th sm-th-vol">Volume</div>
    </div>
  );
}

// ── Skeleton rows ──────────────────────────────────────────────
function SkeletonRows({ n = 3 }) {
  return Array.from({ length: n }).map((_, i) => (
    <div key={i} className="sm-row sm-row-skel">
      <div className="sm-skel sm-skel-logo" />
      <div className="sm-symbol-col">
        <div className="sm-skel" style={{ width: 60, height: 13, borderRadius: 4 }} />
        <div className="sm-skel" style={{ width: 40, height: 10, borderRadius: 3, marginTop: 4 }} />
      </div>
      {[80, 70].map((w, j) => (
        <div key={j} className="sm-col">
          <div className="sm-skel" style={{ width: w, height: 13, borderRadius: 4 }} />
        </div>
      ))}
      {[60, 55].map((w, j) => (
        <div key={`d${j}`} className="sm-col sm-col-pct sm-col-vol">
          <div className="sm-skel" style={{ width: w, height: 13, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  ));
}

// ================================================================
// SEARCH MODAL
// ================================================================
export default function SearchModal({ open, onClose, anchorRef }) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState([]);
  const [history, setHistory] = useState(loadHistory);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const modalRef = useRef(null);
  const navigate = useNavigate();

  // Position dropdown under search box
  useLayoutEffect(() => {
    if (!open || !modalRef.current) return;
    if (isMobile()) {
      Object.assign(modalRef.current.style, { top: "0px", left: "0px", width: "100%", transform: "none" });
      return;
    }
    if (!anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    Object.assign(modalRef.current.style, {
      left:      `${rect.left + window.scrollX}px`,
      top:       `${rect.bottom + window.scrollY + 8}px`,
      width:     `${Math.max(rect.width, 620)}px`,
      transform: "none",
    });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => {
      if (!modalRef.current) return;
      if (isMobile()) {
        Object.assign(modalRef.current.style, { top: "0px", left: "0px", width: "100%", transform: "none" });
        return;
      }
      if (!anchorRef?.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      Object.assign(modalRef.current.style, {
        left:  `${rect.left + window.scrollX}px`,
        top:   `${rect.bottom + window.scrollY + 8}px`,
        width: `${Math.max(rect.width, 620)}px`,
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, anchorRef]);

  useEffect(() => {
    if (open) {
      setQuery(""); setResults([]); setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const doSearch = useCallback(async (q) => {
    const trimmed = q.trim();
    if (!trimmed || !isAddress(trimmed)) {
      setResults([]); setLoading(false); return;
    }
    setLoading(true); setError(null);
    try {
      const t = await tokensApi.getOne(trimmed);
      setResults(t ? [t] : []);
    } catch {
      setError("Token not found");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(timerRef.current);
    if (!v.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    timerRef.current = setTimeout(() => doSearch(v), 300);
  };

  const handleSelect = (token) => {
    addHistory(token);
    setHistory(loadHistory());
    onClose();
    navigate(appendRef(`/trade/${token.tokenAddress}`));
  };

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };

  if (!open) return null;

  const showHistory = !query.trim();
  const displayList = showHistory ? history : results;

  return createPortal(
    <>
      <div className="sm-backdrop" onClick={onClose} />

      <div className="sm-modal" ref={modalRef}>
        {/* Search input */}
        <div className="sm-search-bar">
          <SearchIcon size={16} />
          <input
            ref={inputRef}
            className="sm-input"
            placeholder="Paste contract address (0x…)"
            value={query}
            onChange={handleInput}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button className="sm-clear"
                    onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}>
              <CloseIcon size={14} />
            </button>
          )}
          <kbd className="sm-esc" onClick={onClose}>ESC</kbd>
        </div>

        {/* Results */}
        <div className="sm-body">
          <div className="sm-section-hdr">
            <span className="sm-section-title">
              {showHistory
                ? "Recent"
                : loading ? "Looking up…"
                : results.length > 0 ? "Token found"
                : ""}
            </span>
            {showHistory && history.length > 0 && (
              <button className="sm-clear-history" onClick={clearHistory}>Clear</button>
            )}
          </div>

          {loading && !showHistory
            ? <><TableHeader /><SkeletonRows n={1} /></>
            : displayList.length > 0
              ? <>
                  <TableHeader />
                  <div className="sm-list">
                    {displayList.map(t => (
                      <TokenRow key={t.tokenAddress} t={t}
                        query={showHistory ? "" : query} onClick={handleSelect} />
                    ))}
                  </div>
                </>
              : !loading && query.trim() && !isAddress(query.trim())
                ? <div className="sm-empty">Paste a valid contract address (0x + 40 chars)</div>
                : !loading && query.trim() && isAddress(query.trim())
                  ? <div className="sm-empty">Token not found</div>
                  : !loading && showHistory && history.length === 0
                    ? <div className="sm-empty">No recent searches yet</div>
                    : null
          }

          {error && <div className="sm-error">{error}</div>}
        </div>
      </div>
    </>,
    document.body
  );
}