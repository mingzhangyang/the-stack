/**
 * The brand mark: three crossed sticks. Kept in sync with
 * scripts/generate-icons.mjs, which renders the same geometry to favicons and
 * the Open Graph card.
 *
 * The cream strokes are halos that carve a gap where an upper stick crosses a
 * lower one, so they assume the page background colour.
 */
export default function Logo({className}: {className?: string}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M9 27 L55 37" stroke="#8E9775" strokeWidth="7.5" />
      <path d="M13 48 L51 17" stroke="#F2F0E9" strokeWidth="11" />
      <path d="M13 48 L51 17" stroke="#C19A6B" strokeWidth="7.5" />
      <path d="M21 55 L41 9" stroke="#F2F0E9" strokeWidth="11" />
      <path d="M21 55 L41 9" stroke="#EE8877" strokeWidth="7.5" />
    </svg>
  );
}
