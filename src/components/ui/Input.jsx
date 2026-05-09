export function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full px-4 py-2 outline-none ${className}`}
      {...props}
    />
  );
}