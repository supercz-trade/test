// src/components/TradeNotif/TradeNotif.jsx

import { useEffect, useRef } from "react";
import { CloseIcon, IconError, IconArrow } from "../../assets/icons";
import { formatBnbNotif } from "../../utils/format";
import "./tradeNotif.css";

const BnbIcon = () => (
  <img
    src="/assets/tokens/bnb.svg"
    alt="BNB"
    className="tn-bnb-icon"
  />
);

function playSound(src, volume = 0.5) {
  try {
    if (localStorage.getItem("ui_sound") === "off") return;
    const audio = new Audio(src);
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch {}
}

export default function TradeNotif({ notif, onDismiss, onAction }) {
  const timer = useRef(null);

  useEffect(() => {
    if (!notif) return;
    clearTimeout(timer.current);
    let ms = 8000;
    if (notif.type === "registration") ms = 10000;
    if (notif.type === "error") ms = 12000;
    timer.current = setTimeout(() => onDismiss?.(), ms);
    return () => clearTimeout(timer.current);
  }, [notif, onDismiss]);

  useEffect(() => {
    if (notif?.type === "reward") {
      playSound("/sound/reward-trade.mp3", 0.6);
    }
  }, [notif]);

  if (!notif) return null;

  const isReward = notif.type === "reward";
  const isRegistration = notif.type === "registration";
  const isError = notif.type === "error";

  const handleAction = (e) => {
    e.stopPropagation();
    onDismiss?.();
    onAction?.();
  };

  return (
    <div className={`tn-wrap ${isReward ? "tn-reward" : isRegistration ? "tn-registration" : "tn-error"}`}>
      <div className="tn-bar">
        <div className="tn-icon">
          {(isReward || isRegistration) ? <BnbIcon /> : <IconError />}
        </div>

        <div className="tn-content">
          {isReward && (
            <>
              <div className="tn-title">
                <span className="tn-amount">+{formatBnbNotif(notif.cashback)}</span>
                <span className="tn-unit">BNB</span>
              </div>
              <div className="tn-sub">Trade reward credited to your wallet</div>
            </>
          )}
          {isRegistration && (
            <>
              <div className="tn-title">
                <span className="tn-amount">+{formatBnbNotif(notif.amount)}</span>
                <span className="tn-unit">BNB</span>
              </div>
              <div className="tn-sub">Registration reward added to pending rewards</div>
            </>
          )}
          {isError && (
            <>
              <div className="tn-title tn-title-err">Transaction Failed</div>
              <div className="tn-sub tn-sub-err">{notif.message || "Please try again"}</div>
            </>
          )}
        </div>

        <div className="tn-actions">
          {(isReward || isRegistration) && onAction && (
            <button className="tn-action-btn" onClick={handleAction}>
              <span>{isReward ? "Claim" : "View Rewards"}</span>
              <IconArrow />
            </button>
          )}
          <button className="tn-close" onClick={(e) => { e.stopPropagation(); onDismiss?.(); }}>
            <CloseIcon size={14} />
          </button>
        </div>
      </div>

      <div className="tn-progress">
        <div
          className={`tn-progress-bar ${isReward ? "tn-prog-reward" : isRegistration ? "tn-prog-registration" : "tn-prog-error"}`}
          style={{ animationDuration: isReward ? "8s" : isRegistration ? "10s" : "12s" }}
        />
      </div>
    </div>
  );
}