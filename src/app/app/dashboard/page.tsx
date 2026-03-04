import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  // Fetch user's workspaces
  const workspaces = await prisma.workspace.findMany({
    where: {
      members: {
        some: {
          userId: (session.user as any).id,
        },
      },
    },
    include: {
      accounts: true,
    },
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {workspaces.map((ws) => (
          <div key={ws.id} className="p-6 border rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-2">{ws.name}</h2>
            <p className="text-gray-500 mb-4">Accounts: {ws.accounts.length}</p>
            <div className="space-y-2">
              {ws.accounts.map((acc) => (
                <div key={acc.id} className="flex justify-between border-t pt-2">
                  <span>{acc.name}</span>
                  <span className="font-mono">{acc.currency} {Number(acc.openingBal).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
