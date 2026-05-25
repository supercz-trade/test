// src/pages/developers/Developers.jsx
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { v1, apikey, utils } from "../../services/api.js";
import { DEVELOPER } from "../../services/config";
import {
  IconCode, IconTerminal, IconCheck, IconCopy, IconKey,
  IconTrash, IconRefresh, IconChevron, IconLock, IconUnlock, IconActivity,
  IconMenu, IconWallet, IconEye, IconEyeOff, IconX, IconExternalLink, IconPlus
} from "../../assets/icons";
import "./developers.css";

// ------------------------------------------------------------------
// Configuration
// ------------------------------------------------------------------
const ENDPOINT_GROUPS = DEVELOPER.ENDPOINT_GROUPS.map(group => ({
  ...group,
  items: group.items.map(ep => {
    let tryFn = null;
    if (ep.id === "v1-tokens") tryFn = (p) => v1.getTokens(p);
    else if (ep.id === "v1-transactions") tryFn = (p) => v1.getTransactions(p);
    else if (ep.id === "v1-wallet-tracker") tryFn = (p) => v1.getWalletTracker(p.address, p);
    return { ...ep, tryIt: tryFn };
  })
}));

const WS_ENDPOINTS = {
  label: "WebSocket",
  items: [
    {
      id: "ws-transactions",
      title: "Transaction Stream",
      path: "/ws/transactions",
      method: "WS",
      auth: "public",
      description: "Real-time transaction updates for all tokens.",
      params: [{ name: "channel", type: "string", required: true, desc: "Subscribe to transaction:all" }]
    },
    {
      id: "ws-new-token",
      title: "New Token Stream",
      path: "/ws/new_token",
      method: "WS",
      auth: "public",
      description: "Real-time notifications for newly listed tokens.",
      params: [{ name: "channel", type: "string", required: true, desc: "Subscribe to new_token" }]
    },
    {
      id: "ws-token-update",
      title: "Token Update Stream",
      path: "/ws/token_update",
      method: "WS",
      auth: "public",
      description: "Real-time price and metadata updates for tracked tokens.",
      params: [{ name: "channel", type: "string", required: true, desc: "Subscribe to token_update" }]
    },
    {
      id: "ws-migrate",
      title: "Migration Stream",
      path: "/ws/migrate",
      method: "WS",
      auth: "public",
      description: "Real-time token migration event notifications.",
      params: [{ name: "channel", type: "string", required: true, desc: "Subscribe to migrate" }]
    },
    {
      id: "ws-token-transactions",
      title: "Token Transaction Stream",
      path: "/ws/transactions/:tokenAddress",
      method: "WS",
      auth: "public",
      description: "Real-time transactions for a specific token address.",
      params: [{ name: "tokenAddress", type: "string", required: true, desc: "Token contract address (0x + 40 hex chars)" }]
    },
    {
      id: "ws-holder-update",
      title: "Holder Update Stream",
      path: "/ws/holders/:tokenAddress",
      method: "WS",
      auth: "public",
      description: "Real-time holder count and distribution updates.",
      params: [{ name: "tokenAddress", type: "string", required: true, desc: "Token contract address (0x + 40 hex chars)" }]
    }
  ]
};

const ALL_GROUPS = [...ENDPOINT_GROUPS, WS_ENDPOINTS];

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function useClipboard(timeout = 1800) {
  const [copiedId, setCopiedId] = useState(null);
  const copy = useCallback(async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), timeout);
    } catch (err) {
      console.error("Clipboard failed:", err);
    }
  }, [timeout]);
  return { copiedId, copy };
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

function classNames(...c) {
  return c.filter(Boolean).join(" ");
}

