const labels = {
  waiting: "Beklemede",
  assigned: "Atandı",
  progress: "İşlemde",
  maintenanceDone: "Bakım tamamlandı",
  maintenanceApproved: "Bakım onaylandı",
  cpoApproval: "CPO onayı",
  paid: "Ödeme yapıldı",
  closed: "Süreç sonlandı",
  urgent: "Kritik",
  active: "Aktif",
  pending: "Onay bekliyor",
} as const;

export type Status = keyof typeof labels;

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`status status--${status}`}><i />{labels[status]}</span>;
}
