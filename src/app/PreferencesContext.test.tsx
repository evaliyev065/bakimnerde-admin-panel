import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PreferencesProvider, usePreferences } from "./PreferencesContext";

describe("application preferences", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("bakimnerde_theme", "light");
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.lang = "tr";
  });

  afterEach(() => cleanup());

  it("persists the TR/EN language and light/dark theme choices", async () => {
    render(<PreferencesProvider><PreferenceProbe /></PreferencesProvider>);

    expect(screen.getByText("Genel bakış")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "language" }));
    expect(screen.getByText("Overview")).toBeInTheDocument();
    await waitFor(() => expect(document.documentElement.lang).toBe("en"));
    expect(localStorage.getItem("bakimnerde_language")).toBe("en");

    fireEvent.click(screen.getByRole("button", { name: "theme" }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
    expect(localStorage.getItem("bakimnerde_theme")).toBe("dark");
  });
});

function PreferenceProbe() {
  const { language, setLanguage, setTheme, t, theme } = usePreferences();
  return <>
    <span>{t("Genel bakış")}</span>
    <button type="button" aria-label="language" onClick={() => setLanguage(language === "tr" ? "en" : "tr")} />
    <button type="button" aria-label="theme" onClick={() => setTheme(theme === "light" ? "dark" : "light")} />
  </>;
}
