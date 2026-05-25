// src/services/config.js
// App-wide constants — import from here, never hardcode in components

// ── Social links ──────────────────────────────────────────────────
export const SOCIAL = {
  telegram: "https://t.me/swanfiAnn",
  x:        "https://x.com/swanfipro",
  github: "https://github.com/SwanFi-Labs"
};

// ── External pairs ────────────────────────────────────────────────
export const BNB_DEXSCREENER_PAIR = "0x16b9a82891338f9ba80e2d6970fdda79d1eb0dae";

// ── localStorage / sessionStorage keys ───────────────────────────
export const STORAGE_KEYS = {
  token:         "token",
  refCode:       "ref_code",
  searchHistory: "swanfi_search_history",
  presets:       "swanfi_presets",
  sound:         "ui_sound",
};

// ── Platform logo map ─────────────────────────────────────────────
export const PLATFORM_LOGOS = {
  four_meme:   "/assets/fourmeme-logo.png",
  fourmeme:    "/assets/fourmeme-logo.png",
  flap_sh:     "/assets/flap-logo.png",
  flap:        "/assets/flap-logo.png",
  pancake:     "/assets/tokens/cake.svg",
  pancakeswap: "/assets/tokens/cake.svg",
};

export const DEVELOPER = {
  GITHUB_URL: "https://github.com/SwanFi-Labs/SwanFi-Labs",
  ENDPOINT_GROUPS: [
    {
      label: "Public V1",
      items: [
        { id: "v1-tokens", title: "List Tokens", method: "GET", path: "/v1/tokens", description: "Retrieve token list with filtering by source, stage, and sorting.", auth: "public", params: [{ name: "limit", type: "number", default: "50", range: "1-100", desc: "Number of results" }, { name: "sort", type: "string", default: "newest", enum: ["newest", "oldest"], desc: "Sort order" }, { name: "source", type: "string", enum: ["four_meme", "flap"], desc: "Filter by launchpad source" }, { name: "stage", type: "string", enum: ["bonding", "dex"], desc: "Filter by token stage" }, { name: "address", type: "string", desc: "Filter by specific token address" }] },
        { id: "v1-transactions", title: "List Transactions", method: "GET", path: "/v1/transactions", description: "Retrieve on-chain transactions with optional token or wallet filter.", auth: "public", params: [{ name: "limit", type: "number", default: "50", range: "1-200", desc: "Number of results" }, { name: "sort", type: "string", default: "newest", enum: ["newest", "oldest"], desc: "Sort order" }, { name: "tokenAddress", type: "string", desc: "Filter by token contract address" }, { name: "walletAddress", type: "string", desc: "Filter by wallet address" }, { name: "minUsd", type: "number", default: "0", desc: "Minimum USD volume filter" }] },
        { id: "v1-wallet-tracker", title: "Wallet Tracker", method: "GET", path: "/v1/wallets/:address/tracker", description: "Track all trades for a specific wallet address with rich token metadata.", auth: "public", params: [{ name: ":address", type: "string", required: true, desc: "Wallet address (path param)" }, { name: "limit", type: "number", default: "50", range: "1-200", desc: "Number of results" }, { name: "sort", type: "string", default: "newest", enum: ["newest", "oldest"], desc: "Sort order" }, { name: "tokenAddress", type: "string", desc: "Filter by token address" }, { name: "minUsd", type: "number", default: "0", desc: "Minimum USD volume" }, { name: "position", type: "string", enum: ["BUY", "SELL"], desc: "Trade direction filter" }, { name: "source", type: "string", enum: ["four_meme", "flap"], desc: "Filter by launchpad source" }] }
      ]
    }
  ]
};

export function getPlatformLogo(key) {
  if (!key) return "/unknown.jpg";
  const k = key.toLowerCase().replace(/[\s.-]/g, "_");
  return PLATFORM_LOGOS[k] || "/unknown.jpg";
}


// ── Base Pair Icon Map ──────────────────────────────────────────
export const BASE_PAIR_ICONS = {
  BNB:   "/assets/tokens/bnb.svg",
  WBNB:  "/assets/tokens/bnb.svg",
  USDT:  "/assets/tokens/usdt.svg",
  USDC:  "/assets/tokens/usdc.svg",
  CAKE:  "/assets/tokens/cake.svg",
  ASTER: "/assets/tokens/aster.svg",
  UUSD:  "/assets/tokens/uusd.svg",
  USD1:  "/assets/tokens/usd1.svg",
};
// ── Dev Mark Config ─────────────────────────────────────────────
export const DEV_MARK_CONFIG = {
  DH: { color: "#71717a", label: "Dev Holding",     desc: "Developer has not sold any tokens yet." },
  DB: { color: "#22c55e", label: "Dev Buyback",      desc: "Developer bought back after a previous sell." },
  DP: { color: "#f97316", label: "Dev Partial Sell", desc: "Developer sold a portion, still holds some tokens." },
  DS: { color: "#ef4444", label: "Dev Sold All",     desc: "Developer has exited their full position." },
};

// ── Discover Default Filter ─────────────────────────────────────
export const DISCOVER_DEFAULT_FILTER = {
  platforms: { "flap_sh": true, "four_meme": true },
  ageMin: "", ageMax: "",
  mcMin:  "", mcMax:  "",
  volMin: "", volMax: "",
};