import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { AuthProvider } from "../auth/AuthContext";
import { App } from "./App";

describe("Admin panel auth routing", () => {
  beforeEach(() => localStorage.clear());

  it("oturumsuz kullanıcıyı giriş ekranına yönlendirir", async () => {
    render(<MemoryRouter><AuthProvider><App /></AuthProvider></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Hesabınıza giriş yapın" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Giriş yap/ })).toBeInTheDocument();
  });

  it("Bakımnerde ve üretici test rollerini sunar", () => {
    render(<MemoryRouter initialEntries={["/giris"]}><AuthProvider><App /></AuthProvider></MemoryRouter>);
    expect(screen.getAllByRole("button", { name: "Bakımnerde personeli" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Üretici firma" }).length).toBeGreaterThan(0);
  });
});
