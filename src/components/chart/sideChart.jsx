// ================================================================
// sideChart.jsx — Drawing Tools Sidebar
// ================================================================

import { useEffect, useRef, useState, useCallback } from "react";
import { SIDEBAR_GROUPS, SIDEBAR_BOTTOM } from "./chartConstants";
import "./lwchart.css";

// ----------------------------------------------------------------
// FLYOUT MENU
// ----------------------------------------------------------------
function SidebarFlyout({ group, activeTool, onSelect, onClose, topOffset }) {
  const ref  = useRef(null);
  const [tooltipOn, setTooltipOn] = useState(true);

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [onClose]);

  if (group.isEmoji) {
    const EMOJIS = ["😀","😂","🤣","😍","🥰","😎","🤔","😱","🚀","💎","🔥","⚡","📈","📉","💰","🎯","✅","❌","⚠️","🏆"];
    return (
      <div className="lwc-sb-flyout" ref={ref} style={{ top: Math.max(0, topOffset) }}>
        <div className="lwc-sb-flyout-group">EMOJIS</div>
        <div className="lwc-sb-flyout-emoji-grid">
          {EMOJIS.map(em => (
            <button key={em} className="lwc-sb-flyout-emoji-btn"
              onClick={() => { onSelect("emoji_"+em); onClose(); }}>{em}</button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="lwc-sb-flyout" ref={ref} style={{ top: Math.max(0, topOffset) }}>
      {group.tools.map((t, i) => {
        if (t.group) return <div key={i} className="lwc-sb-flyout-group">{t.group}</div>;
        return (
          <button key={t.id}
            className={`lwc-sb-flyout-item ${activeTool===t.id?"lwc-sb-flyout-item--active":""}`}
            onClick={() => { onSelect(t.id); onClose(); }}>
            <span className="lwc-sb-flyout-label">{t.label}</span>
            {t.shortcut && <span className="lwc-sb-flyout-shortcut">{t.shortcut}</span>}
          </button>
        );
      })}
      {group.bottomToggle && (
        <>
          <div className="lwc-sb-flyout-sep"/>
          <div className="lwc-sb-flyout-toggle-row">
            <span>{group.bottomToggle}</span>
            <button className={`lwc-sb-flyout-switch ${tooltipOn?"lwc-sb-flyout-switch--on":""}`}
              onClick={() => setTooltipOn(v=>!v)}/>
          </div>
        </>
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// SIDEBAR (exported)
// ----------------------------------------------------------------
export default function SideChart({ activeTool, onToolSelect, drawEngineRef }) {
  const [openFlyout,   setOpenFlyout]   = useState(null);
  const [flyoutTop,    setFlyoutTop]    = useState(0);
  const [activeGroups, setActiveGroups] = useState(() =>
    Object.fromEntries(SIDEBAR_GROUPS.map(g => [g.id, g.defaultTool]))
  );
  const [locked,  setLocked]  = useState(false);
  const [hidden,  setHidden]  = useState(false);
  const [canUp,   setCanUp]   = useState(false);
  const [canDown, setCanDown] = useState(false);
  const sidebarRef = useRef(null);
  const scrollRef  = useRef(null);

  const updateScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanUp(el.scrollTop > 4);
    setCanDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScroll();
    el.addEventListener("scroll", updateScroll);
    const ro = new ResizeObserver(updateScroll);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", updateScroll); ro.disconnect(); };
  }, [updateScroll]);

  const scrollBy = (dir) => {
    scrollRef.current?.scrollBy({ top: dir * 80, behavior: "smooth" });
  };

  const handleGroupClick = (e, group) => {
    if (openFlyout === group.id) { setOpenFlyout(null); return; }
    if (group.tools.length === 0 && !group.isEmoji) {
      onToolSelect(group.defaultTool);
      return;
    }
    const btnRect = e.currentTarget.getBoundingClientRect();
    const sbRect  = sidebarRef.current?.getBoundingClientRect();
    setFlyoutTop(sbRect ? btnRect.top - sbRect.top : 0);
    setOpenFlyout(group.id);
    onToolSelect(activeGroups[group.id] || group.defaultTool);
  };

  const handleFlyoutSelect = (groupId, toolId) => {
    setActiveGroups(p => ({ ...p, [groupId]: toolId }));
    onToolSelect(toolId);
  };

  const handleBottom = (id) => {
    const eng = drawEngineRef?.current;
    if (!eng) return;
    if (id === "trash")  { if (window.confirm("Delete all drawings?")) eng.clearAll(); }
    if (id === "lock")   { setLocked(eng.toggleLock()); }
    if (id === "hide")   { setHidden(eng.toggleHide()); }
    if (id === "ruler")  { onToolSelect("pricerange"); }
    if (id === "zoom")   { onToolSelect("zoom"); }
  };

  const currentGroup = SIDEBAR_GROUPS.find(g => g.id === openFlyout);

  return (
    <div className="lwc-sidebar" ref={sidebarRef}>

      {/* Scroll UP arrow */}
      <button
        className={`lwc-sb-scroll-btn ${canUp ? "lwc-sb-scroll-btn--visible" : ""}`}
        onClick={() => scrollBy(-1)}
        title="Scroll up">
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 5L5 1L9 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Scrollable tool list */}
      <div className="lwc-sb-scroll" ref={scrollRef}>
        {SIDEBAR_GROUPS.map(group => {
          const gActive = activeTool === (activeGroups[group.id] || group.defaultTool)
            || group.tools.some(t => !t.group && t.id === activeTool);
          return (
            <button key={group.id}
              className={`lwc-sidebar-btn ${gActive?"lwc-sidebar-btn--active":""} ${openFlyout===group.id?"lwc-sidebar-btn--open":""}`}
              title={group.id.replace("_group","")}
              onClick={e => handleGroupClick(e, group)}>
              {group.icon}
              {(group.tools.length > 0 || group.isEmoji) && (
                <span className="lwc-sb-arrow">
                  <svg width="4" height="6" viewBox="0 0 4 6" fill="none">
                    <path d="M1 1L3 3L1 5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              )}
            </button>
          );
        })}

        <div className="lwc-sidebar-sep"/>

        {SIDEBAR_BOTTOM.map(bt => (
          <button key={bt.id}
            className={`lwc-sidebar-btn ${(bt.id==="lock"&&locked)||(bt.id==="hide"&&hidden)?"lwc-sidebar-btn--active":""}`}
            title={bt.title}
            style={bt.color ? { color: bt.color } : undefined}
            onClick={() => handleBottom(bt.id)}>
            {bt.icon}
          </button>
        ))}
      </div>

      {/* Scroll DOWN arrow */}
      <button
        className={`lwc-sb-scroll-btn ${canDown ? "lwc-sb-scroll-btn--visible" : ""}`}
        onClick={() => scrollBy(1)}
        title="Scroll down">
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {openFlyout && currentGroup && (
        <SidebarFlyout
          group={currentGroup}
          activeTool={activeTool}
          onSelect={id => handleFlyoutSelect(openFlyout, id)}
          onClose={() => setOpenFlyout(null)}
          topOffset={flyoutTop}
        />
      )}
    </div>
  );
}