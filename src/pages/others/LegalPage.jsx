// src/pages/others/LegalPage.jsx
// Shared layout for Terms, Privacy, Disclosures
import { useState, useEffect, useRef } from "react";
import "./others.css";
import { ChevronDownIcon } from "../../assets/icons";

export default function LegalPage({ eyebrow, title, subtitle, sections, readTime }) {
  const [activeId,  setActiveId]  = useState(sections[0]?.id);
  const [scrollPct, setScrollPct] = useState(0);
  const contentRef = useRef(null);

  // Ensure page is scrollable
  useEffect(() => {
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";
    document.body.style.height   = "auto";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.height   = "";
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const el  = document.documentElement;
      const pct = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
      setScrollPct(Math.min(pct, 100));

      // Update active section based on scroll
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i].id);
        if (el && el.getBoundingClientRect().top <= 120) {
          setActiveId(sections[i].id);
          break;
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  const scrollTo = (id) => {
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <div className="ot-progress">
        <div className="ot-progress-bar" style={{ width: `${scrollPct}%` }} />
      </div>

      <div className="ot-page">
        {/* Hero */}
        <div className="ot-hero">
          <div className="ot-hero-left">
            <span className="ot-eyebrow">{eyebrow}</span>
            <h1 className="ot-title">{title}</h1>
            <p className="ot-subtitle">{subtitle}</p>
          </div>
          <div className="ot-meta">
            <span className="ot-badge">{sections.length} sections</span>
            {readTime && <span className="ot-badge">~{readTime} min read</span>}
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="ot-tabs">
          {sections.map(s => (
            <button key={s.id}
              className={`ot-tab${activeId === s.id ? " active" : ""}`}
              onClick={() => scrollTo(s.id)}>
              {s.title}
            </button>
          ))}
        </div>

        {/* Layout */}
        <div className="ot-layout" ref={contentRef}>
          {/* Sidebar */}
          <nav className="ot-sidebar">
            {sections.map(s => (
              <button key={s.id}
                className={`ot-sidebar-item${activeId === s.id ? " active" : ""}`}
                onClick={() => scrollTo(s.id)}>
                <div className="ot-sidebar-dot"/>
                {s.title}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="ot-content">
            {sections.map((s, i) => (
              <div key={s.id} id={s.id} className="ot-section">
                <div className="ot-section-hdr">
                  <div className="ot-section-num">{i + 1}</div>
                  <h2 className="ot-section-title">{s.title}</h2>
                  {s.badge === "IMPORTANT" && <span className="ot-section-badge ot-section-badge--warn">Important</span>}
                  {s.badge === "CRITICAL"  && <span className="ot-section-badge ot-section-badge--warn">Critical</span>}
                  {s.badge === "INFO"      && <span className="ot-section-badge ot-section-badge--info">Info</span>}
                </div>
                {s.content.map((block, j) => (
                  <div key={j} className="ot-block">
                    <h3 className="ot-block-title">{block.subtitle}</h3>
                    <p className="ot-block-text">{block.text.replace(/SuperCZ\.pro/g, "SwanFi").replace(/SuperCZ/g, "SwanFi")}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}