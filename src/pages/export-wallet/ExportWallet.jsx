// src/pages/export-wallet/ExportWallet.jsx

import { useEffect, useMemo, useRef, useState } from "react";
import "./export-wallet.css";

import { userWallet } from "../../services/api";
import {
  IconShield,
  WalletIcon,
  ChevronDownIcon,
  CopyIcon,
  IconEye,
  IconEyeOff,
  IconKey,
  IconSeed,
  CheckIcon,
} from "../../assets/icons";

// ─────────────────────────────────────────────
// Verify Modal
// ─────────────────────────────────────────────

function VerifyModal({ open, loading, error, exportType, onClose, onConfirm }) {
  const [code, setCode] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setCode("");
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="ew-backdrop" onClick={onClose} />
      <div className="ew-modal">
        <div className="ew-modal-icon"><IconShield size={18} /></div>
        <div className="ew-modal-header">
          <h2>Security Verification</h2>
          <p>Enter your 2FA code to reveal sensitive wallet credentials.</p>
        </div>
        <div className="ew-verify-card">
          <span>Export Type</span>
          <strong>{exportType === "pk" ? "Private Key" : "Seed Phrase"}</strong>
        </div>
        <input ref={inputRef} type="text" maxLength={6} inputMode="numeric" className="ew-otp-input" placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={(e) => { if (e.key === "Enter" && code.length === 6) onConfirm(code); }} />
        {error && <div className="ew-error">{error}</div>}
        <button className="ew-primary-btn" disabled={loading || code.length < 6} onClick={() => onConfirm(code)}>
          {loading ? "Verifying..." : "Reveal Credentials"}
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

export default function ExportWallet({ isConnected, userProfile, onConnectClick, on2FAOpen }) {
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [walletOpen, setWalletOpen] = useState(false);
  const [exportType, setExportType] = useState("pk");
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [secretData, setSecretData] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const is2FAEnabled = userProfile?.is2FAEnabled ?? userProfile?.twofaEnabled ?? false;

  useEffect(() => {
    if (!isConnected) return;
    userWallet.list()
      .then((data) => {
        if (Array.isArray(data)) {
          setWallets(data);
          if (data.length) setSelectedWallet(data[0]);
        }
      })
      .catch(() => {});
  }, [isConnected]);

  const hiddenSecret = useMemo(() => {
    if (!secretData) return "";
    return "•".repeat(secretData.length);
  }, [secretData]);

  const handleExport = async (code) => {
    try {
      setLoading(true);
      setError("");
      let response;
      if (exportType === "pk") {
        response = await userWallet.exportPk(selectedWallet.id, code);
      } else {
        response = await userWallet.exportMnemonic(selectedWallet.id, code);
      }
      const value = response.privateKey || response.mnemonic || "";
      setSecretData(value);
      setVerifyOpen(false);
      setRevealed(false);
    } catch (err) {
      setError(err?.message || "Failed to export wallet.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!secretData) return;
    await navigator.clipboard.writeText(secretData);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!isConnected) {
    return (
      <div className="ew-page">
        <div className="ew-empty">
          <WalletIcon size={36} />
          <h2>Connect Wallet</h2>
          <p>Login to access wallet export features.</p>
          <button className="ew-primary-btn" onClick={onConnectClick}>Login / Connect</button>
        </div>
      </div>
    );
  }

  if (!is2FAEnabled) {
    return (
      <div className="ew-page">
        <div className="ew-empty">
          <IconShield size={36} />
          <h2>2FA Required</h2>
          <p>Enable Two-Factor Authentication before exporting wallet credentials.</p>
          <button className="ew-primary-btn" onClick={on2FAOpen}>Enable 2FA</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="ew-page">
        <div className="ew-container">
          <div className="ew-grid">
            {/* Left */}
            <div className="ew-main-card">
              <div className="ew-section">
                <div className="ew-section-top">
                  <span className="ew-label">Select Wallet</span>
                </div>
                <div className="ew-wallet-select">
                  <button className="ew-wallet-btn" onClick={() => setWalletOpen(!walletOpen)}>
                    <div className="ew-wallet-left">
                      <div className="ew-wallet-icon"><WalletIcon size={16} /></div>
                      <div className="ew-wallet-info">
                        <strong>{selectedWallet ? selectedWallet.wallet_name : "Select Wallet"}</strong>
                        <span>{selectedWallet ? `${selectedWallet.address.slice(0, 10)}...${selectedWallet.address.slice(-6)}` : "No wallet selected"}</span>
                      </div>
                    </div>
                    <ChevronDownIcon size={14} />
                  </button>
                  {walletOpen && (
                    <div className="ew-wallet-dropdown">
                      {wallets.map((wallet) => (
                        <button key={wallet.id} className="ew-wallet-option" onClick={() => { setSelectedWallet(wallet); setWalletOpen(false); }}>
                          <div>
                            <strong>{wallet.wallet_name}</strong>
                            <span>{wallet.address}</span>
                          </div>
                          {selectedWallet?.id === wallet.id && <CheckIcon size={11} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Export Type */}
              <div className="ew-section">
                <div className="ew-section-top">
                  <span className="ew-label">Export Type</span>
                </div>
                <div className="ew-type-grid">
                  <button className={`ew-type-card ${exportType === "pk" ? "active" : ""}`} onClick={() => setExportType("pk")}>
                    <div className="ew-type-icon"><IconKey size={16} /></div>
                    <strong>Private Key</strong>
                    <span>Export raw wallet private key</span>
                  </button>
                  <button className={`ew-type-card ${exportType === "mnemonic" ? "active" : ""}`} onClick={() => setExportType("mnemonic")}>
                    <div className="ew-type-icon"><IconSeed size={16} /></div>
                    <strong>Seed Phrase</strong>
                    <span>Export mnemonic recovery phrase</span>
                  </button>
                </div>
              </div>

              {/* Secret */}
              <div className="ew-section">
                <div className="ew-section-top">
                  <span className="ew-label">Sensitive Data</span>
                  {secretData && (
                    <button className="ew-reveal-btn" onClick={() => setRevealed(!revealed)}>
                      {revealed ? <IconEyeOff size={15} /> : <IconEye size={15} />}
                      {revealed ? "Hide" : "Reveal"}
                    </button>
                  )}
                </div>
                <div className="ew-secret-box">
                  {secretData ? (
                    <span>{revealed ? secretData : hiddenSecret}</span>
                  ) : (
                    <span className="ew-secret-placeholder">Export credentials to reveal wallet data</span>
                  )}
                </div>
                {secretData && (
                  <div className="ew-secret-actions">
                    <button className="ew-copy-btn" onClick={handleCopy}>
                      <CopyIcon size={14} /> {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                )}
              </div>

              {error && <div className="ew-error">{error}</div>}

              <button className="ew-primary-btn ew-export-btn" disabled={!selectedWallet} onClick={() => { setError(""); setVerifyOpen(true); }}>
                Export Wallet Credentials
              </button>
            </div>

            {/* Sidebar */}
            <div className="ew-sidebar">
              <div className="ew-warning-card">
                <span className="ew-warning-title">Security Warning</span>
                <ul>
                  <li>Never share your private key with anyone.</li>
                  <li>Anyone with access can control your wallet funds.</li>
                  <li>Store your recovery phrase offline securely.</li>
                  <li>SwanFi staff will never ask for your credentials.</li>
                </ul>
              </div>
              <div className="ew-security-card">
                <span className="ew-warning-title">Protection Status</span>
                <div className="ew-security-item">
                  <div className="ew-security-dot" />
                  <div><strong>2FA Enabled</strong><span>Wallet export protection active</span></div>
                </div>
                <div className="ew-security-item">
                  <div className="ew-security-dot" />
                  <div><strong>Encrypted Storage</strong><span>Credentials protected securely</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <VerifyModal open={verifyOpen} loading={loading} error={error} exportType={exportType} onClose={() => setVerifyOpen(false)} onConfirm={handleExport} />
    </>
  );
}