import { useState } from "react";

import { cn } from "@/lib/utils";

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.5"
      viewBox="0 0 16 16"
    >
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8h1.5M13 8h1.5M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M3.2 12.8l1.1-1.1M11.7 4.3l1.1-1.1" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 16 16"
    >
      <path d="M13.5 9.2A5.5 5.5 0 1 1 6.8 2.5 4.4 4.4 0 0 0 13.5 9.2Z" />
    </svg>
  );
}

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem("theme", dark ? "dark" : "light");
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#111111" : "#ffffff");
}

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  function toggle() {
    const next = !dark;
    setDark(next);
    applyTheme(next);
  }

  return (
    <button
      aria-label={dark ? "Light theme" : "Dark theme"}
      className={cn(
        "text-muted-foreground hover:text-foreground",
        className,
      )}
      onClick={toggle}
      type="button"
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
