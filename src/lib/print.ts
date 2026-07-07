export function printHTML(title: string, bodyHTML: string) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      body{font-family:system-ui,-apple-system,Segoe UI,Tahoma,sans-serif;padding:32px;color:#111;background:#fff}
      h1{font-size:22px;margin:0 0 8px;color:#0f172a}
      h2{font-size:15px;color:#475569;font-weight:600;margin:0 0 24px}
      table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
      th,td{border:1px solid #e2e8f0;padding:8px 10px;text-align:right}
      th{background:#f1f5f9;font-weight:700}
      .kv{display:grid;grid-template-columns:180px 1fr;gap:6px 16px;font-size:14px;margin:16px 0}
      .kv dt{color:#64748b;font-weight:600}
      .kv dd{margin:0;color:#0f172a}
      .brand{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:20px}
      .brand .logo{font-weight:900;font-size:18px;color:#0f172a}
      .footer{margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;color:#64748b;font-size:11px;text-align:center}
      @media print { body{padding:12px} }
    </style></head><body>
    <div class="brand"><div class="logo">SAIFO TRANSPORT ERP</div><div style="font-size:11px;color:#64748b">${new Date().toLocaleString("ar-MA")}</div></div>
    ${bodyHTML}
    <div class="footer">وثيقة تم إصدارها بواسطة نظام SAIFO TRANSPORT ERP</div>
    <script>window.onload=()=>{setTimeout(()=>window.print(),200)}</script>
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
