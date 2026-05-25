// ================================================================
// chartConstants.js — Shared constants, configs, and SVG data
// ================================================================

export const LC_CDN   = "https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js";

export const TF_OPTIONS = [
  { label: "1s",  value: "1s"  },
  { label: "30s", value: "30s" },
  { label: "1m",  value: "1m"  },
  { label: "1H",  value: "1h"  },
  { label: "4H",  value: "4h"  },
  { label: "1D",  value: "1d"  },
];

export const RANGE_OPTIONS = [
  { label: "1d",   value: "1d",   seconds: 86400    },
  { label: "7d",   value: "7d",   seconds: 604800   },
  { label: "30d",  value: "30d",  seconds: 2592000  },
  { label: "180d", value: "180d", seconds: 15552000 },
];

export const SIDEBAR_GROUPS = [
  {
    id: "cursor_group",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2.8" fill="currentColor"/>
        <circle cx="8" cy="8" r="5.8" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      </svg>
    ),
    defaultTool: "cursor",
    tools: [
      { id: "cursor",  label: "Cross"          },
      { id: "dot",     label: "Dot"            },
      { id: "arrow",   label: "Arrow"          },
      { id: "demo",    label: "Demonstration"  },
      { id: "eraser",  label: "Eraser"         },
    ],
    bottomToggle: "Values tooltip on long press",
  },
  {
    id: "lines_group",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <line x1="2" y1="13" x2="14" y2="3" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="2" cy="13" r="1.5" fill="currentColor"/>
        <circle cx="14" cy="3" r="1.5" fill="currentColor"/>
      </svg>
    ),
    defaultTool: "trendline",
    tools: [
      { group: "LINES" },
      { id: "trendline",   label: "Trend Line",      shortcut: "Alt+T" },
      { id: "ray",         label: "Ray"              },
      { id: "infoline",    label: "Info Line"        },
      { id: "extline",     label: "Extended Line"    },
      { id: "trendangle",  label: "Trend Angle"      },
      { id: "hline",       label: "Horizontal Line", shortcut: "Alt+H" },
      { id: "hray",        label: "Horizontal Ray",  shortcut: "Alt+J" },
      { id: "vline",       label: "Vertical Line",   shortcut: "Alt+V" },
      { id: "crossline",   label: "Cross Line",      shortcut: "Alt+C" },
      { group: "CHANNELS" },
      { id: "parallel",    label: "Parallel Channel" },
      { id: "regtrend",    label: "Regression Trend" },
      { id: "flattop",     label: "Flat Top/Bottom"  },
      { id: "disjoint",    label: "Disjoint Channel" },
      { group: "PITCHFORKS" },
      { id: "pitchfork",   label: "Pitchfork"                 },
      { id: "schiff",      label: "Schiff Pitchfork"          },
      { id: "modschiff",   label: "Modified Schiff Pitchfork" },
      { id: "insidepf",    label: "Inside Pitchfork"          },
    ],
  },
  {
    id: "fib_group",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <line x1="1" y1="4"  x2="15" y2="4"  stroke="currentColor" strokeWidth="1.1"/>
        <line x1="1" y1="7"  x2="15" y2="7"  stroke="currentColor" strokeWidth="1.1"/>
        <line x1="1" y1="10" x2="15" y2="10" stroke="currentColor" strokeWidth="1.1"/>
        <line x1="1" y1="13" x2="15" y2="13" stroke="currentColor" strokeWidth="1.1"/>
        <line x1="4" y1="2" x2="4" y2="15" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    ),
    defaultTool: "fibret",
    tools: [
      { group: "FIBONACCI" },
      { id: "fibret",       label: "Fib Retracement",           shortcut: "Alt+F" },
      { id: "fibext",       label: "Trend-Based Fib Extension"  },
      { id: "fibchan",      label: "Fib Channel"                },
      { id: "fibtime",      label: "Fib Time Zone"              },
      { id: "fibfan",       label: "Fib Speed Resistance Fan"   },
      { id: "fibtime2",     label: "Trend-Based Fib Time"       },
      { id: "fibcircles",   label: "Fib Circles"                },
      { id: "fibspiral",    label: "Fib Spiral"                 },
      { id: "fibspeedarcs", label: "Fib Speed Resistance Arcs"  },
      { id: "fibwedge",     label: "Fib Wedge"                  },
      { id: "pitchfan",     label: "Pitchfan"                   },
      { group: "GANN" },
      { id: "gannbox",      label: "Gann Box"         },
      { id: "gannsqfixed",  label: "Gann Square Fixed" },
      { id: "gannsq",       label: "Gann Square"       },
      { id: "gannfan",      label: "Gann Fan"          },
    ],
  },
  {
    id: "pattern_group",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="3"  cy="8"  r="1.4" fill="currentColor"/>
        <circle cx="8"  cy="3"  r="1.4" fill="currentColor"/>
        <circle cx="8"  cy="13" r="1.4" fill="currentColor"/>
        <circle cx="13" cy="8"  r="1.4" fill="currentColor"/>
        <line x1="3" y1="8"  x2="8"  y2="3"  stroke="currentColor" strokeWidth="1.1"/>
        <line x1="3" y1="8"  x2="8"  y2="13" stroke="currentColor" strokeWidth="1.1"/>
        <line x1="8" y1="3"  x2="13" y2="8"  stroke="currentColor" strokeWidth="1.1"/>
        <line x1="8" y1="13" x2="13" y2="8"  stroke="currentColor" strokeWidth="1.1"/>
      </svg>
    ),
    defaultTool: "xabcd",
    tools: [
      { group: "PATTERNS" },
      { id: "xabcd",         label: "XABCD Pattern"       },
      { id: "cypher",        label: "Cypher Pattern"       },
      { id: "headshoulders", label: "Head and Shoulders"   },
      { id: "abcd",          label: "ABCD Pattern"         },
      { id: "triangle_pat",  label: "Triangle Pattern"     },
      { id: "threedrives",   label: "Three Drives Pattern" },
      { group: "ELLIOTT WAVES" },
      { id: "elliott12345",  label: "Elliott Impulse Wave (12345)"       },
      { id: "elliottabc",    label: "Elliott Correction Wave (ABC)"      },
      { id: "elliottabcde",  label: "Elliott Triangle Wave (ABCDE)"      },
      { id: "elliottwxy",    label: "Elliott Double Combo Wave (WXY)"    },
      { id: "elliottwxyxz",  label: "Elliott Triple Combo Wave (WXYXZ)"  },
      { group: "CYCLES" },
      { id: "cyclic",        label: "Cyclic Lines" },
      { id: "timecycles",    label: "Time Cycles"  },
      { id: "sineline",      label: "Sine Line"    },
    ],
  },
  {
    id: "measure_group",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <line x1="2"  y1="8" x2="14" y2="8"  stroke="currentColor" strokeWidth="1.3"/>
        <line x1="2"  y1="5" x2="2"  y2="11" stroke="currentColor" strokeWidth="1.3"/>
        <line x1="14" y1="5" x2="14" y2="11" stroke="currentColor" strokeWidth="1.3"/>
        <circle cx="6"  cy="8" r="1.2" fill="currentColor"/>
        <circle cx="10" cy="8" r="1.2" fill="currentColor"/>
      </svg>
    ),
    defaultTool: "longpos",
    tools: [
      { group: "PROJECTION" },
      { id: "longpos",        label: "Long Position"              },
      { id: "shortpos",       label: "Short Position"             },
      { id: "forecast",       label: "Forecast"                   },
      { id: "barspat",        label: "Bars Pattern"               },
      { id: "ghostfeed",      label: "Ghost Feed"                 },
      { id: "projection",     label: "Projection"                 },
      { group: "VOLUME-BASED" },
      { id: "anchorvwap",     label: "Anchored VWAP"              },
      { id: "frvp",           label: "Fixed Range Volume Profile" },
      { group: "MEASURER" },
      { id: "pricerange",     label: "Price Range"                },
      { id: "daterange",      label: "Date Range"                 },
      { id: "datepricerange", label: "Date and Price Range"       },
    ],
  },
  {
    id: "brush_group",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 13 Q6 3 10 8 T14 4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
        <circle cx="3" cy="13" r="1.3" fill="currentColor"/>
      </svg>
    ),
    defaultTool: "brush",
    tools: [
      { group: "BRUSHES" },
      { id: "brush",       label: "Brush"       },
      { id: "highlighter", label: "Highlighter" },
      { group: "ARROWS" },
      { id: "arrowmarker", label: "Arrow Marker"     },
      { id: "arrowdraw",   label: "Arrow"            },
      { id: "arrowup",     label: "Arrow Mark Up"    },
      { id: "arrowdown",   label: "Arrow Mark Down"  },
      { id: "arrowleft",   label: "Arrow Mark Left"  },
      { id: "arrowright",  label: "Arrow Mark Right" },
      { group: "SHAPES" },
      { id: "rect",         label: "Rectangle",         shortcut: "Alt+Shift+R" },
      { id: "rotrect",      label: "Rotated Rectangle"  },
      { id: "path",         label: "Path"               },
      { id: "circle",       label: "Circle"             },
      { id: "ellipse",      label: "Ellipse"            },
      { id: "polyline",     label: "Polyline"           },
      { id: "triangle_sh",  label: "Triangle"           },
      { id: "arc",          label: "Arc"                },
      { id: "curve",        label: "Curve"              },
      { id: "doublecurve",  label: "Double Curve"       },
    ],
  },
  {
    id: "text_group",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 4h10M8 4v9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M5 13h6"       stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    defaultTool: "text",
    tools: [
      { group: "TEXT & NOTES" },
      { id: "text",       label: "Text"          },
      { id: "anchtext",   label: "Anchored Text"  },
      { id: "note",       label: "Note"           },
      { id: "pricenote",  label: "Price Note"     },
      { id: "pin",        label: "Pin"            },
      { id: "table",      label: "Table"          },
      { id: "callout",    label: "Callout"        },
      { id: "comment",    label: "Comment"        },
      { id: "pricelabel", label: "Price Label"    },
      { id: "signpost",   label: "Signpost"       },
      { id: "flagmark",   label: "Flag Mark"      },
    ],
  },
  {
    id: "emoji_group",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
        <circle cx="5.5" cy="6.5" r="1" fill="currentColor"/>
        <circle cx="10.5" cy="6.5" r="1" fill="currentColor"/>
        <path d="M5 10 Q8 13 11 10" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      </svg>
    ),
    defaultTool: "emoji",
    isEmoji: true,
    tools: [],
  },
];

