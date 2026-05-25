// src/pages/trade/tab/TabDeployTokens.jsx
// Tab: Dev Tokens — shows all tokens deployed by the same developer

import { useNavigate } from "react-router-dom";
import { formatUsd } from "../../../utils/format";
import "./tabs.css";

export default function TabDeployTokens({ devInfo, token }) {
  const navigate = useNavigate();
  const deploy = devInfo?.deploy;
  const tokens = deploy?.deployData ?? [];
  const currentAddr = token?.tokenAddress?.toLowerCase();
  const total = deploy?.deployCount ?? tokens.length;
  const migrated = deploy?.migratedCount ?? 0;

  if (!devInfo) {
    return (
      <div className="tr-empty-state" style={{ flex: 1 }}>
        <p className="tr-empty-title">Loading dev info...</p>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="tr-empty-state" style={{ flex: 1 }}>
        <p className="tr-empty-title">No tokens deployed</p>
        <p className="tr-empty-sub">This dev has not deployed other tokens</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      <div className="tr-panel-subbar">
        <span className="tr-subbar-info">
          Developer · <span style={{ color: "var(--color-primary)", fontWeight: 700 }}>{migrated}/{total}</span> migrated
        </span>
      </div>
      <div className="tr-deploy-table tr-table-scroll">
        <table className="tr-table">
          <thead>
            <tr>
              <th>#</th>
              <th>TOKEN</th>
              <th>ATH MCAP</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((t, i) => {
              const isCurrent = t.address?.toLowerCase() === currentAddr;
              const athMcap = t.athMcap ?? (t.allTimeHigh * (t.totalSupply || 1_000_000_000));
              return (
                <tr
                  key={t.address}
                  style={{
                    cursor: isCurrent ? "default" : "pointer",
                    background: isCurrent ? "var(--bg-active)" : undefined,
                  }}
                  onClick={() => !isCurrent && navigate(`/trade/${t.address}`)}
                  onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = "var(--bg-elevated)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isCurrent ? "var(--bg-active)" : ""; }}
                >
                  <td style={{ color: "var(--text-muted)", width: 30 }}>{i + 1}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {t.imageUrl
                        ? <img src={t.imageUrl} alt={t.symbol}
                            style={{ width: 28, height: 28, borderRadius: 7, objectFit: "cover", flexShrink: 0 }}
                            onError={e => { e.target.style.display = "none"; }}
                          />
                        : <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--bg-elevated)", flexShrink: 0 }} />
                      }
                      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: isCurrent ? "var(--color-primary)" : "var(--text-primary)" }}>
                            {t.symbol}
                          </span>
                          {isCurrent && (
                            <span style={{ fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 6, background: "var(--bg-active)", color: "var(--color-primary)" }}>NOW</span>
                          )}
                          <span className={`tr-deploy-mark tr-deploy-mark--${t.migrated ? "migrated" : "bonding"}`}>
                            {t.migrated ? "M" : "B"}
                          </span>
                        </div>
                        <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                          {t.address?.slice(0,6)}…{t.address?.slice(-4)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
                    {formatUsd(athMcap)}
                  </td>
                  <td>
                    <span style={{
                      fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 10,
                      background: t.migrated ? "rgba(45,212,191,0.12)" : "rgba(255,184,0,0.12)",
                      color: t.migrated ? "#2dd4bf" : "var(--color-primary)",
                    }}>
                      {t.migrated ? "Migrated" : "bonding"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}