import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle({ variant = "sidebar" }: { variant?: "sidebar" | "header" }) {
  const { theme, setTheme } = useTheme();

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  if (variant === "header") {
    return (
      <button onClick={toggle} className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
        <Sun className="h-5 w-5 hidden dark:block" />
        <Moon className="h-5 w-5 block dark:hidden" />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors w-full"
    >
      <Sun className="h-5 w-5 hidden dark:block" />
      <Moon className="h-5 w-5 block dark:hidden" />
      <span className="dark:hidden">Dark Mode</span>
      <span className="hidden dark:inline">Light Mode</span>
    </button>
  );
}
