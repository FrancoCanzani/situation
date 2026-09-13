import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const THEME_COLOR = { light: "#ffffff", dark: "#111111" } as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const dark = resolvedTheme === "dark";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!resolvedTheme) return;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        THEME_COLOR[resolvedTheme === "dark" ? "dark" : "light"],
      );
  }, [resolvedTheme]);

  if (!mounted) {
    return (
      <Button
        aria-hidden
        className={cn("text-muted-foreground", className)}
        disabled
        size="icon-sm"
        type="button"
        variant="ghost"
      />
    );
  }

  return (
    <Button
      aria-label={dark ? "Light theme" : "Dark theme"}
      className={cn("text-muted-foreground hover:text-foreground", className)}
      onClick={() => setTheme(dark ? "light" : "dark")}
      size="icon-sm"
      type="button"
      variant="ghost"
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}
