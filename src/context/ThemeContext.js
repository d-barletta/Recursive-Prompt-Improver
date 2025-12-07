import React, { createContext, useContext, useState, useEffect } from "react";
import { getStorageItem, setStorageItem } from "@utils/storageUtils";

const THEME_STORAGE_KEY = "rpi-theme";

const ThemeContext = createContext({
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState("dark");

  // Load theme from storage on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await getStorageItem(THEME_STORAGE_KEY);
        if (savedTheme && (savedTheme === "light" || savedTheme === "dark")) {
          setThemeState(savedTheme);
        }
      } catch (error) {
        console.error("Error loading theme:", error);
      }
    };
    loadTheme();
  }, []);

  // Update root element and save to storage when theme changes
  useEffect(() => {
    const root = document.querySelector(".rpi");
    if (root) {
      root.classList.remove("light", "dark");
      root.classList.add(theme);
    }

    // Save to storage
    setStorageItem(THEME_STORAGE_KEY, theme).catch((error) => {
      console.error("Error saving theme:", error);
    });
  }, [theme]);

  const setTheme = (newTheme) => {
    if (newTheme === "light" || newTheme === "dark") {
      setThemeState(newTheme);
    }
  };

  const toggleTheme = () => {
    setThemeState((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
