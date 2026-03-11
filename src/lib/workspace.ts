import prisma from "@/lib/prisma";

const DEFAULT_CATEGORIES = [
  { name: "Stipendio", type: "INCOME" as const },
  { name: "Freelance", type: "INCOME" as const },
  { name: "Affitto", type: "EXPENSE" as const },
  { name: "Spesa alimentare", type: "EXPENSE" as const },
  { name: "Trasporti", type: "EXPENSE" as const },
  { name: "Svago", type: "EXPENSE" as const },
  { name: "Salute", type: "EXPENSE" as const },
  { name: "Abbonamenti", type: "EXPENSE" as const },
  { name: "Casa", type: "EXPENSE" as const },
  { name: "Altro", type: "BOTH" as const },
];

export async function createDefaultWorkspace(userId: string) {
  try {
    // Usiamo una transazione Prisma per garantire che tutto avvenga o nulla avvenga
    // E usiamo nested writes che sono più efficienti
    const workspace = await prisma.workspace.create({
      data: {
        name: "Personale",
        members: {
          create: {
            userId: userId,
            role: "OWNER"
          }
        },
        categories: {
          createMany: {
            data: DEFAULT_CATEGORIES.map(cat => ({
              name: cat.name,
              type: cat.type
            }))
          }
        }
      },
      include: {
        members: true
      }
    });

    console.log(`[WorkspaceLib] Created default workspace ${workspace.id} for user ${userId}`);
    return workspace;
  } catch (error) {
    console.error("[WorkspaceLib] Error creating default workspace:", error);
    throw error;
  }
}
