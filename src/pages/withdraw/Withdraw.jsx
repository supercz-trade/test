// src/pages/withdraw/Withdraw.jsx

import { useEffect, useRef, useState } from "react";
import "./Withdraw.css";

import { withdraw, userWallet } from "../../services/api";
import {
  ArrowRightIcon,
  CopyIcon,
  CheckIcon,
  WalletIcon,
  ChevronDownIcon,
  IconShield,
  ExternalLinkIcon,
  CloseIcon,
} from "../../assets/icons";

// ── 2FA Modal ─────────────────────────────────────────────────────────────

function TwoFAModal({ open, loading, error, amount, address, onClose, onConfirm }) {
  const [code, setCode] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setCode("");
    setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="wd-backdrop" onClick={onClose} />
      <div className="wd-modal">
        <button className="wd-modal-close" onClick={onClose}>
          <CloseIcon size={16} />
        </button>
        <div className="wd-modal-icon">
          <IconShield size={18} />
        </div>
        <div className="wd-modal-header">
          <h2>Confirm Withdrawal</h2>
          <p>Enter your 2FA code to authorize this withdrawal request.</p>
        </div>
        <div className="wd-confirm-card">
          <div className="wd-confirm-row">
            <span>Amount</span>
            <strong>{amount || "0"} BNB</strong>
          </div>
          <div className="wd-confirm-row">
            <span>To</span>
            <strong>{address?.slice(0, 8)}...{address?.slice(-6)}</strong>
          </div>
        </div>
        <div className="wd-otp-wrap">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            maxLength={6}
            className="wd-otp-input"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && code.length === 6) onConfirm(code);
            }}
          />
          <div className="wd-otp-dots">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`wd-otp-dot ${i < code.length ? "filled" : ""}`} />
            ))}
          </div>
        </div>
        {error && <div className="wd-error">{error}</div>}
        <button className="wd-submit-btn" disabled={loading || code.length < 6} onClick={() => onConfirm(code)}>
          {loading ? "Submitting..." : "Authorize Withdrawal"}
        </button>
      </div>
    </>
  );
}

// ── Status Modal ─────────────────────────────────────────────────────────

