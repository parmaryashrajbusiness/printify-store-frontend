export default function Button({
  children,
  className = "",
  variant = "default",
  size = "md",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold tracking-[0.01em] transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

  const sizes = {
    sm: "h-9 px-4 text-sm",
    md: "h-11 px-5 text-sm",
    lg: "h-12 px-6 text-base",
    icon: "h-11 w-11",
  };

  const variants = {
    default:
      "bg-green-500 text-black shadow-[0_10px_30px_rgba(34,197,94,0.25)] hover:bg-green-400 hover:shadow-[0_14px_36px_rgba(34,197,94,0.32)]",
    outline:
      "border border-white/12 bg-white/6 text-white backdrop-blur-md hover:bg-white/10 hover:border-white/20",
    dark:
      "bg-black text-white border border-white/10 hover:bg-zinc-900",
    ghost:
      "bg-transparent text-white hover:bg-white/8",
    soft:
      "bg-green-500/14 text-green-300 border border-green-500/20 hover:bg-green-500/20",
  };

  return (
    <button
      className={`${base} ${sizes[size] || sizes.md} ${variants[variant] || variants.default} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}