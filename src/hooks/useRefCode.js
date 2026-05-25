// src/hooks/useRefCode.js
// Referral code tracking via sessionStorage

import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const KEY = "ref_code";

/** Read active ref from sessionStorage */
export function getStoredRef() {
  try { return sessionStorage.getItem(KEY) || ""; } catch { return ""; }
}

/**
 * Appends ref to path — only if sessionStorage has a ref.
 * appendRef("/discover")  → "/discover?ref=B4F50523"  (ref present)
 * appendRef("/discover")  → "/discover"               (no ref)
 */
export function appendRef(path) {
  const ref = getStoredRef();
  if (!ref) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}ref=${encodeURIComponent(ref)}`;
}

/**
 * Hook — called once in AppInner (inside Router).
 * Only runs on initial mount:
 *   - ?ref= present → save to sessionStorage
 *   - ?ref= absent  → keep existing sessionStorage value
 * Internal navigation does not modify sessionStorage.
 */
export function useRefCode() {
  const location = useLocation();
  const initializedRef = useRef(false);

  useEffect(() => {
    // Only process on first load, not on internal navigation
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      const params = new URLSearchParams(location.search);
      const ref = params.get("ref");
      if (ref) {
        // ?ref= present in URL → save/overwrite
        sessionStorage.setItem(KEY, ref);
      }
      // No ?ref= → do NOT clear existing value.
      // ref_code is cleared only after successful signup (in AuthModal handleSuccess).
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // [] = mount only

  return { appendRef, getStoredRef };
}