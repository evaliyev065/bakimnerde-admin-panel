import type { Status } from "../shared/components/StatusBadge";

export const jobs: {
  id: string; station: string; charger: string; cpo: string; contractor: string;
  city: string; status: Status; deadline: string; progress: number; amount: string;
}[] = [
  { id: "BN-2481", station: "İstanbul Havalimanı P3", charger: "TR-VGE-3482", cpo: "Wattarya", contractor: "WattaryaTeknik", city: "İstanbul", status: "urgent", deadline: "Bugün, 16:30", progress: 12, amount: "₺14.800" },
  { id: "BN-2479", station: "Söğütözü AVM", charger: "TR-ESJ-1044", cpo: "Wattarya", contractor: "WattaryaTeknik", city: "Ankara", status: "progress", deadline: "25 Tem, 10:00", progress: 45, amount: "₺9.250" },
  { id: "BN-2474", station: "Alsancak Otopark", charger: "TR-CHN-7740", cpo: "Wattarya", contractor: "WattaryaTeknik", city: "İzmir", status: "assigned", deadline: "26 Tem, 13:30", progress: 25, amount: "₺12.400" },
  { id: "BN-2468", station: "Nilüfer Plaza", charger: "TR-VGE-2901", cpo: "Wattarya", contractor: "WattaryaTeknik", city: "Bursa", status: "maintenanceDone", deadline: "CPO bekleniyor", progress: 67, amount: "₺17.600" },
  { id: "BN-2459", station: "Konya Teknokent", charger: "TR-ZES-6118", cpo: "Wattarya", contractor: "WattaryaTeknik", city: "Konya", status: "cpoApproval", deadline: "1 gün kaldı", progress: 80, amount: "₺8.900" },
];

export const contractors = [
  { name: "WattaryaTeknik", code: "TSR-0012", contact: "Burak Yılmaz", phone: "0532 440 18 21", region: "İstanbul · Bursa · Kocaeli", availability: "Pzt–Cmt", cost: "₺6.500", balance: "₺128.400", score: "4,9", status: "active" as const },
  { name: "WattaryaTeknik", code: "TSR-0021", contact: "Seda Özkan", phone: "0533 912 74 60", region: "Ankara · Eskişehir", availability: "Pzt–Cum", cost: "₺5.800", balance: "₺72.850", score: "4,7", status: "active" as const },
  { name: "WattaryaTeknik", code: "TSR-0034", contact: "Emre Aksoy", phone: "0542 771 09 42", region: "İzmir · Manisa · Aydın", availability: "Sal–Paz", cost: "₺6.100", balance: "₺54.200", score: "4,8", status: "active" as const },
  { name: "WattaryaTeknik", code: "TSR-0041", contact: "Ayşe Taş", phone: "0507 334 22 15", region: "Konya · Kayseri", availability: "Pzt–Cum", cost: "₺5.400", balance: "₺31.900", score: "4,5", status: "pending" as const },
];

export const cpoCompanies = [
  { name: "Wattarya", code: "CPO-0008", contact: "Melis Demir", phone: "0212 440 88 20", agreement: "Aylık paket + iş başı", stations: 184, balance: "₺420.000", activeJobs: 7, status: "active" as const },
  { name: "Wattarya", code: "CPO-0011", contact: "Cem Koç", phone: "0216 885 30 44", agreement: "İş başı", stations: 126, balance: "₺275.500", activeJobs: 4, status: "active" as const },
  { name: "Wattarya", code: "CPO-0015", contact: "Elif Ekin", phone: "0232 441 60 10", agreement: "Yıllık bakım kotası", stations: 72, balance: "₺168.200", activeJobs: 3, status: "active" as const },
  { name: "Wattarya", code: "CPO-0019", contact: "Okan Tekin", phone: "0216 501 19 90", agreement: "Sözleşme görüşmesi", stations: 0, balance: "₺0", activeJobs: 0, status: "pending" as const },
];

export const priceItems = [
  { part: "12V şartel", category: "Elektrik", contractor: "₺620", cpo: "₺1.150", margin: "%46", stock: "Taşeron stoğu" },
  { part: "Şarj kablosu (Type 2)", category: "Kablo", contractor: "₺8.400", cpo: "₺12.900", margin: "%35", stock: "CPO teminli" },
  { part: "Ekran modülü", category: "Elektronik", contractor: "₺11.500", cpo: "₺17.800", margin: "%35", stock: "Sipariş ile" },
  { part: "Soğutma fanı", category: "Mekanik", contractor: "₺2.300", cpo: "₺4.100", margin: "%44", stock: "Merkez stoğu" },
  { part: "Röle 40A", category: "Elektrik", contractor: "₺480", cpo: "₺950", margin: "%49", stock: "Taşeron stoğu" },
  { part: "Fan değişimi işçiliği", category: "Ek işçilik", contractor: "₺5.200", cpo: "₺8.000", margin: "%35", stock: "Parça hariç" },
];

export const flowSteps = ["Talep oluşturuldu", "Teknik Servise Atandı", "Saha Personeline atandı", "Bakım başladı", "Bakım tamamlandı", "Bakım raporu onaylandı (Bakımnerde)", "Bakım raporu onaylandı (CPO)", "Talep Kapatıldı (Bakımnerde)"];
