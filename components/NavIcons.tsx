type P = { className?: string };

const stroke = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function HomeIcon({ className }: P) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 3 2 11.5h2.5V21H10v-6h4v6h5.5v-9.5H22L12 3z" />
    </svg>
  );
}

export function ValueIcon({ className }: P) {
  return (
    <svg {...stroke} className={className}>
      <path d="M4 20v-4M9 20v-7M14 20v-5M19 20v-9" />
      <path d="M3 11.5 8 7l4 3 8-6.5" />
      <path d="M16 3.5h4.5V8" />
    </svg>
  );
}

export function ScenarioIcon({ className }: P) {
  return (
    <svg {...stroke} className={className}>
      <path d="M3 6h7M16 6h5M3 12h2M11 12h10M3 18h9M18 18h3" />
      <circle cx="13" cy="6" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="8" cy="12" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="2.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function DecisionsIcon({ className }: P) {
  return (
    <svg {...stroke} className={className}>
      <path d="M12 4v16M8 20h8M5 6.5h14" />
      <path d="M5 6.5 2.5 13.5h5L5 6.5zM19 6.5l-2.5 7h5L19 6.5z" />
      <path d="M2.5 13.5a2.5 2.5 0 0 0 5 0M16.5 13.5a2.5 2.5 0 0 0 5 0" />
    </svg>
  );
}

export function BatchesIcon({ className }: P) {
  return (
    <svg {...stroke} className={className}>
      <rect x="2" y="10" width="12" height="12" rx="2" />
      <path d="M5 10V9a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-1" />
      <path d="M8 7V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-1" />
    </svg>
  );
}

export function BatchStagesIcon({ className }: P) {
  return (
    <svg {...stroke} className={className}>
      <circle cx="5" cy="12" r="3" />
      <circle cx="12" cy="12" r="3" />
      <circle cx="19" cy="12" r="3" />
    </svg>
  );
}

export function SettingsIcon({ className }: P) {
  return (
    <svg {...stroke} strokeWidth={1.8} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
