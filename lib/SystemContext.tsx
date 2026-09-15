"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  loadSystemSettings,
  saveSystemSettings,
  type SystemSettings,
  type RunwithmeTheme,
} from "@/lib/systemStorage";

type SystemContextValue = {
  settings: SystemSettings;
  theme: RunwithmeTheme;
  setTheme: (theme: RunwithmeTheme) => void;
  updateSettings: (updates: Partial<SystemSettings>) => void;
};

const SystemContext = createContext<SystemContextValue | null>(null);

export function SystemProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [settings, setSettings] =
    useState<SystemSettings | null>(null);

  useEffect(() => {
    const loaded = loadSystemSettings();

    setSettings(loaded);

    document.documentElement.setAttribute(
      "data-runwithme-theme",
      loaded.theme
    );
  }, []);

  const setTheme = (theme: RunwithmeTheme) => {
    setSettings((current) => {
      if (!current) return current;

      const next = {
        ...current,
        theme,
      };

      saveSystemSettings(next);

      document.documentElement.setAttribute(
        "data-runwithme-theme",
        theme
      );

      return next;
    });
  };

  const updateSettings = (
    updates: Partial<SystemSettings>
  ) => {
    setSettings((current) => {
      if (!current) return current;

      const next = {
        ...current,
        ...updates,
      };

      saveSystemSettings(next);

      if (updates.theme) {
        document.documentElement.setAttribute(
          "data-runwithme-theme",
          updates.theme
        );
      }

      return next;
    });
  };

  if (!settings) {
    return null;
  }

  return (
    <SystemContext.Provider
      value={{
        settings,
        theme: settings.theme,
        setTheme,
        updateSettings,
      }}
    >
      {children}
    </SystemContext.Provider>
  );
}

export function useSystem() {
  const context = useContext(SystemContext);

  if (!context) {
    throw new Error(
      "useSystem must be used inside SystemProvider"
    );
  }

  return context;
}