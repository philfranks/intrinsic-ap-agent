/**
 * Receipt, drawn on Lucide's 24px grid with its 2px round stroke so it sits in the same set
 * as the other rail icons: a straight top, a torn zigzag bottom, three lines of text.
 */
export function ReceiptLine({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 2h12a1 1 0 0 1 1 1v19l-2.33-1.5-2.34 1.5L12 20.5 9.67 22l-2.34-1.5L5 22V3a1 1 0 0 1 1-1z" />
      <path d="M9 7h6" />
      <path d="M9 11h6" />
      <path d="M9 15h3" />
    </svg>
  );
}
