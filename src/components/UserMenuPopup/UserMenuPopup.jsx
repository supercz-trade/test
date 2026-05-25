// src/components/UserMenuPopup/UserMenuPopup.jsx

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import "./user-menu-popup.css";
import {
  AddFundsIcon,
  WithdrawIcon,
  ReferralIcon,
  ExportIcon,
  LogoutIcon,
  ShieldOffIcon,
  TelegramIcon,
  IconChevronRight,
  IconShield,
  IconCode,
  UserIcon
} from "../../assets/icons";


// ── Menu Item ──────────────────────────────────────────────────
function MenuItem({ icon, label, onClick, variant = "", mobileOnly = false, arrow = true }) {
  return (
    <button
      className={`um-item${variant ? ` um-item--${variant}` : ""}${mobileOnly ? " um-item--mobile-only" : ""}`}
      onClick={onClick}
    >
      <span className="um-item-icon">{icon}</span>
      <span className="um-item-label">{label}</span>
      {arrow && <span className="um-item-arrow"><IconChevronRight size={12} /></span>}
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function UserMenuPopup({
  open,
  onClose,
  anchorRef,
  userProfile,
  bnbBalance,
  bnbUsd,
  onLogout,
  on2FAOpen,
  onAddFunds,
  onRefreshUser
}) {
  const popupRef = useRef(null);
  const navigate = useNavigate();
  const [pos, setPos] = useState({ top: 60, left: 0 });

  useEffect(() => {
    if (!open || !anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      top:  rect.bottom + 8,
      left: Math.max(8, rect.right - 252),
    });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (
        popupRef.current && !popupRef.current.contains(e.target) &&
        anchorRef?.current && !anchorRef.current.contains(e.target)
      ) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const username = userProfile?.username || "—";
  const is2FAEnabled = userProfile?.is2FAEnabled ?? userProfile?.twofaEnabled ?? false;
  const walletAddr = userProfile?.wallets?.[0]?.address || null;
  const shortAddr = walletAddr
    ? `${walletAddr.slice(0, 6)}…${walletAddr.slice(-4)}`
    : "No wallet";

  const go = (path) => { navigate(path); onClose(); };
  const tgGroup = import.meta.env.VITE_TELEGRAM_GROUP || "swanfi";

  // [FIXED] handle2FA - call on2FAOpen directly without object
  const handle2FA = () => {
    onClose();
    on2FAOpen?.();
  };

  return createPortal(
    <div className="um-popup" ref={popupRef} style={{ top: pos.top, left: pos.left }}>

      {/* ── Header ── */}
      <div className="um-header">
        <div className="um-avatar">
          <UserIcon size={18} color="var(--text-muted)" />
        </div>
        <div className="um-header-info">
          <span className="um-username">{username}</span>
          <span className="um-wallet-addr">{shortAddr}</span>
        </div>
        <button
          className={`um-2fa-pill ${is2FAEnabled ? "um-2fa-pill--on" : "um-2fa-pill--off"}`}
          onClick={() => {
            if (!is2FAEnabled) handle2FA();
          }}
          title={is2FAEnabled ? "2FA enabled" : "Click to enable 2FA"}
        >
          {is2FAEnabled ? <IconShield size={11} /> : <ShieldOffIcon size={11} />}
          <span>2FA</span>
        </button>
      </div>

      {/* ── Balance ── */}
      <div className="um-balance">
        <div className="um-balance-left">
          <span className="um-balance-label">Portfolio</span>
          <span className="um-balance-bnb">{typeof bnbBalance === "number" ? bnbBalance.toFixed(4) : "0.0000"} BNB</span>
        </div>
        <div className="um-balance-right">
          <span className="um-balance-usd">{bnbUsd ?? "$0.00"}</span>
          <div className="um-balance-bar">
            <div className="um-balance-bar-fill" style={{ width: "35%" }} />
          </div>
        </div>
      </div>

      <div className="um-divider" />

      {/* ── Actions ── */}
      <div className="um-actions">
        <button className="um-action-btn um-action--funds um-action--mobile-only" onClick={() => { onAddFunds?.(); onClose(); }}>
          <AddFundsIcon size={14} />
          <span>Add Funds</span>
        </button>
        <button className="um-action-btn um-action--withdraw" onClick={() => go("/withdraw")}>
          <WithdrawIcon size={14} />
          <span>Withdraw</span>
        </button>
      </div>

      <div className="um-divider" />

      {/* ── Menu ── */}
      <MenuItem icon={<ReferralIcon size={14} />} label="Referral & Earn" onClick={() => go("/referral")} variant="referral" />
      <MenuItem icon={<ExportIcon size={14} />} label="Export Wallet" onClick={() => go("/export-wallet")} variant="export" />
      <MenuItem icon={<IconCode size={14} />} label="Developers" onClick={() => { window.open("/developers", "_blank"); onClose(); }} variant="dev" />
      <MenuItem icon={<TelegramIcon size={14} />} label="SwanFi Community" onClick={() => { window.open(`https://t.me/${tgGroup}`, "_blank"); onClose(); }} variant="telegram" />

      <div className="um-divider" />

      <MenuItem icon={<LogoutIcon size={14} />} label="Log Out" onClick={() => { localStorage.removeItem("token"); onClose(); onLogout?.(); }} variant="danger" arrow={false} />

    </div>,
    document.body
  );
}