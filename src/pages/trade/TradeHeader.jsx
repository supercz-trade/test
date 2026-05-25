// src/pages/trade/TradeHeader.jsx
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import TradePanel from "./TradePanel";

// Import icons from central index
import {
  CopyIcon,
  SearchIcon,
  StarIcon,
  PanelIcon,
  TradeIcon,
  GlobeIcon,
  RefreshIcon,
  XIcon,
  TelegramIcon,
  ExternalLinkIcon,
  CheckIcon,
} from "../../assets/icons";

// Import format utilities
import { formatUsd, truncateAddress, timeAgo, formatNumber } from "../../utils/format";

// Local helper (not a format)
function shortAddr(addr) {
  return truncateAddress(addr, 6, 4);
}

// Local BasePairIcon – reads SVG from public/assets/tokens
function BasePairIcon({ basePair, size = 13 }) {
  if (!basePair) return null;
  const key = basePair.toUpperCase();
  const tokenMap = {
    BNB: '/assets/tokens/bnb.svg',
    WBNB: '/assets/tokens/bnb.svg',
    USDT: '/assets/tokens/usdt.svg',
    USDC: '/assets/tokens/usdc.svg',
    CAKE: '/assets/tokens/cake.svg',
    ASTER: '/assets/tokens/aster.svg',
    UUSD: '/assets/tokens/uusd.svg',
    USD1: '/assets/tokens/usd1.svg',
  };
  if (tokenMap[key]) {
    return (
      <img
        src={tokenMap[key]}
        width={size}
        height={size}
        style={{ borderRadius: '50%', flexShrink: 0, display: 'block' }}
        alt={key}
      />
    );
  }
  return (
    <span style={{ fontSize: '8px', fontWeight: 800, color: '#a1a1aa', background: 'var(--border-subtle)', borderRadius: '3px', padding: '1px 3px' }}>
      {key.slice(0, 4)}
    </span>
  );
}

// Local progress ring component (not an icon)
function RoundedRectProgress({ progress, size = 48, rx = 11 }) {
  const pct = Math.min(Math.max(Number(progress || 0), 0), 100);
  const stroke = 2.5;
  const pad = stroke / 2;
  const w = size - stroke;
  const h = size - stroke;
  const perim = 2 * (w + h) - (8 - 2 * Math.PI) * rx;
  const offset = perim - (pct / 100) * perim;
  const color = pct >= 80 ? "#ef4444" : pct >= 50 ? "var(--color-primary)" : "#22c55e";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3 }}>
      <rect x={pad} y={pad} width={w} height={h} rx={rx} fill="none" stroke="var(--border-subtle)" strokeWidth={stroke} />
      <rect x={pad} y={pad} width={w} height={h} rx={rx} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={perim} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }} />
    </svg>
  );
}

// FlashValue – local component, not format
function FlashValue({ value, formatter, className = '', prefix = '' }) {
  const [flash, setFlash] = useState(null);
  const prevRef = useRef(value);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev === value || prev === null) { prevRef.current = value; return; }
    const dir = Number(value) > Number(prev) ? 'up' : 'dn';
    setFlash(dir);
    prevRef.current = value;
    const t = setTimeout(() => setFlash(null), 700);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <span className={className} style={{ transition: 'color 0.3s', color: flash === 'up' ? '#22c55e' : flash === 'dn' ? '#ef4444' : undefined }}>
      {prefix}{formatter(value)}
    </span>
  );
}

// Local format helpers (specific to price/MC formatting)
const fmtPrice = (v) => {
  const n = Number(v || 0);
  if (!n) return '0.00';
  if (n < 0.000001) return n.toExponential(3);
  if (n < 0.0001) return n.toFixed(8);
  if (n < 1) return n.toFixed(6);
  return n.toFixed(4);
};

const fmtMC = (n) => {
  const v = Number(n || 0);
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
};