export const SIDEBAR_BOTTOM = [
  {
    id: "ruler", title: "Measure",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="5" width="14" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      <line x1="4" y1="5" x2="4" y2="8"  stroke="currentColor" strokeWidth="1.1"/>
      <line x1="7" y1="5" x2="7" y2="7"  stroke="currentColor" strokeWidth="1.1"/>
      <line x1="10" y1="5" x2="10" y2="8" stroke="currentColor" strokeWidth="1.1"/>
      <line x1="13" y1="5" x2="13" y2="7" stroke="currentColor" strokeWidth="1.1"/>
    </svg>,
    color: "#4ade80",
  },
  {
    id: "zoom", title: "Zoom In",
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      <line x1="6.5" y1="4" x2="6.5" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="4" y1="6.5" x2="9" y2="6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>,
  },
  {
    id: "magnet", title: "Magnet",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 5C3 2.8 5 1 8 1C11 1 13 2.8 13 5L13 9.5L10.5 9.5L10.5 5C10.5 4.2 9.4 3.5 8 3.5C6.6 3.5 5.5 4.2 5.5 5L5.5 9.5L3 9.5Z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      <line x1="3"    y1="9.5" x2="5.5"  y2="9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="10.5" y1="9.5" x2="13"   y2="9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>,
  },
  {
    id: "lock", title: "Lock Drawings",
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="2.5" y="6.5" width="10" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      <path d="M4.5 6.5L4.5 4C4.5 2.5 10.5 2.5 10.5 4L10.5 6.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      <circle cx="7.5" cy="10" r="1.2" fill="currentColor"/>
      <line x1="7.5" y1="8" x2="7.5" y2="10" stroke="currentColor" strokeWidth="1.1"/>
    </svg>,
  },
  {
    id: "hide", title: "Hide All Drawings",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M1.5 8C3 4.5 5 3 8 3C11 3 13 4.5 14.5 8C13 11.5 11 13 8 13C5 13 3 11.5 1.5 8Z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      <line x1="2.5" y1="2.5" x2="13.5" y2="13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>,
  },
  {
    id: "unlink", title: "Unlink Drawings",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6.5 9.5L4.5 11.5C3.5 12.5 2 12 1.5 10.5C1 9 2 7.5 3.5 7.5L6.5 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
      <path d="M9.5 6.5L11.5 4.5C12.5 3.5 14 4 14.5 5.5C15 7 14 8.5 12.5 8.5L9.5 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
      <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2 1.5"/>
    </svg>,
    color: "#4ade80",
  },
  {
    id: "trash", title: "Delete All Drawings",
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <line x1="1.5" y1="3.5" x2="13.5" y2="3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M4.5 3.5L4.5 2L10.5 2L10.5 3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" fill="none"/>
      <path d="M3 3.5L4 13L11 13L12 3.5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="6" y1="6.5" x2="6" y2="10.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      <line x1="9" y1="6.5" x2="9" y2="10.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>,
  },
];