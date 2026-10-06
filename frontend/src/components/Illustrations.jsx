import React from 'react';

/**
 * Editorial SVG Illustrations using CSS Theme Variables.
 * Every illustration uses currentColor, var(--accent), var(--border),
 * and var(--surface-raised) to seamlessly match all 6 themes.
 */

// -------------------------------------------------------------
// HOW IT WORKS STEP ILLUSTRATIONS
// -------------------------------------------------------------

export function IllustrationSearchMatch({ className = 'w-full h-36', ...props }) {
  return (
    <svg
      viewBox="0 0 240 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {/* Background soft card */}
      <rect x="20" y="15" width="200" height="110" rx="8" fill="var(--surface-raised)" stroke="var(--border)" strokeWidth="1.5" />
      
      {/* Search Input Bar */}
      <rect x="36" y="28" width="168" height="26" rx="5" fill="var(--surface)" stroke="var(--border)" strokeWidth="1.2" />
      <circle cx="50" cy="41" r="5" stroke="var(--accent)" strokeWidth="1.5" />
      <path d="M53.5 44.5L59 50" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="68" y1="41" x2="135" y2="41" stroke="currentColor" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />

      {/* Filter Tag Pills */}
      <rect x="36" y="62" width="50" height="18" rx="4" fill="var(--accent)" fillOpacity="0.12" stroke="var(--accent)" strokeWidth="1" />
      <line x1="46" y1="71" x2="76" y2="71" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />

      <rect x="92" y="62" width="60" height="18" rx="4" fill="var(--surface)" stroke="var(--border)" strokeWidth="1" />
      <line x1="102" y1="71" x2="142" y2="71" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" />

      {/* Matched Practitioner Mini-Card */}
      <g transform="translate(36, 88)">
        <rect width="168" height="26" rx="4" fill="var(--surface)" stroke="var(--border)" strokeWidth="1" />
        <circle cx="16" cy="13" r="7" fill="var(--accent)" fillOpacity="0.2" stroke="var(--accent)" strokeWidth="1" />
        <line x1="30" y1="10" x2="85" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="30" y1="17" x2="65" y2="17" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="152" cy="13" r="5" fill="var(--accent)" />
        <path d="M149.5 13L151 14.5L154.5 11" stroke="var(--surface)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function IllustrationCalendarSlots({ className = 'w-full h-36', ...props }) {
  return (
    <svg
      viewBox="0 0 240 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {/* Calendar Base Plate */}
      <rect x="24" y="16" width="192" height="108" rx="8" fill="var(--surface-raised)" stroke="var(--border)" strokeWidth="1.5" />
      
      {/* Calendar Header */}
      <path d="M24 24C24 19.5817 27.5817 16 32 16H208C212.418 16 216 19.5817 216 24V38H24V24Z" fill="var(--surface)" stroke="var(--border)" strokeWidth="1" />
      <circle cx="42" cy="27" r="3" fill="var(--accent)" />
      <circle cx="52" cy="27" r="3" fill="currentColor" fillOpacity="0.2" />
      <line x1="90" y1="27" x2="150" y2="27" stroke="currentColor" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" />

      {/* Weekday Grid Dots */}
      <g stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" strokeLinecap="round">
        <line x1="40" y1="52" x2="52" y2="52" />
        <line x1="68" y1="52" x2="80" y2="52" />
        <line x1="96" y1="52" x2="108" y2="52" />
        <line x1="124" y1="52" x2="136" y2="52" />
        <line x1="152" y1="52" x2="164" y2="52" />
        <line x1="180" y1="52" x2="192" y2="52" />
      </g>

      {/* Selected Slot Focus Card */}
      <rect x="40" y="66" width="160" height="46" rx="6" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.5" />
      <circle cx="58" cy="89" r="10" fill="var(--accent)" fillOpacity="0.12" stroke="var(--accent)" strokeWidth="1.2" />
      {/* Clock icon inside */}
      <circle cx="58" cy="89" r="6" stroke="var(--accent)" strokeWidth="1.2" />
      <path d="M58 86V89L60 90.5" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" />

      <line x1="76" y1="84" x2="140" y2="84" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="76" y1="94" x2="115" y2="94" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" strokeLinecap="round" />

      {/* Held Badge */}
      <rect x="150" y="80" width="40" height="18" rx="4" fill="var(--accent)" />
      <text x="170" y="92" fill="var(--surface)" fontSize="8" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">10 MIN</text>
    </svg>
  );
}

export function IllustrationVideoConnect({ className = 'w-full h-36', ...props }) {
  return (
    <svg
      viewBox="0 0 240 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {/* Screen Frame */}
      <rect x="22" y="16" width="196" height="106" rx="7" fill="var(--surface-raised)" stroke="var(--border)" strokeWidth="1.5" />
      <path d="M22 22C22 18.6863 24.6863 16 28 16H212C215.314 16 218 18.6863 218 22V28H22V22Z" fill="var(--surface)" stroke="var(--border)" strokeWidth="1" />
      <circle cx="32" cy="22" r="2" fill="currentColor" fillOpacity="0.3" />
      <circle cx="38" cy="22" r="2" fill="currentColor" fillOpacity="0.3" />
      <circle cx="44" cy="22" r="2" fill="currentColor" fillOpacity="0.3" />

      {/* Split In-Browser Video Panes */}
      <rect x="32" y="36" width="82" height="74" rx="5" fill="var(--surface)" stroke="var(--border)" strokeWidth="1" />
      <circle cx="73" cy="65" r="14" fill="var(--surface-raised)" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.2" />
      <path d="M63 87C63 81.5 67.5 77 73 77C78.5 77 83 81.5 83 87" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.2" />

      <rect x="126" y="36" width="82" height="74" rx="5" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.5" />
      <circle cx="167" cy="65" r="14" fill="var(--accent)" fillOpacity="0.15" stroke="var(--accent)" strokeWidth="1.2" />
      <path d="M157 87C157 81.5 161.5 77 167 77C172.5 77 177 81.5 177 87" stroke="var(--accent)" strokeWidth="1.2" />

      {/* Audio Waveform Signal Indicator */}
      <g transform="translate(182, 42)">
        <circle cx="16" cy="8" r="6" fill="var(--accent)" />
        <path d="M14 8L16 6V10L14 8Z" fill="var(--surface)" />
      </g>
    </svg>
  );
}

// -------------------------------------------------------------
// EMPTY & ERROR STATE SVG ILLUSTRATIONS (Matches all 6 themes)
// -------------------------------------------------------------

export function EmptyStateMentorSearch({ className = 'w-36 h-28 mx-auto mb-3', ...props }) {
  return (
    <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false" {...props}>
      <circle cx="72" cy="52" r="32" fill="var(--surface-raised)" stroke="var(--border)" strokeWidth="1.8" />
      <circle cx="72" cy="52" r="22" stroke="var(--border)" strokeDasharray="3 3" strokeWidth="1.5" />
      {/* Magnifier lens handle */}
      <path d="M96 76L122 102" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      {/* Center user avatar outline with question */}
      <circle cx="72" cy="46" r="9" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" />
      <path d="M58 64C58 58 64 56 72 56C80 56 86 58 86 64" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" />
    </svg>
  );
}

export function EmptyStateSessions({ className = 'w-36 h-28 mx-auto mb-3', ...props }) {
  return (
    <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false" {...props}>
      {/* Desk Calendar */}
      <rect x="36" y="26" width="88" height="74" rx="7" fill="var(--surface-raised)" stroke="var(--border)" strokeWidth="1.8" />
      <path d="M36 34C36 29.58 39.58 26 44 26H116C120.42 26 124 29.58 124 34V42H36V34Z" fill="var(--accent)" fillOpacity="0.15" stroke="var(--border)" strokeWidth="1.2" />
      {/* Rings */}
      <rect x="52" y="20" width="5" height="12" rx="2" fill="var(--accent)" />
      <rect x="103" y="20" width="5" height="12" rx="2" fill="var(--accent)" />
      {/* Calendar clean blank grid */}
      <circle cx="60" cy="58" r="3" fill="currentColor" fillOpacity="0.25" />
      <circle cx="80" cy="58" r="3" fill="currentColor" fillOpacity="0.25" />
      <circle cx="100" cy="58" r="3" fill="currentColor" fillOpacity="0.25" />
      <circle cx="60" cy="74" r="3" fill="currentColor" fillOpacity="0.25" />
      <circle cx="80" cy="74" r="3" fill="currentColor" fillOpacity="0.25" />
      <circle cx="100" cy="74" r="4" fill="var(--accent)" />
    </svg>
  );
}

export function EmptyStateProfileIncomplete({ className = 'w-36 h-28 mx-auto mb-3', ...props }) {
  return (
    <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false" {...props}>
      {/* Checklist / Profile Board */}
      <rect x="42" y="18" width="76" height="88" rx="6" fill="var(--surface-raised)" stroke="var(--border)" strokeWidth="1.8" />
      <path d="M64 18V14C64 12.89 64.89 12 66 12H94C95.11 12 96 12.89 96 14V18H64Z" fill="var(--accent)" />
      
      {/* Checklist Items */}
      <rect x="52" y="34" width="12" height="12" rx="3" stroke="var(--accent)" strokeWidth="1.5" fill="var(--accent)" fillOpacity="0.1" />
      <path d="M55 40L58 43L62 37" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="72" y1="40" x2="108" y2="40" stroke="currentColor" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />

      <rect x="52" y="54" width="12" height="12" rx="3" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" />
      <line x1="72" y1="60" x2="104" y2="60" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" />

      <rect x="52" y="74" width="12" height="12" rx="3" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" />
      <line x1="72" y1="80" x2="96" y2="80" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyStateReviews({ className = 'w-36 h-28 mx-auto mb-3', ...props }) {
  return (
    <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false" {...props}>
      {/* Speech Bubble */}
      <path
        d="M36 28C36 23.58 39.58 20 44 20H116C120.42 20 124 23.58 124 28V68C124 72.42 120.42 76 116 76H74L54 94V76H44C39.58 76 36 72.42 36 68V28Z"
        fill="var(--surface-raised)"
        stroke="var(--border)"
        strokeWidth="1.8"
      />
      {/* Star outline inside */}
      <path
        d="M80 34L83.2 40.5L90.4 41.5L85.2 46.6L86.4 53.7L80 50.3L73.6 53.7L74.8 46.6L69.6 41.5L76.8 40.5L80 34Z"
        fill="var(--accent)"
        fillOpacity="0.2"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line x1="62" y1="62" x2="98" y2="62" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyStateEarnings({ className = 'w-36 h-28 mx-auto mb-3', ...props }) {
  return (
    <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false" {...props}>
      {/* Wallet / Ledger Fold */}
      <rect x="34" y="32" width="92" height="62" rx="7" fill="var(--surface-raised)" stroke="var(--border)" strokeWidth="1.8" />
      <path d="M34 44H126" stroke="var(--border)" strokeWidth="1.5" />
      {/* Flap with clasp */}
      <rect x="88" y="52" width="38" height="22" rx="4" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.5" />
      <circle cx="100" cy="63" r="3.5" fill="var(--accent)" />
      {/* Coins outline on left */}
      <circle cx="60" cy="64" r="10" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
      <text x="60" y="68" fill="currentColor" fillOpacity="0.4" fontSize="11" fontFamily="sans-serif" textAnchor="middle">₹</text>
    </svg>
  );
}

export function EmptyStateComplaints({ className = 'w-36 h-28 mx-auto mb-3', ...props }) {
  return (
    <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false" {...props}>
      {/* Peaceful Shield */}
      <path
        d="M80 20L114 34V60C114 80 99 97 80 102C61 97 46 80 46 60V34L80 20Z"
        fill="var(--surface-raised)"
        stroke="var(--border)"
        strokeWidth="1.8"
      />
      <circle cx="80" cy="58" r="16" fill="var(--success)" fillOpacity="0.12" stroke="var(--success)" strokeWidth="1.5" />
      <path d="M73 58L78 63L88 53" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EmptyState404({ className = 'w-40 h-32 mx-auto mb-3', ...props }) {
  return (
    <svg viewBox="0 0 180 130" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false" {...props}>
      {/* Compass Dial */}
      <circle cx="90" cy="65" r="42" fill="var(--surface-raised)" stroke="var(--border)" strokeWidth="2" />
      <circle cx="90" cy="65" r="34" stroke="var(--border)" strokeDasharray="3 3" strokeWidth="1.2" />
      {/* Compass needle */}
      <polygon points="90,36 96,65 90,60" fill="var(--accent)" />
      <polygon points="90,94 96,65 90,60" fill="currentColor" fillOpacity="0.3" />
      <polygon points="90,36 84,65 90,60" fill="var(--accent)" fillOpacity="0.8" />
      <polygon points="90,94 84,65 90,60" fill="currentColor" fillOpacity="0.2" />
      <circle cx="90" cy="65" r="4" fill="var(--surface)" stroke="var(--border)" strokeWidth="1.5" />
      {/* Cardinal marks */}
      <line x1="90" y1="27" x2="90" y2="31" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      <line x1="90" y1="99" x2="90" y2="103" stroke="currentColor" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
      <line x1="52" y1="65" x2="56" y2="65" stroke="currentColor" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
      <line x1="124" y1="65" x2="128" y2="65" stroke="currentColor" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyStateNetworkError({ className = 'w-40 h-32 mx-auto mb-3', ...props }) {
  return (
    <svg viewBox="0 0 180 130" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false" {...props}>
      {/* Server Stack */}
      <rect x="50" y="30" width="80" height="24" rx="4" fill="var(--surface-raised)" stroke="var(--border)" strokeWidth="1.8" />
      <circle cx="62" cy="42" r="3" fill="var(--danger)" />
      <circle cx="72" cy="42" r="3" fill="currentColor" fillOpacity="0.2" />
      <line x1="95" y1="42" x2="120" y2="42" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" />

      <rect x="50" y="60" width="80" height="24" rx="4" fill="var(--surface-raised)" stroke="var(--border)" strokeWidth="1.8" />
      <circle cx="62" cy="72" r="3" fill="currentColor" fillOpacity="0.2" />
      <circle cx="72" cy="72" r="3" fill="currentColor" fillOpacity="0.2" />
      <line x1="95" y1="72" x2="120" y2="72" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" />

      {/* Disconnect indicator */}
      <g transform="translate(90, 95)">
        <circle cx="0" cy="10" r="12" fill="var(--surface)" stroke="var(--danger)" strokeWidth="1.5" />
        <path d="M-4 6L4 14M4 6L-4 14" stroke="var(--danger)" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}
