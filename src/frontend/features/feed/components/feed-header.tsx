import { ThemeToggle } from "@/components/theme-toggle";

export function FeedHeader() {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-3">
      <p className="text-sm">Situation</p>
      <ThemeToggle />
    </header>
  );
}
