import type { LucideIcon } from "lucide-react";
import { usePreferences } from "../../app/PreferencesContext";

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
  const { t } = usePreferences();
  return (
    <section className="page-heading">
      <div><p className="eyebrow">{t(eyebrow)}</p><h1>{t(title)}</h1><p>{t(description)}</p></div>
      {action && <button className="button button--primary">{Icon && <Icon size={18} />}{t(action)}</button>}
    </section>
  );
}
