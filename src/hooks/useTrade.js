// src/hooks/useTrade.js
// Single token trade view hook — token data, transactions, holders

import { useEffect, useState, useRef, useCallback } from "react";
import { tokens as tokensApi, wallets as walletsApi } from "../services/api";
import {
  subscribeTokenTransactions,
  subscribeTokenUpdate,
} from "../services/ws";
import { formatUsd,         
    formatTokenAmount,
    formatAge,
    formatPrice,
    timeAgo,          } from "../utils/format";

const TX_LIMIT     = 100;
const HOLDER_LIMIT = 50;

export function useTrade(rawTokenAddress, initialToken = null) {
  const tokenAddress = rawTokenAddress?.toLowerCase() ?? null;

  const [token,             setToken]             = useState(() => initialToken ?? null);
  const [loadingToken,      setLoadingToken]      = useState(true);
  const [transactions,      setTransactions]      = useState([]);
  const [loadingTx,         setLoadingTx]         = useState(true);
  const [filteredTx,        setFilteredTx]        = useState([]);
  const [loadingFilteredTx, setLoadingFilteredTx] = useState(false);
  const [holders,           setHolders]           = useState([]);
  const [loadingHolders,    setLoadingHolders]    = useState(true);
  const [devInfo,           setDevInfo]           = useState(null);
  const [liveStats,         setLiveStats]         = useState(null);

  const txMapRef     = useRef(new Map());
  const timerTxRef   = useRef(null);
  const destroyedRef = useRef(false);

  const rebuildTx = useCallback(() => {
    if (timerTxRef.current) clearTimeout(timerTxRef.current);
    timerTxRef.current = setTimeout(() => {
      timerTxRef.current = null;
      setTransactions(
        [...txMapRef.current.values()]
          .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
          .slice(0, TX_LIMIT)
      );
    }, 80);
  }, []);

  function normaliseToken(t) {
    const mode = t.mode || (t.migrated ? "dex" : "bonding");
    return {
      tokenAddress:     t.tokenAddress,
      symbol:           t.symbol        || "?",
      name:             t.name          || "?",
      imageUrl:         t.imageUrl      || null,
      description:      t.description   || null,
      sourceFrom:       t.sourceFrom    || null,
      website:          t.website       || null,
      telegram:         t.telegram      || null,
      twitter:          t.twitter       || null,
      basePair:         t.basePair      || t.baseSymbol || null,
      baseAddress:      t.baseAddress   || null,
      launchTime:       t.launchTime    || null,
      migrated:         t.migrated      ?? false,
      migratedTime:     t.migratedTime  || null,
      totalSupply:      Number(t.totalSupply  || 1_000_000_000),
      decimals:         Number(t.decimals     || 18),
      priceUsdt:        Number(t.priceUsdt    || 0),
      marketCap:        Number(t.marketCap    || 0),
      volumeUsdt:       Number(t.volumeUsdt   || 0),
      txCount:          Number(t.txCount      || 0),
      holderCount:      Number(t.holderCount  || 0),
      paperHandPct:     Number(t.holderStats?.paperHandPct ?? t.paperHandPct ?? 0),
      tax: {
        buy:  Number(t.tax?.buy  ?? 0),
        sell: Number(t.tax?.sell ?? 0),
      },
      mode,
      progress:         mode !== "dex" ? (t.progress  ?? null) : null,
      targetUSD:        mode !== "dex" ? (t.targetUSD ?? 0)    : null,
      bondingLiquidity: mode !== "dex" ? {
        base: t.bondingLiquidity?.base ?? 0,
        usd:  t.bondingLiquidity?.usd  ?? 0,
      } : null,
      liquidity: mode === "dex" ? {
        base: t.liquidity?.base ?? 0,
        usd:  t.liquidity?.usd  ?? 0,
      } : null,
      devMark:          t.devMark           || null,
      developerAddress: t.developerAddress  || null,
      holderStats: {
        devHoldPct:   t.holderStats?.devHoldPct   ?? 0,
        paperHandPct: t.holderStats?.paperHandPct ?? 0,
        top10:        t.holderStats?.top10        ?? [],
      },
      topHolders: (t.holderStats?.top10 || t.topHolders || []).map((h, i) => ({
        rank:    h.rank || i + 1,
        address: h.address || h.holder_address,
        balance: Number(h.balance || 0),
        pct:     Number(h.pct     || 0),
        isDev:   h.isDev || false,
      })),
    };
  }

  function normaliseTx(tx) {
    const priceUsd = Number(tx.priceUSDT || tx.priceUsd || tx.priceUsdt || 0);
    return {
      txHash:      tx.txHash      || tx.tx_hash,
      time:        tx.time,
      position:    tx.position,
      wallet:      (tx.wallet || tx.addressMessageSender || "").toLowerCase(),
      tagAddress:  tx.tag         || tx.tagAddress  || null,
      isDev:       tx.isDev       || false,
      priceUsd,
      marketCap:   Number(tx.marketCap || tx.market_cap || (priceUsd * 1_000_000_000) || 0),
      amountToken: Number(tx.tokenAmount || tx.amountToken || tx.amountReceive    || 0),
      amountUsd:   Number(tx.volumeUSDT  || tx.amountUsd   || tx.inUSDTPayable    || 0),
      amountBase:  Number(tx.baseAmount  || tx.amountBase  || tx.amountBasePayable|| 0),
      baseSymbol:  tx.basePair    || tx.baseSymbol   || "BNB",
    };
  }

  function normaliseHolder(h) {
    return {
      rank:          h.rank,
      holderAddress: h.holderAddress || h.holder_address || h.address,
      balance:       Number(h.balance       || 0),
      pctOfSupply:   Number(h.pctOfSupply   || h.pct || 0),
      buyCount:      Number(h.buyCount      || 0),
      sellCount:     Number(h.sellCount     || 0),
      buyUsd:        Number(h.buyUsd        || 0),
      sellUsd:       Number(h.sellUsd       || 0),
      buyTokens:     Number(h.buyTokens     || 0),
      sellTokens:    Number(h.sellTokens    || 0),
      avgBuyPrice:   Number(h.avgBuyPrice   || 0),
      realizedPnl:   Number(h.realizedPnl   || 0),
      isPaperhand:   h.isPaperhand  || false,
      isDev:         h.isDev        || false,
      firstBuyTime:  h.firstBuyTime || null,
    };
  }

  const fetchToken = useCallback(async () => {
    if (!tokenAddress) return;
    setLoadingToken(true);
    try {
      const data = await tokensApi.getOne(tokenAddress);
      const t    = normaliseToken(data);
      setToken(prev => ({
        ...(prev ?? {}),
        ...t,
        priceUsdt:   t.priceUsdt   || prev?.priceUsdt   || 0,
        marketCap:   t.marketCap   || prev?.marketCap   || 0,
        volumeUsdt:  t.volumeUsdt  || prev?.volumeUsdt  || 0,
        txCount:     t.txCount     || prev?.txCount     || 0,
        holderCount: t.holderCount || prev?.holderCount || 0,
      }));
      setLiveStats(prev => ({
        price:            t.priceUsdt  || prev?.price            || 0,
        marketcap:        t.marketCap  || prev?.marketcap        || 0,
        volume24h:        t.volumeUsdt || prev?.volume24h        || 0,
        txCount:          t.txCount    || prev?.txCount          || 0,
        holderCount:      t.holderCount|| prev?.holderCount      || 0,
        devSupply:        prev?.devSupply        ?? 0,
        topHolderSupply:  prev?.topHolderSupply  ?? 0,
        paperHandPct:     t.paperHandPct || prev?.paperHandPct   || 0,
        mode:             t.mode        || prev?.mode            || "bonding",
        progress:         t.progress    ?? prev?.progress        ?? null,
        targetUSD:        t.targetUSD   ?? prev?.targetUSD       ?? 0,
        bondingLiquidity: t.bondingLiquidity ?? prev?.bondingLiquidity ?? null,
        liquidity:        t.liquidity   ?? prev?.liquidity       ?? null,
        baseSymbol:       t.basePair    || prev?.baseSymbol      || null,
      }));
    } catch (err) {
      console.error("[useTrade] fetchToken:", err);
    } finally {
      setLoadingToken(false);
    }
  }, [tokenAddress]);

  const fetchTransactions = useCallback(async () => {
    if (!tokenAddress) return;
    setLoadingTx(true);
    try {
      const data = await tokensApi.getTransactions(tokenAddress, TX_LIMIT);
      txMapRef.current.clear();
      for (const tx of (Array.isArray(data) ? data : [])) {
        txMapRef.current.set(tx.txHash, normaliseTx(tx));
      }
      rebuildTx();
    } catch (err) {
      console.error("[useTrade] fetchTransactions:", err);
    } finally {
      setLoadingTx(false);
    }
  }, [tokenAddress, rebuildTx]);

  const fetchTransactionsByWallet = useCallback(async (walletAddr) => {
    if (!tokenAddress || !walletAddr) { setFilteredTx([]); return; }
    setLoadingFilteredTx(true);
    try {
      const data = await tokensApi.getTransactionsByWallet(tokenAddress, walletAddr, 500);
      setFilteredTx((Array.isArray(data) ? data : []).map(normaliseTx));
    } catch (err) {
      console.error("[useTrade] fetchTransactionsByWallet:", err);
      setFilteredTx([]);
    } finally {
      setLoadingFilteredTx(false);
    }
  }, [tokenAddress]);

  const fetchHolders = useCallback(async () => {
    if (!tokenAddress) return;
    setLoadingHolders(true);
    try {
      const data = await tokensApi.getHolders(tokenAddress, HOLDER_LIMIT);
      setHolders((Array.isArray(data) ? data : []).map(normaliseHolder));
    } catch (err) {
      console.error("[useTrade] fetchHolders:", err);
    } finally {
      setLoadingHolders(false);
    }
  }, [tokenAddress]);

  const fetchDevInfo = useCallback(async (devAddress) => {
    if (!devAddress) return;
    try {
      const data = await walletsApi.getOverview(devAddress);
      setDevInfo(data);
    } catch (err) {
      console.error("[useTrade] fetchDevInfo:", err);
    }
  }, []);

  useEffect(() => {
    if (devInfo) return;
    const devAddr = token?.developerAddress
      || token?.holderStats?.top10?.find(h => h.isDev)?.address
      || null;
    if (devAddr) fetchDevInfo(devAddr);
  }, [token?.developerAddress, token?.holderStats?.top10, devInfo, fetchDevInfo]);

  useEffect(() => { setDevInfo(null); }, [tokenAddress]);

  useEffect(() => {
    if (!tokenAddress) return;
    destroyedRef.current = false;
    txMapRef.current.clear();
    Promise.all([fetchToken(), fetchTransactions(), fetchHolders()]);
    return () => {
      destroyedRef.current = true;
      clearTimeout(timerTxRef.current);
      timerTxRef.current = null;
    };
  }, [tokenAddress, fetchToken, fetchTransactions, fetchHolders]);

  // WebSocket subscriptions

  useEffect(() => {
    if (!tokenAddress) return;

    const handleTransaction = (tx) => {
      if (!tx.txHash) return;
      txMapRef.current.set(tx.txHash, normaliseTx(tx));
      rebuildTx();
    };

    const handleTokenUpdate = (u) => {
      if (!u.tokenAddress) return;
      if (u.tokenAddress.toLowerCase() !== tokenAddress.toLowerCase()) return;

      setLiveStats(prev => ({
        price:            u.price            ?? prev?.price            ?? 0,
        marketcap:        u.marketcap         ?? prev?.marketcap        ?? 0,
        volume24h:        u.volume24h         ?? prev?.volume24h        ?? 0,
        txCount:          u.txCount           ?? prev?.txCount          ?? 0,
        holderCount:      u.holderCount       ?? prev?.holderCount      ?? 0,
        devSupply:        u.devSupply         ?? prev?.devSupply        ?? 0,
        topHolderSupply:  u.topHolderSupply   ?? prev?.topHolderSupply  ?? 0,
        paperHandPct:     u.paperHandPct      ?? prev?.paperHandPct     ?? 0,
        mode:             u.mode              ?? prev?.mode             ?? "bonding",
        progress:         u.progress          ?? prev?.progress         ?? null,
        targetUSD:        u.targetUSD         ?? prev?.targetUSD        ?? 0,
        bondingLiquidity: u.bondingLiquidity  ?? prev?.bondingLiquidity ?? null,
        liquidity:        u.liquidity         ?? prev?.liquidity        ?? null,
        baseSymbol:       u.baseSymbol        ?? prev?.baseSymbol       ?? null,
        devMark:          u.devMark           ?? prev?.devMark          ?? null,
        timestamp:        u.timestamp         ?? Date.now(),
      }));

      setToken(prev => {
        if (!prev) return prev;
        const mode = u.mode ?? prev.mode ?? "bonding";
        return {
          ...prev,
          devMark:     u.devMark     ?? prev.devMark,
          priceUsdt:   u.price       ?? prev.priceUsdt,
          marketCap:   u.marketcap   ?? prev.marketCap,
          volumeUsdt:  u.volume24h   ?? prev.volumeUsdt,
          txCount:     u.txCount     ?? prev.txCount,
          holderCount: u.holderCount ?? prev.holderCount,
          mode,
          basePair:    u.baseSymbol  || prev.basePair,
          ...(mode !== "dex" && {
            progress:  u.progress  ?? prev.progress  ?? null,
            targetUSD: u.targetUSD ?? prev.targetUSD ?? 0,
            bondingLiquidity: {
              base: u.bondingLiquidity?.base ?? prev.bondingLiquidity?.base ?? 0,
              usd:  u.bondingLiquidity?.usd  ?? prev.bondingLiquidity?.usd  ?? 0,
            },
          }),
          ...(mode === "dex" && {
            liquidity: {
              base: u.liquidity?.base ?? prev.liquidity?.base ?? 0,
              usd:  u.liquidity?.usd  ?? prev.liquidity?.usd  ?? 0,
            },
          }),
        };
      });
    };

    const unsubTx    = subscribeTokenTransactions(tokenAddress, handleTransaction);
    const unsubUpdate = subscribeTokenUpdate(handleTokenUpdate);

    return () => {
      unsubTx();
      unsubUpdate();
    };
  }, [tokenAddress, rebuildTx]);

  // Polling fallback

  useEffect(() => {
    if (!tokenAddress) return;

    const pollInterval = setInterval(async () => {
      if (destroyedRef.current) return;
      try {
        const data = await tokensApi.getTransactions(tokenAddress, TX_LIMIT);
        if (!Array.isArray(data)) return;
        let hasNew = false;
        for (const tx of data) {
          if (!tx.txHash) continue;
          if (!txMapRef.current.has(tx.txHash)) {
            txMapRef.current.set(tx.txHash, normaliseTx(tx));
            hasNew = true;
          }
        }
        if (hasNew) rebuildTx();
      } catch {}
    }, 15_000);

    return () => clearInterval(pollInterval);
  }, [tokenAddress, rebuildTx]);

  useEffect(() => {
    if (!tokenAddress) return;
    const interval = setInterval(fetchHolders, 30_000);
    return () => clearInterval(interval);
  }, [tokenAddress, fetchHolders]);

  return {
    token,
    liveStats,
    transactions,
    filteredTx,
    holders,
    devInfo,
    loadingToken,
    loadingTx,
    loadingFilteredTx,
    loadingHolders,
    fetchToken,
    fetchTransactions,
    fetchTransactionsByWallet,
    fetchHolders,
    formatUsd,         
    formatTokenAmount,
    formatAge,
    formatPrice,
    timeAgo,           
};
}