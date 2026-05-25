// src/components/AuthModal/AuthModal.jsx
// Login + Sign Up — same logic, SwanFi branding
import { useState, useEffect } from "react";
import "./auth-modal.css";
import { connectEvmWallet } from "../../utils/evmWallet";
import { auth as authApi } from "../../services/api";
import { TelegramBrandIcon, GoogleIcon, MetaMaskIcon, BackIcon, CloseIcon } from "../../assets/icons";

function SwanLogo() {
  return (
    <div className="auth-brand">
      <img src="/main-logo-swan.png" className="auth-brand-logo" alt="SwanFi" />
      <span className="auth-brand-name">
        <span className="auth-brand-swan">SWAN</span>
        <span className="auth-brand-fi">FI</span>
      </span>
    </div>
  );
}

export default function AuthModal({
  open,
  onClose,
  onConnectWallet,
  onLoginSuccess,
  initialMode = "login",
}) {
  const [mode, setMode] = useState(initialMode);
  const [step, setStep] = useState("form");
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (open) setReferralCode(sessionStorage.getItem("ref_code") || "");
  }, [open, mode]);

  // Cleanup Google when modal closes
  useEffect(() => {
    if (!open) {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
    }
  }, [open]);

  if (!open) return null;

  const isLogin = mode === "login";
  const isSignUp = mode === "signup";

  const resetForm = () => {
    setStep("form");
    setEmail("");
    setReferralCode(sessionStorage.getItem("ref_code") || "");
    setOtp("");
    setError("");
    setLoading(false);
  };

  const handleClose = () => { resetForm(); onClose(); };
  const switchMode = (m) => { resetForm(); setMode(m); };

  const startCooldown = () => {
    setResendCooldown(60);
    const t = setInterval(() => {
      setResendCooldown(prev => { if (prev <= 1) { clearInterval(t); return 0; } return prev - 1; });
    }, 1000);
  };

  const handleSuccess = (token) => {
    if (token) localStorage.setItem("token", token);
    if (isSignUp) {
      sessionStorage.removeItem("ref_code");
      localStorage.removeItem("reg_reward_notified");
    }
    handleClose();
    onConnectWallet?.();
    onLoginSuccess?.(token);
  };

  const handleSubmitEmail = async () => {
    setError("");
    if (!email.trim()) return setError("Please enter your email.");
    setLoading(true);
    try {
      const data = isLogin
        ? await authApi.loginRequest(email.trim())
        : await authApi.register(email.trim(), referralCode.trim() || undefined);

      if (isLogin && data.message?.includes("If email exists"))
        throw new Error("Email not registered. Please sign up first.");

      setStep("otp");
      startCooldown();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    setError("");
    if (!otp.trim()) return setError("Please enter the OTP code.");
    setLoading(true);
    try {
      const data = isLogin
        ? await authApi.loginVerify(email.trim(), otp.trim())
        : await authApi.verifyEmail(email.trim(), otp.trim());
      
      if (!isLogin) {
        setTimeout(() => {
          handleSuccess(data.token);
        }, 1500);
      } else {
        handleSuccess(data.token);
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setLoading(true);
    try {
      isLogin
        ? await authApi.loginRequest(email.trim())
        : await authApi.register(email.trim(), referralCode.trim() || undefined);
      startCooldown();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleMetaMask = async () => {
    try {
      const wallet = await connectEvmWallet();
      const nonceData = await authApi.walletNonce(wallet.address);
      const signature = await wallet.signer.signMessage(`Sign this message to login: ${nonceData.nonce}`);
      const ref = sessionStorage.getItem("ref_code") || undefined;
      const verifyData = await authApi.walletVerify(wallet.address, signature, ref);
      handleSuccess(verifyData.token);
    } catch (err) {
      if (
        err.code === 4001 ||
        err.code === "ACTION_REJECTED" ||
        err.message?.includes("User rejected") ||
        err.message?.includes("user rejected") ||
        err.message?.includes("User denied")
      ) {
        setError("Connection cancelled.");
      } else if (err.message === "NO_EVM_WALLET") {
        alert("No EVM wallet detected. Please install MetaMask or compatible wallet.");
      } else {
        setError(err.message);
      }
    }
  };

  const handleTelegram = async () => {
    const ref = sessionStorage.getItem("ref_code") || "";
    const data = await authApi.telegramBotStart(ref);
    window.open(data.botLink, "_blank");
  };

  const handleGoogle = async () => {
    try {
      setError("");
      setLoading(true);
      if (!window.google) throw new Error("Google SDK not loaded");

      // Cancel any pending Google auth first
      if (window.google.accounts?.id) {
        window.google.accounts.id.cancel();
      }

      let container = document.getElementById("google-btn-hidden");
      if (!container) {
        container = document.createElement("div");
        container.id = "google-btn-hidden";
        container.style.display = "none";
        document.body.appendChild(container);
      } else {
        container.innerHTML = "";
      }

      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            if (!response.credential) throw new Error("No ID token received");
            const ref = sessionStorage.getItem("ref_code") || undefined;
            const data = await authApi.googleLogin(response.credential, ref);
            handleSuccess(data.token);
          } catch (err) {
            setError(err.message);
            setLoading(false);
          }
        },
      });

      window.google.accounts.id.renderButton(container, { theme: "outline", size: "large" });
      const btn = container.querySelector("div[role=button]");
      if (btn) btn.click();
      else throw new Error("Google button not rendered");
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="auth-modal">

        <SwanLogo />

        <div className="auth-header">
          <h2>
            {step === "otp" ? (
              <span className="auth-header-otp">
                <button className="auth-back" onClick={() => { setStep("form"); setOtp(""); setError(""); }}>
                  <BackIcon size={14} />
                </button>
                Verify Email
              </span>
            ) : isLogin ? "Log In" : "Sign Up"}
          </h2>
          <button className="auth-close" onClick={handleClose}>
            <CloseIcon size={14} />
          </button>
        </div>

        {step === "form" && (
          <>
            <p className="auth-subtitle">
              {isLogin ? (
                <>Don't have an account?{" "}
                  <span className="auth-switch" onClick={() => switchMode("signup")}>Sign Up</span>
                </>
              ) : (
                <>Already have an account?{" "}
                  <span className="auth-switch" onClick={() => switchMode("login")}>Log In</span>
                </>
              )}
            </p>

            <label className="auth-label">Email</label>
            <div className="auth-input-wrap">
              <input className="auth-input" type="email" placeholder="Enter your email"
                value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmitEmail()}
                disabled={loading} />
            </div>

            {isSignUp && (
              <>
                <div className="auth-input-wrap auth-input-wrap--ref">
                  <input className="auth-input" type="text" placeholder="Invite code (optional)"
                    value={referralCode} onChange={e => setReferralCode(e.target.value)}
                    disabled={loading || !!sessionStorage.getItem("ref_code")}
                    style={sessionStorage.getItem("ref_code") ? { color: "var(--color-primary)", opacity: 0.9 } : {}} />
                  {sessionStorage.getItem("ref_code") && (
                    <span className="auth-ref-applied">✓ Applied</span>
                  )}
                </div>
                <p className="auth-ref-note">
                  Invite code cannot be changed after binding.
                </p>
              </>
            )}

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-btn-primary" onClick={handleSubmitEmail} disabled={loading}>
              {loading ? "Sending…" : isLogin ? "Log In" : "Sign Up"}
            </button>

            <div className="auth-divider"><span>or continue with</span></div>

            <div className="auth-wallets">
              <button className="auth-wallet-btn" onClick={handleTelegram} disabled={loading}>
                <div className="auth-wallet-icon-wrap"><TelegramBrandIcon /></div>
                <span className="auth-wallet-label">Telegram</span>
              </button>
              <button className="auth-wallet-btn" onClick={handleGoogle} disabled={loading}>
                <div className="auth-wallet-icon-wrap"><GoogleIcon /></div>
                <span className="auth-wallet-label">Google</span>
              </button>
              <button className="auth-wallet-btn" onClick={handleMetaMask} disabled={loading}>
                <div className="auth-wallet-icon-wrap"><MetaMaskIcon /></div>
                <span className="auth-wallet-label">MetaMask</span>
              </button>
            </div>
          </>
        )}

        {step === "otp" && (
          <>
            <p className="auth-subtitle">
              We sent a 6-digit code to <strong className="auth-email-highlight">{email}</strong>
            </p>

            <label className="auth-label">Verification Code</label>
            <div className="auth-input-wrap">
              <input className="auth-input auth-input--otp" type="text" inputMode="numeric"
                maxLength={6} placeholder="000000"
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                onKeyDown={e => e.key === "Enter" && handleVerifyOTP()}
                disabled={loading} />
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-btn-primary" onClick={handleVerifyOTP} disabled={loading}>
              {loading ? "Verifying…" : isLogin ? "Verify & Log In" : "Verify & Sign Up"}
            </button>

            <p className="auth-resend">
              Didn't receive it?{" "}
              <span className={`auth-resend-btn${resendCooldown > 0 ? " auth-resend-btn--disabled" : ""}`}
                    onClick={handleResend}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend"}
              </span>
            </p>
          </>
        )}

        <p className="auth-note">Non-custodial · We never access your private keys</p>
      </div>
    </div>
  );
}