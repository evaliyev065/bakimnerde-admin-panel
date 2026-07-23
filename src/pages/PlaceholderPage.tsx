import { ArrowRight, Construction } from "lucide-react";
export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return <section className="placeholder"><span><Construction /></span><p className="eyebrow">MODÜL İSKELETİ HAZIR</p><h1>{title}</h1><p>{description}</p><button className="button button--secondary">Ürün yol haritasını görüntüle <ArrowRight size={17} /></button></section>;
}
