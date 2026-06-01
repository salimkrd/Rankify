import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const THEME_STORAGE_KEY = "rankify-theme";
const THEME_CHANGE_EVENT = "rankify-theme-change";

function getStoredTheme() {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
}

export default function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const nextTheme = getStoredTheme();
    setTheme(nextTheme);
    applyTheme(nextTheme);

    function handleThemeChange(event) {
      const next = event.detail?.theme ?? getStoredTheme();
      setTheme(next);
      applyTheme(next);
    }

    function handleStorage(event) {
      if (event.key === THEME_STORAGE_KEY) {
        const next = event.newValue === "dark" ? "dark" : "light";
        setTheme(next);
        applyTheme(next);
      }
    }

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  function updateTheme(nextTheme) {
    setTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
    window.dispatchEvent(
      new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme: nextTheme } })
    );
  }

  return (
    <div className={`theme-toggle ${className}`}>
      <button
        type="button"
        aria-pressed={theme === "light"}
        onClick={() => updateTheme("light")}
        className={`theme-toggle__button ${theme === "light" ? "is-active" : ""}`}
      >
        <Sun className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Light</span>
      </button>
      <button
        type="button"
        aria-pressed={theme === "dark"}
        onClick={() => updateTheme("dark")}
        className={`theme-toggle__button ${theme === "dark" ? "is-active" : ""}`}
      >
        <Moon className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Dark</span>
      </button>
    </div>
  );
}