function isValidAddressFormat(address) {
  if (!address || typeof address !== "string") return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// ------------------------------------------------------------------
// Sub-Components
// ------------------------------------------------------------------
function ParamInput({ param, value, onChange }) {
  const id = `param-${param.name}`;
  const isAddressField = param.name.toLowerCase().includes("address") || param.name === "wallet";
  const showError = isAddressField && value && !isValidAddressFormat(value);

  if (param.enum) {
    return (
      <select
        id={id}
        value={value || ""}
        onChange={(e) => onChange(param.name, e.target.value || undefined)}
        className="dev-param-select"
      >
        <option value="">— optional —</option>
        {param.enum.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }
  return (
    <div className="dev-param-input-wrapper">
      <input
        id={id}
        type={param.type === "number" ? "number" : "text"}
        placeholder={param.default || param.desc}
        value={value || ""}
        onChange={(e) => onChange(param.name, e.target.value)}
        className={classNames("dev-param-input", showError && "dev-input-error")}
      />
      {showError && (
        <span className="dev-input-error-text">Invalid address format (must be 0x + 40 hex chars)</span>
      )}
    </div>
  );
}

function EndpointDoc({ endpoint, onTry, isActive }) {
  const [open, setOpen] = useState(true);
  const { copiedId, copy } = useClipboard();

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  return (
    <div className={classNames("dev-doc-card", isActive && "dev-doc-active")} id={endpoint.id}>
      <button 
        className="dev-doc-header" 
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="dev-doc-title">
          <span className={classNames("dev-method-badge", endpoint.method.toLowerCase())}>
            {endpoint.method}
          </span>
          <code className="dev-doc-path">{endpoint.path}</code>
        </div>
        <div className="dev-doc-meta">
          {endpoint.auth === "public" ? (
            <span className="dev-auth-tag public"><IconUnlock size={14} /> Public</span>
          ) : (
            <span className="dev-auth-tag master"><IconLock size={14} /> Master Key</span>
          )}
          <IconChevron size={16} down={!open} />
        </div>
      </button>
      
      {open && (
        <div className="dev-doc-body">
          <p className="dev-doc-desc">{endpoint.description}</p>
          
          {endpoint.params?.length > 0 && (
            <>
              <h4 className="dev-section-title">Parameters</h4>
              <div className="dev-params-table">
                <div className="dev-params-row head">
                  <span>Name</span>
                  <span>Type</span>
                  <span>Default</span>
                  <span>Description</span>
                </div>
                {endpoint.params.map((p) => (
                  <div className="dev-params-row" key={p.name}>
                    <code className={classNames("dev-param-name", p.required && "dev-param-required")}>
                      {p.name}
                      {p.required && <span className="dev-required-star">*</span>}
                    </code>
                    <span className="dev-param-type">
                      {p.type}{p.enum ? ` (${p.enum.join(", ")})` : ""}
                    </span>
                    <span className="dev-param-default">{p.default || "—"}</span>
                    <span className="dev-param-desc">{p.desc}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="dev-doc-actions">
            {endpoint.tryIt && (
              <button className="dev-try-btn" onClick={() => onTry(endpoint)}>
                <IconTerminal size={16} /> Try it
              </button>
            )}
            <button 
              className="dev-copy-btn" 
              onClick={() => copy(`${window.location.origin}/api${endpoint.path}`, endpoint.id)}
            >
              {copiedId === endpoint.id ? <IconCheck size={14} /> : <IconCopy size={14} />}
              {copiedId === endpoint.id ? "Copied" : "Copy Path"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Playground({ endpoint, onClose }) {
  const [values, setValues] = useState(() => {
    const init = {};
    endpoint.params?.forEach((p) => { 
      if (p.default) init[p.name] = p.default; 
    });
    return init;
  });
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");
  const [statusCode, setStatusCode] = useState(null);
  const { copiedId, copy } = useClipboard();

  const handleChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value || undefined }));
  };

  const handleSend = async () => {
    setLoading(true);
    setError("");
    setResponse(null);
    setStatusCode(null);
    try {
      const clean = {};
      const pathParams = {};
      Object.entries(values).forEach(([k, v]) => {
        let trimmed = v !== undefined && v !== null ? String(v).trim() : "";
        if (trimmed !== "") {
          if (k.toLowerCase().includes("address") || k === "wallet" || k === "tokenAddress") {
            trimmed = trimmed.toLowerCase();
          }
          if (endpoint.path.includes(`:${k}`)) {
            pathParams[k] = trimmed;
          } else {
            clean[k] = trimmed;
          }
        }
      });
      const data = await endpoint.tryIt(clean, pathParams);
      setResponse(data);
      setStatusCode(200);
    } catch (err) {
      console.error("Request failed:", err);
      setError(err.message || "Request failed");
      setStatusCode(err.status || 400);
    } finally {
      setLoading(false);
    }
  };

  const curlCmd = useMemo(() => {
    const base = import.meta.env.VITE_API_BASE || "https://api.swanfi.pro";
    let url = `${base}${endpoint.path}`;
    const qs = new URLSearchParams();
    Object.entries(values).forEach(([k, v]) => {
      let trimmed = v !== undefined && v !== null ? String(v).trim() : "";
      if (trimmed !== "") {
        if (k.toLowerCase().includes("address") || k === "wallet" || k === "tokenAddress") {
          trimmed = trimmed.toLowerCase();
        }
        if (endpoint.path.includes(`:${k}`)) {
          url = url.replace(`:${k}`, encodeURIComponent(trimmed));
        } else {
          qs.set(k, trimmed);
        }
      }
    });
    const q = qs.toString();
    if (q) url += `?${q}`;
    return `curl -X ${endpoint.method} "${url}" \\\n  -H "x-api-key: YOUR_PUBLIC_KEY"`;
  }, [endpoint, values]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div className="dev-playground-overlay" onClick={onClose}>
      <div className="dev-playground-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dev-playground-header">
          <div className="dev-playground-header-left">
            <span className={classNames("dev-method-badge", endpoint.method.toLowerCase())}>
              {endpoint.method}
            </span>
            <code className="dev-playground-path">{endpoint.path}</code>
          </div>
          <button className="dev-playground-close" onClick={onClose}>
            <IconX size={18} />
          </button>
        </div>

        <div className="dev-playground-body">
          <div className="dev-playground-left">
            <div className="dev-playground-section">
              <h4>Parameters</h4>
              <div className="dev-params-grid">
                {endpoint.params?.map((p) => (
                  <div className="dev-param-field" key={p.name}>
                    <label htmlFor={`param-${p.name}`}>
                      <code>{p.name}</code>
                      {p.required ? (
                        <span className="dev-required-badge">required</span>
                      ) : (
                        <span className="dev-optional-badge">optional</span>
                      )}
                    </label>
                    <ParamInput param={p} value={values[p.name]} onChange={handleChange} />
                    {p.desc && <small className="dev-param-help">{p.desc}</small>}
                  </div>
                ))}
              </div>
            </div>

            <div className="dev-curl-box">
              <div className="dev-curl-header">
                <span>cURL</span>
                <button className="dev-copy-btn small" onClick={() => copy(curlCmd, "curl")}>
                  {copiedId === "curl" ? <IconCheck size={14} /> : <IconCopy size={14} />}
                </button>
              </div>
              <pre>{curlCmd}</pre>
            </div>

            <button className="dev-send-btn" disabled={loading} onClick={handleSend}>
              {loading ? (
                <><span className="dev-spinner" /> Sending...</>
              ) : (
                <><IconTerminal size={16} /> Send Request</>
              )}
            </button>
          </div>

          <div className="dev-playground-right">
            <div className="dev-response-header">
              <span>Response</span>
              {statusCode && (
                <span className={classNames("dev-status-pill", statusCode >= 200 && statusCode < 300 ? "ok" : "err")}>
                  {statusCode}
                </span>
              )}
            </div>
            <div className="dev-response-body">
              {error ? (
                <pre className="dev-error">{error}</pre>
              ) : response ? (
                <pre>{JSON.stringify(response, null, 2)}</pre>
              ) : (
                <div className="dev-empty">
                  <IconTerminal size={32} />
                  <p>Click "Send Request" to see the response</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApiKeyListItem({ apiKey, onCopy, copiedId, onRemove }) {
  const [showFull, setShowFull] = useState(false);

  if (!apiKey) return null;

  const safeKey = apiKey.key || "";
  const safeName = apiKey.name || "Unnamed Key";
  const isActive = apiKey.isActive ?? false;
  const usageToday = apiKey.usageToday ?? 0;
  const dailyQuota = apiKey.dailyQuota ?? 10000;
  const remainingQuota = apiKey.remainingQuota ?? Math.max(0, dailyQuota - usageToday);
  const usagePercent = dailyQuota > 0 ? Math.min(100, Math.round((usageToday / dailyQuota) * 100)) : 0;
  const displayKey = safeKey 
    ? (showFull ? safeKey : `${safeKey.slice(0, 12)}...${safeKey.slice(-4)}`) 
    : "No key available";

  return (
    <div className="dev-key-list-item">
      <div className="dev-key-list-head">
        <div className="dev-key-list-info">
          <strong>{safeName}</strong>
          <div className="dev-key-list-meta">
            <span className={classNames("dev-status-dot", isActive ? "active" : "inactive")} />
            {isActive ? "Active" : "Inactive"}
          </div>
        </div>
        <div className="dev-key-list-actions">
          <button className="dev-icon-btn" onClick={() => safeKey && onCopy(safeKey, apiKey.id)} disabled={!safeKey}>
            {copiedId === apiKey.id ? <IconCheck size={14} /> : <IconCopy size={14} />}
          </button>
          <button className="dev-icon-btn danger" onClick={() => onRemove(apiKey.id)}>
            <IconTrash size={14} />
          </button>
        </div>
      </div>

      <div className="dev-key-list-secret">
        <code>{displayKey}</code>
        <button className="dev-icon-btn small" onClick={() => setShowFull(!showFull)} disabled={!safeKey}>
          {showFull ? <IconEyeOff size={14} /> : <IconEye size={14} />}
        </button>
      </div>

      <div className="dev-key-list-usage">
        <div className="dev-key-usage-row">
          <span>Used Today</span>
          <strong>{usageToday.toLocaleString()} / {dailyQuota.toLocaleString()}</strong>
        </div>
        <div className="dev-key-usage-row">
          <span>Remaining</span>
          <strong className={remainingQuota < 1000 ? "warn" : "ok"}>{remainingQuota.toLocaleString()}</strong>
        </div>
        <div className="dev-progress-bar">
          <div className="dev-progress-fill" style={{ width: `${usagePercent}%` }} />
        </div>
        <div className="dev-progress-label">{usagePercent}% used</div>
      </div>
    </div>
  );
}

function ApiKeyManager({ isConnected, userProfile, onConnectClick }) {
  const [keys, setKeys] = useState(() => {
    try { 
      return JSON.parse(localStorage.getItem("swanfi_api_keys") || "[]"); 
    } catch { 
      return []; 
    }
  });
  const [form, setForm] = useState({ name: "", wallet: "", note: "" });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [walletOpen, setWalletOpen] = useState(false);
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const { copiedId, copy } = useClipboard();

  useEffect(() => {
    if (!isConnected) return;
    const loadWallets = async () => {
      try {
        if (userProfile?.wallets && Array.isArray(userProfile.wallets)) {
          setWallets(userProfile.wallets);
          if (userProfile.wallets.length && !selectedWallet) {
            setSelectedWallet(userProfile.wallets[0]);
          }
        }
      } catch (e) {
        console.log("Could not load wallets", e);
      }
    };
    loadWallets();
  }, [isConnected, userProfile]);

  const saveKeys = (next) => {
    localStorage.setItem("swanfi_api_keys", JSON.stringify(next));
    setKeys(next);
  };

  const handleGenerate = async () => {
    if (!form.name.trim()) { 
      setError("Key name is required."); 
      return; 
    }
    setError("");
    setGenerating(true);
    try {
      const payload = {
        name: form.name.trim(),
        ...(selectedWallet ? { 
          wallet: selectedWallet.address || selectedWallet.wallet_address || selectedWallet 
        } : {}),
        ...(form.note ? { note: form.note } : {}),
      };
      const response = await apikey.create(payload);
      const result = response?.apiKey || response || {};
      const rawKey = result.key || "";
      if (!rawKey) {
        setError("API did not return a key. Please try again.");
        return;
      }
      const newKey = {
        id: result.id || result._id || `temp-${Date.now()}`,
        name: form.name.trim(),
        key: rawKey,
        createdAt: Date.now(),
        isActive: true,
        usageToday: 0,
        dailyQuota: result.dailyQuota || result.daily_quota || 10000,
        remainingQuota: result.dailyQuota || result.daily_quota || 10000,
        rateLimit: result.rateLimit || result.rate_limit || 60
      };
      const next = [...keys, newKey];
      saveKeys(next);
      setForm({ name: "", wallet: "", note: "" });
      setSelectedWallet(null);
    } catch (err) {
      setError(err.message || "Failed to generate key. Make sure you are logged in.");
    } finally {
      setGenerating(false);
    }
  };

  const removeKey = (id) => {
    const next = keys.filter((k) => k.id !== id);
    saveKeys(next);
  };

  const handleCopyKey = async (key, id) => {
    if (!key) return;
    await copy(key, id);
  };

  if (!isConnected) {
    return (
      <div className="dev-key-manager">
        <h3 className="dev-rightbar-title">
          <IconKey size={18} /> API Keys
        </h3>
        <div className="dev-key-login-overlay">
          <div className="dev-key-login-blur">
            <div className="dev-key-form">
              <div className="dev-input-group">
                <label>Key Name <span className="dev-required">*</span></label>
                <input placeholder="e.g. Trading Bot" disabled />
              </div>
              <div className="dev-input-group">
                <label>Wallet</label>
                <input placeholder="Select wallet..." disabled />
              </div>
              <div className="dev-input-group">
                <label>Note</label>
                <input placeholder="Optional description" disabled />
              </div>
              <button className="dev-generate-btn" disabled>
                <IconKey size={16} /> Generate Key
              </button>
            </div>
          </div>
          <div className="dev-key-login-prompt">
            <IconLock size={32} />
            <p>Login to generate and manage API keys</p>
            <button className="dev-login-btn" onClick={onConnectClick}>
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dev-key-manager">
      <h3 className="dev-rightbar-title">
        <IconKey size={18} /> API Keys
      </h3>
      
      <div className="dev-key-form">
        <div className="dev-input-group">
          <label>Key Name <span className="dev-required">*</span></label>
          <input 
            placeholder="e.g. Trading Bot" 
            value={form.name} 
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            maxLength={50}
          />
        </div>
        
        <div className="dev-input-group">
          <label>Wallet</label>
          <div className="dev-wallet-select">
            <button 
              className="dev-wallet-btn" 
              onClick={() => setWalletOpen(!walletOpen)} 
              disabled={wallets.length === 0}
            >
              <div className="dev-wallet-left">
                <IconWallet size={16} />
                <span>
                  {selectedWallet
                    ? (selectedWallet.wallet_name || selectedWallet.name || 
                       `${selectedWallet.address?.slice(0, 10)}...${selectedWallet.address?.slice(-6)}`)
                    : (wallets.length === 0 ? "No wallets found" : "Select wallet...")}
                </span>
              </div>
              <IconChevron size={14} down={!walletOpen} />
            </button>
            
            {walletOpen && wallets.length > 0 && (
              <div className="dev-wallet-dropdown">
                {wallets.map((wallet, idx) => (
                  <button 
                    key={wallet.id || wallet.address || idx} 
                    className="dev-wallet-option" 
                    onClick={() => { 
                      setSelectedWallet(wallet); 
                      setWalletOpen(false); 
                    }}
                  >
                    <div>
                      <strong>{wallet.wallet_name || wallet.name || `Wallet ${idx + 1}`}</strong>
                      <span>{wallet.address || wallet.wallet_address}</span>
                    </div>
                    {selectedWallet?.id === wallet.id || selectedWallet?.address === wallet.address 
                      ? <IconCheck size={16} /> 
                      : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="dev-input-group">
          <label>Note</label>
          <input 
            placeholder="Optional description" 
            value={form.note} 
            onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
            maxLength={100}
          />
        </div>
        
        <button 
          className="dev-generate-btn" 
          disabled={generating || !form.name.trim()} 
          onClick={handleGenerate}
        >
          <IconKey size={16} /> {generating ? "Generating..." : "Generate Key"}
        </button>
        
        {error && <div className="dev-key-error">{error}</div>}
      </div>

      {keys.length > 0 && (
        <div className="dev-key-list">
          <h4 className="dev-section-title">Your Keys ({keys.length})</h4>
          {keys.map((k, index) => (
            <ApiKeyListItem 
              key={k.id || k._id || `apikey-${index}`} 
              apiKey={k} 
              onCopy={handleCopyKey} 
              copiedId={copiedId}
              onRemove={removeKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarContent({ search, setSearch, activeEndpoint, onNavigate, filteredGroups }) {
  return (
    <>
      <div className="dev-logo">
        <div className="dev-logo-icon"><IconCode size={20} /></div>
        <div className="dev-logo-text">
          <strong>SwanFi API</strong>
          <span>Developer Docs</span>
        </div>
      </div>
      
      <div className="dev-search-box">
        <input 
          placeholder="Search endpoints..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)}
          type="search"
        />
      </div>
      
      <nav className="dev-sidebar-nav">
        {filteredGroups.map((group) => (
          <div className="dev-nav-group" key={group.label}>
            <span className="dev-sidebar-label">{group.label}</span>
            {group.items.map((ep) => (
              <button 
                key={ep.id} 
                className={classNames("dev-nav-btn", activeEndpoint === ep.id && "active")} 
                onClick={() => onNavigate(ep.id)}
              >
                <span className={classNames("dev-method-dot", ep.method.toLowerCase())} />
                <div className="dev-nav-info">
                  <strong>{ep.title}</strong>
                  <span>{ep.path}</span>
                </div>
              </button>
            ))}
          </div>
        ))}
      </nav>
      
      <a href={DEVELOPER.GITHUB_URL} target="_blank" rel="noreferrer" className="dev-github-link">
        <IconCode size={16} /> View on GitHub <IconExternalLink size={12} />
      </a>
    </>
  );
}

function BottomSheet({ open, onClose, title, children }) {
  const sheetRef = useRef(null);

  return (
    <>
      <div className={classNames("dev-bottom-sheet-overlay", open && "open")} onClick={onClose} />
      <div className={classNames("dev-bottom-sheet", open && "open")} ref={sheetRef}>
        <div className="dev-bottom-sheet-handle">
          <div className="dev-bottom-sheet-handle-bar" />
        </div>
        <div className="dev-bottom-sheet-header">
          <span className="dev-bottom-sheet-title">{title}</span>
          <button className="dev-bottom-sheet-close" onClick={onClose}>
            <IconX size={18} />
          </button>
        </div>
        <div className="dev-bottom-sheet-body">{children}</div>
      </div>
    </>
  );
}

// ------------------------------------------------------------------
// Main Component
// ------------------------------------------------------------------
export default function Developers({ isConnected, userProfile, onConnectClick }) {
  const [activeEndpoint, setActiveEndpoint] = useState(null);
  const [search, setSearch] = useState("");
  const [apiHealth, setApiHealth] = useState(null);
  const [tryingEndpoint, setTryingEndpoint] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [bottomSheetContent, setBottomSheetContent] = useState("apikeys");
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1100px)");
  const mainRef = useRef(null);

  // Health check
  useEffect(() => {
    let mounted = true;
    utils.getHealth()
      .then(() => mounted && setApiHealth("online"))
      .catch(() => mounted && setApiHealth("offline"));
    return () => { mounted = false; };
  }, []);

  // Close mobile UI on resize to desktop
  useEffect(() => {
    if (!isMobile) {
      setMobileSidebarOpen(false);
      setBottomSheetOpen(false);
    }
  }, [isMobile]);

  // Intersection Observer for active endpoint tracking
  useEffect(() => {
    if (isMobile) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveEndpoint(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );

    const cards = document.querySelectorAll(".dev-doc-card");
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [search, isMobile]);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return ALL_GROUPS;
    const q = search.toLowerCase();
    return ALL_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((i) =>
        i.title.toLowerCase().includes(q) ||
        i.path.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q)
      ),
    })).filter((g) => g.items.length > 0);
  }, [search]);

  const scrollTo = useCallback((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveEndpoint(id);
      if (isMobile) setMobileSidebarOpen(false);
    }
  }, [isMobile]);

  const tabs = ALL_GROUPS.map((g, i) => ({ 
    id: i, 
    label: g.label, 
    method: g.items[0]?.method || "GET" 
  }));

  // Prevent body scroll when modals are open
  useEffect(() => {
    if (tryingEndpoint || mobileSidebarOpen || bottomSheetOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [tryingEndpoint, mobileSidebarOpen, bottomSheetOpen]);

  const openBottomSheet = (content) => {
    setBottomSheetContent(content);
    setBottomSheetOpen(true);
  };

  return (
    <div className="dev-page">
      {/* Mobile Header */}
      {isMobile && (
        <header className="dev-mobile-header">
          <div className="dev-mobile-header-left">
            <div className="dev-logo-icon"><IconCode size={18} /></div>
            <span className="dev-mobile-header-title">API Docs</span>
          </div>
          <div className="dev-mobile-actions">

            <button className="dev-mobile-icon-btn" onClick={() => setMobileSidebarOpen(true)}>
              <IconMenu size={18} />
            </button>
          </div>
        </header>
      )}

      {/* Mobile Tabs */}
      {isMobile && (
        <div className="dev-mobile-tabs">
          <div className="dev-mobile-tabs-inner">
            {tabs.map((tab) => (
              <button 
                key={tab.id} 
                className={classNames("dev-mobile-tab", activeTab === tab.id && "active")}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className={classNames("dev-mobile-tab-dot", tab.method.toLowerCase())} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Sidebar */}
      {isMobile && (
        <>
          <div className={classNames("dev-sidebar-mobile", mobileSidebarOpen && "open")}>
            <div className="dev-sidebar-mobile-header">
              <span>Navigation</span>
              <button className="dev-icon-btn" onClick={() => setMobileSidebarOpen(false)}>
                <IconX size={18} />
              </button>
            </div>
            <SidebarContent 
              search={search} 
              setSearch={setSearch}
              activeEndpoint={activeEndpoint}
              onNavigate={scrollTo}
              filteredGroups={filteredGroups}
            />
          </div>
          <div 
            className={classNames("dev-sidebar-overlay", mobileSidebarOpen && "open")}
            onClick={() => setMobileSidebarOpen(false)}
          />
        </>
      )}

      <div className="dev-container">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <aside className="dev-sidebar">
            <SidebarContent 
              search={search} 
              setSearch={setSearch}
              activeEndpoint={activeEndpoint}
              onNavigate={scrollTo}
              filteredGroups={filteredGroups}
            />
          </aside>
        )}

        {/* Main Content */}
        <main className="dev-main" ref={mainRef}>
          <div className="dev-hero">
            <div className="dev-badge">
              <IconTerminal size={14} /> API Reference
            </div>
            <h1>SwanFi Public API</h1>
            <p>
              Build powerful DeFi applications with real-time token data, 
              on-chain transactions, and wallet analytics. All V1 endpoints are 
              available with a public API key.
            </p>
            <div className="dev-hero-meta">
              <span className={classNames("dev-health-pill", apiHealth || "unknown")}>
                {apiHealth === "online" ? "● API Online" : 
                 apiHealth === "offline" ? "○ API Offline" : "… Checking"}
              </span>
              <span className="dev-version-pill">v1.0.0</span>
              <span className="dev-base-url">
                <code>api.swanfi.pro</code>
              </span>
            </div>
          </div>

          <div className="dev-quickstart">
            <h3>Quick Start</h3>
            <div className="dev-code-block">
              <div className="dev-code-header">
                <span>cURL</span>
              </div>
              <pre>{`curl -X GET "https://api.swanfi.pro/v1/tokens?limit=10" \\\n  -H "x-api-key: YOUR_API_KEY"`}</pre>
            </div>
          </div>

          <div className="dev-endpoints">
            {ALL_GROUPS.map((group, idx) => (
              <section 
                key={group.label} 
                className={classNames("dev-endpoint-group", isMobile && activeTab !== idx && "dev-hidden-mobile")}
              >
                <h2 className="dev-group-title">
                  {group.label}
                  <span className="dev-group-count">{group.items.length} endpoints</span>
                </h2>
                {group.items.map((ep) => (
                  <EndpointDoc 
                    key={ep.id} 
                    endpoint={ep} 
                    onTry={(e) => e.tryIt && setTryingEndpoint(e)}
                    isActive={activeEndpoint === ep.id}
                  />
                ))}
              </section>
            ))}
          </div>

          {isMobile && (
            <div className="dev-mobile-rate-section">
              <h3 className="dev-section-title">Rate Limits</h3>
              <div className="dev-rate-card">
                <div className="dev-rate-row">
                  <span>Free Tier</span>
                  <strong>15 req/min</strong>
                </div>
                <div className="dev-rate-row">
                  <span>Daily Quota</span>
                  <strong>10,000 req</strong>
                </div>
                <div className="dev-rate-row">
                  <span>Key Format</span>
                  <code>swan_&lt;hex&gt;</code>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Desktop Right Panel */}
        {!isTablet && (
          <aside className="dev-rightbar">
            <ApiKeyManager 
              isConnected={isConnected} 
              userProfile={userProfile} 
              onConnectClick={onConnectClick} 
            />
            <div className="dev-support-card">
              <h4 className="dev-section-title">Need Help?</h4>
              <p>Join our developer community or open an issue on GitHub.</p>
              <a href={DEVELOPER.GITHUB_URL} target="_blank" rel="noreferrer" className="dev-support-link">
                <IconCode size={14} /> GitHub Discussions
              </a>
            </div>
          </aside>
        )}
      </div>

      {/* Mobile Bottom Sheet */}
      {isMobile && (
        <BottomSheet 
          open={bottomSheetOpen} 
          onClose={() => setBottomSheetOpen(false)} 
          title={bottomSheetContent === "apikeys" ? "API Keys" : "Rate Limits"}
        >
          {bottomSheetContent === "apikeys" ? (
            <ApiKeyManager 
              isConnected={isConnected} 
              userProfile={userProfile} 
              onConnectClick={onConnectClick} 
            />
          ) : (
<ApiKeyManager 
              isConnected={isConnected} 
              userProfile={userProfile} 
              onConnectClick={onConnectClick} 
            />
          )}
        </BottomSheet>
      )}

      {/* Mobile FAB */}
      {isMobile && (
        <button className="dev-mobile-fab" onClick={() => openBottomSheet("apikeys")}>
          <IconKey size={22} />
        </button>
      )}

      {/* Playground Modal */}
      {tryingEndpoint && (
        <Playground endpoint={tryingEndpoint} onClose={() => setTryingEndpoint(null)} />
      )}
    </div>
  );
}