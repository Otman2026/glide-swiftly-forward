export type PrintBrand = {
  companyName?: string | null;
  logoUrl?: string | null;
  stampUrl?: string | null;
  headerNote?: string | null;
  footerNote?: string | null;
  bankDetails?: string | null;
  address?: string | null;
  city?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  taxId?: string | null;
  registrationNumber?: string | null;
};

let _brand: PrintBrand | null = null;
/** Set the active branding used by all subsequent printHTML() calls. */
export function setPrintBrand(b: PrintBrand | null) { _brand = b; }

export function printHTML(title: string, bodyHTML: string, brand?: PrintBrand) {
  const b = brand ?? _brand ?? {};
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  const company = escapeHtml(b.companyName || "SAIFO TRANSPORT ERP");
  const logo = b.logoUrl
    ? `<img src="${escapeHtml(b.logoUrl)}" alt="logo" style="max-height:64px;max-width:180px;object-fit:contain" />`
    : `<div class="logo">${company}</div>`;
  const idBits = [
    b.taxId ? `ICE: ${escapeHtml(b.taxId)}` : "",
    b.registrationNumber ? `RC: ${escapeHtml(b.registrationNumber)}` : "",
    b.contactPhone ? `Tel: ${escapeHtml(b.contactPhone)}` : "",
    b.contactEmail ? escapeHtml(b.contactEmail) : "",
  ].filter(Boolean).join(" · ");
  const addr = [b.address, b.city].filter(Boolean).join(", ");
  const header = b.headerNote ? `<div class="hnote">${escapeHtml(b.headerNote)}</div>` : "";
  const stamp = b.stampUrl
    ? `<img src="${escapeHtml(b.stampUrl)}" alt="stamp" class="stamp" />` : "";
  const bank = b.bankDetails ? `<div class="bank"><b>البنك:</b> ${escapeHtml(b.bankDetails)}</div>` : "";
  const footer = b.footerNote ? escapeHtml(b.footerNote) : "وثيقة تم إصدارها بواسطة نظام SAIFO TRANSPORT ERP";

  win.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      body{font-family:system-ui,-apple-system,Segoe UI,Tahoma,sans-serif;padding:32px;color:#111;background:#fff;position:relative}
      h1{font-size:22px;margin:0 0 8px;color:#0f172a}
      h2{font-size:15px;color:#475569;font-weight:600;margin:0 0 24px}
      table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
      th,td{border:1px solid #e2e8f0;padding:8px 10px;text-align:right}
      th{background:#f1f5f9;font-weight:700}
      .kv{display:grid;grid-template-columns:180px 1fr;gap:6px 16px;font-size:14px;margin:16px 0}
      .kv dt{color:#64748b;font-weight:600}
      .kv dd{margin:0;color:#0f172a}
      .brand{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:20px;gap:16px}
      .brand .logo{font-weight:900;font-size:18px;color:#0f172a}
      .brand .co{font-size:12px;color:#475569;line-height:1.5;text-align:left}
      .brand .co .n{font-weight:800;color:#0f172a;font-size:14px}
      .hnote{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#334155}
      .bank{margin-top:20px;padding:10px 14px;border:1px dashed #94a3b8;border-radius:8px;font-size:12px;color:#334155}
      .stamp{position:absolute;bottom:120px;left:48px;max-width:150px;max-height:150px;opacity:.85;transform:rotate(-8deg)}
      .footer{margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;color:#64748b;font-size:11px;text-align:center;white-space:pre-line}
      @media print { body{padding:12px} }
    </style></head><body>
    <div class="brand">
      <div>${logo}</div>
      <div class="co">
        <div class="n">${company}</div>
        ${addr ? `<div>${escapeHtml(addr)}</div>` : ""}
        ${idBits ? `<div>${idBits}</div>` : ""}
        <div style="margin-top:4px;color:#94a3b8">${new Date().toLocaleString("ar-MA")}</div>
      </div>
    </div>
    ${header}
    ${bodyHTML}
    ${bank}
    ${stamp}
    <div class="footer">${footer}</div>
    <script>window.onload=()=>{setTimeout(()=>window.print(),300)}</script>
    </body></html>`);
  win.document.close();
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function esc(s: unknown): string {
  if (s === null || s === undefined) return "—";
  return escapeHtml(String(s));
}
