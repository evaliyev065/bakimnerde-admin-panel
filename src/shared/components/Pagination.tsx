import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePreferences } from "../../app/PreferencesContext";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange(page: number): void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const { t } = usePreferences();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const first = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const last = Math.min(total, safePage * pageSize);
  const pages = pageNumbers(safePage, pageCount);

  return <nav className="pagination" aria-label={`${t("Sayfa")} ${safePage}`}>
    <span>{first}-{last} / {t("Toplam")} {total} {t("kayıt")}</span>
    <div>
      <button type="button" disabled={safePage === 1} onClick={() => onPageChange(safePage - 1)} aria-label={t("Önceki")}><ChevronLeft /></button>
      {pages.map((item, index) => item === "…"
        ? <span className="pagination__ellipsis" key={`ellipsis-${index}`}>…</span>
        : <button type="button" className={item === safePage ? "is-active" : ""} aria-current={item === safePage ? "page" : undefined} onClick={() => onPageChange(item)} key={item}>{item}</button>)}
      <button type="button" disabled={safePage === pageCount} onClick={() => onPageChange(safePage + 1)} aria-label={t("Sonraki")}><ChevronRight /></button>
    </div>
  </nav>;
}

function pageNumbers(page: number, pageCount: number): Array<number | "…"> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const values = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...values].filter((value) => value >= 1 && value <= pageCount).sort((left, right) => left - right);
  const result: Array<number | "…"> = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) result.push("…");
    result.push(value);
  });
  return result;
}
