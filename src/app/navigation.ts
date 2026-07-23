import { Building2, FileBarChart, Gauge, Settings2, Tags, Wrench } from "lucide-react";

export const navigation = [
  { label: "Genel bakış", to: "/", icon: Gauge },
  { label: "İş emirleri", to: "/is-emirleri", icon: Wrench, badge: "18" },
  { label: "Kuruluşlar", to: "/kuruluslar", icon: Building2 },
  { label: "Raporlar", to: "/raporlar", icon: FileBarChart },
  { label: "Tarifeler", to: "/tarifeler", icon: Tags },
  { label: "Ayarlar", to: "/ayarlar", icon: Settings2 }
] as const;
