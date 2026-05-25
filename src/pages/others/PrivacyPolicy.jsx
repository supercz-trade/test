// src/pages/others/PrivacyPolicy.jsx
import LegalPage from "./LegalPage";

const SECTIONS = [
  { id: "overview", title: "Overview", content: [
    { subtitle: "Our Commitment", text: "SwanFi is committed to protecting your privacy. This Privacy Policy explains how we handle information in connection with your use of the Platform. As a non-custodial trading terminal, we collect minimal data and never hold your funds or private keys." },
    { subtitle: "Scope", text: "This policy applies to all users of the SwanFi Platform. By using the Platform, you acknowledge and agree to the data practices described in this Privacy Policy." },
  ]},
  { id: "what-we-collect", title: "What We Collect", content: [
    { subtitle: "Wallet Addresses", text: "When you connect your wallet to the Platform, your public wallet address is used to fetch blockchain data and provide portfolio tracking. Wallet addresses are public on the blockchain by nature." },
    { subtitle: "Usage Data", text: "We may collect anonymized usage data including browser type, device information, page views, and interaction patterns to improve Platform performance and user experience." },
    { subtitle: "Local Preferences", text: "Trading presets, quick buy settings, search history, and other preferences are stored locally in your browser. This data never leaves your device and is not transmitted to our servers." },
  ]},
  { id: "blockchain-data", title: "Blockchain & On-Chain Data", content: [
    { subtitle: "Public Nature of Blockchain", text: "All transactions on the BSC blockchain are publicly visible and immutable. Any wallet activity you perform on-chain is permanently recorded on the public ledger and can be viewed by anyone." },
    { subtitle: "Data We Display", text: "The Platform reads and displays publicly available blockchain data including transaction history, token balances, and on-chain analytics. We do not create or modify this data — we only present it." },
  ]},
  { id: "how-we-use", title: "How We Use Data", content: [
    { subtitle: "Platform Operations", text: "Data is used to provide and improve Platform services including trading features, portfolio tracking, token discovery, and market analytics." },
    { subtitle: "No Data Sales", text: "We do not sell, rent, or trade your personal information to third parties for marketing purposes. Any data shared with service providers is strictly for operational purposes." },
  ]},
  { id: "third-parties", title: "Third-Party Services", content: [
    { subtitle: "External Services", text: "The Platform uses third-party services including DexScreener for price data and analytics. These services have their own privacy policies. We recommend reviewing their policies for information on their data practices." },
    { subtitle: "Blockchain Explorers", text: "Links to BscScan and other block explorers may be provided. These are independent services with their own privacy policies." },
  ]},
  { id: "security", title: "Security", content: [
    { subtitle: "Security Measures", text: "We implement appropriate technical and organizational measures to protect data. However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of data." },
    { subtitle: "Your Responsibility", text: "You are responsible for maintaining the security of your wallet, private keys, and seed phrases. Never share these with anyone. The Platform will never request your private keys or seed phrases." },
  ]},
  { id: "your-rights", title: "Your Rights", content: [
    { subtitle: "Access & Deletion", text: "You may request access to any personal data we hold about you. As most data is stored locally on your device, you can clear it at any time by clearing your browser data. On-chain data is permanent and cannot be deleted." },
    { subtitle: "Contact", text: "For privacy-related inquiries, please contact us through our official Telegram channel. We will respond to requests within a reasonable timeframe." },
  ]},
  { id: "changes", title: "Policy Changes", content: [
    { subtitle: "Updates", text: "We may update this Privacy Policy periodically. We will notify users of significant changes by updating the date at the top of this page. Continued use of the Platform after changes constitutes acceptance of the updated policy." },
  ]},
];

export default function PrivacyPolicy() {
  return <LegalPage eyebrow="Legal" title="Privacy Policy" subtitle="SwanFi · Last updated April 2026" sections={SECTIONS} readTime={4} />;
}