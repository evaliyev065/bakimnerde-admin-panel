import {
  BadgeDollarSign,
  Building2,
  Gauge,
  Handshake,
  Settings2,
  ScrollText,
  WalletCards,
  Wrench,
} from "lucide-react";

export const navigation = [
  { label: "Genel bakış", to: "/", icon: Gauge },
  { label: "İşler", to: "/isler", icon: Wrench, badge: "18" },
  { label: "Taşeron firmalar", to: "/taseronlar", icon: Handshake },
  { label: "CPO firmalar", to: "/cpo-firmalar", icon: Building2 },
  { label: "Fiyat yönetimi", to: "/fiyatlar", icon: BadgeDollarSign },
  { label: "Bakiye & hak ediş", to: "/bakiyeler", icon: WalletCards },
  { label: "Denetim kayıtları", to: "/denetim-kayitlari", icon: ScrollText },
  { label: "Yetki & tenant", to: "/ayarlar", icon: Settings2 },
] as const;
