import { supabase as _s } from "@/integrations/supabase/client";
const supabase: any = _s;

const BUCKET = "task-submissions";

export async function uploadToBucket(taskId: string, file: File) {
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${taskId}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  // Private bucket: create a long-lived signed URL (1 year)
  const { data, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signErr) throw new Error(signErr.message);
  return { url: data.signedUrl as string, name: file.name, path };
}

export async function getSignedUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error) throw new Error(error.message);
  return data.signedUrl as string;
}
