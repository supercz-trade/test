// src/pages/others/Help.jsx
import { useState, useEffect } from "react";
import "./others.css";

const CATEGORIES = [
  { id: "getting-started", title: "Getting Started", items: [
    { q: "How do I connect my wallet?", a: "Click the 'Connect' button in the top-right of the terminal. SwanFi supports MetaMask, Trust Wallet, and other BSC-compatible wallets. Make sure your wallet is set to the Binance Smart Chain (BSC) network before connecting." },
    { q: "Which networks are supported?", a: "SwanFi is built specifically for Binance Smart Chain (BSC / BNB Chain). All token data, trading, and analytics are BSC-native. Other EVM networks are not currently supported." },
    { q: "Is an account required?", a: "No. SwanFi is fully non-custodial and requires no account creation, email address, or personal information. Simply connect your BSC wallet and you're ready to use all features." },
    { q: "Is the Platform free to use?", a: "Access to the Platform interface is free. When you execute trades, standard DEX swap fees apply. A Platform service fee may be applied on certain trades — this is clearly displayed before you confirm any transaction." },
  ]},
  { id: "trading", title: "Trading", items: [
    { q: "How do I buy a token?", a: "Navigate to the token using the search bar or Discover page. Click the token to open its trading view. Enter the BNB amount in the buy panel, review the estimated output and fees, then confirm the transaction in your wallet." },
    { q: "What is slippage and how do I set it?", a: "Slippage is the difference between expected and actual execution price due to market movement during processing. Set your tolerance in the trade settings panel. Higher slippage increases success chance but may result in worse prices." },
    { q: "What is MEV protection?", a: "MEV protection shields your transactions from sandwich attacks — where bots front-run your buy and immediately sell after to extract value. Enable it in trade settings. Note that MEV protection may slightly increase transaction time." },
    { q: "Why did my transaction fail?", a: "Common causes: insufficient BNB for gas, slippage set too low, the token contract blocking transactions (honeypot), RPC node issues, or network congestion. Check the error message in your wallet for specific details." },
    { q: "What are Quick Buy presets?", a: "Quick Buy presets let you save BNB amounts for one-click trading. Configure your presets in the trading settings. Presets are stored locally in your browser and never leave your device." },
  ]},
  { id: "tokens", title: "Tokens & Discovery", items: [
    { q: "How are risk scores calculated?", a: "Risk scores are calculated based on on-chain factors including liquidity depth, holder distribution, contract verification, tax rates, honeypot detection, and developer wallet concentration. Risk scores are informational only." },
    { q: "What is a honeypot token?", a: "A honeypot is a token contract designed to prevent selling. Users can buy but cannot sell. Always check honeypot indicators before purchasing. No detection method is 100% reliable — always do your own research." },
    { q: "What is a rug pull?", a: "A rug pull occurs when developers remove all liquidity or dump tokens suddenly, crashing the price to near zero. Most rug pulls happen with highly concentrated developer wallets and unlocked liquidity pools." },
    { q: "How do I search for a specific token?", a: "Use the search bar at the top of the terminal. You can search by token name, ticker symbol, or paste the contract address directly. Contract address search is the most reliable method." },
  ]},
  { id: "portfolio", title: "Portfolio & History", items: [
    { q: "How does portfolio tracking work?", a: "Portfolio tracking loads automatically when you connect your wallet. The Platform reads your token balances from BSC blockchain and calculates estimated value using current market prices." },
    { q: "Why are some tokens missing?", a: "Very low-liquidity tokens, unverified contracts, or spam tokens may be filtered from the portfolio view. View your full transaction history on BscScan for complete on-chain records." },
    { q: "Where is my transaction history stored?", a: "Transaction history is sourced directly from the BSC blockchain. The Platform fetches this data on-demand — nothing is stored on Platform servers. Your history is permanent and cannot be deleted from the blockchain." },
  ]},
  { id: "security", title: "Security & Safety", items: [
    { q: "Is SwanFi safe to use?", a: "SwanFi is non-custodial — it never holds or accesses your funds. However, all DeFi trading carries inherent risks. Always verify you are on the official Platform URL before connecting your wallet." },
    { q: "Will support ever ask for my seed phrase?", a: "Never. Legitimate SwanFi support will never ask for your seed phrase, private key, or wallet password. Anyone asking for this information is a scammer." },
    { q: "How do I revoke token approvals?", a: "Token approvals can be revoked using tools like Revoke.cash or BscScan's token approval checker. We recommend regularly reviewing and revoking unused approvals." },
  ]},
  { id: "troubleshooting", title: "Troubleshooting", items: [
    { q: "The Platform is not loading properly.", a: "Try: (1) Hard refresh the page (Ctrl+Shift+R). (2) Clear browser cache. (3) Try a different browser or incognito mode. (4) Disable browser extensions. (5) Check the official Telegram for known outages." },
    { q: "My wallet won't connect.", a: "Ensure your wallet is unlocked and set to BSC network. Try refreshing and reconnecting. If using WalletConnect, clear the session from your mobile wallet settings. Make sure you're not running conflicting wallet extensions." },
    { q: "Price data seems incorrect or outdated.", a: "Price data is sourced from third-party providers and may occasionally be delayed. Try refreshing the token page. For very new tokens, data may take a few minutes to appear after initial trading activity." },
  ]},
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`ot-faq-item${open ? " open" : ""}`}>
      <button className="ot-faq-q" onClick={() => setOpen(o => !o)}>
        <span className="ot-faq-q-text">{q}</span>
        <svg className="ot-faq-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && <div className="ot-faq-a">{a}</div>}
    </div>
  );
}

