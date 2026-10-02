import { getCurrentUser } from "@/lib/auth/dal";
import { getAvatar } from "@/lib/data/users";

// Profile photo for a team member (uploaded in the app, stored in the database).
export async function GET(_request: Request, context: RouteContext<"/api/avatar/[id]">) {
  if (!(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });
  const { id } = await context.params;
  const userId = Number(id);
  const avatar = Number.isSafeInteger(userId) && userId > 0 ? await getAvatar(userId) : null;
  if (!avatar) {
    // The version query param busts the cache on change, so missing photos can cache briefly.
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "private, max-age=300" } });
  }
  return new Response(Buffer.from(avatar.data), {
    headers: {
      "Content-Type": avatar.mime,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
