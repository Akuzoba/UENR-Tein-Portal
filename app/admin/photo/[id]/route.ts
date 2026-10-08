import { hasPermission } from "@/lib/admin";
import { getMember } from "@/lib/db";
import { readPhoto } from "@/lib/storage";

// Passport photos are private: only admins who can see members load them.
export async function GET(_: Request, ctx: RouteContext<"/admin/photo/[id]">) {
  if (!(await hasPermission("members.view"))) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const m = await getMember(id);
  const buf = m ? await readPhoto(m.photo_path) : null;
  if (!buf) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=300" },
  });
}
