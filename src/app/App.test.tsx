import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AuthProvider } from "../auth/AuthContext";
import { App } from "./App";

describe("Admin panel auth routing", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(cleanup);

  it("oturumsuz kullanıcıyı giriş ekranına yönlendirir", async () => {
    render(<MemoryRouter><AuthProvider><App /></AuthProvider></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Şirket hesabınıza giriş yapın" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Giriş yap/ })).toBeInTheDocument();
  });

  it("açık girişte yalnız CPO ve taşeron yönetimini sunar", () => {
    render(<MemoryRouter initialEntries={["/giris"]}><AuthProvider><App /></AuthProvider></MemoryRouter>);
    expect(screen.getAllByRole("button", { name: "CPO firma" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Taşeron yönetimi" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Bakımnerde personeli")).not.toBeInTheDocument();
  });

  it("Bakımnerde girişini yalnız özel URL üzerinde gösterir", () => {
    render(<MemoryRouter initialEntries={["/auth/admin/login"]}><AuthProvider><App /></AuthProvider></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Yetkili personel girişi" })).toBeInTheDocument();
  });

  it("eski yönetici giriş adresini yayınlamaz", async () => {
    render(<MemoryRouter initialEntries={["/bakimnerde-merkez-giris"]}><AuthProvider><App /></AuthProvider></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Şirket hesabınıza giriş yapın" })).toBeInTheDocument();
  });

  it("taşeron kayıt ekranını herkese açık sunar", () => {
    render(<MemoryRouter initialEntries={["/contractor-registration"]}><AuthProvider><App /></AuthProvider></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Bakımnerde taşeron başvurusu" })).toBeInTheDocument();
    expect(screen.getByText(/Bakımnerde Taşeronlarla Hizmet Sözleşmesi’ni/)).toBeInTheDocument();
  });
});
