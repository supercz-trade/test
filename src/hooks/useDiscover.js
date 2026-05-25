// src/hooks/useDiscover.js
// Token discovery hook — manages new, migrating, and migrated token state

import { useEffect, useState, useRef, useCallback } from "react";
import { tokens as tokensApi } from "../services/api";
import {
  subscribeNewToken,
  subscribeTokenUpdate,
  subscribeMigrate,
} from "../services/ws";

const LIMIT = 50;

export function useDiscover() {

  const newMapRef       = useRef(new Map());
  const migratingMapRef = useRef(new Map());
  const migratedMapRef  = useRef(new Map());

  const pendingUpdatesRef = useRef(new Map());
  const timerNewRef       = useRef(null);
  const timerMigRef       = useRef(null);
  const timerMigedRef     = useRef(null);

  const [newTokens,       setNewTokens]       = useState([]);
  const [migratingTokens, setMigratingTokens] = useState([]);
  const [migratedTokens,  setMigratedTokens]  = useState([]);

  const [loadingNew,       setLoadingNew]       = useState(true);
  const [loadingMigrating, setLoadingMigrating] = useState(true);
  const [loadingMigrated,  setLoadingMigrated]  = useState(true);

  function normaliseToken(t) {
    const mode = t.mode || (t.migrated ? "dex" : "bonding");
    return {
      tokenAddress:  t.tokenAddress,
      symbol:        t.symbol       || t.tokenSymbol || "?",
      name:          t.name         || t.tokenName   || "?",
      imageUrl:      t.imageUrl     || null,
      description:   t.description  || null,
      website:       t.website      || null,
      telegram:      t.telegram     || null,
      twitter:       t.twitter      || null,
      sourceFrom:    t.sourceFrom   || t.source      || null,
      basePair:      t.basePair     || t.base_pair   || t.baseSymbol || null,
      baseAddress:   t.baseAddress  || t.base_address|| null,
      launchTime:    t.launchTime   || t.timestamp   || null,
      migrated:      t.migrated     ?? false,
      migratedTime:  t.migratedTime || null,
      totalSupply:   Number(t.totalSupply || 0),
      decimals:      Number(t.decimals    || 18),
      marketCap:     t.marketcap    ?? t.marketCap   ?? 0,
      volumeUsdt:    t.volume24h    ?? t.volumeUsdt  ?? 0,
      priceUsdt:     t.price        ?? t.priceUsdt   ?? 0,
      txCount:       t.txCount      || 0,
      holderCount:   t.holderCount  || 0,
      devMark:          t.devMark          || null,
      developerAddress: t.developerAddress || t.devAddress || null,
      holderStats: {
        devHoldPct:   t.holderStats?.devHoldPct   ?? 0,
        paperHandPct: t.holderStats?.paperHandPct ?? 0,
        top10:        t.holderStats?.top10        ?? [],
      },
      tax: {
        buy:  t.tax?.buy  ?? t.taxBuy  ?? 0,
        sell: t.tax?.sell ?? t.taxSell ?? 0,
      },
      mode,
      platform: t.platform || t.sourceFrom || null,
      progress:        mode !== "dex" ? (t.progress        ?? 0) : null,
      targetUSD:       mode !== "dex" ? (t.targetUSD       ?? t.target ?? 0) : null,
      bondingLiquidity: mode !== "dex" ? {
        base: t.bondingLiquidity?.base ?? 0,
        usd:  t.bondingLiquidity?.usd  ?? 0,
      } : null,
      liquidity: mode === "dex" ? {
        base: t.liquidity?.base ?? 0,
        usd:  t.liquidity?.usd  ?? 0,
      } : null,
    };
  }

  const rebuildNew = useCallback(() => {
    if (timerNewRef.current) return;
    timerNewRef.current = setTimeout(() => {
      timerNewRef.current = null;
      setNewTokens(
        [...newMapRef.current.values()]
          .sort((a, b) => new Date(b.launchTime) - new Date(a.launchTime))
      );
    }, 100);
  }, []);

  const rebuildMigrating = useCallback(() => {
    if (timerMigRef.current) return;
    timerMigRef.current = setTimeout(() => {
      timerMigRef.current = null;
      setMigratingTokens(
        [...migratingMapRef.current.values()]
          .sort((a, b) => b.marketCap - a.marketCap)
      );
    }, 100);
  }, []);

  const rebuildMigrated = useCallback(() => {
    if (timerMigedRef.current) return;
    timerMigedRef.current = setTimeout(() => {
      timerMigedRef.current = null;
      setMigratedTokens(
        [...migratedMapRef.current.values()]
          .sort((a, b) => new Date(b.migratedTime || 0) - new Date(a.migratedTime || 0))
      );
    }, 100);
  }, []);

  // Load initial data

  useEffect(() => {
    newMapRef.current.clear();
    setLoadingNew(true);
    setNewTokens([]);

    tokensApi.getNew(LIMIT).then(list => {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      for (const t of list) {
        if (!t.tokenAddress) continue;
        const ts = t.launchTime ? new Date(t.launchTime).getTime() : 0;
        if (ts > 0 && ts < oneDayAgo) continue;
        newMapRef.current.set(t.tokenAddress, normaliseToken(t));
      }
      rebuildNew();
      setLoadingNew(false);
    }).catch(() => setLoadingNew(false));

    return () => {
      clearTimeout(timerNewRef.current);
      timerNewRef.current = null;
      newMapRef.current.clear();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    migratingMapRef.current.clear();
    setLoadingMigrating(true);
    setMigratingTokens([]);

    tokensApi.getMigrating(LIMIT).then(list => {
      for (const t of list) {
        if (t.tokenAddress) migratingMapRef.current.set(t.tokenAddress, normaliseToken(t));
      }
      rebuildMigrating();
      setLoadingMigrating(false);
    }).catch(() => setLoadingMigrating(false));

    return () => {
      clearTimeout(timerMigRef.current);
      timerMigRef.current = null;
      migratingMapRef.current.clear();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    migratedMapRef.current.clear();
    setLoadingMigrated(true);
    setMigratedTokens([]);

    tokensApi.getMigrated(LIMIT).then(list => {
      for (const t of list) {
        if (t.tokenAddress) migratedMapRef.current.set(t.tokenAddress, normaliseToken(t));
      }
      rebuildMigrated();
      setLoadingMigrated(false);
    }).catch(() => setLoadingMigrated(false));

    return () => {
      clearTimeout(timerMigedRef.current);
      timerMigedRef.current = null;
      migratedMapRef.current.clear();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // WebSocket subscriptions

  useEffect(() => {
    const handleNewToken = (t) => {
      if (!t.tokenAddress) return;

      const ts = t.launchTime ? new Date(t.launchTime).getTime() : Date.now();
      if (Date.now() - ts > 24 * 60 * 60 * 1000) return;

      const existing = newMapRef.current.get(t.tokenAddress);

      if (!existing) {
        const base = normaliseToken(t);
        const pending = pendingUpdatesRef.current.get(t.tokenAddress);
        if (pending) {
          pendingUpdatesRef.current.delete(t.tokenAddress);
          newMapRef.current.set(t.tokenAddress, {
            ...base,
            priceUsdt:   pending.price       ?? base.priceUsdt,
            marketCap:   pending.marketcap   ?? base.marketCap,
            volumeUsdt:  pending.volume24h   ?? base.volumeUsdt,
            txCount:     pending.txCount     ?? base.txCount,
            holderCount: pending.holderCount ?? base.holderCount,
            devMark:     pending.devMark     ?? base.devMark ?? null,
            progress:    pending.progress    ?? base.progress ?? 0,
            targetUSD:   pending.targetUSD   ?? base.targetUSD ?? 0,
            bondingLiquidity: {
              base: pending.bondingLiquidity?.base ?? base.bondingLiquidity?.base ?? 0,
              usd:  pending.bondingLiquidity?.usd  ?? base.bondingLiquidity?.usd  ?? 0,
            },
          });
        } else {
          newMapRef.current.set(t.tokenAddress, base);
        }
        rebuildNew();
      } else if (t.symbol != null) {
        newMapRef.current.set(t.tokenAddress, {
          ...existing,
          symbol:      t.symbol      || existing.symbol,
          name:        t.name        || existing.name,
          imageUrl:    t.imageUrl    || existing.imageUrl,
          description: t.description || existing.description,
          website:     t.website     || existing.website,
          telegram:    t.telegram    || existing.telegram,
          twitter:     t.twitter     || existing.twitter,
          sourceFrom:  t.source      || existing.sourceFrom,
          basePair:    t.basePair    || existing.basePair,
          baseAddress: t.baseAddress || existing.baseAddress,
          launchTime:  t.launchTime  || existing.launchTime,
          priceUsdt:   t.price       ?? existing.priceUsdt,
          marketCap:   t.marketcap   ?? existing.marketCap,
          volumeUsdt:  t.volume24h   ?? existing.volumeUsdt,
          devMark:     t.devMark     ?? existing.devMark ?? null,
          tax: {
            buy:  t.taxBuy  ?? existing.tax?.buy  ?? 0,
            sell: t.taxSell ?? existing.tax?.sell ?? 0,
          },
        });
        rebuildNew();
      }
    };

    const handleTokenUpdate = (u) => {
      if (!u.tokenAddress) return;

      if (!newMapRef.current.has(u.tokenAddress) &&
          !migratingMapRef.current.has(u.tokenAddress) &&
          !migratedMapRef.current.has(u.tokenAddress)) {
        pendingUpdatesRef.current.set(u.tokenAddress, u);
      }

      const updateInMap = (map, rebuild) => {
        const existing = map.get(u.tokenAddress);
        if (!existing) return;

        const mode = u.mode || existing.mode || "bonding";

        map.set(u.tokenAddress, {
          ...existing,
          priceUsdt:   u.price       ?? existing.priceUsdt,
          marketCap:   u.marketcap   ?? existing.marketCap,
          volumeUsdt:  u.volume24h   ?? existing.volumeUsdt,
          txCount:     u.txCount     ?? existing.txCount,
          holderCount: u.holderCount ?? existing.holderCount,
          devMark:     u.devMark     ?? existing.devMark ?? null,
          mode,
          platform:    u.platform    || existing.platform,
          basePair:    u.baseSymbol  || existing.basePair,
          holderStats: {
            ...existing.holderStats,
            devHoldPct: u.devSupply != null
              ? (u.devSupply / 1_000_000_000) * 100
              : (existing.holderStats?.devHoldPct ?? 0),
            paperHandPct: u.paperHandPct ?? (existing.holderStats?.paperHandPct ?? 0),
            top10: existing.holderStats?.top10 ?? [],
          },
          ...(mode !== "dex" && {
            progress:  u.progress  ?? existing.progress  ?? 0,
            targetUSD: u.targetUSD ?? existing.targetUSD ?? 0,
            bondingLiquidity: {
              base: u.bondingLiquidity?.base ?? existing.bondingLiquidity?.base ?? 0,
              usd:  u.bondingLiquidity?.usd  ?? existing.bondingLiquidity?.usd  ?? 0,
            },
          }),
          ...(mode === "dex" && {
            liquidity: {
              base: u.liquidity?.base ?? existing.liquidity?.base ?? 0,
              usd:  u.liquidity?.usd  ?? existing.liquidity?.usd  ?? 0,
            },
          }),
        });
        rebuild();
      };

      updateInMap(newMapRef.current,       rebuildNew);
      updateInMap(migratingMapRef.current, rebuildMigrating);
      updateInMap(migratedMapRef.current,  rebuildMigrated);
    };

    const handleMigrate = (m) => {
      if (!m.tokenAddress) return;

      const source =
        newMapRef.current.get(m.tokenAddress) ||
        migratingMapRef.current.get(m.tokenAddress);

      if (source) {
        const updated = {
          ...source,
          migrated:     true,
          migratedTime: new Date().toISOString(),
          mode:         "dex",
          priceUsdt:    m.priceUSDT  ?? source.priceUsdt,
          basePair:     m.baseSymbol || source.basePair,
          baseAddress:  m.baseAddress|| source.baseAddress,
          progress:     null,
          targetUSD:    null,
          bondingLiquidity: null,
          liquidity: {
            base: m.baseLiquidity ?? 0,
            usd:  m.priceUSDT != null
              ? (m.baseLiquidity ?? 0) * m.priceUSDT
              : 0,
          },
        };

        newMapRef.current.delete(m.tokenAddress);
        migratingMapRef.current.delete(m.tokenAddress);
        migratedMapRef.current.set(m.tokenAddress, updated);

        rebuildNew();
        rebuildMigrating();
        rebuildMigrated();
      }
    };

    const unsubNewToken    = subscribeNewToken(handleNewToken);
    const unsubTokenUpdate = subscribeTokenUpdate(handleTokenUpdate);
    const unsubMigrate     = subscribeMigrate(handleMigrate);

    return () => {
      unsubNewToken();
      unsubTokenUpdate();
      unsubMigrate();
    };
  }, [rebuildNew, rebuildMigrating, rebuildMigrated]);

  return {
    newTokens,
    migratingTokens,
    migratedTokens,
    loadingNew,
    loadingMigrating,
    loadingMigrated,
  };
}