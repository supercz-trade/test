// ===============================================================
// components/Footer/Footer.jsx
// Footer with BNB price, social links, market stats, and more menu
// ===============================================================

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { platform as platformApi } from "../../services/api";
import { SOCIAL, BNB_DEXSCREENER_PAIR, STORAGE_KEYS, getPlatformLogo } from "../../services/config";
import {
  TelegramIcon,
  XIcon,
  GitHubIcon,
  SoundOnIcon,
  SoundOffIcon,
  DotsIcon,
  IconCloseSmall,
  IconChevronRight,
} from "../../assets/icons";
import { fmtPrice2, fmtPct2, fmtCompact, fmtCount } from "../../utils/format";
import "./footer.css";

// ===============================================================
// CONSTANTS
// ===============================================================

const PERIODS = ["5m", "1h", "6h", "24h"];

const MORE_LINKS = [
  { to: "/developers",  label: "Developers",  sub: "API & Integration" },
  { to: "/terms",      label: "Terms",       sub: "Terms of service" },
  { to: "/privacy",    label: "Privacy",     sub: "Privacy policy" },
  { to: "/disclosures", label: "Disclosures", sub: "Risk disclaimers" },
  { to: "/help",       label: "Help",        sub: "Support & FAQ" },
];

// ===============================================================
// SUB-COMPONENTS
// ===============================================================

function PctBadge({ value }) {
  if (value == null) return null;
  return <span className={`ft-pct ${value >= 0 ? "pos" : "neg"}`}>{fmtPct2(value)}</span>;
}

// ── More Menu ───────────────────────────────────────────────────

function MoreMenu({ onClose, soundOn, onToggleSound }) {
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div className="ft-more-menu" ref={ref}>
      <div className="ft-more-hdr">
        <span className="ft-more-hdr-title">Options</span>
        <button className="ft-more-close" onClick={onClose}>
          <IconCloseSmall />
        </button>
      </div>

      <button className="ft-more-item" onClick={onToggleSound}>
        <div className={`ft-more-icon${soundOn ? " mi-sound-on" : " mi-sound-off"}`}>
          {soundOn ? <SoundOnIcon /> : <SoundOffIcon />}
        </div>
        <div className="ft-more-text">
          <span className="ft-more-text-label">Sound effects</span>
          <span className="ft-more-text-sub">Trade audio alerts</span>
        </div>
        <span className={`ft-more-badge ${soundOn ? "badge-on" : "badge-off"}`}>
          {soundOn ? "ON" : "OFF"}
        </span>
      </button>

      <div className="ft-more-divider" />

      {MORE_LINKS.map(({ to, label, sub }) => (
        <Link key={to} to={to} className="ft-more-item" onClick={onClose}>
          <div className="ft-more-text">
            <span className="ft-more-text-label">{label}</span>
            <span className="ft-more-text-sub">{sub}</span>
          </div>
          <IconChevronRight />
        </Link>
      ))}
    </div>
  );
}

// ── Market Stats Panel ──────────────────────────────────────────

