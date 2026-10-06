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

// -------------------------------------------------------------
// SESSIONS TAB EMPTY STATES (Upcoming, Past, Cancelled)
// -------------------------------------------------------------

export function EmptyStateSessionsUpcoming({ className = 'w-36 h-28 mx-auto mb-3', ...props }) {
  return (
    <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false" {...props}>
      <rect x="36" y="26" width="88" height="74" rx="7" fill="var(--surface-raised)" stroke="var(--border)" strokeWidth="1.8" />
      <path d="M36 34C36 29.58 39.58 26 44 26H116C120.42 26 124 29.58 124 34V42H36V34Z" fill="var(--accent)" fillOpacity="0.15" stroke="var(--border)" strokeWidth="1.2" />
      <rect x="52" y="20" width="5" height="12" rx="2" fill="var(--accent)" />
      <rect x="103" y="20" width="5" height="12" rx="2" fill="var(--accent)" />
      {/* Clock icon inside */}
      <circle cx="80" cy="68" r="14" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.5" />
      <path d="M80 60V68L85 71" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyStateSessionsPast({ className = 'w-36 h-28 mx-auto mb-3', ...props }) {
  return (
    <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false" {...props}>
      {/* Open notebook / completed ledger */}
      <rect x="38" y="28" width="84" height="70" rx="6" fill="var(--surface-raised)" stroke="var(--border)" strokeWidth="1.8" />
      <line x1="80" y1="28" x2="80" y2="98" stroke="var(--border)" strokeWidth="1.5" />
      <line x1="48" y1="44" x2="70" y2="44" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="48" y1="54" x2="72" y2="54" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="48" y1="64" x2="66" y2="64" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" />
      {/* Checkmark in circle */}
      <circle cx="98" cy="58" r="12" fill="var(--success)" fillOpacity="0.15" stroke="var(--success)" strokeWidth="1.5" />
      <path d="M93 58L97 62L104 54" stroke="var(--success)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EmptyStateSessionsCancelled({ className = 'w-36 h-28 mx-auto mb-3', ...props }) {
  return (
    <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false" {...props}>
      <rect x="36" y="26" width="88" height="74" rx="7" fill="var(--surface-raised)" stroke="var(--border)" strokeWidth="1.8" />
      <path d="M36 34C36 29.58 39.58 26 44 26H116C120.42 26 124 29.58 124 34V42H36V34Z" fill="currentColor" fillOpacity="0.08" stroke="var(--border)" strokeWidth="1.2" />
      <rect x="52" y="20" width="5" height="12" rx="2" fill="currentColor" fillOpacity="0.3" />
      <rect x="103" y="20" width="5" height="12" rx="2" fill="currentColor" fillOpacity="0.3" />
      {/* Soft reset icon */}
      <circle cx="80" cy="68" r="14" fill="var(--surface)" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
      <path d="M75 63L85 73M85 63L75 73" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// -------------------------------------------------------------
// SMALL PAGE HEADER & SECTION TITLE SVGS (24x24 or 28x28)
// -------------------------------------------------------------

export function IconHeaderBrowse({ className = 'w-6 h-6 text-accent inline-block shrink-0', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false" {...props}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="11" cy="11" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function IconHeaderGuide({ className = 'w-6 h-6 text-accent inline-block shrink-0', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false" {...props}>
      <path d="M4 19.5V5C4 3.9 4.9 3 6 3H20V21H6C4.9 21 4 20.1 4 19.5Z" stroke="currentColor" strokeWidth="2" />
      <path d="M4 17C4.9 17 6 17.9 6 19H20" stroke="currentColor" strokeWidth="1.5" />
      <line x1="9" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconHeaderRecommendations({ className = 'w-6 h-6 text-accent inline-block shrink-0', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false" {...props}>
      <path d="M12 2L14.4 7.6L20.5 8.2L15.8 12.3L17.2 18.2L12 15.1L6.8 18.2L8.2 12.3L3.5 8.2L9.6 7.6L12 2Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export function IconHeaderProfile({ className = 'w-6 h-6 text-accent inline-block shrink-0', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false" {...props}>
      <circle cx="12" cy="8" r="4.5" stroke="currentColor" strokeWidth="2" />
      <path d="M4 20C4 16.5 7.5 14.5 12 14.5C16.5 14.5 20 16.5 20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconHeaderAvailability({ className = 'w-6 h-6 text-accent inline-block shrink-0', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false" {...props}>
      <rect x="3" y="4" width="18" height="17" rx="3" stroke="currentColor" strokeWidth="2" />
      <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8" y1="2" x2="8" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="2" x2="16" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="15" r="2" fill="currentColor" />
    </svg>
  );
}

export function IconHeaderEarnings({ className = 'w-6 h-6 text-accent inline-block shrink-0', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false" {...props}>
      <rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M16 12C16 13.1 16.9 14 18 14H22V10H18C16.9 10 16 10.9 16 12Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function IconHeaderMentorDashboard({ className = 'w-6 h-6 text-accent inline-block shrink-0', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false" {...props}>
      <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="3" width="8" height="5" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="11" width="8" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3" y="14" width="8" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function IconChoiceLearner({ className = 'w-5 h-5 mx-auto mb-1 text-inherit', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false" {...props}>
      <path d="M12 3L2 8.5L12 14L22 8.5L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M6 10.7V16.5C6 18.5 8.7 20.5 12 20.5C15.3 20.5 18 18.5 18 16.5V10.7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M22 8.5V15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconChoiceMentor({ className = 'w-5 h-5 mx-auto mb-1 text-inherit', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false" {...props}>
      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 20C4 16.7 7.6 14 12 14C16.4 14 20 16.7 20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 11L18 13L22 9" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EmptyStateRecommendations({ className = 'w-36 h-28 mx-auto mb-3', ...props }) {
  return (
    <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false" {...props}>
      <circle cx="80" cy="60" r="36" fill="var(--surface-raised)" stroke="var(--border)" strokeWidth="1.8" />
      <path d="M80 38L83.5 49L95 50L86 58L89 69L80 63L71 69L74 58L65 50L76.5 49L80 38Z" fill="var(--accent)" fillOpacity="0.2" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="106" cy="42" r="3" fill="var(--accent)" />
      <circle cx="54" cy="78" r="2.5" fill="var(--accent)" />
    </svg>
  );
}


