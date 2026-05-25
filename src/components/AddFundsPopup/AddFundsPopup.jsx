import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { CopyIcon, CheckIcon, CloseIcon } from "../../assets/icons";
import "./add-funds-popup.css";

// BNB icon — pakai img karena bukan SVG inline
const IconBNB = () => (
  <img src="/assets/tokens/bnb.svg" alt="BNB" width="12" height="12" />
);

export default function AddFundsPopup({ open, onClose, anchorRef, walletAddress }) {
  const popupRef  = useRef(null);
  const canvasRef = useRef(null);
  const [copied,   setCopied]   = useState(false);
  const [pos,      setPos]      = useState({ top: 0, left: 0 });
  const [isMobile, setIsMobile] = useState(false);

  // ── Position ──
  useEffect(() => {
    if (!open || !anchorRef?.current) return;
    const mobile  = window.innerWidth <= 768;
    const rect    = anchorRef.current.getBoundingClientRect();
    const popupW  = 280;
    const margin  = 8;
    setIsMobile(mobile);

    if (mobile) {
      setPos({ top: rect.bottom + 8, left: 0 });
    } else {
      const idealLeft   = rect.right - popupW;
      const clampedLeft = Math.max(margin, Math.min(idealLeft, window.innerWidth - popupW - margin));
      setPos({ top: rect.bottom + 8, left: clampedLeft });
    }
  }, [open, anchorRef]);

  // ── QR code ──
  useEffect(() => {
    if (!open || !canvasRef.current || !walletAddress) return;
    const size = window.innerWidth <= 768 ? 156 : 172;
    QRCode.toCanvas(canvasRef.current, walletAddress, {
      width: size,
      margin: 1,
      color: { dark: "#ffffff", light: "#0d0d10" },
    }).catch(console.error);
  }, [open, walletAddress]);

  // ── Outside click ──
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (
        popupRef.current  && !popupRef.current.contains(e.target) &&
        anchorRef?.current && !anchorRef.current.contains(e.target)
      ) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const shortAddr = walletAddress
    ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}`
    : "—";

  const handleCopy = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const style = isMobile
    ? { top: pos.top }
    : { top: pos.top, left: pos.left };

  return createPortal(
    <div
      className={`af-popup${isMobile ? " af-popup--mobile" : ""}`}
      ref={popupRef}
      style={style}
    >
      {/* Header */}
      <div className="af-header">
        <div className="af-header-left">
          <div className="af-header-icon">
            <IconBNB />
          </div>
          <div>
            <span className="af-title">Add Funds</span>
            <span className="af-network">BNB Chain · BEP-20</span>
          </div>
        </div>
        <button className="af-close" onClick={onClose} aria-label="Close">
          <CloseIcon size={12} />
        </button>
      </div>

      {/* Status bar */}
      <div className="af-status-bar">
        <span className="af-status-dot" />
        <span className="af-status-text">Network active — instant deposits</span>
      </div>

      {/* QR */}
      <div className="af-qr-wrap">
        {walletAddress ? (
          <canvas ref={canvasRef} className="af-qr-canvas" />
        ) : (
          <div className="af-qr-empty">No wallet connected</div>
        )}
      </div>

      {/* Address */}
      <div className="af-address-block">
        <div className="af-address-row">
          <span className="af-address-text">{shortAddr}</span>
          <button className="af-copy-btn" onClick={handleCopy}>
            {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* Warning */}
      <div className="af-warning">
        <span className="af-warning-icon">⚠</span>
        <span>Only send <strong>BNB or BEP-20 tokens</strong>. Other assets may be lost permanently.</span>
      </div>
    </div>,
    document.body
  );
}