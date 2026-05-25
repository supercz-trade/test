// src/pages/referral/Referral.jsx
import { useEffect, useState, useCallback } from "react";
import { referral, reward, tasks, bind } from "../../services/api";
import {
  IconUsers,
  IconCoins,
  IconTrendUp,
  IconGift,
  IconCopy,
  IconCheck,
  IconTelegram,
  IconTwitter,
  IconZap,
  IconActivity,
  IconBookOpen,
  IconWallet,
} from "../../assets/icons";
import "./referral.css";

export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function SparkChart({ data, color = "#ffd400" }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const W = 500, H = 140;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 20) - 10;
    return `${x},${y}`;
  });
  const pathD = `M${pts.join(" L")}`;
  const fillD = `M0,${H} L${pts.join(" L")} L${W},${H} Z`;
  const gradId = `rf-grad-${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].split(",")[0]} cy={pts[pts.length - 1].split(",")[1]} r="4" fill={color} />
    </svg>
  );
}

function TutorialSection({ referralCode }) {
  const [copiedIdx, setCopiedIdx] = useState(null);
  const code = referralCode && referralCode !== "—" ? referralCode : "YOUR_CODE";
  const APP_URL = window.location.origin;
  const examples = [
    {
      label: "Trade Page",
      icon: "⚡",
      description: "Add ?ref=CODE to any token page URL when sharing with friends.",
      url: `${APP_URL}/trade/<Address-Token>?ref=${code}`,
      tip: "Great for sharing a trending token.",
    },
  ];
  const handleCopy = (url, idx) => {
    navigator.clipboard.writeText(url);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };
  return (
    <div className="rf-tutorial-card">
      <div className="rf-tutorial-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="rf-tutorial-icon-wrap"><IconBookOpen /></span>
          <span className="rf-tutorial-title">How to Use Your Referral Link</span>
        </div>
        <span className="rf-tutorial-badge">Tutorial</span>
      </div>
      <p className="rf-tutorial-intro">
        Append <code className="rf-tutorial-code-inline">?ref={code}</code> to any page URL and share it. You earn{" "}
        <strong style={{ color: "#ffd400" }}>50%</strong> commission on every trade your referrals make.
      </p>
      <div className="rf-tutorial-examples">
        {examples.map((ex, i) => (
          <div key={i} className="rf-tutorial-example">
            <div className="rf-tutorial-example-header">
              <span className="rf-tutorial-example-emoji">{ex.icon}</span>
              <span className="rf-tutorial-example-label">{ex.label}</span>
              <span className="rf-tutorial-example-tip">{ex.tip}</span>
            </div>
            <p className="rf-tutorial-example-desc">{ex.description}</p>
            <div className="rf-tutorial-url-row">
              <span className="rf-tutorial-url">
                <span className="rf-tutorial-url-base">{APP_URL}</span>
                <span className="rf-tutorial-url-path">{ex.url.replace(APP_URL, "")}</span>
              </span>
              <button
                className={`rf-tutorial-copy-btn ${copiedIdx === i ? "rf-tutorial-copy-btn--copied" : ""}`}
                onClick={() => handleCopy(ex.url, i)}
              >
                {copiedIdx === i ? <><IconCheck /> Copied!</> : <><IconCopy /> Copy</>}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="rf-tutorial-note">
        <span className="rf-tutorial-note-icon">💡</span>
        <span>
          Your ref code is detected automatically when a friend opens the link. Commission is credited directly to your wallet after every trade they make.
        </span>
      </div>
    </div>
  );
}

export default function Referral({ isConnected, onConnectClick }) {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [refRewards, setRefRewards] = useState([]);
  const [allRewards, setAllRewards] = useState([]);
  const [rewardStats, setRewardStats] = useState(null);
  const [taskList, setTaskList] = useState([]);
  const [completedTaskIds, setCompletedTaskIds] = useState([]);
  const [referralChartData, setReferralChartData] = useState({ users: [] });
  const [rewardChartData, setRewardChartData] = useState({ rewards: [] });
  const [loading, setLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [chartRange, setChartRange] = useState("7D");
  const [activeTab, setActiveTab] = useState("referralMain");
  const [mobileSection, setMobileSection] = useState("stats");
  const [claimingRef, setClaimingRef] = useState(false);
  const [claimingAll, setClaimingAll] = useState(false);
  const [claimMsg, setClaimMsg] = useState("");
  const [endpointError, setEndpointError] = useState(false);
  const [bindingX, setBindingX] = useState(false);

  const APP_URL = window.location.origin;
  const TELEGRAM_GROUP = import.meta.env.VITE_TELEGRAM_GROUP || "supercz_community";
  const MIN_CLAIM = 0.001;

  // Formatting helpers
  const formatBnbCard = (val) => {
    const n = Number(val);
    if (isNaN(n)) return "0";
    let fixed = n.toFixed(6).replace(/\.?0+$/, "");
    return fixed === "" ? "0" : fixed;
  };

  const formatBnbTable = (val) => {
    const n = Number(val);
    if (isNaN(n)) return "0";
    let full = n.toFixed(18).replace(/\.?0+$/, "");
    return full === "" ? "0" : full;
  };

  const loadData = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    setEndpointError(false);
    try {
      const results = await Promise.allSettled([
        referral.getStats(),
        referral.getActivity(),
        referral.getRewards(),
        reward.getAll(),
        reward.getStats(),
        tasks.getList(),
      ]);

      const statsData = results[0]?.status === 'fulfilled' ? results[0].value : null;
      const activityData = results[1]?.status === 'fulfilled' ? results[1].value : null;
      const refRewardsData = results[2]?.status === 'fulfilled' ? results[2].value : null;
      const allRewardsData = results[3]?.status === 'fulfilled' ? results[3].value : null;
      const rewardStatsData = results[4]?.status === 'fulfilled' ? results[4].value : null;
      const tasksData = results[5]?.status === 'fulfilled' ? results[5].value : null;

      if ((results[3]?.status === 'rejected') || (results[4]?.status === 'rejected') || (results[5]?.status === 'rejected')) {
        setEndpointError(true);
      }

      setStats(statsData);
      setActivity(activityData?.activities || []);
      setRefRewards(refRewardsData?.rewards || []);
      setAllRewards(allRewardsData?.rewards || []);
      setRewardStats(rewardStatsData);
      setTaskList(tasksData?.tasks || []);
      setCompletedTaskIds(tasksData?.completed || []);

      if (activityData?.activities) buildReferralChartData(activityData.activities);
      if (allRewardsData?.rewards) buildRewardChartData(allRewardsData.rewards);
    } catch (err) {
      console.error("Failed to load referral data", err);
    } finally {
      setLoading(false);
    }
  }, [isConnected]);

  useEffect(() => { loadData(); }, [loadData]);

  const buildReferralChartData = useCallback((actArr) => {
    const days = chartRange === "7D" ? 7 : chartRange === "30D" ? 30 : 90;
    const now = new Date();
    const buckets = Array.from({ length: days }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (days - 1 - i));
      return d.toISOString().slice(0, 10);
    });
    const userMap = {};
    actArr.forEach(a => { const d = a.created_at?.slice(0, 10); if (d) userMap[d] = (userMap[d] || 0) + 1; });
    let cu = 0;
    const userSeries = buckets.map(d => { cu += userMap[d] || 0; return cu; });
    setReferralChartData({ users: userSeries });
  }, [chartRange]);

  const buildRewardChartData = useCallback((rewardsArr) => {
    const days = chartRange === "7D" ? 7 : chartRange === "30D" ? 30 : 90;
    const now = new Date();
    const buckets = Array.from({ length: days }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (days - 1 - i));
      return d.toISOString().slice(0, 10);
    });
    const rewardMap = {};
    rewardsArr.forEach(r => {
      const d = r.createdAt?.slice(0, 10);
      if (d) rewardMap[d] = (rewardMap[d] || 0) + (r.status === "pending" ? r.amountBnb : 0);
    });
    let cr = 0;
    const rewardSeries = buckets.map(d => { cr += rewardMap[d] || 0; return cr; });
    setRewardChartData({ rewards: rewardSeries });
  }, [chartRange]);

  useEffect(() => {
    if (activity.length) buildReferralChartData(activity);
    if (allRewards.length) buildRewardChartData(allRewards);
  }, [chartRange, buildReferralChartData, buildRewardChartData, activity, allRewards]);

  const referralCode = stats?.referralCode || stats?.referral_code || "—";
  const referralLink = `${APP_URL}/discover?ref=${referralCode}`;
  const totalRefs = stats?.referralCount || stats?.referral_count || 0;
  const totalPendingRefReward = stats?.pendingRewardsBnb || stats?.referral_reward_bnb || 0;
  const totalPendingReward = rewardStats?.totalPendingBnb || 0;
  const pendingTradeReward = allRewards.filter(r => r.type === "trade" && r.status === "pending").reduce((s, r) => s + r.amountBnb, 0);
  const pendingTaskReward = allRewards.filter(r => r.type === "task" && r.status === "pending").reduce((s, r) => s + r.amountBnb, 0);
  const totalCompletedTasks = completedTaskIds.length;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };
  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };
  const shareTwitter = () => {
    const text = encodeURIComponent(`Join me on SwanFi! Use my referral code: ${referralCode} 🚀`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(referralLink)}`, "_blank");
  };
  const shareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(`Join SwanFi! Code: ${referralCode}`)}`, "_blank");
  };
  const handleClaimRef = async () => {
    if (totalPendingRefReward < MIN_CLAIM) return;
    setClaimingRef(true);
    try {
      await referral.claim();
      setClaimMsg("Referral reward claimed!");
      setTimeout(() => setClaimMsg(""), 3000);
      await loadData();
    } catch {
      setClaimMsg("Claim failed. Try again.");
      setTimeout(() => setClaimMsg(""), 3000);
    } finally {
      setClaimingRef(false);
    }
  };
  const handleClaimAllRewards = async () => {
    if (totalPendingReward < MIN_CLAIM) return;
    setClaimingAll(true);
    try {
      const userData = await import("../../services/api").then(m => m.user.getMe());
      const primaryWallet = userData?.wallets?.[0]?.address;
      if (!primaryWallet) throw new Error("No wallet address found");
      await reward.claim(primaryWallet);
      setClaimMsg("All rewards claimed!");
      setTimeout(() => setClaimMsg(""), 3000);
      await loadData();
    } catch {
      setClaimMsg("Claim failed. Try again.");
      setTimeout(() => setClaimMsg(""), 3000);
    } finally {
      setClaimingAll(false);
    }
  };
  const handleCompleteTask = async (taskId) => {
    try {
      await tasks.complete(taskId);
      setClaimMsg("Task completed! Reward added.");
      setTimeout(() => setClaimMsg(""), 3000);
      await loadData();
    } catch {
      setClaimMsg("Failed to complete task.");
      setTimeout(() => setClaimMsg(""), 3000);
    }
  };

  // X (Twitter) binding handler
 const handleBindX = async () => {
  setBindingX(true);
  try {
    const raw = await bind.xInit();
    console.log("[X FRONTEND] raw response:", JSON.stringify(raw));
    const authUrl = raw?.authUrl ?? raw?.auth_url ?? raw?.url ?? raw?.redirectUrl;
    console.log("[X FRONTEND] authUrl:", authUrl);
    if (!authUrl) throw new Error("No auth URL");
    window.location.href = authUrl;
  } catch (err) {
    console.error("[X FRONTEND] error:", err.message);
    setClaimMsg("Failed to connect X account. Please try again.");
    setTimeout(() => setClaimMsg(""), 3000);
  } finally {
    setBindingX(false);
  }
};

  // Listen for binding result from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("binding") === "success") {
      setClaimMsg("X account connected successfully! Reward added.");
      setTimeout(() => setClaimMsg(""), 5000);
      loadData();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("binding") === "error") {
      setClaimMsg("Failed to connect X account. Please try again.");
      setTimeout(() => setClaimMsg(""), 5000);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [loadData]);

  if (!isConnected) {
    return (
      <div className="rf-page">
        <div className="rf-empty">
          <div className="rf-empty-icon"><IconWallet /></div>
          <h3 className="rf-empty-title">Connect your wallet</h3>
          <p className="rf-empty-desc">Login to view your referral stats and earnings.</p>
          <button className="rf-connect-btn" onClick={onConnectClick}>Login / Connect</button>
        </div>
      </div>
    );
  }

  const ReferralStatsBlock = () => (
    <div className="rf-stats-row">
      <div className="rf-stat-card">
        <div className="rf-stat-icon rf-stat-icon--yellow"><IconUsers /></div>
        <div className="rf-stat-label">Total Referrals</div>
        <div className="rf-stat-val rf-stat-val--yellow">{loading ? "—" : totalRefs}</div>
        <div className="rf-stat-change">users referred</div>
      </div>
      <div className="rf-stat-card rf-stat-card--claimable">
        <div className="rf-stat-icon rf-stat-icon--green"><IconCoins /></div>
        <div className="rf-stat-label">Referral Reward</div>
        <div className="rf-stat-val rf-stat-val--green">{loading ? "—" : formatBnbCard(totalPendingRefReward)} BNB</div>
        <div className="rf-stat-change">pending</div>
        <button className={`rf-claim-btn rf-claim-btn--green ${totalPendingRefReward < MIN_CLAIM ? "rf-claim-btn--disabled" : ""}`} onClick={handleClaimRef} disabled={claimingRef || totalPendingRefReward < MIN_CLAIM}>
          {claimingRef ? "Claiming…" : totalPendingRefReward < MIN_CLAIM ? `Min ${MIN_CLAIM} BNB` : "Claim"}
        </button>
      </div>
      <div className="rf-stat-card">
        <div className="rf-stat-icon rf-stat-icon--purple"><IconGift /></div>
        <div className="rf-stat-label">Active This Month</div>
        <div className="rf-stat-val">{loading ? "—" : activity.filter(a => { const d = new Date(a.created_at), now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length}</div>
        <div className="rf-stat-change">new signups</div>
      </div>
    </div>
  );

  const ReferralChartBlock = () => (
    <div className="rf-chart-card">
      <div className="rf-chart-header">
        <div className="rf-chart-metric-tabs">
          <button className="rf-chart-metric-tab active"><IconUsers /><span>Total Users</span>{!loading && <span className="rf-chart-metric-val">{referralChartData.users[referralChartData.users.length - 1] ?? 0}</span>}</button>
        </div>
        <div className="rf-chart-tabs">
          {["7D", "30D", "ALL"].map(r => <button key={r} className={`rf-chart-tab ${chartRange === r ? "active" : ""}`} onClick={() => setChartRange(r)}>{r}</button>)}
        </div>
      </div>
      <div className="rf-chart-area">
        {referralChartData.users.some(v => v > 0) ? <SparkChart data={referralChartData.users} color="#ffd400" /> : <div className="rf-chart-empty"><IconTrendUp /><span>{loading ? "Loading chart…" : "No data yet — share your code to get started"}</span></div>}
      </div>
      <div className="rf-how-divider" />
      <div className="rf-how-title">How It Works</div>
      <div className="rf-how-steps">
        {["Share your code", "Friend signs up", "They trade", "You earn BNB"].map((label, i) => (
          <div key={i} className="rf-how-step"><div className="rf-how-num">{i + 1}</div><div className="rf-how-label">{label}</div></div>
        ))}
      </div>
    </div>
  );

  const ReferralTableBlock = () => (
    <div className="rf-activity-card">
      <div className="rf-activity-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><span className="rf-activity-title">Referral Activity</span><span className="rf-activity-badge">{activity.length} records</span></div>
      </div>
      {activity.length === 0 ? (
        <div className="rf-activity-empty"><div className="rf-activity-empty-icon"><IconActivity /></div><div className="rf-activity-empty-text">No referral activity yet.</div></div>
      ) : (
        <div className="rf-table-wrap">
          <table className="rf-table">
            <thead>
              <tr><th>User</th><th>Type</th><th>Date</th></tr>
            </thead>
            <tbody>
              {activity.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td className="rf-table-username">{item.referred_username || "User"}</td>
                  <td><span className={item.type === "signup" ? "rf-badge-signup" : "rf-badge-trade"}>{item.type === "signup" ? "✦ Signup" : "⚡ Trade"}</span></td>
                  <td className="rf-table-date">{formatDate(item.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const ShareBlock = () => (
    <>
      <div className="rf-share-card">
        <div className="rf-share-card-title">🎉 Your Referral</div>
        <div className="rf-code-section">
          <div className="rf-field-label">Referral Code</div>
          <div className="rf-code-box">
            <span className="rf-code-text">{loading ? <span className="rf-code-loading">Loading…</span> : referralCode}</span>
            <button className={`rf-copy-btn ${codeCopied ? "rf-copy-btn--copied" : ""}`} onClick={handleCopyCode} disabled={referralCode === "—"}>
              {codeCopied ? <IconCheck /> : <IconCopy />}{codeCopied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
        <div className="rf-code-section">
          <div className="rf-field-label">Referral Link</div>
          <div className="rf-link-box">
            <span className="rf-link-text">{referralLink}</span>
            <button className={`rf-link-copy-btn ${linkCopied ? "rf-link-copy-btn--copied" : ""}`} onClick={handleCopyLink}>
              {linkCopied ? <IconCheck /> : <IconCopy />}
            </button>
          </div>
        </div>
        <div className="rf-share-via">
          <div className="rf-field-label">Share Via</div>
          <div className="rf-share-buttons">
            <button className="rf-share-btn" onClick={shareTwitter}><IconTwitter /> Twitter / X</button>
            <button className="rf-share-btn" onClick={() => window.open(`https://t.me/${TELEGRAM_GROUP}`, "_blank")}>Community</button>
            <button className="rf-share-btn rf-share-btn--telegram" onClick={shareTelegram}><IconTelegram /> Share on Telegram</button>
          </div>
        </div>
      </div>
      <TutorialSection referralCode={referralCode} />
    </>
  );

  const RewardsStatsBlock = () => (
    <div className="rf-stats-row">
      {endpointError && (
        <div className="rf-warning-banner" style={{ width: '100%', marginBottom: '12px', background: 'rgba(255,212,0,0.1)', border: '1px solid rgba(255,212,0,0.3)', borderRadius: '8px', padding: '10px', textAlign: 'center', fontSize: '0.75rem', color: '#ffd400' }}>
          ⚠️ Reward data temporarily unavailable. Your rewards are safe and will appear once the service is restored.
        </div>
      )}
      <div className="rf-stat-card">
        <div className="rf-stat-icon rf-stat-icon--green"><IconCoins /></div>
        <div className="rf-stat-label">Total Reward</div>
        <div className="rf-stat-val rf-stat-val--green">{loading ? "—" : formatBnbCard(totalPendingReward)} BNB</div>
        <button className={`rf-claim-btn rf-claim-btn--green ${(totalPendingReward < MIN_CLAIM || endpointError) ? "rf-claim-btn--disabled" : ""}`} onClick={handleClaimAllRewards} disabled={claimingAll || totalPendingReward < MIN_CLAIM || endpointError}>
          {claimingAll ? "Claiming…" : totalPendingReward < MIN_CLAIM ? `Min ${MIN_CLAIM} BNB` : "Claim All"}
        </button>
      </div>
      <div className="rf-stat-card">
        <div className="rf-stat-icon rf-stat-icon--orange"><IconZap /></div>
        <div className="rf-stat-label">Reward Trade</div>
        <div className="rf-stat-val rf-stat-val--orange">{loading ? "—" : formatBnbCard(pendingTradeReward)} BNB</div>
        <div className="rf-stat-change">pending</div>
      </div>
      <div className="rf-stat-card">
        <div className="rf-stat-icon rf-stat-icon--yellow"><IconGift /></div>
        <div className="rf-stat-label">Reward Task</div>
        <div className="rf-stat-val rf-stat-val--yellow">{loading ? "—" : formatBnbCard(pendingTaskReward)} BNB</div>
        <div className="rf-stat-change">pending</div>
      </div>
      <div className="rf-stat-card">
        <div className="rf-stat-icon rf-stat-icon--purple"><IconActivity /></div>
        <div className="rf-stat-label">Total Task Completed</div>
        <div className="rf-stat-val">{loading ? "—" : totalCompletedTasks}</div>
        <div className="rf-stat-change">tasks done</div>
      </div>
    </div>
  );

  const RewardsChartBlock = () => (
    <div className="rf-chart-card">
      <div className="rf-chart-header">
        <div className="rf-chart-metric-tabs">
          <button className="rf-chart-metric-tab active active--green"><IconCoins /><span>Total Reward (BNB)</span>{!loading && <span className="rf-chart-metric-val">{formatBnbCard(rewardChartData.rewards[rewardChartData.rewards.length - 1] ?? 0)} BNB</span>}</button>
        </div>
        <div className="rf-chart-tabs">
          {["7D", "30D", "ALL"].map(r => <button key={r} className={`rf-chart-tab ${chartRange === r ? "active" : ""}`} onClick={() => setChartRange(r)}>{r}</button>)}
        </div>
      </div>
      <div className="rf-chart-area">
        {rewardChartData.rewards.some(v => v > 0) ? <SparkChart data={rewardChartData.rewards} color="#4ade80" /> : <div className="rf-chart-empty"><IconTrendUp /><span>{loading ? "Loading chart…" : "No reward data yet. Complete tasks or wait for trade cashback."}</span></div>}
      </div>
    </div>
  );

  const RewardsTableBlock = () => (
  <div className="rf-rewards-table-card">
    <div className="rf-card-header">
      <div className="rf-card-title">
        <IconActivity size={14} />
        <span>All Rewards History</span>
      </div>
      <div className="rf-card-badge">{allRewards.length} records</div>
    </div>
    <div className="rf-table-container">
      <table className="rf-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Amount</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {allRewards.length === 0 ? (
            <tr>
              <td colSpan="3" style={{ textAlign: "center", padding: "var(--space-6)" }}>
                No rewards yet.
              </td>
            </tr>
          ) : (
            allRewards.map(r => (
              <tr key={r.id}>
                <td>
                  <span className={`rf-reward-type ${r.type}`}>
                    {r.type === "registration"
                      ? "🎁 Registration Reward"
                      : r.type === "task"
                      ? "📋 Task Reward"
                      : "💹 Trade Reward"}
                  </span>
                </td>
                <td className="rf-reward-amount">{formatBnbTable(r.amountBnb)} BNB</td>
                <td className="rf-table-date">{formatDate(r.createdAt)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

  const TaskPanel = () => {
    const availableTasks = taskList.filter(t => !completedTaskIds.includes(t.id));
    const completedTasks = taskList.filter(t => completedTaskIds.includes(t.id));
    return (
      <div className="rf-task-panel">
        <div className="rf-card-header">
          <div className="rf-card-title">
            <IconGift size={14} />
            <span>🎯 Tasks & Rewards</span>
          </div>
          <div className="rf-card-badge">{availableTasks.length} available</div>
        </div>

        {endpointError && (
          <div className="rf-warning-banner" style={{ marginBottom: '16px', background: 'rgba(255,212,0,0.1)', border: '1px solid rgba(255,212,0,0.3)', borderRadius: '8px', padding: '10px', textAlign: 'center', fontSize: '0.75rem' }}>
            ⚠️ Tasks are temporarily unavailable. Please check back later.
          </div>
        )}

        <div className="rf-task-section">
          <div className="rf-task-section-title">
            <span>📋 Available Tasks</span>
          </div>
          {availableTasks.length === 0 ? (
            <div className="rf-empty-state">No tasks available at the moment.</div>
          ) : (
            <div className="rf-task-grid">
              {availableTasks.map(task => (
                <div key={task.id} className="rf-task-item">
                  <div className="rf-task-info">
                    <div className="rf-task-icon">✓</div>
                    <div className="rf-task-details">
                      <div className="rf-task-name">{task.title}</div>
                      <div className="rf-task-desc">{task.description}</div>
                    </div>
                  </div>
                  <div className="rf-task-reward">
                    <span className="rf-reward-badge">{formatBnbCard(task.rewardBNB)} BNB</span>
                    {task.title === "Bind X Account" ? (
                      <button
                        className="rf-complete-btn"
                        onClick={handleBindX}
                        disabled={bindingX}
                      >
                        {bindingX ? "Redirecting..." : "Connect X Account"}
                      </button>
                    ) : (
                      <button
                        className="rf-complete-btn"
                        onClick={() => handleCompleteTask(task.id)}
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {completedTasks.length > 0 && (
          <div className="rf-task-section">
            <div className="rf-task-section-title">
              <span>✅ Completed Tasks</span>
            </div>
            <div className="rf-task-grid">
              {completedTasks.map(task => (
                <div key={task.id} className="rf-task-item rf-completed-task">
                  <div className="rf-task-info">
                    <div className="rf-task-icon">✔</div>
                    <div className="rf-task-details">
                      <div className="rf-task-name">{task.title}</div>
                    </div>
                  </div>
                  <div className="rf-task-reward">
                    <span className="rf-reward-badge">{formatBnbCard(task.rewardBNB)} BNB</span>
                    <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>claimed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rf-page">
      {claimMsg && <div className="rf-claim-toast">{claimMsg}</div>}
      <div className="rf-container">
        <div className="rf-hero">
          <div className="rf-hero-left">
            <div className="rf-hero-eyebrow"><span className="rf-hero-eyebrow-dot" />Referral Program</div>
            <h1 className="rf-hero-title">Invite Friends,<br />Earn <span>Real BNB</span></h1>
            <p className="rf-hero-sub">Share your referral code and earn <strong style={{ color: "#ffd400" }}>50%</strong> commission on every trade your referrals make — paid directly to your wallet.</p>
          </div>
          <div className="rf-hero-right"><div className="rf-commission-label">Commission</div><div className="rf-commission-val">50%</div><div className="rf-commission-sub">per referred trade</div></div>
        </div>

        <div className="rf-tab-switcher" style={{ marginBottom: "1rem", justifyContent: "center" }}>
          <button className={`rf-chart-tab ${activeTab === "referralMain" ? "active" : ""}`} onClick={() => setActiveTab("referralMain")}>Referral</button>
          <button className={`rf-chart-tab ${activeTab === "rewardsMain" ? "active" : ""}`} onClick={() => setActiveTab("rewardsMain")}>Rewards & Tasks</button>
        </div>

        {activeTab === "referralMain" && (
          <>
            <div className="rf-desktop-only"><ReferralStatsBlock /></div>
            <div className="rf-desktop-only rf-main-grid">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}><ReferralChartBlock /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}><ShareBlock /></div>
            </div>
            <div className="rf-desktop-only"><ReferralTableBlock /></div>
            <div className="rf-mobile-nav">
              {["stats", "chart", "share", "table"].map(s => <button key={s} className={`rf-mobile-nav-btn ${mobileSection === s ? "active" : ""}`} onClick={() => setMobileSection(s)}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>)}
            </div>
            <div className="rf-mobile-only">
              {mobileSection === "stats" && <ReferralStatsBlock />}
              {mobileSection === "chart" && <ReferralChartBlock />}
              {mobileSection === "share" && <ShareBlock />}
              {mobileSection === "table" && <ReferralTableBlock />}
            </div>
          </>
        )}

        {activeTab === "rewardsMain" && (
          <>
            <RewardsStatsBlock />
            <RewardsChartBlock />
            <RewardsTableBlock />
            <TaskPanel />
          </>
        )}
      </div>
    </div>
  );
}