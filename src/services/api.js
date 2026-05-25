// src/services/api.js
// Centralized API client for SwanFi

const API_BASE   = import.meta.env.VITE_API_BASE   || "http://localhost:3000";
const MASTER_KEY = import.meta.env.VITE_MASTER_KEY || "";

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function masterHeaders() {
  return { "x-api-key": MASTER_KEY };
}

function privateHeaders() {
  return { ...masterHeaders(), ...authHeaders() };
}

async function get(base, path, headers = {}) {
  const res = await fetch(`${base}${path}`, { headers });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (err) {
    console.error("INVALID JSON RESPONSE", { path, text });
    throw err;
  }
  if (!res.ok) throw new Error(data?.error || `GET ${path} -> ${res.status}`);
  return data;
}

async function getPrivate(path) {
  return get(API_BASE, path, masterHeaders());
}

async function getAuth(path) {
  return get(API_BASE, path, privateHeaders());
}

async function post(base, path, body, headers = {}) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { ...authHeaders(), ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error || `POST ${path} -> ${res.status}`), { status: res.status, data });
  return data;
}

async function postAuth(path, body) {
  return post(API_BASE, path, body, privateHeaders());
}

async function patchAuth(path, body) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...masterHeaders(),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `PATCH ${path} -> ${res.status}`);
  return data;
}

async function delAuth(path) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...masterHeaders(),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `DELETE ${path} -> ${res.status}`);
  return data;
}

export const tokens = {
  getNew:       (limit = 50)  => getPrivate(`/tokens/new?limit=${limit}`),
  getMigrating: (limit = 50)  => getPrivate(`/tokens/migrating?limit=${limit}`),
  getMigrated:  (limit = 50)  => getPrivate(`/tokens/migrated?limit=${limit}`),
  getOne:       (address)     => getPrivate(`/tokens/${address}`),
  getTransactions: (address, limit = 100, offset = 0) =>
    getPrivate(`/tokens/${address}/transactions?limit=${limit}&offset=${offset}`),
  getTransactionsByWallet: (address, wallet, limit = 200) =>
    getPrivate(`/tokens/${address}/transactions/${wallet}?limit=${limit}`),
  getHolders:   (address, limit = 50) =>
    getPrivate(`/tokens/${address}/holders?limit=${limit}`),
  getTopTraders: (address, limit = 50, sort = "realized_pnl") =>
    getPrivate(`/tokens/${address}/top-traders?limit=${limit}&sort=${sort}`),
  getCandles:   (address, tf = "1m", limit = 500) =>
    getPrivate(`/tokens/${address}/candles?timeframe=${tf}&limit=${limit}`),
  getEvents:    (address, limit = 500) =>
    getPrivate(`/tokens/${address}/events?limit=${limit}`),
  getEventsByWallet: (address, wallet, limit = 500) =>
    getPrivate(`/tokens/${address}/events/${wallet}?limit=${limit}`),
};

export const wallets = {
  getOverview:      (address) => getPrivate(`/wallets/${address}/overview`),
  getTransactions:  (address, limit = 200, offset = 0) =>
    getPrivate(`/wallets/${address}/transactions?limit=${limit}&offset=${offset}`),
};

export const utils = {
  getGasPrice: () => getPrivate("/utils/gas-price"),
  getHealth:   () => getPrivate("/health"),
};

export const platform = {
  getStats: (period = "24h") =>
    getPrivate(`/platform/stats?period=${period}`),
  getChart: (period = "24h", interval = "5m") =>
    getPrivate(`/platform/chart?period=${period}&interval=${interval}`),
};

export const debug = {
  getStats: () => getPrivate("/debug/stats"),
};

