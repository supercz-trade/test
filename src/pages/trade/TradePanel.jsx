// src/pages/trade/TradePanel.jsx
// Buy/Sell trading panel with presets and settings

import { useState, useRef, useEffect, useCallback } from "react";
import { trade as tradeApi, utils as utilsApi, user as userApi } from "../../services/api";

// Import icons from central index
import {
  CloseIcon,
  DragIcon,
  SettingsIcon,
  SwapIcon1,
  GasIcon,
  WalletIcon,
  CoinIcon,
  BackIcon,
  CheckIcon,
} from "../../assets/icons";

// Import format utilities
import { formatUsd, formatTokenAmount, formatPrice } from "../../utils/format";

// Spinner component
const Spinner = () => (
  <span style={{
    width: 12, height: 12, display: "inline-block",
    border: "2px solid rgba(0,0,0,0.25)", borderTopColor: "currentColor",
    borderRadius: "50%", animation: "tp-spin 0.6s linear infinite",
  }} />
);

function playSound(src, volume = 0.5) {
  try {
    if (localStorage.getItem("ui_sound") === "off") return;
    const audio = new Audio(src);
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch {}
}

// Auto checkbox component
function AutoCheckbox({ checked, onChange }) {
  return (
    <label className="tp-auto-check" onClick={onChange}>
      <span className={`tp-auto-check-box${checked ? " checked" : ""}`}>
        {checked && <CheckIcon size={8} />}
      </span>
      <span className="tp-auto-check-label">Auto</span>
    </label>
  );
}

// Gas price cache
let _gasPriceCache = null;
let _gasPriceFetchedAt = 0;
const GAS_CACHE_TTL = 15000;

async function fetchGasPrice() {
  const now = Date.now();
  if (_gasPriceCache && now - _gasPriceFetchedAt < GAS_CACHE_TTL) return _gasPriceCache;
  try {
    const res = await utilsApi.getGasPrice();
    _gasPriceCache = res.gwei;
    _gasPriceFetchedAt = now;
    return res.gwei;
  } catch {
    return _gasPriceCache ?? 3;
  }
}

const PROFILES = ["P1", "P2", "P3"];

const DEFAULT_SETTINGS = {
  P1: { buyPresets: [0.01, 0.02, 0.5, 1], sellPresets: [10, 25, 50, 100], slippage: "1.0", autoSlippage: true, gas: "3", autoGas: true, anti_mev: false },
  P2: { buyPresets: [0.05, 0.1, 0.5, 1], sellPresets: [25, 50, 75, 100], slippage: "1.0", autoSlippage: true, gas: "3", autoGas: true, anti_mev: false },
  P3: { buyPresets: [0.1, 0.5, 1, 2], sellPresets: [10, 25, 50, 100], slippage: "1.0", autoSlippage: true, gas: "3", autoGas: true, anti_mev: false },
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("tp_settings") || "null");
    if (!saved) return DEFAULT_SETTINGS;
    const result = {};
    for (const p of PROFILES) {
      result[p] = {
        ...DEFAULT_SETTINGS[p],
        ...(saved[p] || {}),
        autoGas: saved[p]?.autoGas ?? true,
        autoSlippage: saved[p]?.autoSlippage ?? true,
      };
    }
    return result;
  } catch { return DEFAULT_SETTINGS; }
}

function saveSettings(s) {
  try { localStorage.setItem("tp_settings", JSON.stringify(s)); } catch {}
}

