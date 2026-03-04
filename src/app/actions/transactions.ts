'use server'

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function confirmTransactions(transactionIds: string[]) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Unauthorized");

    const userId = (session.user as any).id;
    const workspace = await prisma.workspace.findFirst({
        where: { members: { some: { userId } } },
    });
    if (!workspace) throw new Error("Workspace not found");

    await prisma.transaction.updateMany({
        where: {
            id: { in: transactionIds },
            workspaceId: workspace.id, // Security check
        },
        data: {
            status: 'CONFIRMED',
        }
    });

    revalidatePath('/app/transactions'); // Re-renders the page with new data
    return { success: true };
}

export async function deleteTransactions(transactionIds: string[]) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Unauthorized");

    const userId = (session.user as any).id;
    const workspace = await prisma.workspace.findFirst({
        where: { members: { some: { userId } } },
    });
    if (!workspace) throw new Error("Workspace not found");

    // First, delete related TransactionTags and TransactionSplits to avoid foreign key errors
    await prisma.transactionTag.deleteMany({
        where: { transactionId: { in: transactionIds } }
    });
    await prisma.transactionSplit.deleteMany({
        where: { transactionId: { in: transactionIds } }
    });

    // Then delete the transactions
    await prisma.transaction.deleteMany({
        where: {
            id: { in: transactionIds },
            workspaceId: workspace.id,
        },
    });

    revalidatePath('/app/transactions');
    return { success: true };
}

export async function setTransactionCategory(transactionIds: string[], categoryId: string | null) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Unauthorized");

    const userId = (session.user as any).id;
    const workspace = await prisma.workspace.findFirst({
        where: { members: { some: { userId } } },
    });
    if (!workspace) throw new Error("Workspace not found");

    await prisma.transaction.updateMany({
        where: {
            id: { in: transactionIds },
            workspaceId: workspace.id,
        },
        data: {
            categoryId: categoryId,
        }
    });

    revalidatePath('/app/transactions');
    return { success: true };
}
