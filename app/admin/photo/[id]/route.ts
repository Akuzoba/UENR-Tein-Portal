import { isAdmin } from "@/lib/admin";
import { getMember } from "@/lib/db";
import { readPhoto } from "@/lib/storage";

// Passport photos are private: only signed-in admins can load them directly.
export async function GET(_: Request, ctx: RouteContext<"/admin/photo/[id]">) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const m = await getMember(id);
  const buf = m ? await readPhoto(m.photo_path) : null;
  if (!buf) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=300" },
  });
}
