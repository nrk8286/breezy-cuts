import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { findUserById } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { Role } from "@/lib/types";

export const currentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  return await findUserById(session.userId);
});

export async function requireUser(roles?: Role[]) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/dashboard");
  return user;
}
