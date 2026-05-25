// src/pages/others/Disclosures.jsx
import LegalPage from "./LegalPage";

const SECTIONS = [
  { id: "no-financial-advice", title: "No Financial Advice", badge: "IMPORTANT", content: [
    { subtitle: "Informational Only", text: "SwanFi is a trading terminal that provides data, analytics, and execution tools. Nothing on this Platform constitutes financial, investment, legal, or tax advice. All information is provided for informational purposes only." },
    { subtitle: "No Professional Relationship", text: "Use of this Platform does not create a financial advisor-client, broker-dealer, or any other professional relationship between you and the Platform operators. Always consult qualified financial professionals before making investment decisions." },
    { subtitle: "No Recommendations", text: "The Platform does not recommend buying, selling, or holding any specific token or cryptocurrency. All trading decisions are made solely by you. Risk indicators and analytics are tools to assist your own research, not recommendations." },
  ]},
  { id: "high-risk", title: "High Risk Warning", badge: "CRITICAL", content: [
    { subtitle: "Extreme Volatility", text: "Meme tokens and micro-cap cryptocurrencies on BSC are among the highest-risk financial instruments in existence. Prices can drop to zero within minutes. A significant majority of newly launched tokens fail or are fraudulent. Only use capital you can afford to lose completely." },
    { subtitle: "Irreversible Transactions", text: "All blockchain transactions are irreversible. There is no way to undo, reverse, or recover funds from a completed transaction. Exercise extreme caution before confirming any trade." },
    { subtitle: "MEV & Front-Running", text: "Decentralized exchanges are subject to MEV (Maximal Extractable Value) exploitation including sandwich attacks and front-running bots. While the Platform provides MEV protection options, no protection is absolute." },
  ]},
  { id: "data-accuracy", title: "Data & Accuracy", content: [
    { subtitle: "Data Sources", text: "Market data, prices, and analytics are sourced from third-party providers including DexScreener and on-chain data. Data may be delayed, inaccurate, or temporarily unavailable. Do not rely solely on Platform data for time-sensitive trading decisions." },
    { subtitle: "Risk Indicators", text: "Risk scores, honeypot detection, and other safety indicators are algorithmic estimates. They are not guarantees. A token showing as 'safe' may still be fraudulent. Always conduct your own due diligence." },
    { subtitle: "Historical Performance", text: "Past performance of any token is not indicative of future results. Price charts and historical data are provided for informational purposes only." },
  ]},
  { id: "platform-limitations", title: "Platform Limitations", content: [
    { subtitle: "Service Availability", text: "The Platform is provided on an 'as available' basis. We do not guarantee uninterrupted access. Maintenance, technical issues, or external service outages may cause temporary unavailability." },
    { subtitle: "Execution Quality", text: "Trade execution depends on blockchain network conditions, RPC node availability, DEX liquidity, and wallet configuration. The Platform does not guarantee specific execution prices or transaction speeds." },
  ]},
  { id: "regulatory", title: "Regulatory Disclosure", content: [
    { subtitle: "Regulatory Uncertainty", text: "The regulatory status of cryptocurrency, DeFi, and related technologies is evolving globally. The Platform is not registered as a financial institution, broker-dealer, or investment advisor in any jurisdiction." },
    { subtitle: "Jurisdictional Compliance", text: "You are solely responsible for determining whether your use of the Platform complies with the laws of your jurisdiction. The Platform may not be available or appropriate for use in all jurisdictions." },
  ]},
  { id: "affiliates", title: "Affiliate Relationships", content: [
    { subtitle: "Third-Party Protocols", text: "The Platform integrates with third-party protocols including launchpads and DEXs. These relationships are for technical integration purposes. We do not endorse any specific token, project, or protocol listed on or accessible through the Platform." },
    { subtitle: "No Guarantees", text: "The listing or display of any token on the Platform does not constitute an endorsement, recommendation, or guarantee of the token's safety, legitimacy, or investment potential." },
  ]},
];

export default function Disclosures() {
  return <LegalPage eyebrow="Legal" title="Disclosures" subtitle="SwanFi · Risk disclaimers & regulatory disclosures" sections={SECTIONS} readTime={5} />;
}