export default function Help() {
  const [activeId,  setActiveId]  = useState(CATEGORIES[0].id);
  const [scrollPct, setScrollPct] = useState(0);

  // Ensure page is scrollable
  useEffect(() => {
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";
    document.body.style.height   = "auto";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.height   = "";
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const el  = document.documentElement;
      const pct = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
      setScrollPct(Math.min(pct, 100));
      for (let i = CATEGORIES.length - 1; i >= 0; i--) {
        const el = document.getElementById(CATEGORIES[i].id);
        if (el && el.getBoundingClientRect().top <= 120) { setActiveId(CATEGORIES[i].id); break; }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id) => {
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <div className="ot-progress">
        <div className="ot-progress-bar" style={{ width: `${scrollPct}%` }} />
      </div>

      <div className="ot-page">
        <div className="ot-hero">
          <div className="ot-hero-left">
            <span className="ot-eyebrow">Support</span>
            <h1 className="ot-title">Help Center</h1>
            <p className="ot-subtitle">SwanFi · Frequently asked questions</p>
          </div>
          <div className="ot-meta">
            <span className="ot-badge">{CATEGORIES.length} categories</span>
            <span className="ot-badge">{CATEGORIES.reduce((a, c) => a + c.items.length, 0)} questions</span>
          </div>
        </div>

        <div className="ot-tabs">
          {CATEGORIES.map(c => (
            <button key={c.id} className={`ot-tab${activeId === c.id ? " active" : ""}`} onClick={() => scrollTo(c.id)}>
              {c.title}
            </button>
          ))}
        </div>

        <div className="ot-layout">
          <nav className="ot-sidebar">
            {CATEGORIES.map(c => (
              <button key={c.id} className={`ot-sidebar-item${activeId === c.id ? " active" : ""}`} onClick={() => scrollTo(c.id)}>
                <div className="ot-sidebar-dot"/>
                {c.title}
              </button>
            ))}
          </nav>

          <div className="ot-content">
            {CATEGORIES.map((cat, i) => (
              <div key={cat.id} id={cat.id} className="ot-section">
                <div className="ot-section-hdr">
                  <div className="ot-section-num">{i + 1}</div>
                  <h2 className="ot-section-title">{cat.title}</h2>
                </div>
                <div className="ot-faq">
                  {cat.items.map((item, j) => (
                    <FAQItem key={j} q={item.q} a={item.a} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}