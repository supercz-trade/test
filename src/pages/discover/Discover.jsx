// src/pages/discover/Discover.jsx

import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageTitle from "../../components/PageTitle";
import TradeNotif from "../../components/TradeNotif/TradeNotif";
import { useDiscover } from "../../hooks/useDiscover";
import { DiscoverColumn, DEFAULT_FILTER } from "./DiscoverColumn";
import { ChevronDownIcon, DiscoverNewIcon, DiscoverMigratingIcon, DiscoverMigratedIcon } from "../../assets/icons";
import "./discover.css";

const TABS = ["New Launched", "Migrating", "Migrated"];

const TAB_ICONS = {
  "New Launched": <DiscoverNewIcon size={13} />,
  "Migrating":    <DiscoverMigratingIcon size={13} />,
  "Migrated":     <DiscoverMigratedIcon size={13} />,
};

function MobileTabDropdown({ active, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="dc-tab-wrap" ref={ref}>
      <button
        className="dc-tab-trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="dc-tab-active-label" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          {TAB_ICONS[active]}{active}
        </span>
        <ChevronDownIcon
          size={12}
          className={`dc-tab-chevron${open ? " dc-tab-chevron--open" : ""}`}
        />
      </button>

      {open && (
        <div className="dc-tab-menu" role="listbox">
          {TABS.map(tab => (
            <button
              key={tab}
              role="option"
              aria-selected={tab === active}
              className={`dc-tab-item${tab === active ? " dc-tab-item--active" : ""}`}
              onClick={() => { onChange(tab); setOpen(false); }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                {TAB_ICONS[tab]}{tab}
              </span>
              {tab === active && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Discover({ walletId = null, onTradeNotif }) {
  const {
    newTokens,       loadingNew,
    migratingTokens, loadingMigrating,
    migratedTokens,  loadingMigrated,
  } = useDiscover();

  const navigate = useNavigate();

  const [filterNew,       setFilterNew]       = useState(DEFAULT_FILTER);
  const [filterMigrating, setFilterMigrating] = useState(DEFAULT_FILTER);
  const [filterMigrated,  setFilterMigrated]  = useState(DEFAULT_FILTER);
  const [mobileTab,       setMobileTab]       = useState("New Launched");

  const tabMap = {
    "New Launched": { tokens: newTokens,       loading: loadingNew,       filter: filterNew,       onFilterChange: setFilterNew       },
    "Migrating":    { tokens: migratingTokens, loading: loadingMigrating, filter: filterMigrating, onFilterChange: setFilterMigrating },
    "Migrated":     { tokens: migratedTokens,  loading: loadingMigrated,  filter: filterMigrated,  onFilterChange: setFilterMigrated  },
  };

  return (
    <div className="dc-page">
      <PageTitle title="SwanFi — Discover" />

      <div className="dc-layout">
        <DiscoverColumn title="New Launched"  tokens={newTokens}       loading={loadingNew}       filter={filterNew}       onFilterChange={setFilterNew}       walletId={walletId} onTradeNotif={onTradeNotif} />
        <DiscoverColumn title="Migrating"     tokens={migratingTokens} loading={loadingMigrating} filter={filterMigrating} onFilterChange={setFilterMigrating} walletId={walletId} onTradeNotif={onTradeNotif} />
        <DiscoverColumn title="Migrated"      tokens={migratedTokens}  loading={loadingMigrated}  filter={filterMigrated}  onFilterChange={setFilterMigrated}  walletId={walletId} onTradeNotif={onTradeNotif} />
      </div>

      <div className="dc-mobile-layout">
        <DiscoverColumn
          title={mobileTab}
          mobileTabSlot={<MobileTabDropdown active={mobileTab} onChange={setMobileTab} />}
          walletId={walletId}
          onTradeNotif={onTradeNotif}
          {...tabMap[mobileTab]}
        />
      </div>
    </div>
  );
}