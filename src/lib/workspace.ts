import prisma from "@/lib/prisma";

const DEFAULT_CATEGORIES = [
  { name: "Stipendio", type: "INCOME" as const, icon: "💰" },
  { name: "Freelance", type: "INCOME" as const, icon: "💻" },
  { name: "Affitto", type: "EXPENSE" as const, icon: "🏠" },
  { name: "Spesa alimentare", type: "EXPENSE" as const, icon: "🛒" },
  { name: "Trasporti", type: "EXPENSE" as const, icon: "🚗" },
  { name: "Svago", type: "EXPENSE" as const, icon: "🎬" },
  { name: "Salute", type: "EXPENSE" as const, icon: "🏥" },
  { name: "Abbonamenti", type: "EXPENSE" as const, icon: "📱" },
  { name: "Casa", type: "EXPENSE" as const, icon: "🛋️" },
  { name: "Altro", type: "BOTH" as const, icon: "📦" },
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
              type: cat.type,
              icon: cat.icon
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
