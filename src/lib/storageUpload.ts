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
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl as string, name: file.name };
}
