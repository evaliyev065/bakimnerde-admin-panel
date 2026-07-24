import type { LucideIcon } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  icon: Icon,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: string;
  icon?: LucideIcon;
}) {
  return (
    <section className="page-heading">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>
      {action && <button className="button button--primary">{Icon && <Icon size={18} />}{action}</button>}
    </section>
  );
}
