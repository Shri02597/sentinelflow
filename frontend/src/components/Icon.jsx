// Inline SVG icon set. Hand-rolled rather than a package: the console needs
// about a dozen glyphs and lucide-react would add ~30kB to every load.
const P = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const PATHS = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5" {...P} /><rect x="14" y="3" width="7" height="5" rx="1.5" {...P} /><rect x="14" y="12" width="7" height="9" rx="1.5" {...P} /><rect x="3" y="16" width="7" height="5" rx="1.5" {...P} /></>,
  events: <><path d="M3 12h3l2 6 3-12 2 6h4" {...P} /></>,
  users: <><circle cx="9" cy="8" r="3.5" {...P} /><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" {...P} /><path d="M16 5.2a3.5 3.5 0 0 1 0 6.6M18 20c0-2.2-.8-3.9-2.2-5" {...P} /></>,
  shield: <><path d="M12 3l7.5 3v5.5c0 4.6-3.1 8.4-7.5 9.5-4.4-1.1-7.5-4.9-7.5-9.5V6L12 3z" {...P} /><path d="M9 12l2 2 4-4" {...P} /></>,
  block: <><circle cx="12" cy="12" r="8.5" {...P} /><path d="M6 6l12 12" {...P} /></>,
  cart: <><circle cx="9" cy="20" r="1.4" {...P} /><circle cx="18" cy="20" r="1.4" {...P} /><path d="M2.5 3h2.2l2.4 11.4a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.3L21 7H6" {...P} /></>,
  activity: <><circle cx="12" cy="12" r="9" {...P} /><path d="M12 7v5l3.5 2" {...P} /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" {...P} /><path d="M20 20l-4.7-4.7" {...P} /></>,
  user: <><circle cx="12" cy="8" r="3.8" {...P} /><path d="M4.5 20.5c0-3.6 3.4-6.5 7.5-6.5s7.5 2.9 7.5 6.5" {...P} /></>,
  logout: <><path d="M15 8V5.5A1.5 1.5 0 0 0 13.5 4h-8A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20h8a1.5 1.5 0 0 0 1.5-1.5V16" {...P} /><path d="M9.5 12H21m0 0l-3.2-3.2M21 12l-3.2 3.2" {...P} /></>,
  warn: <><path d="M10.3 4.3L2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" {...P} /><path d="M12 9.5v4M12 16.6h.01" {...P} /></>,
  bolt: <><path d="M13.5 2.5L4 14h6.5l-.5 7.5L20 10h-6.5l0-7.5z" {...P} /></>,
  globe: <><circle cx="12" cy="12" r="9" {...P} /><path d="M3.2 9.5h17.6M3.2 14.5h17.6" {...P} /><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" {...P} /></>,
  key: <><circle cx="7.5" cy="14" r="4" {...P} /><path d="M10.4 11.2L20 2m-3 3l2.5 2.5M14.5 7.5L17 10" {...P} /></>,
  database: <><ellipse cx="12" cy="5.5" rx="7.5" ry="2.8" {...P} /><path d="M4.5 5.5v13c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8v-13" {...P} /><path d="M4.5 12c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8" {...P} /></>,
  arrow: <><path d="M5 12h14m0 0l-6-6m6 6l-6 6" {...P} /></>,
  chevron: <><path d="M9 5l7 7-7 7" {...P} /></>,
  close: <><path d="M6 6l12 12M18 6L6 18" {...P} /></>,
  check: <><path d="M4.5 12.5l5 5 10-11" {...P} /></>,
  plus: <><path d="M12 5v14M5 12h14" {...P} /></>,
  trash: <><path d="M4 7h16M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" {...P} /><path d="M6.5 7l.8 12.3A1.6 1.6 0 0 0 8.9 20.8h6.2a1.6 1.6 0 0 0 1.6-1.5L17.5 7" {...P} /></>,
  lock: <><rect x="4.5" y="10" width="15" height="10.5" rx="2" {...P} /><path d="M8 10V7.5a4 4 0 0 1 8 0V10" {...P} /></>,
  unlock: <><rect x="4.5" y="10" width="15" height="10.5" rx="2" {...P} /><path d="M8 10V7.5a4 4 0 0 1 7.6-1.7" {...P} /></>,
  wifi: <><path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0" {...P} /><circle cx="12" cy="19" r="1" fill="currentColor" /></>,
  eye: <><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" {...P} /><circle cx="12" cy="12" r="2.8" {...P} /></>,
  filter: <><path d="M3 5.5h18M6.5 12h11M10 18.5h4" {...P} /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14-4.5L3.5 9" {...P} /><path d="M4 13a8 8 0 0 0 14 4.5L20.5 15" {...P} /><path d="M3.5 5.5V9H7M20.5 18.5V15H17" {...P} /></>,
  inbox: <><path d="M3 13h4l1.5 3h7L17 13h4" {...P} /><path d="M5.4 4.5h13.2L21 13v4.5A2 2 0 0 1 19 19.5H5a2 2 0 0 1-2-2V13L5.4 4.5z" {...P} /></>,
  star: <><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5z" {...P} /></>,
  bell: <><path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9z" {...P} /><path d="M13.7 19a2 2 0 0 1-3.4 0" {...P} /></>,
  package: <><path d="M12 2.8l8.5 4.4v9.6L12 21.2 3.5 16.8V7.2L12 2.8z" {...P} /><path d="M3.7 7.1L12 11.5l8.3-4.4M12 11.5V21" {...P} /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" {...P} /></>,
}

export default function Icon({ name, size = 16, className = '' }) {
  const d = PATHS[name]
  if (!d) return null
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {d}
    </svg>
  )
}

export const ICON_NAMES = Object.keys(PATHS)
