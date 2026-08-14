import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthContext";
import { PreferencesProvider } from "./PreferencesContext";
import { App } from "./App";

describe("Admin panel auth routing", () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });
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
    render(<MemoryRouter initialEntries={["/auth/admin/login"]}><AuthProvider><App /></AuthProvider></MemoryRouter>);
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
      if (url.endsWith("/charge-points-list")) return apiResponse([{ id: "cp1", externalId: "CP-1", cpoTenantId: "cpo1", station: { name: "Merkez", city: "Bursa", district: "Nilüfer" } }]);
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
        maintenanceTarget: "DEVICE", charger: "CP-101", status: "IN_PROGRESS",
        givenDurationAt: "2026-08-01T08:00:00.000Z", workflowCycle: 1, cpo: "Wattarya", contractor: "Saha Teknik",
        amount: 1000, contractorCost: 700, cpoTenantId: "cpo-1", contractorTenantId: "contractor-1",
      }]);
      return apiResponse([]);
    }));
    render(<MemoryRouter initialEntries={["/dashboard"]}><AuthProvider><App /></AuthProvider></MemoryRouter>);
    const search = await screen.findByRole("searchbox", { name: "Platformda ara" });
    fireEvent.change(search, { target: { value: "Wattarya" } });
    fireEvent.submit(search.closest("form")!);
    expect(await screen.findByRole("heading", { name: "İş yönetimi" })).toBeInTheDocument();
    expect(await screen.findByText("BN-2501")).toBeInTheDocument();
    expect(screen.queryByText(/Ctrl\+K|⌘ K/)).not.toBeInTheDocument();
  });

  it("iş detayındaki atama sınırını ve kayıtlı Assets seçimlerini uygular, vazgeçince detayı korur", async () => {
    sessionStorage.setItem("bakimnerde_token", "platform-token");
    const job = {
      documentId: "job-detail-1", id: "BN-2601", station: "Merkez İstasyonu", city: "İstanbul", district: "Kadıköy",
      maintenanceTarget: "DEVICE", charger: "CP-101", status: "WAITING",
      givenDurationAt: "2030-08-10T12:00:00.000Z", contractorGivenDurationAt: "2030-08-09T00:00:00.000Z",
      appointmentAt: "2030-08-08T10:00:00.000Z", workflowCycle: 1, cpo: "Wattarya", contractor: "Atanmadı",
      amount: 1000, contractorCost: 700, cpoTenantId: "cpo-1",
    };
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/auth-me")) return apiResponse({ userId: "1", tenantId: "2", tenantKey: "bakimnerde", tenantName: "Bakımnerde", tenantType: "PLATFORM", name: "Elvin Yönetici", email: "admin@test.test", role: "PLATFORM_OWNER" });
      if (url.endsWith("/jobs-summary")) return apiResponse({ total: 1, active: 1, byStatus: { WAITING: 1 } });
      if (url.endsWith("/notifications-list")) return apiResponse({ items: [], unreadCount: 0 });
      if (url.endsWith("/jobs-list")) return apiResponse([job]);
      if (url.endsWith("/jobs-detail")) return apiResponse(job);
      if (url.endsWith("/tenants-list")) return apiResponse([
        { id: "cpo-1", name: "Wattarya", type: "CPO", status: "ACTIVE" },
        { id: "contractor-active", name: "Aktif Teknik", type: "CONTRACTOR", status: "ACTIVE", profile: { serviceRegions: ["İstanbul"] } },
        { id: "contractor-legacy", name: "Eski Fixture Teknik", type: "CONTRACTOR", profile: { serviceRegions: ["İstanbul"] } },
        { id: "contractor-suspended", name: "Askıda Teknik", type: "CONTRACTOR", status: "SUSPENDED", profile: { serviceRegions: ["İstanbul"] } },
      ]);
      if (url.endsWith("/charge-points-list")) return apiResponse([{ id: "cp-1", externalId: "CP-101", cpoTenantId: "cpo-1", station: { name: "Merkez İstasyonu", city: "İstanbul", district: "Kadıköy" } }]);
      if (url.endsWith("/stations-list")) return apiResponse([{ id: "station-1", cpoTenantId: "cpo-1", name: "Merkez İstasyonu", city: "İstanbul", district: "Kadıköy" }]);
      if (url.endsWith("/job-field-report-get")) return apiResponse(null);
      return apiResponse([]);
    }));

    render(<MemoryRouter initialEntries={["/job-details/job-detail-1"]}><AuthProvider><App /></AuthProvider></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "BN-2601" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ata" }));
    expect(screen.getByLabelText("Randevu Tarihi")).toHaveAttribute("max", inputDate(job.contractorGivenDurationAt));
    expect(screen.getByRole("option", { name: "Aktif Teknik" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Eski Fixture Teknik" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Askıda Teknik" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Vazgeç" }));
    expect(screen.getByRole("heading", { name: "BN-2601" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Düzenle" }));
    expect(screen.getByLabelText("Cihaz kodu")).toHaveValue("CP-101");
    expect(screen.queryByText(/Yeni (cihaz|istasyon)/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Bakım hedefi")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Vazgeç" }));
    expect(screen.getByRole("heading", { name: "BN-2601" })).toBeInTheDocument();
  });

  it("CPO atama öncesinde Verilen Süreyi güncelleyebilir", async () => {
    sessionStorage.setItem("bakimnerde_token", "cpo-token");
    const job = {
      documentId: "job-cpo-1", id: "BN-2602", station: "Sahil İstasyonu", city: "İzmir", district: "Konak",
      maintenanceTarget: "DEVICE", charger: "CP-202", status: "WAITING",
      givenDurationAt: "2030-09-10T12:00:00.000Z", appointmentAt: "2030-09-08T10:00:00.000Z",
      workflowCycle: 1, cpo: "Ege CPO", contractor: "Atanmadı", amount: null, contractorCost: null, cpoTenantId: "cpo-2",
    };
    const fetchMock = vi.fn(async (input: string | URL | Request, options?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth-me")) return apiResponse({ userId: "cpo-user", tenantId: "cpo-2", tenantKey: "ege", tenantName: "Ege CPO", tenantType: "CPO", name: "CPO Yönetici", email: "cpo@test.test", role: "CPO_ADMIN" });
      if (url.endsWith("/jobs-summary")) return apiResponse({ total: 1, active: 1, byStatus: { WAITING: 1 } });
      if (url.endsWith("/notifications-list")) return apiResponse({ items: [], unreadCount: 0 });
      if (url.endsWith("/jobs-list")) return apiResponse([job]);
      if (url.endsWith("/jobs-detail")) return apiResponse(job);
      if (url.endsWith("/jobs-given-duration-update")) {
        job.givenDurationAt = String((JSON.parse(String(options?.body)) as { givenDurationAt: string }).givenDurationAt);
        return apiResponse({ id: job.documentId, givenDurationAt: job.givenDurationAt });
      }
      if (url.endsWith("/charge-points-list")) return apiResponse([{ id: "cp-2", externalId: "CP-202", cpoTenantId: "cpo-2", station: { name: "Sahil İstasyonu", city: "İzmir", district: "Konak" } }]);
      if (url.endsWith("/stations-list")) return apiResponse([{ id: "station-2", cpoTenantId: "cpo-2", name: "Sahil İstasyonu", city: "İzmir", district: "Konak" }]);
      if (url.endsWith("/job-field-report-get")) return apiResponse(null);
      return apiResponse([]);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<MemoryRouter initialEntries={["/job-details/job-cpo-1"]}><AuthProvider><App /></AuthProvider></MemoryRouter>);
    const duration = await screen.findByLabelText("Verilen Süreyi güncelle");
    const nextDuration = inputDate("2030-09-12T12:00:00.000Z");
    fireEvent.change(duration, { target: { value: nextDuration } });
    fireEvent.click(screen.getByRole("button", { name: "Süreyi güncelle" }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith("/jobs-given-duration-update"))).toBe(true));
    const updateCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith("/jobs-given-duration-update"));
    expect(JSON.parse(String(updateCall?.[1]?.body))).toMatchObject({ id: "job-cpo-1", givenDurationAt: new Date(nextDuration).toISOString() });
  });

  it("CPO borç durumunu ayırır ve ödeme detayını servisten yükler", async () => {
    sessionStorage.setItem("bakimnerde_token", "cpo-token");
    let resolveDetail!: (response: Response) => void;
    const pendingDetail = new Promise<Response>((resolve) => { resolveDetail = resolve; });
    const transactionId = "transaction-12345678";
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/auth-me")) return apiResponse({ userId: "1", tenantId: "cpo-1", tenantKey: "wattarya", tenantName: "Wattarya", tenantType: "CPO", name: "CPO Yönetici", email: "cpo@test.test", role: "CPO_ADMIN" });
      if (url.endsWith("/jobs-summary")) return apiResponse({ active: 0 });
      if (url.endsWith("/notifications-list")) return apiResponse({ items: [], unreadCount: 0 });
      if (url.endsWith("/wallets-list")) return apiResponse([{ id: "wallet-1", tenantId: "cpo-1", tenantName: "Wattarya", tenantType: "CPO", currency: "TRY", balance: -250, blockedBalance: 0, creditLimit: 1000, borrowableAmount: 750, debtStatus: "IN_DEBT" }]);
      if (url.endsWith("/wallet-transactions-list")) return apiResponse([{ id: transactionId, tenantName: "Wattarya", amount: -250, direction: "DEBIT", description: "Bakım ödemesi", createdAt: "2026-08-05T08:00:00.000Z", paymentMethod: "CREDIT_CARD", type: "CPO_TO_PLATFORM_PAYMENT" }]);
      if (url.endsWith("/wallet-transaction-detail")) return pendingDetail;
      return apiResponse([]);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<MemoryRouter initialEntries={["/wallet"]}><AuthProvider><App /></AuthProvider></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Ödemeler" })).toBeInTheDocument();
    const debtStatus = await screen.findByText("Borçta");
    expect(debtStatus).not.toHaveClass("danger-text");
    expect(screen.getByText("Borçlanma limitiniz içinde; sistemi kullanmaya devam edebilirsiniz")).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "12345678 ödeme detayını görüntüle" }));
    expect(screen.getByRole("status")).toHaveTextContent("Ödeme ayrıntıları yükleniyor");
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/wallet-transaction-detail"), expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ id: transactionId }),
    }));

    await act(async () => {
      resolveDetail(apiResponse({ id: transactionId, tenantName: "Wattarya", amount: -250, direction: "DEBIT", description: "Bakım ödemesi", createdAt: "2026-08-05T08:00:00.000Z", paymentMethod: "CREDIT_CARD", type: "CPO_TO_PLATFORM_PAYMENT", currency: "TRY", paymentReference: "PAY-REF-42", cardSummary: "**** 4242", jobId: "job-1", jobNumber: "BN-2501" }));
      await pendingDetail;
    });
    expect(await screen.findByText("PAY-REF-42")).toBeInTheDocument();
    expect(screen.getByText("**** 4242")).toBeInTheDocument();
    expect(screen.getByText("BN-2501")).toBeInTheDocument();
    expect(screen.getByText("TRY")).toBeInTheDocument();
  });

  it("limit aşımını borçlu gösterir ve ödeme detay hatasını erişilebilir sunar", async () => {
    sessionStorage.setItem("bakimnerde_token", "cpo-token");
    const transactionId = "transaction-87654321";
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/auth-me")) return apiResponse({ userId: "1", tenantId: "cpo-1", tenantKey: "wattarya", tenantName: "Wattarya", tenantType: "CPO", name: "CPO Yönetici", email: "cpo@test.test", role: "CPO_ADMIN" });
      if (url.endsWith("/jobs-summary")) return apiResponse({ active: 0 });
      if (url.endsWith("/notifications-list")) return apiResponse({ items: [], unreadCount: 0 });
      if (url.endsWith("/wallets-list")) return apiResponse([{ id: "wallet-1", tenantId: "cpo-1", tenantName: "Wattarya", tenantType: "CPO", currency: "TRY", balance: -1100, blockedBalance: 0, creditLimit: 1000, borrowableAmount: 0, debtStatus: "DEBT_LIMIT_EXCEEDED" }]);
      if (url.endsWith("/wallet-transactions-list")) return apiResponse([{ id: transactionId, tenantName: "Wattarya", amount: -250, direction: "DEBIT", description: "Bakım ödemesi", createdAt: "2026-08-05T08:00:00.000Z", paymentMethod: "WALLET", type: "CPO_TO_PLATFORM_PAYMENT" }]);
      if (url.endsWith("/wallet-transaction-detail")) return apiErrorResponse("Ödeme ayrıntısı alınamadı.");
      return apiResponse([]);
    }));

    render(<MemoryRouter initialEntries={["/wallet"]}><AuthProvider><App /></AuthProvider></MemoryRouter>);
    const debtStatus = await screen.findByText("Borçlu");
    expect(debtStatus).toHaveClass("danger-text");
    expect(screen.getByText("Borç limiti aşıldığı için sistem kullanımı durduruldu")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "87654321 ödeme detayını görüntüle" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ödeme ayrıntısı alınamadı.");
  });

  it("İşler ekranındaki statik metinleri dil tercihiyle İngilizceye geçirir", async () => {
    sessionStorage.setItem("bakimnerde_token", "platform-token");
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/auth-me")) return apiResponse({ userId: "1", tenantId: "2", tenantKey: "bakimnerde", tenantName: "Bakımnerde", tenantType: "PLATFORM", name: "Admin User", email: "admin@test.test", role: "PLATFORM_OWNER" });
      if (url.endsWith("/jobs-summary")) return apiResponse({ total: 0, active: 0, byStatus: {} });
      if (url.endsWith("/notifications-list")) return apiResponse({ items: [], unreadCount: 0 });
      return apiResponse([]);
    }));

    render(<MemoryRouter initialEntries={["/jobs"]}><PreferencesProvider><AuthProvider><App /></AuthProvider></PreferencesProvider></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "İş yönetimi" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dili İngilizce yap" }));

    expect(await screen.findByRole("heading", { name: "Job management" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All jobs" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search jobs" })).toHaveAttribute("placeholder", "Search jobs, companies, devices, or stations");
    expect(screen.getByText("No jobs in this view")).toBeInTheDocument();
  });
});

function apiResponse(data: unknown): Response { return { ok: true, json: async () => ({ data }) } as Response; }
function apiErrorResponse(message: string): Response { return { ok: false, status: 500, json: async () => ({ error: { message } }) } as Response; }

function inputDate(value: string): string {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
