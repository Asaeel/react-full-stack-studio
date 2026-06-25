import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  taskId: z.string().uuid(),
  filename: z.string().min(1).max(200),
  base64: z.string().min(1),
  contentType: z.string().optional(),
});

const BUCKET = "task-submissions";

export const uploadTaskSubmission = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Ensure bucket exists (idempotent)
    try {
      await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
    } catch {
      // already exists — fine
    }

    // Decode base64 → bytes
    const bin = atob(data.base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const safe = data.filename.replace(/[^\w.\-]+/g, "_");
    const path = `${data.taskId}/${Date.now()}-${safe}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: data.contentType || "application/octet-stream",
        upsert: false,
      });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

    const { error: updErr } = await supabaseAdmin
      .from("tasks")
      .update({ submission_name: data.filename, submission_url: pub.publicUrl })
      .eq("id", data.taskId);
    if (updErr) throw new Error(`Task update failed: ${updErr.message}`);

    return { url: pub.publicUrl, name: data.filename };
  });