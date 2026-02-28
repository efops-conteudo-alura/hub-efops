"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start text-muted-foreground"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun size={16} className="mr-2 dark:hidden" />
      <Moon size={16} className="mr-2 hidden dark:block" />
      {theme === "dark" ? "Modo claro" : "Modo escuro"}
    </Button>
  );
}