function StatusModal({ open, requestId, amount, address, onClose }) {
  const [status, setStatus] = useState("pending");
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !requestId) return;
    let interval;
    const poll = async () => {
      try {
        const data = await withdraw.getStatus(requestId);
        setStatus(data.status);
        if (data.tx_hash) setTxHash(data.tx_hash);
        if (data.last_error) setError(data.last_error);
        if (data.status === "sent" || data.status === "failed") clearInterval(interval);
      } catch {}
    };
    poll();
    interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [open, requestId]);

  if (!open) return null;

  const isSuccess = status === "sent";
  const isFailed = status === "failed";
  const isFinal = isSuccess || isFailed;

  return (
    <>
      <div className="wd-backdrop" onClick={isFinal ? onClose : undefined} />
      <div className="wd-modal">
        {isFinal && (
          <button className="wd-modal-close" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        )}
        <div className={`wd-status-icon ${isSuccess ? "success" : isFailed ? "failed" : ""}`}>
          {isSuccess ? <CheckIcon size={16} /> : isFailed ? <CloseIcon size={16} /> : <ArrowRightIcon size={16} />}
        </div>
        <div className="wd-modal-header">
          <h2>{isSuccess ? "Withdrawal Sent" : isFailed ? "Transaction Failed" : "Processing Withdrawal"}</h2>
          <p>
            {isSuccess
              ? "Your transaction has been broadcast successfully."
              : isFailed
              ? "Something went wrong while processing your transaction."
              : "Please wait while we broadcast your transaction to BSC."}
          </p>
        </div>
        <div className="wd-confirm-card">
          <div className="wd-confirm-row">
            <span>Amount</span>
            <strong>{amount} BNB</strong>
          </div>
          <div className="wd-confirm-row">
            <span>Recipient</span>
            <strong>{address?.slice(0, 8)}...{address?.slice(-6)}</strong>
          </div>
        </div>
        {txHash && (
          <div className="wd-tx-card">
            <span className="wd-tx-label">Transaction Hash</span>
            <div className="wd-tx-row">
              <span className="wd-tx-hash">{txHash.slice(0, 12)}...{txHash.slice(-8)}</span>
              <button className="wd-copy-btn" onClick={() => navigator.clipboard.writeText(txHash)}>
                <CopyIcon size={13} />
              </button>
              <a className="wd-explorer-btn" href={`https://bscscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon size={12} /> BSCScan
              </a>
            </div>
          </div>
        )}
        {error && <div className="wd-error">{error}</div>}
        {isFinal && (
          <button className="wd-submit-btn" onClick={onClose}>
            Close
          </button>
        )}
      </div>
    </>
  );
}

// ── Main ────────────────────────────────────────────────────────────────

export default function Withdraw({ userProfile, isConnected, onConnectClick, on2FAOpen }) {
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [walletOpen, setWalletOpen] = useState(false);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [twoFAOpen, setTwoFAOpen] = useState(false);
  const [twoFAError, setTwoFAError] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [requestId, setRequestId] = useState(null);

  const is2FAEnabled = userProfile?.is2FAEnabled ?? userProfile?.twofaEnabled ?? false;

  const primaryWallet = userProfile?.wallets?.[0] || null;
  const balance = primaryWallet?.balanceBNB ?? primaryWallet?.balance_bnb ?? 0;

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

  const handleMax = () => {
    const maxAmount = Math.max(0, balance - 0.0005);
    setAmount(maxAmount > 0 ? maxAmount.toFixed(6) : "0");
  };

  const validate = () => {
    setError("");
    if (!selectedWallet) return "Select a wallet.";
    if (!to.trim()) return "Recipient address is required.";
    if (!amount || Number(amount) <= 0) return "Enter a valid amount.";
    if (Number(amount) > balance) return "Insufficient BNB balance.";
    return null;
  };

  const handleReview = () => {
    if (!isConnected) {
      onConnectClick?.();
      return;
    }
    if (!is2FAEnabled) {
      on2FAOpen?.();
      return;
    }
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setTwoFAOpen(true);
  };

  const handleConfirm = async (code) => {
    try {
      setLoading(true);
      setTwoFAError("");
      const data = await withdraw.request(selectedWallet.id, to, Number(amount), "BNB", code);
      setRequestId(data.id);
      setTwoFAOpen(false);
      setStatusOpen(true);
      setTo("");
      setAmount("");
    } catch (err) {
      setTwoFAError(err?.message || "Failed to submit withdrawal.");
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="wd-page">
        <div className="wd-empty">
          <WalletIcon size={36} />
          <h2>Connect Wallet</h2>
          <p>Login to access withdrawal features.</p>
          <button className="wd-submit-btn" onClick={onConnectClick}>Login / Connect</button>
        </div>
      </div>
    );
  }

  if (!is2FAEnabled) {
    return (
      <div className="wd-page">
        <div className="wd-empty">
          <IconShield size={36} />
          <h2>2FA Required</h2>
          <p>Enable Two-Factor Authentication before making withdrawals.</p>
          <button className="wd-submit-btn" onClick={on2FAOpen}>Enable 2FA</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="wd-page">
        <div className="wd-container">
          <div className="wd-grid">
            {/* LEFT */}
            <div className="wd-main-card">
              <div className="wd-card-header">
                <div>
                  <h2>Withdraw BNB</h2>
                  <p>Transfer BNB securely to any BEP-20 compatible wallet.</p>
                </div>
              </div>

              {/* Wallet */}
              <div className="wd-modern-section">
                <div className="wd-modern-top">
                  <span className="wd-modern-label">Source Wallet</span>
                </div>
                <div className="wd-wallet-select">
                  <button className="wd-wallet-btn" onClick={() => setWalletOpen(!walletOpen)}>
                    <div className="wd-wallet-left">
                      <div className="wd-wallet-icon"><WalletIcon size={15} /></div>
                      <div className="wd-wallet-info">
                        <strong>{selectedWallet ? selectedWallet.wallet_name : "Select Wallet"}</strong>
                        <span>{selectedWallet ? `${selectedWallet.address.slice(0, 10)}...${selectedWallet.address.slice(-6)}` : "No wallet selected"}</span>
                      </div>
                    </div>
                    <ChevronDownIcon size={14} />
                  </button>
                  {walletOpen && (
                    <div className="wd-wallet-dropdown">
                      {wallets.map((wallet) => (
                        <button key={wallet.id} className="wd-wallet-option" onClick={() => { setSelectedWallet(wallet); setWalletOpen(false); }}>
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

              {/* Recipient */}
              <div className="wd-modern-section">
                <div className="wd-modern-top">
                  <span className="wd-modern-label">Recipient Address</span>
                </div>
                <input className="wd-modern-input" placeholder="Paste BSC wallet address" value={to} spellCheck={false} onChange={(e) => setTo(e.target.value)} />
              </div>

              {/* Amount */}
              <div className="wd-modern-section">
                <div className="wd-modern-top">
                  <span className="wd-modern-label">Amount</span>
                  <span className="wd-modern-balance">Available: <strong>{balance.toFixed(4)} BNB</strong></span>
                </div>
                <div className="wd-modern-amount">
                  <input className="wd-modern-input wd-modern-input-amount" type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  <button className="wd-max-btn" onClick={handleMax}>MAX</button>
                  <span className="wd-modern-unit">BNB</span>
                </div>
              </div>

              {/* Review */}
              {amount && Number(amount) > 0 && (
                <div className="wd-review-card">
                  <div className="wd-review-row"><span>You Send</span><strong>{amount} BNB</strong></div>
                  <div className="wd-review-row"><span>Estimated Fee</span><strong>0.0005 BNB</strong></div>
                  <div className="wd-review-row wd-review-final"><span>Recipient Receives</span><strong>{Math.max(0, Number(amount) - 0.0005).toFixed(6)} BNB</strong></div>
                </div>
              )}

              {error && <div className="wd-error">{error}</div>}
              <button className="wd-submit-btn wd-submit-btn-large" onClick={handleReview}>Continue Withdrawal</button>
            </div>

            {/* RIGHT */}
            <div className="wd-sidebar">
              <div className="wd-side-card">
                <span className="wd-side-title">Security</span>
                <div className="wd-security-list">
                  <div className="wd-security-item">
                    <div className="wd-security-icon"><IconShield size={18} /></div>
                    <div><strong>2FA Protected</strong><span>Withdrawal confirmation enabled</span></div>
                  </div>
                  <div className="wd-security-item">
                    <div className="wd-security-icon"><ArrowRightIcon size={16} /></div>
                    <div><strong>Live Broadcasting</strong><span>Real-time BSC transaction status</span></div>
                  </div>
                </div>
              </div>
              <div className="wd-warning-card">
                <span className="wd-warning-title">Important Notes</span>
                <ul>
                  <li>Only send to BSC compatible wallets.</li>
                  <li>Transactions cannot be reversed.</li>
                  <li>Ensure the address is correct before confirming.</li>
                  <li>Network congestion may affect confirmation speed.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TwoFAModal open={twoFAOpen} loading={loading} error={twoFAError} amount={amount} address={to} onClose={() => setTwoFAOpen(false)} onConfirm={handleConfirm} />
      <StatusModal open={statusOpen} requestId={requestId} amount={amount} address={to} onClose={() => { setStatusOpen(false); setRequestId(null); }} />
    </>
  );
}