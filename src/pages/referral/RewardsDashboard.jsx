// src/pages/referral/RewardsDashboard.jsx
import { useEffect, useState, useCallback } from "react";
import { referral, rewards, tasks, user, userWallet } from "../../services/api";
import "./referral.css";

// ============================================================
// Icons (reused from original, simplified)
// ============================================================
const IconUsers = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
const IconCoins = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></svg>);
const IconZap = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>);
const IconGift = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>);
const IconActivity = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>);
const IconCheck = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7"/></svg>);
const IconCopy = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>);
const IconWallet = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36"><rect x="2" y="7" width="20" height="14" rx="3"/><path d="M16 12h2M2 11V6a2 2 0 0 1 2-2h14l2 3" strokeLinecap="round"/></svg>);

// Helper
function formatBnb(val) {
  const n = Number(val);
  if (isNaN(n)) return "0";
  return n.toFixed(6).replace(/\.?0+$/, "");
}

// ============================================================
// Main Component
// ============================================================
export default function RewardsDashboard({ isConnected, onConnectClick }) {
  // ----- Referral State -----
  const [refStats, setRefStats] = useState(null);
  const [refActivity, setRefActivity] = useState([]);
  const [refRewards, setRefRewards] = useState([]);
  const [tradeRewards, setTradeRewards] = useState([]);
  const [claimingRef, setClaimingRef] = useState(false);
  const [claimingTrade, setClaimingTrade] = useState(false);

  // ----- User Rewards (registration, task, trade) -----
  const [userRewards, setUserRewards] = useState([]);
  const [claimingAllRewards, setClaimingAllRewards] = useState(false);
  const [destinationAddress, setDestinationAddress] = useState("");
  const [userWallets, setUserWallets] = useState([]);

  // ----- Tasks -----
  const [allTasks, setAllTasks] = useState([]);
  const [completedTaskIds, setCompletedTaskIds] = useState([]);
  const [completingTask, setCompletingTask] = useState(null);

  const [loading, setLoading] = useState(true);
  const [claimMsg, setClaimMsg] = useState("");
  const [activeTab, setActiveTab] = useState("referral"); // referral, rewards, tasks

  const showMessage = (msg) => {
    setClaimMsg(msg);
    setTimeout(() => setClaimMsg(""), 3000);
  };

  const loadData = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      // 1. Referral data
      const [stats, activity, refRew, tradeRew] = await Promise.all([
        referral.getStats(),
        referral.getActivity(),
        referral.getRewards(),
        referral.getTradeRewards(),
      ]);
      setRefStats(stats);
      setRefActivity(activity.activities || []);
      setRefRewards(refRew.rewards || []);
      setTradeRewards(tradeRew.rewards || []);

      // 2. User rewards (pending)
      const pending = await rewards.getPending();
      setUserRewards(pending);

      // 3. Tasks
      const tasksData = await tasks.getList();
      setAllTasks(tasksData.tasks || []);
      setCompletedTaskIds(tasksData.completed || []);

      // 4. User wallets for claim destination
      const wallets = await userWallet.list();
      setUserWallets(wallets);
      if (wallets && wallets.length > 0) {
        setDestinationAddress(wallets[0].address);
      } else {
        const me = await user.getMe();
        if (me?.wallets?.[0]?.address) setDestinationAddress(me.wallets[0].address);
      }
    } catch (err) {
      console.error("Load data error:", err);
      showMessage("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [isConnected]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ----- Referral Claim Handlers -----
  const handleClaimRef = async () => {
    if (claimingRef) return;
    setClaimingRef(true);
    try {
      await referral.claim();
      showMessage("Referral rewards claimed!");
      loadData();
    } catch (err) {
      showMessage(err.message || "Claim failed");
    } finally {
      setClaimingRef(false);
    }
  };

  const handleClaimTrade = async () => {
    if (claimingTrade) return;
    setClaimingTrade(true);
    try {
      await referral.claimTrade();
      showMessage("Trade rewards claimed!");
      loadData();
    } catch (err) {
      showMessage(err.message || "Claim failed");
    } finally {
      setClaimingTrade(false);
    }
  };

  // ----- User Rewards Claim (all pending) -----
  const handleClaimAllRewards = async () => {
    if (!destinationAddress) {
      showMessage("Please select a wallet address");
      return;
    }
    if (claimingAllRewards) return;
    setClaimingAllRewards(true);
    try {
      const result = await rewards.claim(destinationAddress);
      showMessage(`Claimed ${formatBnb(result.totalBnb)} BNB!`);
      loadData(); // refresh pending rewards
    } catch (err) {
      showMessage(err.message || "Claim failed");
    } finally {
      setClaimingAllRewards(false);
    }
  };

  // ----- Task Complete -----
  const handleCompleteTask = async (taskId) => {
    if (completingTask === taskId) return;
    setCompletingTask(taskId);
    try {
      const res = await tasks.complete(taskId);
      showMessage(`Task completed! +${formatBnb(res.reward)} BNB earned.`);
      loadData(); // refresh tasks and rewards
    } catch (err) {
      showMessage(err.message || "Failed to complete task");
    } finally {
      setCompletingTask(null);
    }
  };

  // ----- Not connected state -----
  if (!isConnected) {
    return (
      <div className="rf-page">
        <div className="rf-empty">
          <div className="rf-empty-icon"><IconWallet /></div>
          <h3>Connect your wallet</h3>
          <p>Login to view your referral stats, rewards, and tasks.</p>
          <button className="rf-connect-btn" onClick={onConnectClick}>Login / Connect</button>
        </div>
      </div>
    );
  }

  // ----- Totals for user rewards -----
  const totalUserRewardsBnb = userRewards.reduce((sum, r) => sum + parseFloat(r.amount_bnb || 0), 0);
  const totalRefRewardsBnb = refRewards.filter(r => r.status === "pending").reduce((sum, r) => sum + parseFloat(r.amount_bnb || 0), 0);
  const totalTradeRewardsBnb = tradeRewards.filter(r => r.status === "pending").reduce((sum, r) => sum + parseFloat(r.amount_bnb || 0), 0);

  // Render tabs content
  const renderReferralTab = () => (
    <div>
      {/* Stats row */}
      <div className="rf-stats-row">
        <div className="rf-stat-card">
          <div className="rf-stat-icon rf-stat-icon--yellow"><IconUsers /></div>
          <div className="rf-stat-label">Total Referrals</div>
          <div className="rf-stat-val rf-stat-val--yellow">{loading ? "—" : refStats?.referralCount || 0}</div>
        </div>
        <div className="rf-stat-card">
          <div className="rf-stat-icon rf-stat-icon--green"><IconCoins /></div>
          <div className="rf-stat-label">Ref Rewards Pending</div>
          <div className="rf-stat-val rf-stat-val--green">{formatBnb(totalRefRewardsBnb)} BNB</div>
          <button className="rf-claim-btn rf-claim-btn--green" onClick={handleClaimRef} disabled={claimingRef || totalRefRewardsBnb === 0}>
            {claimingRef ? "Claiming..." : "Claim"}
          </button>
        </div>
        <div className="rf-stat-card">
          <div className="rf-stat-icon rf-stat-icon--orange"><IconZap /></div>
          <div className="rf-stat-label">Trade Rewards Pending</div>
          <div className="rf-stat-val rf-stat-val--orange">{formatBnb(totalTradeRewardsBnb)} BNB</div>
          <button className="rf-claim-btn rf-claim-btn--orange" onClick={handleClaimTrade} disabled={claimingTrade || totalTradeRewardsBnb === 0}>
            {claimingTrade ? "Claiming..." : "Claim"}
          </button>
        </div>
      </div>

      {/* Activity table */}
      <div className="rf-activity-card">
        <div className="rf-activity-header">
          <span className="rf-activity-title">Referral Activity</span>
        </div>
        {refActivity.length === 0 ? (
          <div className="rf-activity-empty"><div>No activity yet</div></div>
        ) : (
          <div className="rf-table-wrap">
            <table className="rf-table">
              <thead><tr><th>User</th><th>Type</th><th>Date</th></tr></thead>
              <tbody>
                {refActivity.map((act, idx) => (
                  <tr key={act.id || idx}>
                    <td>{act.referred_username || "User"}</td>
                    <td><span className={act.type === "signup" ? "rf-badge-signup" : "rf-badge-trade"}>{act.type === "signup" ? "Signup" : "Trade"}</span></td>
                    <td>{new Date(act.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderRewardsTab = () => (
    <div>
      <div className="rf-stats-row">
        <div className="rf-stat-card">
          <div className="rf-stat-icon rf-stat-icon--purple"><IconGift /></div>
          <div className="rf-stat-label">Total Pending Rewards</div>
          <div className="rf-stat-val">{formatBnb(totalUserRewardsBnb)} BNB</div>
        </div>
        <div className="rf-stat-card">
          <div className="rf-stat-label">Claim to Wallet</div>
          <select value={destinationAddress} onChange={(e) => setDestinationAddress(e.target.value)} style={{ background: "var(--bg-base)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "6px", width: "100%", marginBottom: "8px" }}>
            {userWallets.map(w => <option key={w.id} value={w.address}>{w.wallet_name || w.address.slice(0,10)}</option>)}
          </select>
          <button className="rf-claim-btn" style={{ background: "var(--swan-yellow)", color: "var(--swan-black)" }} onClick={handleClaimAllRewards} disabled={claimingAllRewards || totalUserRewardsBnb === 0}>
            {claimingAllRewards ? "Claiming..." : "Claim All Rewards"}
          </button>
        </div>
      </div>
      <div className="rf-activity-card">
        <div className="rf-activity-header"><span className="rf-activity-title">Pending Rewards History</span></div>
        {userRewards.length === 0 ? (
          <div className="rf-activity-empty"><div>No pending rewards</div></div>
        ) : (
          <div className="rf-table-wrap">
            <table className="rf-table">
              <thead><tr><th>Type</th><th>Amount (BNB)</th><th>Date</th></tr></thead>
              <tbody>
                {userRewards.map((rw, idx) => (
                  <tr key={rw.id || idx}>
                    <td><span className="rf-badge-signup">{rw.type === "registration" ? "Registration" : rw.type === "task" ? "Task" : "Trade"}</span></td>
                    <td className="rf-reward-val">{formatBnb(rw.amount_bnb)}</td>
                    <td>{new Date(rw.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderTasksTab = () => (
    <div>
      <div className="rf-stats-row">
        <div className="rf-stat-card">
          <div className="rf-stat-icon rf-stat-icon--purple"><IconActivity /></div>
          <div className="rf-stat-label">Completed Tasks</div>
          <div className="rf-stat-val">{completedTaskIds.length} / {allTasks.length}</div>
        </div>
        <div className="rf-stat-card">
          <div className="rf-stat-label">Total Reward from Tasks</div>
          <div className="rf-stat-val">{formatBnb(userRewards.filter(r => r.type === "task").reduce((s,r)=>s+parseFloat(r.amount_bnb),0))} BNB</div>
        </div>
      </div>
      <div className="rf-activity-card">
        <div className="rf-activity-header"><span className="rf-activity-title">Available Tasks</span></div>
        {allTasks.length === 0 ? (
          <div className="rf-activity-empty"><div>No tasks available</div></div>
        ) : (
          <div className="rf-table-wrap">
            <table className="rf-table">
              <thead><tr><th>Task</th><th>Reward</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {allTasks.map(task => {
                  const isCompleted = completedTaskIds.includes(task.id);
                  return (
                    <tr key={task.id}>
                      <td><strong>{task.title}</strong><br /><span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{task.description}</span></td>
                      <td className="rf-reward-val">{formatBnb(task.reward_bnb)} BNB</td>
                      <td>{isCompleted ? <span style={{ color: "var(--color-success)" }}>Completed</span> : <span style={{ color: "var(--text-muted)" }}>Pending</span>}</td>
                      <td>
                        {!isCompleted && (
                          <button className="rf-claim-btn" style={{ background: "var(--color-primary)", color: "var(--swan-black)" }} onClick={() => handleCompleteTask(task.id)} disabled={completingTask === task.id}>
                            {completingTask === task.id ? "Completing..." : "Complete"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ----- Main render -----
  return (
    <div className="rf-page">
      {claimMsg && <div className="rf-claim-toast">{claimMsg}</div>}
      <div className="rf-container">
        <div className="rf-hero">
          <div className="rf-hero-left">
            <div className="rf-hero-eyebrow"><span className="rf-hero-eyebrow-dot" />Rewards Hub</div>
            <h1 className="rf-hero-title">Earn <span>BNB</span> by Trading, Referring & Completing Tasks</h1>
            <p className="rf-hero-sub">Claim registration bonus, trade cashback, task rewards, and referral commissions — all in one place.</p>
          </div>
          <div className="rf-hero-right">
            <div className="rf-commission-label">Total Pending</div>
            <div className="rf-commission-val">{formatBnb(totalUserRewardsBnb + totalRefRewardsBnb + totalTradeRewardsBnb)} BNB</div>
            <div className="rf-commission-sub">across all rewards</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="rf-tab-switcher" style={{ marginBottom: "20px", justifyContent: "center", gap: "8px" }}>
          <button className={`rf-chart-tab ${activeTab === "referral" ? "active" : ""}`} onClick={() => setActiveTab("referral")}>Referral</button>
          <button className={`rf-chart-tab ${activeTab === "rewards" ? "active" : ""}`} onClick={() => setActiveTab("rewards")}>Rewards</button>
          <button className={`rf-chart-tab ${activeTab === "tasks" ? "active" : ""}`} onClick={() => setActiveTab("tasks")}>Tasks</button>
        </div>

        {activeTab === "referral" && renderReferralTab()}
        {activeTab === "rewards" && renderRewardsTab()}
        {activeTab === "tasks" && renderTasksTab()}
      </div>
    </div>
  );
}