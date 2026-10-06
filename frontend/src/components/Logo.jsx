import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Original Mentor-Match brand logo mark and wordmark.
 * The mark consists of two connecting solid geometric shapes representing
 * a learner and a mentor coming together, forming an abstract 'M'.
 * It strictly uses theme tokens (var(--logo-mark, var(--accent)) and var(--text))
 * and maintains WCAG AA contrast (>3:1) in all 6 themes.
 *
 * @param {'full' | 'mark'} [variant='full'] - Display mark + wordmark or mark only
 * @param {boolean} [asLink=true] - Wrap in a link to "/" with accessible home label
 * @param {string} [className=''] - Additional class names for styling
 * @param {() => void} [onClick] - Optional click handler (e.g. to close mobile menu)
 */
export default function Logo({
  variant = 'full',
  asLink = true,
  className = '',
  onClick
}) {
  const mark = (
    <svg
      className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 transition-transform group-hover:scale-[1.03]"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="img"
    >
      {/* Learner solid pillar (ascending left arm) */}
      <path
        d="M4 27V5H13L16 17L11 27H4Z"
        fill="var(--logo-mark, var(--accent))"
      />
      {/* Mentor solid pillar (connecting right arm, matching at apex 16, 17) */}
      <path
        d="M28 27V5H19L16 17L21 27H28Z"
        fill="var(--logo-mark, var(--accent))"
      />
    </svg>
  );

  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {mark}
      {variant === 'full' && (
        <span className="font-serif text-lg sm:text-xl font-bold tracking-tight text-text whitespace-nowrap group-hover:text-accent transition-colors">
          Mentor-Match
        </span>
      )}
    </span>
  );

  if (asLink) {
    return (
      <Link
        to="/"
        className="inline-flex shrink-0 items-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
        aria-label="Mentor-Match home"
        onClick={onClick}
      >
        {content}
      </Link>
    );
  }

  return (
    <span aria-label="Mentor-Match home" role="img">
      {content}
    </span>
  );
}