// DevMarkBadge component (remains local)
function DevMarkBadge({ devMark, token, devInfo }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  const hideTimer = useRef(null);

  const MARK_CONFIG = {
    DH: { color: "var(--text-muted)", label: "Dev Holding", desc: "Developer has not sold any tokens yet." },
    DB: { color: "#22c55e", label: "Dev Buyback", desc: "Developer bought back after a previous sell." },
    DP: { color: "#f97316", label: "Dev Partial Sell", desc: "Developer sold a portion, still holds some." },
    DS: { color: "#ef4444", label: "Dev Sold All", desc: "Developer has fully exited their position." },
  };

  const c = MARK_CONFIG[devMark];
  if (!c) return null;

  const devHolder = token?.holderStats?.top10?.find(h => h.isDev);
  const devAddr = devHolder?.address || token?.developerAddress || null;
  const devBal = devHolder ? devHolder.balance : null;
  const devPct = devHolder ? devHolder.pct : null;

  const deploy = devInfo?.deploy;
  const trading = devInfo?.trading;
  const behavior = devInfo?.behavior;

  const fmtVolume = (n) => {
    const v = Number(n || 0);
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(2)}`;
  };

  const fmtBal = (n) => {
    const v = Number(n || 0);
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toLocaleString();
  };

  const handleMouseEnter = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const tipW = 260;
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, tipW / 2 + 8),
      window.innerWidth - tipW / 2 - 8
    );
    setPos({ left, top: rect.bottom + 8 });
    setShow(true);
  };

  const handleMouseLeave = () => {
    hideTimer.current = setTimeout(() => setShow(false), 150);
  };

  const handleTooltipEnter = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  };

  const handleTooltipLeave = () => {
    hideTimer.current = setTimeout(() => setShow(false), 150);
  };

  const handleCopyAddr = (e) => {
    e.stopPropagation();
    if (!devAddr) return;
    navigator.clipboard.writeText(devAddr).catch(() => { });
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const winRate = behavior?.winRate ?? 0;
  const totalTx = trading?.totalTxCount ?? 0;
  const deployCount = deploy?.deployCount ?? 0;
  const buyVol = trading?.buyVolumeUsd ?? 0;
  const sellVol = trading?.sellVolumeUsd ?? 0;
  const avgHold = behavior?.avgHoldTimeSeconds ?? 0;

  const avgHoldFmt = avgHold < 60
    ? `${Math.round(avgHold)}s`
    : avgHold < 3600
      ? `${Math.round(avgHold / 60)}m`
      : avgHold < 86400
        ? `${Math.round(avgHold / 3600)}h`
        : `${Math.round(avgHold / 86400)}d`;

  return (
    <>
      <span
        ref={ref}
        className="tc-devmark-badge"
        style={{
          background: `${c.color}20`, color: c.color,
          border: `1px solid ${c.color}44`,
          display: "inline-flex", alignItems: "center", gap: 3,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <svg width="9" height="9" viewBox="0 0 512 512" fill="currentColor">
          <path d="M387.98,93.958C368.794,38.56,315.935,0,256,0S143.206,38.56,124.02,93.958C54.345,101.745,0,161.008,0,232.727c0,69.067,50.407,126.585,116.364,137.697v32.97h23.273h23.273h186.182h23.273h23.273v-32.97C461.593,359.312,512,301.794,512,232.727C512,161.008,457.655,101.745,387.98,93.958z" />
          <path d="M372.364,449.939h-23.273H162.909h-23.273h-23.273v38.788c0,12.851,10.42,23.273,23.273,23.273h232.727c12.853,0,23.273-10.422,23.273-23.273v-38.788H372.364z" />
        </svg>
        {devMark}
      </span>

      {show && pos && typeof document !== "undefined" && createPortal(
        <div
          className="tc-devmark-tooltip"
          style={{ position: "fixed", left: pos.left, top: pos.top, transform: "translateX(-50%)", zIndex: 9999 }}
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
        >
          <div className="tc-devmark-tt-header">
            <span>Dev Activity</span>
            <span className="tc-devmark-tt-badge" style={{ background: `${c.color}22`, color: c.color, border: `1px solid ${c.color}55` }}>
              {devMark} · {c.label}
            </span>
          </div>

          <div className="tc-devmark-tt-desc">{c.desc}</div>

          <div style={{ borderTop: "1px solid var(--border-subtle)", margin: "2px 0" }} />

          {devAddr && (
            <div className="tc-devmark-tt-row">
              <span className="tc-devmark-tt-lbl">Wallet</span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span className="tc-devmark-tt-addr">{shortAddr(devAddr)}</span>
                <button className="tc-devmark-tt-copy" onClick={handleCopyAddr} title="Copy address">
                  {copied
                    ? <CheckIcon size={10} />
                    : <CopyIcon size={10} />
                  }
                </button>
              </span>
            </div>
          )}

          {devPct !== null && (
            <div className="tc-devmark-tt-row">
              <span className="tc-devmark-tt-lbl">Holding</span>
              <span className="tc-devmark-tt-val" style={{ color: devPct > 20 ? "#ef4444" : devPct > 5 ? "#f97316" : "var(--text-primary)" }}>
                {devPct.toFixed(2)}%
                {devBal != null && (
                  <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 10 }}> ({fmtBal(devBal)})</span>
                )}
              </span>
            </div>
          )}

          {trading && (
            <>
              <div style={{ borderTop: "1px solid var(--border-subtle)", margin: "2px 0" }} />
              <div className="tc-devmark-tt-section">Wallet Stats</div>
              <div className="tc-devmark-tt-row">
                <span className="tc-devmark-tt-lbl">Total trades</span>
                <span className="tc-devmark-tt-val">{totalTx.toLocaleString()}</span>
              </div>
              <div className="tc-devmark-tt-row">
                <span className="tc-devmark-tt-lbl">Buy vol</span>
                <span className="tc-devmark-tt-val" style={{ color: "#22c55e" }}>{fmtVolume(buyVol)}</span>
              </div>
              <div className="tc-devmark-tt-row">
                <span className="tc-devmark-tt-lbl">Sell vol</span>
                <span className="tc-devmark-tt-val" style={{ color: "#ef4444" }}>{fmtVolume(sellVol)}</span>
              </div>
              <div className="tc-devmark-tt-row">
                <span className="tc-devmark-tt-lbl">Win rate</span>
                <span className="tc-devmark-tt-val" style={{ color: winRate >= 50 ? "#22c55e" : "#ef4444" }}>
                  {winRate.toFixed(1)}%
                  <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 10 }}> ({behavior?.winCount ?? 0}/{behavior?.totalCount ?? 0})</span>
                </span>
              </div>
              {avgHold > 0 && (
                <div className="tc-devmark-tt-row">
                  <span className="tc-devmark-tt-lbl">Avg hold</span>
                  <span className="tc-devmark-tt-val">{avgHoldFmt}</span>
                </div>
              )}
              <div className="tc-devmark-tt-row">
                <span className="tc-devmark-tt-lbl">Tokens deployed</span>
                <span className="tc-devmark-tt-val">{deployCount}</span>
              </div>

              {deploy?.deployData?.length > 0 && (
                <>
                  <div style={{ borderTop: "1px solid var(--border-subtle)", margin: "2px 0" }} />
                  <div className="tc-devmark-tt-section">Deployed Tokens</div>
                  <div className="tc-devmark-tt-tokenlist">
                    {deploy.deployData.map((t) => (
                      <a
                        key={t.address}
                        href={`/trade/${t.address}`}
                        className="tc-devmark-tt-tokenrow"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <img
                          src={t.imageUrl || "/unknown.jpg"}
                          className="tc-devmark-tt-tokenimg"
                          alt={t.symbol}
                          onError={(e) => (e.target.src = "/unknown.jpg")}
                        />
                        <span className="tc-devmark-tt-tokensym">{t.symbol}</span>
                        <span className="tc-devmark-tt-tokenath">
                          {t.allTimeHigh > 0
                            ? (() => {
                              const mc = t.allTimeHigh * 1_000_000_000;
                              if (mc >= 1_000_000) return `ATH $${(mc / 1_000_000).toFixed(1)}M`;
                              if (mc >= 1_000) return `ATH $${(mc / 1_000).toFixed(1)}K`;
                              return `ATH $${mc.toFixed(0)}`;
                            })()
                            : "—"
                          }
                        </span>
                      </a>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {devAddr && (
            <a
              href={`https://bscscan.com/address/${devAddr}`}
              target="_blank"
              rel="noreferrer"
              className="tc-devmark-tt-link"
              style={{ marginTop: 2 }}
              onClick={(e) => e.stopPropagation()}
            >
              View on BscScan
            </a>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

// Main TradeHeader component
export default function TradeHeader({
  token,
  tokenAddress,
  liveStats,
  loadingToken,
  favorites,
  onToggleFavorite,
  formatAge,
  panelOpen,
  onTogglePanel,
  tradeOpen,
  onToggleTrade,
  isConnected,
  onConnectClick,
  bnbBalance = "0.0000",
  walletId = null,
  tokenBalance = 0,
  onNotif = null,
  onTradeSuccess = null,
  devInfo = null,
}) {
  const [copied, setCopied] = useState(false);

  const price = liveStats?.price ?? token?.priceUsdt ?? 0;
  const marketCap = liveStats?.marketcap ?? token?.marketCap ?? 0;
  const volume24h = liveStats?.volume24h ?? token?.volumeUsdt ?? 0;
  const holderCnt = liveStats?.holderCount ?? token?.holderCount ?? 0;
  const txCount = liveStats?.txCount ?? token?.txCount ?? 0;
  const devSupply = liveStats?.devSupply ?? 0;
  const top10Pct = liveStats?.top10Pct
    ?? token?.holderStats?.top10?.reduce((s, h) => s + (h.pct || 0), 0)
    ?? 0;
  const change1h = liveStats?.change1h ?? null;
  const devMark = liveStats?.devMark ?? token?.devMark ?? null;

  const mode = liveStats?.mode ?? token?.mode ?? (token?.migrated ? "dex" : "bonding");
  const isBonding = mode !== "dex";
  const isDex = mode === "dex";
  const progress = isBonding ? (liveStats?.progress ?? token?.progress ?? null) : null;
  const bondingLiquidity = isBonding ? (liveStats?.bondingLiquidity ?? token?.bondingLiquidity ?? null) : null;
  const liquidity = isDex ? (liveStats?.liquidity ?? token?.liquidity ?? null) : null;
  const basePair = liveStats?.baseSymbol ?? token?.basePair ?? null;

  const TOTAL_SUPPLY = token?.totalSupply || 1_000_000_000;
  const devPct = TOTAL_SUPPLY > 0 ? (devSupply / TOTAL_SUPPLY) * 100 : 0;
  const taxBuy = Number(token?.tax?.buy || 0) + 1;
  const taxSell = Number(token?.tax?.sell || 0) + 1;
  const isPos1h = (change1h ?? 0) >= 0;

  const isFav = favorites?.some(t =>
    (t.tokenAddress && t.tokenAddress === tokenAddress) ||
    (t.symbol && t.symbol === token?.symbol)
  );

  const platformLogo = token?.sourceFrom === 'four_meme'
    ? '/four-meme-logo.png'
    : token?.sourceFrom === 'flap.sh'
      ? '/flap-logo.png'
      : null;

  const handleCopy = () => {
    if (!tokenAddress) return;
    navigator.clipboard.writeText(tokenAddress).catch(() => { });
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const openLink = (url) => { if (url) window.open(url, '_blank', 'noopener,noreferrer'); };
  const lensSearch = () => {
    if (!token?.imageUrl) return;
    window.open(`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(token.imageUrl)}`, '_blank', 'noopener,noreferrer');
  };

  const handleTradeClick = () => {
    if (isConnected) onToggleTrade();
    else onConnectClick?.();
  };

  return (
    <div className="tc-infobar">

      <button className={`tc-panel-toggle${panelOpen ? ' active' : ''}`} onClick={onTogglePanel} title={panelOpen ? 'Close token panel' : 'Open token panel'}>
        <PanelIcon size={14} />
      </button>

      <div className="tc-info-left">
        <div className={`tc-logo-wrap${progress != null ? ' tc-logo-wrap--ring' : ''}`} title="Search with Google Lens">
          {progress != null && <RoundedRectProgress progress={progress} size={48} rx={11} />}
          <div className="tc-logo-inner" onClick={lensSearch}>
            {loadingToken
              ? <div className="tc-logo-skeleton" />
              : <img src={token?.imageUrl || '/unknown.jpg'} className="tc-logo" alt={token?.symbol} onError={e => (e.target.src = '/unknown.jpg')} />
            }
            <div className="tc-logo-overlay"><SearchIcon size={13} /></div>
          </div>
          {progress != null && (
            <div className="tc-logo-progress-overlay" onClick={lensSearch}>
              <span className="tc-logo-progress-pct">{Math.min(Math.max(Number(progress), 0), 100).toFixed(0)}%</span>
            </div>
          )}
          {platformLogo && (
            <img src={platformLogo} className="tc-source-badge" alt={token?.sourceFrom}
              title={token?.sourceFrom === 'four_meme' ? 'four.meme' : token?.sourceFrom}
              onError={e => (e.target.style.display = 'none')} />
          )}
        </div>

        <div className="tc-meta">
          <div className="tc-name-row">
            {loadingToken ? (
              <span className="tr-skeleton" style={{ width: 120, height: 14, borderRadius: 4, display: 'inline-block' }} />
            ) : (
              <>
                <button className={`tc-fav tc-fav-inline${isFav ? ' active' : ''}`} onClick={() => token && onToggleFavorite?.(token)} title={isFav ? 'Remove from favorites' : 'Add to favorites'}>
                  <StarIcon filled={isFav} />
                </button>
                <span className="tc-symbol">{token?.symbol || '—'}</span>
                <button className={`tc-symbol-panel-btn${panelOpen ? ' active' : ''}`} onClick={onTogglePanel} title={panelOpen ? 'Close panel' : 'Open panel'}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    {panelOpen ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
                  </svg>
                </button>
                {token?.name && <span className="tc-fullname">{token.name}</span>}
                {basePair && (
                  <span className="tc-basepair-badge" title={basePair}>
                    <BasePairIcon basePair={basePair} size={13} />
                    <span>{basePair}</span>
                  </span>
                )}
                {isDex && <span className="tc-badge tc-badge-dex">DEX</span>}
                {token?.devSold && <span className="tc-badge tc-badge-dev">Dev Sold</span>}
                {devMark && !loadingToken && (
                  <DevMarkBadge devMark={devMark} token={token} devInfo={devInfo} />
                )}
              </>
            )}
          </div>

          {!loadingToken && tokenAddress && (
            <div className="tc-addr-row-mobile">
              <span className="tc-addr-text-mobile">{shortAddr(tokenAddress)}</span>
              <button className="tc-addr-copy-mobile" onClick={handleCopy} title="Copy address">
                {copied
                  ? <CheckIcon size={11} />
                  : <CopyIcon size={11} />
                }
              </button>
            </div>
          )}

          <div className="tc-icons-row">
            {loadingToken ? (
              <span className="tr-skeleton" style={{ width: 180, height: 11, borderRadius: 4, display: 'inline-block' }} />
            ) : (
              <>
                <a href={`https://bscscan.com/token/${tokenAddress || ''}`} target="_blank" rel="noreferrer" className="tc-chain" title="View on BscScan">
                  <svg width="13" height="13" viewBox="0 0 122 122" fill="none">
                    <path fill="currentColor" d="M25.223 57.583a5.143 5.143 0 0 1 5.168-5.143l8.568.028a5.15 5.15 0 0 1 5.15 5.151v32.4c.966-.286 2.2-.591 3.56-.911a4.29 4.29 0 0 0 3.309-4.177V44.744a5.15 5.15 0 0 1 5.15-5.152h8.595a5.15 5.15 0 0 1 5.15 5.152v37.3s2.15-.87 4.244-1.754a4.3 4.3 0 0 0 2.625-3.957V31.866a5.15 5.15 0 0 1 5.15-5.151h8.585a5.15 5.15 0 0 1 5.146 5.151v36.617c7.443-5.394 14.986-11.882 20.972-19.683a8.65 8.65 0 0 0 1.316-8.072 60.64 60.64 0 0 0-33.43-35.843A60.636 60.636 0 0 0 8.056 90.836a7.67 7.67 0 0 0 7.316 3.79c1.624-.143 3.646-.345 6.05-.627a4.29 4.29 0 0 0 3.805-4.258V57.583" />
                    <path fill="#f0b90b" d="M25.04 109.544a60.65 60.65 0 0 0 63.208 5.001 60.65 60.65 0 0 0 33.13-54.062c0-1.4-.065-2.778-.158-4.152-22.163 33.055-63.085 48.508-96.18 53.213" />
                  </svg>
                  BSC
                </a>
                <span className="tc-sep" />
                <a href={`https://x.com/search?q=${tokenAddress || ''}`} target="_blank" rel="noreferrer" className="tc-icon-btn" title="Search on X"><SearchIcon size={13} /></a>
                {token?.twitter && <button className="tc-icon-btn" onClick={() => openLink(token.twitter)} title="X / Twitter"><XIcon size={12} /></button>}
                {token?.telegram && <button className="tc-icon-btn" onClick={() => openLink(token.telegram)} title="Telegram"><TelegramIcon size={12} /></button>}
                {token?.website && <button className="tc-icon-btn" onClick={() => openLink(token.website)} title="Website"><GlobeIcon size={12} /></button>}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="tc-vdiv" />

      <div className="tc-stats-mobile">
        <div className="tc-sm-main">
          <div className="tc-sm-row">
            <span className="tc-sm-lbl">PRICE</span>
            <span className="tc-sm-price-wrap">
              <span className="tc-sm-dollar">$</span>
              {loadingToken
                ? <span className="tr-skeleton" style={{ width: 64, height: 11, borderRadius: 3, display: 'inline-block' }} />
                : <FlashValue value={price} formatter={fmtPrice} className="tc-sm-price-num" />
              }
              {change1h !== null && !loadingToken && (
                <span className={`tc-sm-chg ${isPos1h ? 'pos' : 'neg'}`}>{isPos1h ? '▲' : '▼'}{Math.abs(change1h).toFixed(1)}%</span>
              )}
            </span>
          </div>
          <div className="tc-sm-row">
            <span className="tc-sm-lbl">MCAP</span>
            {loadingToken
              ? <span className="tr-skeleton" style={{ width: 44, height: 11, borderRadius: 3, display: 'inline-block' }} />
              : <FlashValue value={marketCap} formatter={fmtMC} className="tc-sm-val" />
            }
          </div>
          <div className="tc-sm-row">
            <span className="tc-sm-lbl">VOL</span>
            {loadingToken
              ? <span className="tr-skeleton" style={{ width: 44, height: 11, borderRadius: 3, display: 'inline-block' }} />
              : <FlashValue value={volume24h} formatter={fmtMC} className="tc-sm-val" />
            }
          </div>
        </div>

        {!loadingToken && (
          <div className="tc-sm-chips">
            {isBonding && bondingLiquidity?.base > 0 && (
              <span className="tc-sm-chip neutral" title={`Liquidity: ${Number(bondingLiquidity.base).toFixed(4)} ${basePair || ''}`}>
                {Number(bondingLiquidity.base).toFixed(2)} {basePair || ''}
              </span>
            )}
            {devPct > 0 && (
              <span className={`tc-sm-chip ${devPct > 10 ? 'danger' : 'warn'}`} title="Dev holding %">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" /></svg>
                {devPct.toFixed(1)}%
              </span>
            )}
            {top10Pct > 0 && (
              <span className={`tc-sm-chip ${top10Pct >= 30 ? 'danger' : 'warn'}`} title="Top 10 holders %">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                {top10Pct.toFixed(0)}%
              </span>
            )}
            {holderCnt > 0 && (
              <span className="tc-sm-chip neutral" title="Holders">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
                {holderCnt >= 1000 ? `${(holderCnt / 1000).toFixed(1)}k` : holderCnt}
              </span>
            )}
            {txCount > 0 && (
              <span className="tc-sm-chip neutral" title="Transactions">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                {txCount >= 1000 ? `${(txCount / 1000).toFixed(1)}k` : txCount}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="tc-stats">
        <div className="tc-stat">
          <span className="tc-stat-lbl">Price</span>
          <div className="tc-stat-val tc-stat-price">
            <span className="tc-price-dollar">$</span>
            {loadingToken
              ? <span className="tr-skeleton" style={{ width: 80, height: 13, borderRadius: 4, display: 'inline-block' }} />
              : <FlashValue value={price} formatter={fmtPrice} className="tc-price-num" />
            }
          </div>
          {change1h !== null && !loadingToken && (
            <span className={`tc-chg ${isPos1h ? 'pos' : 'neg'}`}>{isPos1h ? '▲' : '▼'} {Math.abs(change1h).toFixed(2)}%</span>
          )}
        </div>

        <div className="tc-stat-sep" />
        <div className="tc-stat">
          <span className="tc-stat-lbl">Market Cap</span>
          {loadingToken
            ? <span className="tr-skeleton" style={{ width: 60, height: 13, borderRadius: 4, display: 'inline-block' }} />
            : <FlashValue value={marketCap} formatter={fmtMC} className="tc-stat-val" />
          }
        </div>

        <div className="tc-stat-sep" />
        <div className="tc-stat">
          <span className="tc-stat-lbl">Vol 24h</span>
          {loadingToken
            ? <span className="tr-skeleton" style={{ width: 60, height: 13, borderRadius: 4, display: 'inline-block' }} />
            : <FlashValue value={volume24h} formatter={fmtMC} className="tc-stat-val" />
          }
        </div>

        <div className="tc-stat-sep" />
        <div className="tc-stat">
          <span className="tc-stat-lbl">Tax</span>
          {loadingToken
            ? <span className="tr-skeleton" style={{ width: 50, height: 13, borderRadius: 4, display: 'inline-block' }} />
            : (
              <div className="tc-stat-val">
                <span style={{ color: taxBuy > 5 ? '#ef4444' : '#22c55e' }}>{taxBuy}%</span>
                <span style={{ color: '#3f3f46', margin: '0 3px' }}>/</span>
                <span style={{ color: taxSell > 5 ? '#ef4444' : '#22c55e' }}>{taxSell}%</span>
              </div>
            )
          }
        </div>

        <div className="tc-stat-sep" />
        <div className="tc-stat">
          <span className="tc-stat-lbl">Holders</span>
          {loadingToken
            ? <span className="tr-skeleton" style={{ width: 45, height: 13, borderRadius: 4, display: 'inline-block' }} />
            : <span className="tc-stat-val">{holderCnt.toLocaleString()}</span>
          }
        </div>

        {devPct > 0 && !loadingToken && (
          <>
            <div className="tc-stat-sep" />
            <div className="tc-stat">
              <span className="tc-stat-lbl">Dev</span>
              <span className="tc-stat-val" style={{ color: devPct > 10 ? '#ef4444' : '#f59e0b' }}>{devPct.toFixed(1)}%</span>
            </div>
          </>
        )}

        {top10Pct > 0 && !loadingToken && (
          <>
            <div className="tc-stat-sep" />
            <div className="tc-stat">
              <span className="tc-stat-lbl">Top10</span>
              <span className="tc-stat-val" style={{ color: top10Pct >= 20 ? '#ef4444' : '#22c55e' }}>{top10Pct.toFixed(1)}%</span>
            </div>
          </>
        )}

        {isBonding && !loadingToken && (
          <>
            <div className="tc-stat-sep" />
            <div className="tc-stat">
              <span className="tc-stat-lbl">Liquidity</span>
              <span className="tc-stat-val">
                {bondingLiquidity?.base > 0 ? `${Number(bondingLiquidity.base).toFixed(2)} ${basePair || ''}` : '—'}
              </span>
            </div>
          </>
        )}

        {isDex && liquidity && !loadingToken && (
          <>
            <div className="tc-stat-sep" />
            <div className="tc-stat">
              <span className="tc-stat-lbl">Liquidity</span>
              <span className="tc-stat-val" style={{ color: '#60a5fa' }}>{fmtMC(liquidity.usd)}</span>
              {liquidity.base > 0 && basePair && (
                <span className="tc-stat-sub">{Number(liquidity.base).toFixed(2)} {basePair}</span>
              )}
            </div>
          </>
        )}

        {formatAge && token?.launchTime && !loadingToken && (
          <>
            <div className="tc-stat-sep" />
            <div className="tc-stat">
              <span className="tc-stat-lbl">Age</span>
              <span className="tc-stat-val">{formatAge(token.launchTime)}</span>
            </div>
          </>
        )}

        <div style={{ marginLeft: "auto", paddingLeft: 12, flexShrink: 0 }}>
          <button
            className={`tp-header-btn${tradeOpen && isConnected ? " active" : ""}`}
            onClick={handleTradeClick}
            title={!isConnected ? "Login to trade" : tradeOpen ? "Close trade panel" : "Open trade panel"}
          >
            <TradeIcon size={14} />
            <span>{isConnected ? "Trade" : "Login"}</span>
          </button>
        </div>
      </div>

      {tradeOpen && isConnected && window.innerWidth > 640 && (
        <TradePanel token={token} onClose={onToggleTrade} bnbBalance={bnbBalance} walletId={walletId} tokenBalance={tokenBalance} onNotif={onNotif} onTradeSuccess={onTradeSuccess} />
      )}
    </div>
  );
}