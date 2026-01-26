// theme.ts - Clinical UI Theme Constants
// Use these for consistent styling across Forensic

export const colors = {
  // Background hierarchy
  bg: {
    primary: '#0f172a',    // slate-900
    secondary: '#1e293b',  // slate-800
    tertiary: '#334155',   // slate-700
    input: '#475569',      // slate-600
  },
  
  // Text
  text: {
    primary: '#f8fafc',    // slate-50
    secondary: '#cbd5e1',  // slate-300
    muted: '#94a3b8',      // slate-400
    dimmed: '#64748b',     // slate-500
  },
  
  // Accents
  blue: {
    DEFAULT: '#2563eb',    // blue-600
    hover: '#1d4ed8',      // blue-700
    bg: 'rgba(37, 99, 235, 0.2)',
  },
  
  green: {
    DEFAULT: '#16a34a',    // green-600
    bg: 'rgba(22, 163, 74, 0.2)',
  },
  
  amber: {
    DEFAULT: '#d97706',    // amber-600
    hover: '#b45309',      // amber-700
    bg: 'rgba(217, 119, 6, 0.2)',
  },
  
  red: {
    DEFAULT: '#dc2626',    // red-600
    bg: 'rgba(220, 38, 38, 0.2)',
  },
  
  purple: {
    DEFAULT: '#9333ea',    // purple-600
    bg: 'rgba(147, 51, 234, 0.2)',
  },
};

export const spacing = {
  page: '24px',           // p-6
  card: '24px',           // p-6
  cardCompact: '16px',    // p-4
  section: '32px',        // mb-8
  gap: '16px',            // gap-4
  gapSm: '8px',           // gap-2
};

export const radius = {
  sm: '8px',              // rounded-lg
  md: '12px',             // rounded-xl
  lg: '16px',             // rounded-2xl
  full: '9999px',         // rounded-full
};

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  glow: {
    blue: '0 10px 40px -10px rgba(37, 99, 235, 0.25)',
    amber: '0 10px 40px -10px rgba(217, 119, 6, 0.25)',
  },
};

export const transitions = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
};

// Tailwind class mappings for convenience
export const tw = {
  card: 'bg-slate-800 rounded-xl p-6',
  cardHover: 'bg-slate-800/80 rounded-xl p-5 border border-slate-700 hover:border-slate-600 transition-all hover:transform hover:scale-[1.02]',
  
  btnPrimary: 'bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium text-white transition-colors',
  btnSecondary: 'bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-medium text-white transition-colors',
  btnGhost: 'text-slate-400 hover:text-white transition-colors',
  
  // Forensic-specific
  btnForensic: 'bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg font-medium text-white transition-colors',
  btnForensicGradient: 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 hover:from-amber-600/30 hover:to-orange-600/30 border border-amber-500/30 text-amber-300',
  
  input: 'w-full bg-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500',
  select: 'w-full bg-slate-700 text-white border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500',
  
  badge: 'px-2 py-0.5 rounded-full text-xs font-medium',
  badgeSuccess: 'bg-green-500/20 text-green-400',
  badgeWarning: 'bg-amber-500/20 text-amber-400',
  badgeDanger: 'bg-red-500/20 text-red-400',
  badgeInfo: 'bg-blue-500/20 text-blue-400',
  
  navActive: 'bg-blue-600 text-white',
  navInactive: 'text-slate-300 hover:bg-slate-700',
  navForensicActive: 'bg-amber-600 text-white',
};
