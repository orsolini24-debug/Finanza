import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import CategoryManager from "@/components/categories/CategoryManager";

export default async function CategoriesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const workspace = await prisma.workspace.findFirst({
    where: { members: { some: { userId: (session.user as any).id } } },
    include: { categories: { include: { parent: true } } },
  });

  if (!workspace) return <div className="p-8">Nessun workspace trovato. Contatta l'assistenza.</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold text-[var(--fg-primary)] tracking-tight">
            Categorie
          </h1>
          <p className="text-[var(--fg-muted)] mt-2 font-medium">
            Organizza le tue finanze raggruppando le transazioni.
          </p>
        </div>
      </div>

      <CategoryManager categories={workspace.categories as any} />
    </div>
  );
}
