export function Badge({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold leading-none ${className}`}
    >
      {children}
    </span>
  );
}