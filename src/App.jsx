// src/App.jsx
// SwanFi Main Entry

import { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import AuthModal from "./components/AuthModal/AuthModal";
import TwoFAModal from "./components/TwoFAModal/TwoFAModal";
import AddFundsPopup from "./components/AddFundsPopup/AddFundsPopup";
import TradeNotif from "./components/TradeNotif/TradeNotif";

import { QuickBuyProvider } from "./context/QuickBuyContext";
import { useRefCode } from "./hooks/useRefCode";

import { user, reward } from "./services/api";
import { STORAGE_KEYS } from "./services/config";

import Discover from "./pages/discover/Discover";
import TermsOfService from "./pages/others/TermsOfService";
import PrivacyPolicy from "./pages/others/PrivacyPolicy";
import Disclosures from "./pages/others/Disclosures";
import Help from "./pages/others/Help";
import Developers from "./pages/developers/Developers";
import Withdraw from "./pages/withdraw/Withdraw";
import ExportWallet from "./pages/export-wallet/ExportWallet";
import Portfolio from "./pages/portfolio/Portfolio";
import AddressPage from "./pages/address/AddressPage";
import Trade from "./pages/trade/Trade";
import TgLogin from "./pages/tglogin/TgLogin";
import Referral from "./pages/referral/Referral";
import XCallback from "./pages/auth/XCallback";

function AppInner() {
  const [authOpen, setAuthOpen] = useState(false);
  const [twoFAOpen, setTwoFAOpen] = useState(false);
  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [bnbBalance, setBnbBalance] = useState(null);
  const [bnbUsd, setBnbUsd] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [regNotif, setRegNotif] = useState(null);

  useRefCode();

  const updateUserState = useCallback((data) => {
    setIsConnected(true);
    setUserProfile(data);
    const firstWallet = data?.wallets?.[0];
    const walletBnb = firstWallet?.balanceBNB ?? firstWallet?.balanceBnb ?? data?.bnbBalance ?? null;
    setBnbBalance(walletBnb);
    setBnbUsd(data.bnbUsd ?? null);
  }, []);

  const clearUserState = useCallback(() => {
    setIsConnected(false);
    setUserProfile(null);
    setBnbBalance(null);
    setBnbUsd(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.token);
    if (!token) return;
    user.getMe()
      .then(updateUserState)
      .catch(() => {
        localStorage.removeItem(STORAGE_KEYS.token);
      });
  }, [updateUserState]);

  const fetchRegistrationReward = useCallback(() => {
    if (!isConnected || !userProfile) return;
    const shownKey = "reg_reward_notified";
    if (localStorage.getItem(shownKey) === "true") return;

    reward.getPending()
      .then((res) => {
        let rewardsList = [];
        if (Array.isArray(res)) {
          rewardsList = res;
        } else if (res?.rewards && Array.isArray(res.rewards)) {
          rewardsList = res.rewards;
        } else if (res?.data && Array.isArray(res.data)) {
          rewardsList = res.data;
        }
        const regReward = rewardsList.find(r => r.type === "registration" && r.status === "pending");
        if (regReward) {
          setRegNotif({
            type: "registration",
            amount: regReward.amountBNB || regReward.amount_bnb,
            rewardId: regReward.id,
          });
          localStorage.setItem(shownKey, "true");
          setTimeout(() => setRegNotif(null), 10000);
        }
      })
      .catch((err) => {
        console.debug("Pending rewards endpoint not available yet:", err.message);
      });
  }, [isConnected, userProfile]);

  useEffect(() => {
    fetchRegistrationReward();
  }, [fetchRegistrationReward]);

  useEffect(() => {
    const handleRefreshRewards = () => {
      localStorage.removeItem("reg_reward_notified");
      fetchRegistrationReward();
    };
    window.addEventListener("refresh-pending-rewards", handleRefreshRewards);
    return () => window.removeEventListener("refresh-pending-rewards", handleRefreshRewards);
  }, [fetchRegistrationReward]);

  const handleLoginSuccess = useCallback(() => {
    user.getMe()
      .then(updateUserState)
      .catch(() => {});
  }, [updateUserState]);

  const handleRegistrationSuccess = useCallback(() => {
    localStorage.removeItem("reg_reward_notified");
    window.dispatchEvent(new CustomEvent("refresh-pending-rewards"));
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem("reg_reward_notified");
    clearUserState();
  }, [clearUserState]);

  const handleRefreshUser = useCallback(() => {
    user.getMe()
      .then((data) => {
        setUserProfile(data);
        const firstWallet = data?.wallets?.[0];
        const walletBnb = firstWallet?.balanceBNB ?? firstWallet?.balanceBnb ?? data?.bnbBalance ?? null;
        setBnbBalance(walletBnb);
        setBnbUsd(data.bnbUsd ?? null);
      })
      .catch(() => {});
  }, []);

  const handleAddFunds = useCallback((anchorElement) => {
    setAnchorEl(anchorElement);
    setAddFundsOpen(true);
  }, []);

  const handleCloseAuth = useCallback(() => setAuthOpen(false), []);
  const handleOpenAuth = useCallback(() => setAuthOpen(true), []);
  const handleClose2FA = useCallback(() => setTwoFAOpen(false), []);
  const handleOpen2FA = useCallback(() => setTwoFAOpen(true), []);
  const handleCloseAddFunds = useCallback(() => setAddFundsOpen(false), []);

  const handle2FASuccess = useCallback(() => {
    handleRefreshUser();
    handleClose2FA();
  }, [handleRefreshUser, handleClose2FA]);

  const firstWalletId = userProfile?.wallets?.[0]?.id ?? null;
  const firstWalletAddress = userProfile?.wallets?.[0]?.address ?? null;

  return (
    <QuickBuyProvider>
      <div className="app-container">
        <Navbar
          onConnectClick={handleOpenAuth}
          isConnected={isConnected}
          userProfile={userProfile}
          bnbBalance={bnbBalance}
          bnbUsd={bnbUsd}
          onLogout={handleLogout}
          onAddFunds={handleAddFunds}
          onRefreshUser={handleRefreshUser}
        />

        <AuthModal
          open={authOpen}
          onClose={handleCloseAuth}
          onLoginSuccess={handleLoginSuccess}
          onRegistrationSuccess={handleRegistrationSuccess}
        />

        <TwoFAModal
          open={twoFAOpen}
          onClose={handleClose2FA}
          onSuccess={handle2FASuccess}
        />

        <AddFundsPopup
          open={addFundsOpen}
          onClose={handleCloseAddFunds}
          anchorRef={anchorEl}
          walletAddress={firstWalletAddress}
        />

        <TradeNotif
          notif={regNotif}
          onDismiss={() => setRegNotif(null)}
          onAction={() => { window.location.href = "/referral"; }}
        />

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/discover" replace />} />
            <Route path="/discover" element={<Discover walletId={firstWalletId} />} />
            <Route path="/trade/:address" element={
              <Trade
                isConnected={isConnected}
                onConnectClick={handleOpenAuth}
                bnbBalance={bnbBalance || "0.0000"}
                walletId={firstWalletId}
                onRefreshBalance={handleRefreshUser}
              />
            } />
            <Route path="/portfolio" element={<Portfolio isConnected={isConnected} userProfile={userProfile} onConnectClick={handleOpenAuth} />} />
            <Route path="/address/:wallet" element={<AddressPage />} />
            <Route path="/withdraw" element={<Withdraw isConnected={isConnected} userProfile={userProfile} onConnectClick={handleOpenAuth} on2FAOpen={handleOpen2FA} />} />
            <Route path="/export-wallet" element={<ExportWallet isConnected={isConnected} userProfile={userProfile} onConnectClick={handleOpenAuth} on2FAOpen={handleOpen2FA} />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/disclosures" element={<Disclosures />} />
            <Route path="/help" element={<Help />} />
            <Route path="/developers" element={<Developers isConnected={isConnected} userProfile={userProfile} onConnectClick={handleOpenAuth} />} />
            <Route path="/tglogin" element={<TgLogin />} />
            <Route path="/referral" element={<Referral isConnected={isConnected} onConnectClick={handleOpenAuth} />} />
            <Route path="/auth/x/callback" element={<XCallback />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </QuickBuyProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}