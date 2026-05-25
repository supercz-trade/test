// ===============================================================
// components/Navbar/Navbar.jsx
// Main navigation bar with presets, search, wallet, and user menu
// ===============================================================

import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useRefCode } from "../../hooks/useRefCode";
import { useQuickBuy } from "../../context/QuickBuyContext";
import { utils as utilsApi, user } from "../../services/api";
import {
  ArrowIcon,
  FlashIcon,
  LinkIcon,
  UserIcon,
  IconBack,
  IconCheck,
  IconSearch,
  IconSlippage,
  IconGas,
  IconShield,
  IconGear,
  IconAutoCheck,
} from "../../assets/icons";
import SearchModal from "../SearchModal/SearchModal";
import AddFundsPopup from "../AddFundsPopup/AddFundsPopup";
import UserMenuPopup from "../UserMenuPopup/UserMenuPopup";
import TwoFAModal from "../TwoFAModal/TwoFAModal";
import "./navbar.css";

// ===============================================================
// CONSTANTS
// ===============================================================

const PRESETS_VERSION = 3;
const GAS_CACHE_TTL = 15_000;

const DEFAULT_PRESETS = [
  { name: "Preset 1", buyPresets: [0.01, 0.02, 0.5, 1],   sellPresets: [10, 25, 50, 100], slippage: "1.0", autoSlippage: true,  gas: "3", autoGas: true,  antiMev: false },
  { name: "Preset 2", buyPresets: [0.05, 0.1,  0.5, 1],   sellPresets: [25, 50, 75, 100], slippage: "1.0", autoSlippage: true,  gas: "3", autoGas: true,  antiMev: false },
  { name: "Preset 3", buyPresets: [0.1,  0.5,  1,   2],   sellPresets: [10, 25, 50, 100], slippage: "1.0", autoSlippage: true,  gas: "3", autoGas: true,  antiMev: false },
];

const NAV_LINKS = [
  { label: "Discover",  path: "/discover" },
  { label: "Trade",     path: "/trade/0x0000000000000000000000000000000000000000" },
  { label: "Portfolio", path: "/portfolio" },
];

// ===============================================================
// HELPERS
// ===============================================================

function loadPresets() {
  try {
    const raw = localStorage.getItem("swanfi_presets");
    if (!raw) return DEFAULT_PRESETS;
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved) || saved._v === undefined) {
      const v = saved?._v ?? (Array.isArray(saved) ? saved.find((p) => p._v)?._v : undefined);
      if (v !== PRESETS_VERSION) { savePresets(DEFAULT_PRESETS); return DEFAULT_PRESETS; }
    }
    return saved
      .filter((p) => p && p.name)
      .map((p) => ({
        ...DEFAULT_PRESETS[0],
        ...p,
        autoGas:      p.autoGas      ?? true,
        autoSlippage: p.autoSlippage ?? true,
        antiMev:      p.antiMev      ?? p.anti_mev ?? false,
      }));
  } catch { return DEFAULT_PRESETS; }
}

function savePresets(p) {
  try { localStorage.setItem("swanfi_presets", JSON.stringify([...p, { _v: PRESETS_VERSION }])); } catch {}
}

let _gasPriceCache = null;
let _gasPriceFetchedAt = 0;

async function fetchGasPrice() {
  const now = Date.now();
  if (_gasPriceCache && now - _gasPriceFetchedAt < GAS_CACHE_TTL) return _gasPriceCache;
  try {
    const res = await utilsApi.getGasPrice();
    const data = await res.json();
    _gasPriceCache = data.gwei;
    _gasPriceFetchedAt = now;
    return data.gwei;
  } catch { return _gasPriceCache ?? 3; }
}

// ===============================================================
// SUB-COMPONENTS
// ===============================================================

function SwanWordmark() {
  return (
    <span className="nb-wordmark">
      <span className="nb-wordmark-swan">SWAN</span>
      <span className="nb-wordmark-fi">FI</span>
    </span>
  );
}

function AutoCheckbox({ checked, onChange }) {
  return (
    <label className="nb-auto-check" onClick={onChange}>
      <span className={`nb-auto-check-box${checked ? " checked" : ""}`}>
        {checked && <IconAutoCheck size={8} />}
      </span>
      <span className="nb-auto-check-label">Auto</span>
    </label>
  );
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button onClick={onChange} className={`nb-toggle${checked ? " nb-toggle--on" : ""}`} type="button">
      <span className="nb-toggle-knob" />
    </button>
  );
}

// ── Preset Settings Panel ─────────────────────────────────────