function MarketPanel({ onClose }) {
  const [period, setPeriod] = useState("24h");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  useEffect(() => {
    setLoading(true);
    platformApi
      .getStats(period)
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const buyPct = stats
    ? Math.round((stats.volume.buy.volume / (stats.volume.total || 1)) * 100)
    : 50;

  return (
    <div className="ft-panel" ref={ref}>
      <div className="ft-panel-hdr">
        <div className="ft-panel-hdr-left">
          <div className="ft-panel-live" />
          <span className="ft-panel-title">BSC Market</span>
        </div>
        <div className="ft-period-row">
          {PERIODS.map((p) => (
            <button
              key={p}
              className={`ft-period-btn${period === p ? " active" : ""}`}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
        <button className="ft-panel-close" onClick={onClose}>
          <IconCloseSmall size={12} />
        </button>
      </div>

      {loading && !stats ? (
        <div className="ft-panel-empty">Loading ⚡</div>
      ) : !stats ? (
        <div className="ft-panel-empty">Failed to load stats</div>
      ) : (
        <>
          <div className="ft-panel-stats">
            <div className="ft-stat-card">
              <span className="ft-stat-lbl">Transactions</span>
              <span className="ft-stat-val">{fmtCount(stats.transactions.count)}</span>
              <PctBadge value={stats.transactions.change} />
            </div>
            <div className="ft-stat-card">
              <span className="ft-stat-lbl">Traders</span>
              <span className="ft-stat-val">{fmtCount(stats.traders.count)}</span>
              <PctBadge value={stats.traders.change} />
            </div>
            <div className="ft-stat-card">
              <span className="ft-stat-lbl">New tokens</span>
              <span className="ft-stat-val">{fmtCount(stats.tokens.created.count)}</span>
              <PctBadge value={stats.tokens.created.change} />
            </div>
            <div className="ft-stat-card">
              <span className="ft-stat-lbl">Migrations</span>
              <span className="ft-stat-val">{fmtCount(stats.tokens.migrations.count)}</span>
              <PctBadge value={stats.tokens.migrations.change} />
            </div>
          </div>

          <div className="ft-panel-vol">
            <div className="ft-vol-row">
              <span className="ft-vol-label">Volume {period}</span>
              <span className="ft-vol-total">
                {fmtCompact(stats.volume.total)}
                <PctBadge value={stats.volume.change} />
              </span>
            </div>
            <div className="ft-vol-bar">
              <div className="ft-vol-buy-bar" style={{ width: `${buyPct}%` }} />
              <div className="ft-vol-sell-bar" style={{ width: `${100 - buyPct}%` }} />
            </div>
            <div className="ft-vol-row">
              <span className="ft-vol-buy-lbl"> Buy {fmtCompact(stats.volume.buy.volume)}</span>
              <span className="ft-vol-sell-lbl"> Sell {fmtCompact(stats.volume.sell.volume)}</span>
            </div>
          </div>

          {stats.launchpads?.length > 0 && (
            <div className="ft-panel-chips">
              {stats.launchpads.slice(0, 4).map((lp) => (
                <div key={lp.source} className="ft-chip">
                  <img
                    src={getPlatformLogo(lp.source)}
                    alt={lp.label}
                    width="16"
                    height="16"
                    style={{ borderRadius: 4, objectFit: "contain" }}
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                  <span className="ft-chip-name">{lp.label || lp.source}</span>
                  <span className="ft-chip-vol">{fmtCompact(lp.volume)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ===============================================================
// MAIN FOOTER
// ===============================================================

export default function Footer() {
  const [bnbPrice, setBnbPrice] = useState(null);
  const [bnbChange, setBnbChange] = useState(null);
  const [bnbLoad, setBnbLoad] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.sound) !== "off";
    } catch {
      return true;
    }
  });

  const toggleSound = () =>
    setSoundOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEYS.sound, next ? "on" : "off");
      } catch {}
      return next;
    });

  useEffect(() => {
    const fetchBnb = async () => {
      try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/pairs/bsc/${BNB_DEXSCREENER_PAIR}`);
        const data = await res.json();
        const pair = data?.pair || data?.pairs?.[0];
        if (pair?.priceUsd) {
          setBnbPrice(pair.priceUsd);
          setBnbChange(pair.priceChange?.h24 ?? null);
        }
      } catch (_) {
      } finally {
        setBnbLoad(false);
      }
    };
    fetchBnb();
    const iv = setInterval(fetchBnb, 30_000);
    return () => clearInterval(iv);
  }, []);

  const githubUrl = SOCIAL?.github || "https://github.com/SwanFi-Labs";

  return (
    <>
      {panelOpen && <MarketPanel onClose={() => setPanelOpen(false)} />}
      {moreOpen && <MoreMenu onClose={() => setMoreOpen(false)} soundOn={soundOn} onToggleSound={toggleSound} />}

      <footer className="ft-bar">
        {/* LEFT */}
        <div className="ft-left">
          <img src="/main-logo-swan.png" className="ft-logo" alt="SwanFi" />
          <span className="ft-brand">
            <span className="ft-brand-swan">SWAN</span>
            <span className="ft-brand-fi">FI</span>
          </span>
          <div className="ft-sep" />
        </div>

        {/* CENTER */}
        <div className="ft-center">
          <div className={`ft-bnb${bnbLoad ? " ft-bnb--loading" : ""}`}>
            <img src="/assets/tokens/bnb.svg" width="14" height="14" alt="BNB" style={{ flexShrink: 0 }} />
            <span className="ft-bnb-label">BNB</span>
            <span className="ft-bnb-price">{bnbLoad ? "···" : fmtPrice2(bnbPrice)}</span>
            {!bnbLoad && bnbChange != null && (
              <span className={`ft-bnb-chg ${bnbChange >= 0 ? "pos" : "neg"}`}>{fmtPct2(bnbChange)}</span>
            )}
          </div>

          <div className="ft-social">
            <a href={SOCIAL.telegram} target="_blank" rel="noopener noreferrer" className="ft-social-pill ft-social-pill--tg" title="Telegram">
              <TelegramIcon />
            </a>
            <a href={SOCIAL.x} target="_blank" rel="noopener noreferrer" className="ft-social-pill ft-social-pill--x" title="X (Twitter)">
              <XIcon />
            </a>
            <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="ft-social-pill ft-social-pill--github" title="GitHub">
              <GitHubIcon />
            </a>
          </div>
        </div>

        {/* RIGHT */}
        <div className="ft-right">
          <div className="ft-nav-links">
            <Link to="/developers" className="ft-nav-link">Developers</Link>
            <Link to="/help" className="ft-nav-link">Help</Link>
            <Link to="/privacy" className="ft-nav-link">Privacy</Link>
            <Link to="/disclosures" className="ft-nav-link">Disclosures</Link>
            <Link to="/terms" className="ft-nav-link">Terms</Link>
          </div>
          <div className="ft-sep" />
          <button
            className={`ft-icon-btn${soundOn ? " ft-icon-btn--active" : ""}`}
            onClick={toggleSound}
            title={soundOn ? "Mute" : "Unmute"}
          >
            {soundOn ? <SoundOnIcon /> : <SoundOffIcon />}
          </button>
          <button
            className={`ft-stats-btn${panelOpen ? " active" : ""}`}
            onClick={() => { setPanelOpen((o) => !o); setMoreOpen(false); }}
          >
            <div className="ft-stats-dot" />
            Market Stats
          </button>
          <button
            className={`ft-more-trigger${moreOpen ? " active" : ""}`}
            onClick={() => { setMoreOpen((o) => !o); setPanelOpen(false); }}
          >
            <DotsIcon />
          </button>
        </div>
      </footer>
    </>
  );
}