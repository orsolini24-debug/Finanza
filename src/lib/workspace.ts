import prisma from "@/lib/prisma";

const DEFAULT_CATEGORIES = [
  { name: "Stipendio", type: "INCOME" as const, icon: "💰" },
  { name: "Freelance", type: "INCOME" as const, icon: "💻" },
  { name: "Affitto / Mutuo", type: "EXPENSE" as const, icon: "🏠" },
  { name: "Bollette", type: "EXPENSE" as const, icon: "💡" },
  { name: "Spesa alimentare", type: "EXPENSE" as const, icon: "🛒" },
  { name: "Ristoranti e Bar", type: "EXPENSE" as const, icon: "🍲" },
  { name: "Trasporti", type: "EXPENSE" as const, icon: "🚗" },
  { name: "Shopping", type: "EXPENSE" as const, icon: "🛍️" },
  { name: "Svago e Media", type: "EXPENSE" as const, icon: "🎬" },
  { name: "Viaggi", type: "EXPENSE" as const, icon: "✈️" },
  { name: "Salute", type: "EXPENSE" as const, icon: "🏥" },
  { name: "Sport", type: "EXPENSE" as const, icon: "💪" },
  { name: "Cura Personale", type: "EXPENSE" as const, icon: "🧴" },
  { name: "Istruzione", type: "EXPENSE" as const, icon: "📚" },
  { name: "Abbonamenti", type: "EXPENSE" as const, icon: "📱" },
  { name: "Regali", type: "EXPENSE" as const, icon: "🎁" },
  { name: "Animali", type: "EXPENSE" as const, icon: "🐱" },
  { name: "Investimenti", type: "BOTH" as const, icon: "📈" },
  { name: "Tasse", type: "EXPENSE" as const, icon: "⚖️" },
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