function PresetSettings({ presets, activeIdx, onSave, onBack, liveGasGwei }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(presets)));
  const [activeP, setActiveP] = useState(activeIdx);
  const cur = draft[activeP];

  const set = (field, i, v) =>
    setDraft((d) => {
      const n = JSON.parse(JSON.stringify(d));
      if (i !== null) n[activeP][field][i] = parseFloat(v) || 0;
      else n[activeP][field] = v;
      return n;
    });

  return (
    <div className="nb-settings">
      <div className="nb-settings-hdr">
        <button className="nb-icon-btn" onClick={onBack}><IconBack /></button>
        <span className="nb-settings-title">Preset Settings</span>
        <div style={{ flex: 1 }} />
        <button className="nb-settings-reset" onClick={() => setDraft(JSON.parse(JSON.stringify(DEFAULT_PRESETS)))}>
          Reset
        </button>
        <button className="nb-settings-save" onClick={() => { savePresets(draft); onSave(draft); onBack(); }}>
          <IconCheck /> Save
        </button>
      </div>

      <div className="nb-settings-profiles">
        {draft.filter((p) => p.name).map((_, i) => (
          <button key={i} className={`nb-profile-tab${activeP === i ? " active" : ""}`} onClick={() => setActiveP(i)}>
            {i + 1}
          </button>
        ))}
      </div>

      <div className="nb-settings-body">
        {/* Buy Presets */}
        <div className="nb-settings-section">
          <div className="nb-settings-label">Buy Presets (BNB)</div>
          <div className="nb-settings-grid4">
            {cur.buyPresets.map((v, i) => (
              <div key={i} className="nb-settings-input-wrap nb-input-buy">
                <input
                  type="number" min="0" step="0.01" lang="en"
                  className="nb-settings-input"
                  value={v}
                  onChange={(e) => set("buyPresets", i, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Sell Presets */}
        <div className="nb-settings-section">
          <div className="nb-settings-label">Sell Presets (%)</div>
          <div className="nb-settings-grid4">
            {cur.sellPresets.map((v, i) => (
              <div key={i} className="nb-settings-input-wrap nb-input-sell">
                <input
                  type="number" min="0" max="100" step="1" lang="en"
                  className="nb-settings-input"
                  value={v}
                  onChange={(e) => set("sellPresets", i, e.target.value)}
                />
                <span className="nb-settings-unit">%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Slippage */}
        <div className="nb-settings-section">
          <div className="nb-settings-row-hdr">
            <span className="nb-settings-label">Slippage</span>
            <AutoCheckbox checked={cur.autoSlippage} onChange={() => set("autoSlippage", null, !cur.autoSlippage)} />
          </div>
          <div className="nb-settings-input-wrap" style={{ width: "100%" }}>
            <input
              type="number" min="0" max="100" step="0.01" lang="en"
              className={`nb-settings-input${cur.autoSlippage ? " nb-input-disabled" : ""}`}
              value={cur.autoSlippage ? "" : cur.slippage}
              placeholder={cur.autoSlippage ? "Auto Slippage" : ""}
              onChange={(e) => !cur.autoSlippage && set("slippage", null, e.target.value)}
              readOnly={cur.autoSlippage}
              style={{ width: "100%" }}
            />
            {!cur.autoSlippage && <span className="nb-settings-unit">%</span>}
          </div>
        </div>

        {/* Gas Price */}
        <div className="nb-settings-section">
          <div className="nb-settings-row-hdr">
            <span className="nb-settings-label">Gas Price</span>
            <AutoCheckbox checked={cur.autoGas} onChange={() => set("autoGas", null, !cur.autoGas)} />
          </div>
          <div className="nb-settings-input-wrap" style={{ width: "100%" }}>
            <input
              type="number" min="0" step="0.1" lang="en"
              className={`nb-settings-input${cur.autoGas ? " nb-input-disabled" : ""}`}
              value={cur.autoGas ? "" : cur.gas}
              placeholder={cur.autoGas ? `Auto${liveGasGwei != null ? ` — ${liveGasGwei} Gwei` : " — fetching..."}` : ""}
              onChange={(e) => !cur.autoGas && set("gas", null, e.target.value)}
              readOnly={cur.autoGas}
              style={{ width: "100%" }}
            />
            {!cur.autoGas && <span className="nb-settings-unit">Gwei</span>}
          </div>
        </div>

        {/* Anti-MEV */}
        <div className="nb-settings-section">
          <div className="nb-settings-row-hdr" style={{ alignItems: "center" }}>
            <div>
              <div className="nb-settings-label">Anti-MEV</div>
              <div className="nb-settings-sublabel">+0.001 BNB fee</div>
            </div>
            <ToggleSwitch checked={cur.antiMev} onChange={() => set("antiMev", null, !cur.antiMev)} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Preset Dropdown ───────────────────────────────────────────

function PresetDropdown({ presets, activeIdx, onOpenSettings, liveGasGwei }) {
  const p = presets[activeIdx];
  if (!p) return null;

  const slippageVal = p.autoSlippage ? "Auto" : `${p.slippage}%`;
  const gasVal = p.autoGas ? `${liveGasGwei != null ? `${liveGasGwei}` : ""}` : `${p.gas} Gwei`;

  return (
    <div className="nb-preset-dropdown">
      <div className="nb-preset-dropdown-hdr">
        <span className="nb-preset-dropdown-title">{p.name}</span>
        <button className="nb-icon-btn" onClick={onOpenSettings} title="Edit preset">
          <IconGear />
        </button>
      </div>

      <div className="nb-preset-section">
        <div className="nb-preset-section-label">Buy (BNB)</div>
        <div className="nb-preset-chips">
          {p.buyPresets.map((v, i) => <span key={i} className="nb-preset-chip nb-chip-buy">{v}</span>)}
        </div>
      </div>

      <div className="nb-preset-section">
        <div className="nb-preset-section-label">Sell (%)</div>
        <div className="nb-preset-chips">
          {p.sellPresets.map((v, i) => <span key={i} className="nb-preset-chip nb-chip-sell">{v}%</span>)}
        </div>
      </div>

      <div className="nb-preset-stats">
        <div className="nb-preset-stat">
          <span className="nb-preset-stat-lbl"><IconSlippage /> Slippage</span>
          <span className="nb-preset-stat-val">{slippageVal}</span>
        </div>
        <div className="nb-preset-stat">
          <span className="nb-preset-stat-lbl"><IconGas /> Gas</span>
          <span className="nb-preset-stat-val">{gasVal}</span>
        </div>
        <div className="nb-preset-stat">
          <span className="nb-preset-stat-lbl"><IconShield /> MEV</span>
          <span className={`nb-preset-stat-val${p.antiMev ? " nb-stat-mev-on" : ""}`}>
            {p.antiMev ? "On" : "Off"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ===============================================================
// MAIN NAVBAR
// ===============================================================

export default function Navbar({
  onConnectClick,
  isConnected,
  userProfile,
  bnbBalance,
  bnbUsd,
  onLogout,
  onRefreshUser,
}) {
  const [dropOpen, setDropOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activePreset, setActivePreset] = useState(0);
  const [presets, setPresets] = useState(loadPresets);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [liveGasGwei, setLiveGasGwei] = useState(null);

  const presetRef = useRef(null);
  const searchBoxRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const addFundsBtnRef = useRef(null);
  const userMenuBtnRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { appendRef } = useRefCode();
  const { quickBuyAmount, setQuickBuyAmount } = useQuickBuy();

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  const handleRefreshUserData = useCallback(() => {
    user.getMe()
      .then((data) => { if (onRefreshUser) onRefreshUser(data); })
      .catch(() => {});
  }, [onRefreshUser]);

  // Keyboard shortcut: / to open search
  useEffect(() => {
    const h = (e) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(e.target.tagName)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Close preset dropdown on outside click
  useEffect(() => {
    if (!dropOpen) return;
    const h = (e) => {
      if (presetRef.current && !presetRef.current.contains(e.target)) {
        setDropOpen(false);
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [dropOpen]);

  // Close mobile menu on outside click
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const h = (e) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [mobileMenuOpen]);

  // Fetch gas price when dropdown opens
  useEffect(() => {
    if (!dropOpen) return;
    fetchGasPrice().then(setLiveGasGwei);
    const iv = setInterval(() => fetchGasPrice().then(setLiveGasGwei), GAS_CACHE_TTL);
    return () => clearInterval(iv);
  }, [dropOpen]);

  const handleAddFundsToggle = () => { setUserMenuOpen(false); setAddFundsOpen((v) => !v); };
  const handleUserMenuToggle = () => { setAddFundsOpen(false); setUserMenuOpen((v) => !v); };

  const walletAddress = userProfile?.wallets?.[0]?.address || null;
  const validPresets = presets.filter((p) => p && p.name);

  return (
    <nav className="navbar">
      {/* LEFT: Logo + Nav Links */}
      <div className="nav-left">
        <div className="nb-logo-wrap" onClick={() => navigate("/")}>
          <img src="/main-logo-swan.png" className="nb-logo" alt="SwanFi" />
          <SwanWordmark />
        </div>

        {/* Desktop Nav */}
        <div className="menu desktop-menu">
          {NAV_LINKS.map(({ label, path }) => (
            <span
              key={path}
              className={isActive(path) ? "active" : ""}
              onClick={() => navigate(appendRef(path))}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Mobile Nav */}
        <div className="mobile-nav-menu" ref={mobileMenuRef}>
          <button className="mobile-nav-trigger" onClick={() => setMobileMenuOpen((v) => !v)}>
            <span className="mobile-nav-label">
              {NAV_LINKS.find(({ path }) => isActive(path))?.label ?? "Menu"}
            </span>
            <svg
              className={`mobile-nav-chevron${mobileMenuOpen ? " open" : ""}`}
              width="12" height="12" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {mobileMenuOpen && (
            <div className="mobile-nav-dropdown">
              {NAV_LINKS.map(({ label, path }) => (
                <button
                  key={path}
                  className={`mobile-nav-item${isActive(path) ? " active" : ""}`}
                  onClick={() => { navigate(appendRef(path)); setMobileMenuOpen(false); }}
                >
                  {label}
                  {isActive(path) && <span className="mobile-nav-dot" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CENTER: Search */}
      <div className="nav-center">
        <div className="search-box" ref={searchBoxRef} onClick={() => setSearchOpen(true)}>
          <IconSearch />
          <span className="search-placeholder">Search by Name, Ticker or CA</span>
          <span className="shortcut">/</span>
        </div>
      </div>

      {/* RIGHT: Quick Buy + Presets + Auth */}
      <div className="nav-right">
        {/* Quick Buy Input */}
        <div className="quick-buy">
          <span className="qb-icon">
            <FlashIcon size={16} color="var(--swan-yellow)" />
          </span>
          <input
            type="number" step="0.01" min="0" lang="en"
            value={quickBuyAmount}
            onChange={(e) => setQuickBuyAmount(Number(e.target.value))}
            className="qb-input"
          />
          <span className="qb-unit">BNB</span>
        </div>

        {/* Preset Selector */}
        <div className="preset-box" ref={presetRef}>
          <div className="preset-tabs">
            {validPresets.map((_, i) => (
              <button
                key={i}
                className={`preset${activePreset === i ? " active" : ""}`}
                onClick={() => {
                  setActivePreset(i);
                  setDropOpen((o) => (activePreset === i ? !o : true));
                  setShowSettings(false);
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
          {dropOpen &&
            (showSettings ? (
              <PresetSettings
                presets={validPresets}
                activeIdx={activePreset}
                onSave={(p) => { setPresets(p); savePresets(p); }}
                onBack={() => setShowSettings(false)}
                liveGasGwei={liveGasGwei}
              />
            ) : (
              <PresetDropdown
                presets={validPresets}
                activeIdx={activePreset}
                onOpenSettings={() => setShowSettings(true)}
                liveGasGwei={liveGasGwei}
              />
            ))}
        </div>

        {/* Mobile Search Button */}
        <button className="mobile-search-btn" aria-label="Search" onClick={() => setSearchOpen(true)}>
          <IconSearch />
        </button>

        {/* Auth Buttons */}
        {!isConnected ? (
          <button className="nb-auth-btn" onClick={onConnectClick}>
            <LinkIcon size={16} color="var(--swan-black)" />
            <span className="nb-auth-btn-text">Connect</span>
          </button>
        ) : (
          <>
            <button className="add-funds-btn add-funds-btn--desktop" ref={addFundsBtnRef} onClick={handleAddFundsToggle}>
              Add Funds
            </button>
            <button className="user-menu-btn" ref={userMenuBtnRef} onClick={handleUserMenuToggle}>
              <UserIcon size={18} color="var(--text-secondary)" />
              <ArrowIcon
                size={14}
                color="var(--text-muted)"
                style={{ transition: "transform 0.2s", transform: userMenuOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>
          </>
        )}
      </div>

      {/* Modals & Popups */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} anchorRef={searchBoxRef} />
      <AddFundsPopup
        open={addFundsOpen}
        onClose={() => setAddFundsOpen(false)}
        anchorRef={addFundsBtnRef.current?.getBoundingClientRect().width > 0 ? addFundsBtnRef : userMenuBtnRef}
        walletAddress={walletAddress}
      />
      <UserMenuPopup
        open={userMenuOpen}
        onClose={() => setUserMenuOpen(false)}
        anchorRef={userMenuBtnRef}
        userProfile={userProfile}
        bnbBalance={bnbBalance}
        bnbUsd={bnbUsd}
        onLogout={onLogout}
        on2FAOpen={() => setShow2FA(true)}
        onRefreshUser={handleRefreshUserData}
        onAddFunds={() => { setUserMenuOpen(false); setAddFundsOpen(true); }}
      />
      <TwoFAModal
        open={show2FA}
        onClose={() => setShow2FA(false)}
        onSuccess={() => {
          user.getMe().then((data) => { if (onRefreshUser) onRefreshUser(data); });
          setShow2FA(false);
        }}
      />
    </nav>
  );
}