export const v1 = {
  getTokens: ({ limit = 50, sort = "newest", source, stage, address } = {}) => {
    const params = new URLSearchParams({ limit, sort });
    if (source)  params.set("source", source);
    if (stage)   params.set("stage", stage);
    if (address) params.set("address", address);
    return get(`${API_BASE}/v1/tokens?${params.toString()}`, "", masterHeaders());
  },
  getTransactions: ({ limit = 50, sort = "newest", tokenAddress, walletAddress, minUsd } = {}) => {
    const params = new URLSearchParams({ limit, sort });
    if (tokenAddress)  params.set("tokenAddress", tokenAddress);
    if (walletAddress) params.set("walletAddress", walletAddress);
    if (minUsd)        params.set("minUsd", minUsd);
    return get(`${API_BASE}/v1/transactions?${params.toString()}`, "", masterHeaders());
  },
  getWalletTracker: (address, { limit = 50, sort = "newest", tokenAddress, minUsd, position, source } = {}) => {
    const params = new URLSearchParams({ limit, sort });
    if (tokenAddress) params.set("tokenAddress", tokenAddress);
    if (minUsd)       params.set("minUsd", minUsd);
    if (position)     params.set("position", position);
    if (source)       params.set("source", source);
    return get(`${API_BASE}/v1/wallets/${address}/tracker?${params.toString()}`, "", masterHeaders());
  },
};

