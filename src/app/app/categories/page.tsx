import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function CategoriesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  // Get current workspace (first one for now)
  const workspace = await prisma.workspace.findFirst({
    where: {
      members: {
        some: {
          userId: (session.user as any).id,
        },
      },
    },
    include: {
      categories: {
        include: {
          parent: true,
        },
      },
    },
  });

  if (!workspace) {
    return <div>No workspace found. Please log in again.</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Categories</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
          Add Category
        </button>
      </div>
      <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-800">
            <tr>
              <th className="px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Parent</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-800">
            {workspace.categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{cat.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cat.parent?.name || "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <button className="text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                  <button className="text-red-600 hover:text-red-800">Delete</button>
                </td>
              </tr>
            ))}
            {workspace.categories.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  No categories found. Use the seed command or add one manually.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
