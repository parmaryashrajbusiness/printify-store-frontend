import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export default function SelectField({
  value,
  onChange,
  options = [],
  placeholder = "Select",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!ref.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-12 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 text-left text-white outline-none transition ${
          disabled
            ? "cursor-not-allowed opacity-50"
            : "hover:border-white/20 hover:bg-white/[0.08] focus:border-green-400/60"
        }`}
      >
        <span className={selectedOption ? "text-white" : "text-zinc-500"}>
          {selectedOption?.label || placeholder}
        </span>

        <ChevronDown
          className={`h-4 w-4 text-zinc-400 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-[9999] mt-2 max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-[#080d08] p-1 shadow-2xl shadow-black/60">
          {options.map((option) => {
            const active = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`w-full rounded-xl px-4 py-3 text-left text-sm transition ${
                  active
                    ? "bg-green-500 text-black"
                    : "text-zinc-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}