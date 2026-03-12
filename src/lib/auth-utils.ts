import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

/**
 * Gets the current workspace for the authenticated user.
 * Throws an error if not authorized or workspace not found.
 */
export async function getWorkspaceForUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Non autorizzato");
  }

  const userId = (session.user as any).id;
  if (!userId) {
    throw new Error("ID utente non trovato nella sessione");
  }

  const workspace = await prisma.workspace.findFirst({
    where: { members: { some: { userId } } },
    orderBy: { createdAt: 'asc' }, // Always take the first one if multiple exist
  });

  if (!workspace) {
    throw new Error("Workspace non trovato");
  }

  return { workspace, userId };
}

/**
 * Ensures the current user has access to a specific workspace.
 */
export async function requireWorkspaceAccess(workspaceId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Non autorizzato");

  const userId = (session.user as any).id;
  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId }
  });

  if (!membership) throw new Error("Accesso negato allo spazio di lavoro");
  return userId;
}
