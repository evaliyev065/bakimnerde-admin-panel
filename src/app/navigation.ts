import {
  BadgeDollarSign,
  Building2,
  BatteryCharging,
  Gauge,
  Handshake,
  ScrollText,
  WalletCards,
  Wrench,
  Users,
} from "lucide-react";

export const navigation = [
  { label: "Genel bakış", to: "/dashboard", icon: Gauge },
  { label: "İşler", to: "/jobs", icon: Wrench, badge: true },
  { label: "Cihazlar ve İstasyonlar", to: "/assets", icon: BatteryCharging },
  { label: "Kullanıcı yönetimi", to: "/users", icon: Users },
  { label: "Taşeron firmalar", to: "/contractors", icon: Handshake },
  { label: "CPO firmalar", to: "/cpo-companies", icon: Building2 },
  { label: "Fiyat yönetimi", to: "/pricing", icon: BadgeDollarSign },
  { label: "Cüzdan", to: "/wallet", icon: WalletCards },
  { label: "Denetim kayıtları", to: "/audit-logs", icon: ScrollText },
] as const;
