import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={`rounded-full hover:bg-muted text-foreground transition-transform active:scale-95 ${className || "h-10 w-10 border bg-card"}`}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? (
        <Sun className="h-4.5 w-4.5 text-amber-400 transition-all rotate-0 scale-100" />
      ) : (
        <Moon className="h-4.5 w-4.5 text-slate-700 dark:text-slate-200 transition-all rotate-0 scale-100" />
      )}
    </Button>
  );
}
