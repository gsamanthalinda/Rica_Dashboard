type P = { className?: string };
const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

export const StagesIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="5" cy="12" r="3" />
    <circle cx="12" cy="12" r="3" />
    <circle cx="19" cy="12" r="3" />
  </svg>
);

export const ScenarioIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M4 6h16M4 12h16M4 18h16" />
    <circle cx="9" cy="6" r="2" fill="currentColor" />
    <circle cx="15" cy="12" r="2" fill="currentColor" />
    <circle cx="8" cy="18" r="2" fill="currentColor" />
  </svg>
);

export const UserIcon = ({ className }: P) => (
  <svg {...base} className={className} fill="currentColor" stroke="none">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" />
  </svg>
);

export const EditIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M4 20h4L19 9l-4-4L4 16z" fill="currentColor" stroke="none" />
    <path d="M3 22h18" />
  </svg>
);

export const TrashIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
);

export const ArrowUp = ({ className }: P) => (
  <svg {...base} className={className} fill="currentColor" stroke="none">
    <path d="M12 5l7 10H5z" />
  </svg>
);

export const ArrowDown = ({ className }: P) => (
  <svg {...base} className={className} fill="currentColor" stroke="none">
    <path d="M12 19L5 9h14z" />
  </svg>
);

export const SearchIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);
