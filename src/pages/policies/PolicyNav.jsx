import { Link, useLocation } from "react-router-dom";

const policyLinks = [
  { label: "Terms", path: "/terms" },
  { label: "Shipping", path: "/shipping-policy" },
  { label: "Refunds", path: "/refund-policy" },
  { label: "Privacy", path: "/privacy-policy" },
];

export default function PolicyNav() {
  const location = useLocation();

  return (
    <nav className="mt-6 flex flex-wrap gap-2 border-y border-white/10 py-4">
      {policyLinks.map((link) => {
        const active = location.pathname === link.path;

        return (
          <Link
            key={link.path}
            to={link.path}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              active
                ? "border-green-400 bg-green-400 text-black"
                : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}