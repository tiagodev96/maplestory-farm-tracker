import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./auth";

export type CurrentUser = { id: string; name: string };

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Reading the headers first marks the route as dynamic, so `next build` stops
  // here instead of going on to open the database while prerendering.
  const requestHeaders = await headers();
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return null;
  return { id: session.user.id, name: session.user.name };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
