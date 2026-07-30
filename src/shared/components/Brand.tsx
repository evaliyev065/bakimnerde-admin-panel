import { Zap } from "lucide-react";

export function Brand() {
  return (
    <div className="brand" aria-label="Bakımnerde Yönetim Merkezi">
      <span className="brand__mark"><Zap size={20} fill="currentColor" /></span>
      <span><strong>bakımnerde</strong><small>Yönetim Merkezi</small></span>
    </div>
  );
}
