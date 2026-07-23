const labels = { urgent: "Kritik", progress: "İşlemde", waiting: "Bekliyor", completed: "Tamamlandı" } as const;
export function StatusBadge({ status }: { status: keyof typeof labels }) {
  return <span className={`status status--${status}`}><i />{labels[status]}</span>;
}
