import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import TransactionsTable from "@/components/TransactionsTable";
import { Search, Filter } from 'lucide-react'

export default async function TransactionsPage() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        redirect("/auth/signin");
    }

    const userId = (session.user as any).id;
    const workspace = await prisma.workspace.findFirst({
        where: { members: { some: { userId } } },
        include: { 
            transactions: {
                include: {
                    category: true,
                    account: true,
                },
                orderBy: {
                    date: 'desc'
                }
            },
            categories: true,
        }
    });

    if (!workspace) {
        return <div className="p-8">Workspace not found.</div>;
    }
    
    return (
        <div className="p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <h1 className="text-2xl font-bold">Transactions</h1>
                
                <div className="flex items-center gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                    type="text" 
                    placeholder="Search..." 
                    className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-800"
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition">
                    <Filter className="w-4 h-4" />
                    <span>Filter</span>
                </button>
                </div>
            </div>

            <TransactionsTable 
                transactions={workspace.transactions} 
                categories={workspace.categories}
            />
        </div>
    )
}