// Settings panel component
function SettingsPanel({ settings, profile, onSave, onBack, liveGasGwei }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(settings)));
  const [activeP, setActiveP] = useState(profile);

  const cur = draft[activeP];

  const setBuyPreset = (i, v) => setDraft(d => { const n = JSON.parse(JSON.stringify(d)); n[activeP].buyPresets[i] = v; return n; });
  const setSellPreset = (i, v) => setDraft(d => { const n = JSON.parse(JSON.stringify(d)); n[activeP].sellPresets[i] = v; return n; });
  const setField = (f, v) => setDraft(d => { const n = JSON.parse(JSON.stringify(d)); n[activeP][f] = v; return n; });

  const handleSave = () => { saveSettings(draft); onSave(draft); onBack(); };
  const handleReset = () => setDraft(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));

  return (
    <div className="tp-settings">
      <div className="tp-settings-hdr">
        <button className="tp-icon-btn" onClick={onBack}><BackIcon size={12} /></button>
        <span className="tp-settings-title">Settings</span>
        <div style={{ flex: 1 }} />
        <button className="tp-settings-reset" onClick={handleReset}>Reset</button>
        <button className="tp-settings-save" onClick={handleSave}><CheckIcon size={11} /> Save</button>
      </div>

      <div className="tp-settings-profiles">
        {PROFILES.map(p => (
          <button key={p} className={`tp-profile${activeP === p ? " active" : ""}`} onClick={() => setActiveP(p)}>{p}</button>
        ))}
      </div>

      <div className="tp-settings-body">
        {/* Buy Presets */}
        <div className="tp-settings-section">
          <div className="tp-settings-label">Buy Presets (BNB)</div>
          <div className="tp-settings-grid4">
            {cur.buyPresets.map((v, i) => (
              <div key={i} className="tp-settings-input-wrap tp-settings-input-buy">
                <input type="number" min="0" step="0.01" className="tp-settings-input"
                  value={v} onChange={e => setBuyPreset(i, parseFloat(e.target.value) || 0)} />
              </div>
            ))}
          </div>
        </div>

        {/* Sell Presets */}
        <div className="tp-settings-section">
          <div className="tp-settings-label">Sell Presets (%)</div>
          <div className="tp-settings-grid4">
            {cur.sellPresets.map((v, i) => (
              <div key={i} className="tp-settings-input-wrap tp-settings-input-sell">
                <input type="number" min="0" max="100" step="1" className="tp-settings-input"
                  value={v} onChange={e => setSellPreset(i, parseFloat(e.target.value) || 0)} />
                <span className="tp-settings-unit">%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Slippage */}
        <div className="tp-settings-section">
          <div className="tp-settings-row-hdr">
            <span className="tp-settings-label">Slippage</span>
            <AutoCheckbox checked={cur.autoSlippage} onChange={() => setField("autoSlippage", !cur.autoSlippage)} />
          </div>
          <div className="tp-settings-input-wrap" style={{ width: "100%" }}>
            <input
              type="number" min="0" max="100" step="0.01"
              className={`tp-settings-input${cur.autoSlippage ? " tp-input-disabled" : ""}`}
              value={cur.autoSlippage ? "" : cur.slippage}
              placeholder={cur.autoSlippage ? "Auto — Auto Slippage" : ""}
              onChange={e => !cur.autoSlippage && setField("slippage", e.target.value)}
              readOnly={cur.autoSlippage}
              style={{ width: "100%" }}
            />
            {!cur.autoSlippage && <span className="tp-settings-unit">%</span>}
          </div>
        </div>

        {/* Gas */}
        <div className="tp-settings-section">
          <div className="tp-settings-row-hdr">
            <span className="tp-settings-label">Gas Price</span>
            <AutoCheckbox checked={cur.autoGas} onChange={() => setField("autoGas", !cur.autoGas)} />
          </div>
          <div className="tp-settings-input-wrap" style={{ width: "100%" }}>
            <input
              type="number" min="0" step="0.1"
              className={`tp-settings-input${cur.autoGas ? " tp-input-disabled" : ""}`}
              value={cur.autoGas ? "" : cur.gas}
              placeholder={cur.autoGas ? `Auto${liveGasGwei != null ? ` — ${liveGasGwei} Gwei` : " — fetching..."}` : ""}
              onChange={e => !cur.autoGas && setField("gas", e.target.value)}
              readOnly={cur.autoGas}
              style={{ width: "100%" }}
            />
            {!cur.autoGas && <span className="tp-settings-unit">Gwei</span>}
          </div>
        </div>

        {/* Anti-MEV */}
        <div className="tp-settings-section">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div className="tp-settings-label" style={{ marginBottom: 2 }}>Anti-MEV</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>+0.001 BNB fee · via 48 Club</div>
            </div>
            <button
              onClick={() => setField("anti_mev", !cur.anti_mev)}
              style={{
                width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
                background: cur.anti_mev ? "var(--color-primary)" : "rgba(255,255,255,0.12)",
                position: "relative", transition: "background 0.2s", flexShrink: 0,
              }}
            >
              <span style={{
                position: "absolute", top: 3,
                left: cur.anti_mev ? 21 : 3,
                width: 16, height: 16, borderRadius: "50%",
                background: cur.anti_mev ? "#000" : "rgba(255,255,255,0.6)",
                transition: "left 0.2s",
              }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Panel Component
export default function TradePanel({
  token,
  onClose,
  mobile = false,
  bnbBalance = "0.0000",
  walletId = null,
  tokenBalance = 0,
  onNotif = null,
  onTradeSuccess = null,
}) {
  // Drag state (desktop only)
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 });
  const [pos, setPos] = useState({ x: window.innerWidth - 320, y: 80 });

  const onMouseDown = useCallback((e) => {
    if (mobile) return;
    if (e.target.closest("button") || e.target.closest("input")) return;
    e.preventDefault();
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
  }, [pos, mobile]);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current.dragging) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 300, dragRef.current.origX + e.clientX - dragRef.current.startX)),
        y: Math.max(0, Math.min(window.innerHeight - 100, dragRef.current.origY + e.clientY - dragRef.current.startY)),
      });
    };
    const onUp = () => { dragRef.current.dragging = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  const [profile, setProfile] = useState("P1");
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(loadSettings);
  const [buyAmt, setBuyAmt] = useState("");
  const [sellAmt, setSellAmt] = useState("");
  const [buyInput, setBuyInput] = useState("");
  const [sellInput, setSellInput] = useState("");
  const [buyLoading, setBuyLoading] = useState(false);
  const [sellLoading, setSellLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [posData, setPosData] = useState(null);
  const [liveGasGwei, setLiveGasGwei] = useState(null);
  const toastTimer = useRef(null);
  const pollRef = useRef(null);

  const cfg = settings[profile];

  // Fetch gas price
  useEffect(() => {
    fetchGasPrice().then(setLiveGasGwei);
    const iv = setInterval(() => fetchGasPrice().then(setLiveGasGwei), 15000);
    return () => clearInterval(iv);
  }, []);

  const handleBuyPreset = (v) => { setBuyAmt(String(v)); setBuyInput(String(v)); };
  const handleSellPreset = (v) => { setSellAmt(String(v)); setSellInput(String(v)); };

  const handleProfile = (p) => {
    setProfile(p);
    setBuyAmt(""); setBuyInput(""); setSellAmt(""); setSellInput("");
  };

  const showToast = useCallback((msg, type = "success", extra = {}) => {
    setToast({ msg, type, ...extra });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchPosition = useCallback(async () => {
    const addr = token?.tokenAddress ?? token?.address ?? null;
    if (!addr) return;
    try {
      const data = await userApi.getPosition(addr);
      setPosData(data);
    } catch (err) {
      console.error("[TradePanel] fetchPosition error:", err);
    }
  }, [token]);

  useEffect(() => { fetchPosition(); }, [fetchPosition]);

  const pollBackground = useCallback((tradeId, jwtToken) => {
    clearInterval(pollRef.current);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 18) { clearInterval(pollRef.current); return; }
      try {
        const d = await tradeApi.getStatus(tradeId);
        if (d.status === "done") {
          clearInterval(pollRef.current);
          const cashback = Number(d.cashback_amount ?? d.fee_amount ?? 0);
          if (cashback > 0) {
            playSound("/sound/reward-trade.mp3", 0.6);
            onNotif?.({ type: "reward", cashback });
          }
          onTradeSuccess?.(); fetchPosition();
        } else if (d.status === "failed") {
          clearInterval(pollRef.current);
          onNotif?.({ type: "error", message: d.last_error || "Trade failed on-chain" });
          onTradeSuccess?.(); fetchPosition();
        }
      } catch {}
    }, 2000);
  }, [onNotif, onTradeSuccess, fetchPosition]);

  const getSource = useCallback(() => {
    const src = (token?.sourceFrom || token?.source || "").toLowerCase();
    if (src.includes("four") || src.includes("fourmeme")) return "fourmeme";
    if (src.includes("flap")) return "flap";
    return "fourmeme";
  }, [token]);

  const resolveSlippage = useCallback((side) => {
    if (!cfg.autoSlippage) return Number(cfg.slippage);
    const fee = side === "BUY"
      ? Number(token?.tax?.buy ?? 0)
      : Number(token?.tax?.sell ?? 0);
    return fee + 1;
  }, [cfg, token]);

  const resolveGas = useCallback(() => {
    if (!cfg.autoGas) return Number(cfg.gas) || null;
    return liveGasGwei ?? null;
  }, [cfg, liveGasGwei]);

  const submitTrade = useCallback(async (side, amount) => {
    const jwtToken = localStorage.getItem("token");
    if (!jwtToken) return showToast("Not logged in", "error");
    if (!walletId) return showToast("Wallet not found", "error");
    if (!token?.tokenAddress) return showToast("Token not loaded", "error");
    if (!amount || Number(amount) <= 0) return showToast("Enter a valid amount", "error");

    const isBuy = side === "BUY";
    let finalAmount = Number(amount);
    if (!isBuy) {
      const pct = Math.min(Math.max(finalAmount, 0), 100);
      finalAmount = (pct / 100) * tokenBalance;
    }

    if (isBuy) setBuyLoading(true); else setSellLoading(true);
    playSound("/sound/transaction.mp3", 0.4);

    const slippage = resolveSlippage(side);
    const gas = resolveGas();

    try {
      const data = await tradeApi.request({
        walletId,
        source: getSource(),
        token_address: token.tokenAddress,
        base_token: token.basePair || "BNB",
        side,
        amount: finalAmount,
        slippage,
        gas_gwei: gas,
        anti_mev: cfg.anti_mev ?? false,
      });

      if (!data || data.error) {
        if (isBuy) setBuyLoading(false); else setSellLoading(false);
        showToast(data?.error || "Trade failed", "error");
      } else {
        if (isBuy) { setBuyInput(""); setBuyAmt(""); setBuyLoading(false); }
        else { setSellInput(""); setSellAmt(""); setSellLoading(false); }
        showToast(isBuy ? "Buy order submitted ✓" : "Sell order submitted ✓", "success");
        if (data.id) pollBackground(data.id, jwtToken);
      }
    } catch (err) {
      showToast(err?.message || "Network error", "error");
      if (isBuy) setBuyLoading(false); else setSellLoading(false);
    }
  }, [walletId, token, tokenBalance, cfg, getSource, showToast, pollBackground, resolveSlippage, resolveGas]);

  const slippageLabel = cfg.autoSlippage
    ? `Auto (${token?.tax?.buy != null ? `${Number(token.tax.buy) + 1}%` : "fee+1%"})`
    : `${cfg.slippage}%`;
  const gasLabel = cfg.autoGas
    ? `Auto${liveGasGwei != null ? ` (${liveGasGwei})` : ""}`
    : `${cfg.gas} Gwei`;

  const toastStyle = (type) => ({
    position: "absolute", top: 8, left: 8, right: 8, zIndex: 99,
    padding: "10px 12px", borderRadius: 8, cursor: "pointer",
    fontSize: 12, fontWeight: 600, textAlign: "center", transition: "opacity 0.2s",
    ...(type === "pending"
      ? { background: "rgba(255,212,0,0.10)", border: "1px solid var(--border-default)", color: "var(--color-primary)" }
      : type === "error"
      ? { background: "rgba(255,80,80,0.10)", border: "1px solid rgba(255,80,80,0.22)", color: "#ff5050" }
      : { background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }),
  });

  return (
    <div
      className={`tp-panel${mobile ? " tp-panel--mobile" : ""}`}
      style={mobile ? undefined : { left: pos.x, top: pos.y }}
    >
      {toast && (
        <div style={toastStyle(toast.type)} onClick={() => setToast(null)}>
          <span>{toast.type === "error" ? "✗" : "✓"} {toast.msg}</span>
        </div>
      )}

      <div className="tp-header" onMouseDown={onMouseDown}>
        {!mobile && <div className="tp-drag-handle"><DragIcon size={14} /></div>}
        <div className="tp-profiles">
          {PROFILES.map(p => (
            <button key={p} className={`tp-profile${profile === p ? " active" : ""}`} onClick={() => handleProfile(p)}>{p}</button>
          ))}
        </div>
        <div className="tp-header-right">
          <div className="tp-bal-pill" title="BNB Balance">
            <CoinIcon size={13} />
            <span>{bnbBalance}</span>
          </div>
          <button className="tp-icon-btn" onClick={() => setShowSettings(s => !s)} title="Settings">
            <SettingsIcon size={13} />
          </button>
          <button className="tp-icon-btn tp-close" onClick={onClose}><CloseIcon size={12} /></button>
        </div>
      </div>

      {showSettings
        ? <SettingsPanel
            settings={settings}
            profile={profile}
            onSave={setSettings}
            onBack={() => setShowSettings(false)}
            liveGasGwei={liveGasGwei}
          />
        : <>
            {/* Buy Section */}
            <div className="tp-block">
              <div className="tp-block-label tp-label-buy">Buy</div>
              <div className="tp-presets">
                {cfg.buyPresets.map((v, i) => (
                  <button key={i} className={`tp-preset tp-preset-buy${buyAmt === String(v) ? " active" : ""}`}
                    onClick={() => handleBuyPreset(v)}>{v}</button>
                ))}
              </div>
              <div className="tp-input-row">
                <div className="tp-input-wrap tp-input-buy">
                  <input type="number" className="tp-input" placeholder="0.00"
                    value={buyInput} min="0" step="0.01"
                    onChange={e => { setBuyInput(e.target.value); setBuyAmt(""); }} />
                  <span className="tp-input-unit">BNB</span>
                </div>
                <button className="tp-action-btn tp-buy-btn"
                  onClick={() => submitTrade("BUY", buyInput || buyAmt)}
                  disabled={buyLoading}>
                  {buyLoading ? <Spinner /> : "Buy"}
                </button>
              </div>
              <div className="tp-subrow">
                <span className="tp-sub"><SwapIcon1 size={13} />{slippageLabel}</span>
                <span className="tp-sub"><GasIcon size={11} />{gasLabel}</span>
                <span className="tp-sub"><WalletIcon size={13} />{bnbBalance}</span>
              </div>
            </div>

            <div className="tp-divider" />

            {/* Sell Section */}
            <div className="tp-block">
              <div className="tp-block-header">
                <div className="tp-block-label tp-label-sell">Sell</div>
                <span className="tp-sell-bal">
                  {tokenBalance > 0
                    ? (tokenBalance >= 1_000_000
                        ? `${(tokenBalance / 1_000_000).toFixed(2)}M`
                        : tokenBalance >= 1_000
                        ? `${(tokenBalance / 1_000).toFixed(2)}K`
                        : tokenBalance.toFixed(2))
                    : "0"
                  } {token?.symbol || "—"}
                </span>
              </div>
              <div className="tp-presets">
                {cfg.sellPresets.map((v, i) => (
                  <button key={i} className={`tp-preset tp-preset-sell${sellAmt === String(v) ? " active" : ""}`}
                    onClick={() => handleSellPreset(v)}>{v}%</button>
                ))}
              </div>
              <div className="tp-input-row">
                <div className="tp-input-wrap tp-input-sell">
                  <input type="number" className="tp-input" placeholder="0"
                    value={sellInput} min="0" max="100" step="1"
                    onChange={e => { setSellInput(e.target.value); setSellAmt(""); }} />
                  <span className="tp-input-unit">%</span>
                </div>
                <button className="tp-action-btn tp-sell-btn"
                  onClick={() => submitTrade("SELL", sellInput || sellAmt)}
                  disabled={sellLoading}>
                  {sellLoading ? <Spinner /> : "Sell"}
                </button>
              </div>
              {(sellInput || sellAmt) && tokenBalance > 0 && (() => {
                const pct = Math.min(Math.max(Number(sellInput || sellAmt), 0), 100);
                const qty = (pct / 100) * tokenBalance;
                const fmt = qty >= 1_000_000 ? `${(qty/1_000_000).toFixed(2)}M`
                  : qty >= 1_000 ? `${(qty/1_000).toFixed(2)}K` : qty.toFixed(2);
                return (
                  <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 600, padding: "3px 0 1px", opacity: 0.75, fontVariantNumeric: "tabular-nums" }}>
                    ≈ {fmt} {token?.symbol || ""}
                  </div>
                );
              })()}
              <div className="tp-subrow">
                <span className="tp-sub"><SwapIcon1 size={13} />{slippageLabel}</span>
                <span className="tp-sub"><GasIcon size={11} />{gasLabel}</span>
                <span className="tp-sub"><WalletIcon size={13} />{bnbBalance}</span>
                <span className="tp-sub tp-balik">Return capital</span>
              </div>
            </div>

            <div className="tp-divider" />

            {/* Footer */}
            <div className="tp-footer">
              {[
                ["Balance", `${bnbBalance} BNB`],
                ["Holdings", tokenBalance > 0
                  ? (tokenBalance >= 1_000_000
                      ? `${(tokenBalance/1_000_000).toFixed(2)}M`
                      : tokenBalance >= 1_000
                      ? `${(tokenBalance/1_000).toFixed(2)}K`
                      : tokenBalance.toFixed(2)) + ` ${token?.symbol || ""}`
                  : `0 ${token?.symbol || "—"}`],
                ["Total Buy", posData?.buyUsd > 0 ? `${formatUsd(posData.buyUsd)}` : "—"],
                ["Total Sell", posData?.sellUsd > 0 ? `${formatUsd(posData.sellUsd)}` : "—"],
              ].map(([lbl, val]) => (
                <div key={lbl} className="tp-footer-item">
                  <span className="tp-footer-lbl">{lbl}</span>
                  <span className="tp-footer-val">{val}</span>
                </div>
              ))}
              <div className="tp-footer-item tp-footer-pnl">
                <span className="tp-footer-lbl">PnL</span>
                <span className={`tp-footer-val ${posData?.realizedPnl > 0 ? "tp-footer-pos" : posData?.realizedPnl < 0 ? "tp-footer-neg" : ""}`}>
                  {posData ? (() => {
                    const pnl = Number(posData.realizedPnl || 0);
                    if (pnl === 0) return "—";
                    return (pnl > 0 ? "+" : "") + formatUsd(Math.abs(pnl));
                  })() : "—"}
                </span>
              </div>
            </div>
          </>
      }
    </div>
  );
}