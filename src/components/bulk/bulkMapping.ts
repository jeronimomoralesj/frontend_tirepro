// Shared client for the AI-assisted bulk-upload flow.
// Used by agregar, agregarDist and the chat BulkUploadWidget so the
// analyze → review → commit logic lives in exactly one place.

const API_BASE = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL)
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
  : "https://api.tirepro.com.co/api";

export interface CanonicalField {
  field: string;
  label: string;
  description: string;
  required?: boolean;
}

export type IssueSeverity = "error" | "warning";

export interface MappingIssue {
  severity: IssueSeverity;
  scope: "column" | "row" | "file";
  ref?: string;
  message: string;
}

export interface AnalyzeResult {
  mapping: Record<string, string | null>;
  confidence: number;
  issues: MappingIssue[];
  missingRequired: string[];
  fields: CanonicalField[];
  aiUsed: boolean;
  headers: string[];
  sampleRows: Record<string, string>[];
  totalRows: number;
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Send the file to the backend for AI analysis. Writes nothing — returns the proposed mapping + issues. */
export async function analyzeBulkFile(file: File): Promise<AnalyzeResult> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/tires/bulk-upload/analyze`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Error ${res.status} al analizar el archivo`);
  }
  return res.json();
}

/** Commit the upload with a confirmed column mapping. */
export async function uploadBulkFile(
  file: File,
  companyId: string,
  opts: { userId?: string; columnMapping?: Record<string, string | null> } = {},
): Promise<Response> {
  const form = new FormData();
  form.append("file", file);
  if (opts.columnMapping) {
    form.append("columnMapping", JSON.stringify(opts.columnMapping));
  }

  const qs = new URLSearchParams({ companyId });
  if (opts.userId) qs.set("userId", opts.userId);

  return fetch(`${API_BASE}/tires/bulk-upload?${qs.toString()}`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: form,
  });
}
