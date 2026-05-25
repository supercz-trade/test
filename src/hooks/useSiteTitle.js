// src/hooks/useSiteTitle.js
// Dynamic page title hook

import { useEffect } from "react";

export function useSiteTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} | SwanFi` : "SwanFi";
    return () => { document.title = prev; };
  }, [title]);
}