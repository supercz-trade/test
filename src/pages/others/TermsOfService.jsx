// src/pages/others/TermsOfService.jsx
import LegalPage from "./LegalPage";

const SECTIONS = [
  { id: "acceptance", title: "Acceptance of Terms", content: [
    { subtitle: "Agreement to Terms", text: "By accessing or using SwanFi (\"Platform\"), you agree to be bound by these Terms of Service. If you do not agree, you may not access or use the Platform. These Terms constitute a legally binding agreement between you and the Platform operators." },
    { subtitle: "Eligibility", text: "You must be at least 18 years of age and have the legal capacity to enter into contracts in your jurisdiction. Users from jurisdictions where cryptocurrency trading is prohibited are not permitted to use this Platform." },
    { subtitle: "Modifications", text: "We reserve the right to modify these Terms at any time. We will notify users of material changes by updating the date at the top. Your continued use of the Platform constitutes acceptance of the revised Terms." },
  ]},
  { id: "platform", title: "Platform Description", content: [
    { subtitle: "Services Provided", text: "The Platform provides a trading terminal for Binance Smart Chain (BSC) tokens, including real-time market data, token discovery, portfolio tracking, transaction history, and trading execution through integration with decentralized exchanges." },
    { subtitle: "Third-Party Integrations", text: "The Platform integrates with DexScreener, Four.meme, Flap.sh, and various BSC protocols. We do not control these third-party services and are not responsible for their availability, accuracy, or actions." },
    { subtitle: "Non-Custodial Nature", text: "This Platform is strictly non-custodial. We do not hold, control, or have access to your assets, private keys, or wallet credentials at any time. All transactions are executed directly on-chain through your connected wallet." },
  ]},
  { id: "risks", title: "Risk Disclosure", badge: "IMPORTANT", content: [
    { subtitle: "High Risk of Loss", text: "Trading cryptocurrency tokens, especially newly launched memecoin tokens on BSC, carries an extremely high level of financial risk. Token prices can be highly volatile and can lose all value rapidly. Never invest more than you can afford to lose entirely." },
    { subtitle: "Rug Pulls & Scams", text: "The BSC ecosystem is susceptible to fraudulent schemes including rug pulls, honeypots, and exit scams. The Platform provides risk indicators as informational tools only — these do not guarantee the safety or legitimacy of any token." },
    { subtitle: "Smart Contract Risk", text: "All transactions involve interaction with smart contracts. Smart contracts may contain bugs or vulnerabilities. Once a transaction is executed on-chain, it is irreversible. Always verify transaction details before confirming." },
    { subtitle: "Market & Liquidity Risk", text: "Memecoin markets may have extremely low liquidity. Slippage, MEV bots, and sandwich attacks are common in DeFi trading. MEV protection settings are provided but do not guarantee complete protection." },
  ]},
  { id: "user-obligations", title: "User Obligations", content: [
    { subtitle: "Prohibited Activities", text: "You agree not to: use the Platform for illegal purposes; manipulate markets or coordinate pump-and-dump schemes; use automated bots to abuse services; attempt unauthorized access to Platform systems; or use the Platform to launder money." },
    { subtitle: "Wallet Security", text: "You are solely responsible for your wallet security. The Platform will never ask for your private keys or seed phrases. Any loss resulting from unauthorized access to your wallet is your sole responsibility." },
  ]},
  { id: "disclaimer", title: "Disclaimers & Liability", content: [
    { subtitle: "No Financial Advice", text: "Nothing on this Platform constitutes financial, investment, legal, or tax advice. All content is for informational purposes only. Consult qualified professionals before making investment decisions." },
    { subtitle: "No Warranty", text: "The Platform is provided 'AS IS' without warranties of any kind. We do not warrant that the Platform will be uninterrupted or error-free, or that any data provided is accurate or up-to-date." },
    { subtitle: "Limitation of Liability", text: "To the maximum extent permitted by law, the Platform operators shall not be liable for any indirect, incidental, or consequential damages, including loss of cryptocurrency or financial losses arising from your use of the Platform." },
  ]},
  { id: "governing-law", title: "Governing Law", content: [
    { subtitle: "Applicable Law", text: "These Terms shall be governed by applicable laws. Any disputes shall be resolved through binding arbitration rather than in court, except where prohibited by law." },
    { subtitle: "Dispute Resolution", text: "You agree to first attempt to resolve disputes informally. If unresolved within 30 days, either party may initiate binding arbitration. The arbitrator's decision shall be final and binding." },
  ]},
];

export default function TermsOfService() {
  return <LegalPage eyebrow="Legal" title="Terms of Service" subtitle="SwanFi · Last updated April 2026" sections={SECTIONS} readTime={7} />;
}