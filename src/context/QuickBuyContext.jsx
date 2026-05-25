import { createContext, useContext, useState } from 'react';
const QuickBuyContext = createContext();
export function QuickBuyProvider({ children }) {
  const [quickBuyAmount, setQuickBuyAmount] = useState(0.1);
  return <QuickBuyContext.Provider value={{ quickBuyAmount, setQuickBuyAmount }}>{children}</QuickBuyContext.Provider>;
}
export function useQuickBuy() { return useContext(QuickBuyContext); }
