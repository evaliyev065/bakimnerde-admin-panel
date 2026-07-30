import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthContext";
import { App } from "./App";

describe("Admin panel auth routing", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("oturumsuz kullanıcıyı giriş ekranına yönlendirir", async () => {
    render(<MemoryRouter><AuthProvider><App /></AuthProvider></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Şirket hesabınıza giriş yapın" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Giriş yap/ })).toBeInTheDocument();
  });

  it("açık girişte yalnız CPO ve taşeron yönetimini sunar", () => {
    render(<MemoryRouter initialEntries={["/login"]}><AuthProvider><App /></AuthProvider></MemoryRouter>);
    expect(screen.getAllByRole("button", { name: "CPO firma" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Taşeron yönetimi" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Bakımnerde personeli")).not.toBeInTheDocument();
  });

  it("Bakımnerde girişini yalnız özel URL üzerinde gösterir", () => {
    render(<MemoryRouter initialEntries={["/admin/login"]}><AuthProvider><App /></AuthProvider></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Yetkili personel girişi" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Ekosistemi tek merkezden yönet/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "CPO firma" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Taşeron yönetimi" })).not.toBeInTheDocument();
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

  it("Cihazlar ve İstasyonlar ekranını açar ve üst profil alanından hesap yönetimine gider", async () => {
    sessionStorage.setItem("bakimnerde_token", "platform-token");
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/auth-me")) return apiResponse({ userId: "1", tenantId: "2", tenantKey: "bakimnerde", tenantName: "Bakımnerde", tenantType: "PLATFORM", name: "Elvin Yönetici", email: "admin@test.test", role: "PLATFORM_ADMIN" });
      if (url.endsWith("/jobs-summary")) return apiResponse({ active: 0 });
      if (url.endsWith("/notifications-list")) return apiResponse({ items: [], unreadCount: 0 });
      if (url.endsWith("/charge-points-list")) return apiResponse([{ id: "cp1", externalId: "CP-1", model: "M-1", cpoTenantId: "cpo1", station: { name: "Merkez", city: "Bursa", district: "Nilüfer" } }]);
      if (url.endsWith("/stations-list")) return apiResponse([{ id: "cpo1:Merkez:Bursa:Nilüfer", cpoTenantId: "cpo1", name: "Merkez", city: "Bursa", district: "Nilüfer", deviceCount: 1 }]);
      return apiResponse([]);
    }));
    render(<MemoryRouter initialEntries={["/assets"]}><AuthProvider><App /></AuthProvider></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Cihazlar ve İstasyonlar" })).toBeInTheDocument();
    expect(await screen.findByText("CP-1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hesap yönetimine git" }));
    expect(await screen.findByRole("heading", { name: "Hesap bilgileri" })).toBeInTheDocument();
  });

  it("üst aramayı Ctrl+K olmadan işler ekranındaki canlı filtreye taşır", async () => {
    sessionStorage.setItem("bakimnerde_token", "platform-token");
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/auth-me")) return apiResponse({ userId: "1", tenantId: "2", tenantKey: "bakimnerde", tenantName: "Bakımnerde", tenantType: "PLATFORM", name: "Elvin Yönetici", email: "admin@test.test", role: "PLATFORM_ADMIN" });
      if (url.endsWith("/jobs-summary")) return apiResponse({ total: 1, active: 1, byStatus: { IN_PROGRESS: 1 } });
      if (url.endsWith("/notifications-list")) return apiResponse({ items: [], unreadCount: 0 });
      if (url.endsWith("/jobs-list")) return apiResponse([{
        documentId: "job-1", id: "BN-2501", station: "Merkez İstasyonu", city: "İstanbul", district: "Kadıköy",
        maintenanceTarget: "DEVICE", charger: "CP-101", chargerModel: "Model X", status: "IN_PROGRESS",
        deadlineAt: "2026-08-01T08:00:00.000Z", workflowCycle: 1, cpo: "VoltGo", contractor: "Saha Teknik",
        amount: 1000, contractorCost: 700, cpoTenantId: "cpo-1", contractorTenantId: "contractor-1",
      }]);
      return apiResponse([]);
    }));
    render(<MemoryRouter initialEntries={["/dashboard"]}><AuthProvider><App /></AuthProvider></MemoryRouter>);
    const search = await screen.findByRole("searchbox", { name: "Platformda ara" });
    fireEvent.change(search, { target: { value: "VoltGo" } });
    fireEvent.submit(search.closest("form")!);
    expect(await screen.findByRole("heading", { name: "İş yönetimi" })).toBeInTheDocument();
    expect(await screen.findByText("BN-2501")).toBeInTheDocument();
    expect(screen.queryByText(/Ctrl\+K|⌘ K/)).not.toBeInTheDocument();
  });
});

function apiResponse(data: unknown): Response { return { ok: true, json: async () => ({ data }) } as Response; }
