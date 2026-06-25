// Encode description inside project_name (DB column) using a control delimiter.
// Workaround: no `description` column exists on tasks yet.
const SEP = "\u0001";

export function encodeProjectName(project: string, description: string): string | null {
  const p = (project || "").trim();
  const d = (description || "").trim();
  if (!p && !d) return null;
  return d ? `${p}${SEP}${d}` : p;
}

export function decodeProjectName(raw: string | null | undefined): { project: string; description: string } {
  if (!raw) return { project: "", description: "" };
  const i = raw.indexOf(SEP);
  if (i === -1) return { project: raw, description: "" };
  return { project: raw.slice(0, i), description: raw.slice(i + 1) };
}
