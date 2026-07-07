import { supabase } from "@/integrations/supabase/client";
import { setPrintBrand } from "@/lib/print";

export type CompanySettings = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  stamp_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  tax_id: string | null;
  registration_number: string | null;
  currency: string;
  tax_rate: number;
  invoice_prefix: string;
  invoice_number_format: string;
  invoice_next_number: number;
  invoice_header: string | null;
  invoice_footer: string | null;
  bank_details: string | null;
};

/** Fetch the current signed-in user's company (tenant) with all settings. */
export async function fetchCompany(): Promise<CompanySettings | null> {
  const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
  if (!profile?.tenant_id) return null;
  const { data } = await supabase.from("tenants").select("*").eq("id", profile.tenant_id).maybeSingle();
  return (data as unknown as CompanySettings) ?? null;
}

/** Resolve a `tenant-assets` storage path (or full URL) to a browser URL. */
export async function resolveAssetUrl(pathOrUrl: string | null | undefined): Promise<string | null> {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  const { data } = await supabase.storage.from("tenant-assets").createSignedUrl(pathOrUrl, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

/** Allocate the next formatted invoice number atomically via RPC. */
export async function allocateInvoiceNumber(tenantId: string): Promise<string> {
  const { data, error } = await supabase.rpc("next_invoice_number" as never, { _tenant_id: tenantId } as never);
  if (error) throw error;
  return String(data);
}

/** Format an amount with the company currency code (fallback MAD). */
export function formatMoney(value: number | string | null | undefined, currency = "MAD"): string {
  const n = Number(value ?? 0);
  return `${n.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

/** Fetch company settings and install them as the global print brand. */
export async function applyPrintBrand(): Promise<CompanySettings | null> {
  const c = await fetchCompany();
  if (!c) { setPrintBrand(null); return null; }
  const [logoUrl, stampUrl] = await Promise.all([resolveAssetUrl(c.logo_url), resolveAssetUrl(c.stamp_url)]);
  setPrintBrand({
    companyName: c.name,
    logoUrl, stampUrl,
    headerNote: c.invoice_header,
    footerNote: c.invoice_footer,
    bankDetails: c.bank_details,
    address: c.address,
    city: c.city,
    contactEmail: c.contact_email,
    contactPhone: c.contact_phone,
    taxId: c.tax_id,
    registrationNumber: c.registration_number,
  });
  return c;
}