export const auth = {
  register: (email, referralCode) =>
    post(API_BASE, "/private/auth/register", { email, ...(referralCode ? { referralCode } : {}) }),
  verifyEmail: (email, otp) =>
    post(API_BASE, "/private/auth/verify-email", { email, otp }),
  loginRequest: (email) =>
    post(API_BASE, "/private/auth/login/request", { email }),
  loginVerify: (email, otp) =>
    post(API_BASE, "/private/auth/login/verify", { email, otp }),
  googleLogin: (idToken, referralCode) =>
    post(API_BASE, "/private/auth/google", { idToken, ...(referralCode ? { referralCode } : {}) }),
  walletNonce: async (address) => {
    const res = await fetch(`${API_BASE}/private/auth/wallet/nonce?address=${address}`);
    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data.error || "Failed to get nonce"), { data });
    return data;
  },
  walletVerify: (address, signature, referralCode) =>
    post(API_BASE, "/private/auth/wallet/verify", { address, signature, ...(referralCode ? { referralCode } : {}) }),
  telegramStart: (telegramId, referralCode) =>
    post(API_BASE, "/private/auth/telegram/start", { telegramId, ...(referralCode ? { referralCode } : {}) }),
  telegramVerify: (token, referralCode) =>
    post(API_BASE, "/private/auth/telegram/verify", { token, ...(referralCode ? { referralCode } : {}) }),
  telegramBotStart: async (referralCode) => {
    const params = referralCode ? `?referralCode=${referralCode}` : "";
    const res = await fetch(`${API_BASE}/private/auth/telegram/bot/start${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to get bot link");
    return data;
  },
};

export const bind = {
  list:         () => getAuth("/private/bind/list"),
  unlink:       (provider) => delAuth(`/private/bind/${provider}`),
  setup2FA:     () => postAuth("/private/bind/2fa/setup", {}),
  enable2FA:    (code) => postAuth("/private/bind/2fa/enable", { code }),
  verify2FA:    (code) => postAuth("/private/bind/2fa/verify", { code }),
  disable2FA:   (code) => postAuth("/private/bind/2fa/disable", { code }),
  emailRequest: (email) => postAuth("/private/bind/email/request", { email }),
  emailVerify:  (email, otp) => postAuth("/private/bind/email/verify", { email, otp }),
  google:       (idToken) => postAuth("/private/bind/google", { idToken }),
  telegram:     (telegramId, username) => postAuth("/private/bind/telegram", { telegramId, username }),
  walletNonce:  (address) => postAuth("/private/bind/wallet/nonce", { address }),
  walletVerify: (address, signature) => postAuth("/private/bind/wallet/verify", { address, signature }),
  xInit:        () => getAuth("/private/bind/x/init"),
  xExchange:    (code, state) => postAuth("/private/bind/x/exchange", { code, state }),
};

export const user = {
  getMe:              () => getAuth("/private/user/me"),
  getActivity:        () => getAuth("/private/user/activity"),
  getPortfolioHistory:() => getAuth("/private/user/portfolio/history"),
  getPosition:        (tokenAddress) => getAuth(`/private/user/position/${tokenAddress}`),
  getPositionTxs:     (tokenAddress) => getAuth(`/private/user/position/${tokenAddress}/txs`),
};

export const trade = {
  request:   (body) => postAuth("/private/trade/request", body),
  getStatus: async (tradeId) => {
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(MASTER_KEY ? { "x-api-key": MASTER_KEY } : {}),
    };
    const res = await fetch(`${API_BASE}/private/trade/status/${tradeId}`, { headers });
    if (!res.ok) throw new Error(`trade/status -> ${res.status}`);
    return res.json();
  },
  getHistory: (limit = 20) => getAuth(`/private/trade/history?limit=${limit}`),
  getRewards: (limit = 50) => getAuth(`/private/trade/rewards?limit=${limit}`),
};

export const referral = {
  getStats:    () => getAuth("/private/referral/stats"),
  getActivity: (limit = 50) => getAuth(`/private/referral/activity?limit=${limit}`),
  getRewards:  (limit = 50) => getAuth(`/private/referral/rewards?limit=${limit}`),
  claim:       () => postAuth("/private/referral/claim", {}),
  getTradeRewards: (limit = 50) => getAuth(`/private/trade/rewards?limit=${limit}`),
};

export const reward = {
  getPending: () => getAuth("/private/rewards/pending"),
  claim:      (address) => postAuth("/private/rewards/claim", { address }),
  getAll:     (limit = 100, offset = 0) => 
    getAuth(`/private/rewards/all?limit=${limit}&offset=${offset}`),
  getStats:   () => getAuth("/private/rewards/stats"),
  claimTrade: () => postAuth("/private/rewards/claim/trade", {}),
};

export const tasks = {
  getList:    () => getAuth("/private/tasks/tasks"),
  complete:   (taskId) => postAuth("/private/tasks/task/complete", { taskId }),
};

export const userWallet = {
  create:         (walletName) => postAuth("/private/wallet/create", { walletName }),
  importPk:       (walletName, privateKey) => postAuth("/private/wallet/import-pk", { walletName, privateKey }),
  importMnemonic: (walletName, mnemonic) => postAuth("/private/wallet/import-mnemonic", { walletName, mnemonic }),
  list:           () => getAuth("/private/wallet/list"),
  getBalance:     () => getAuth("/private/wallet/balance"),
  exportPk:       (walletId, code) => postAuth("/private/wallet/export-pk", { walletId, code }),
  exportMnemonic: (walletId, code) => postAuth("/private/wallet/export-mnemonic", { walletId, code }),
};

export const withdraw = {
  request:  (walletId, to, amount, token, code) =>
    postAuth("/private/withdraw/request", { walletId, to, amount, token, code }),
  getStatus: (id) => getAuth(`/private/withdraw/status/${id}`),
};

export const apikey = {
  create: (payload) => postAuth("/private/apikey/create", payload),
  list: () => getAuth("/private/apikey/list"),
  getStats: (id) => getAuth(`/private/apikey/stats/${id}`),
};

export const rpc = {
  submit: (payload) => postAuth("/private/rpc/submit", payload),
};

export const internalRpc = {
  getPending: () => getPrivate("/internal/rpc/pending"),
  approve:    (id) => patchAuth(`/internal/rpc/${id}/approve`, {}),
  reject:     (id, reason) => patchAuth(`/internal/rpc/${id}/reject`, { reason }),
};

export const chart = {
  getMyWallet: async () => {
    const data = await user.getMe();
    return data?.wallets?.[0]?.address || null;
  },
  getCandles:      (address, tf = "1m", limit = 500) => tokens.getCandles(address, tf, limit),
  getEvents:       (address, limit = 500) => tokens.getEvents(address, limit),
  getEventsByWallet: (address, wallet, limit = 500) => tokens.getEventsByWallet(address, wallet, limit),
};