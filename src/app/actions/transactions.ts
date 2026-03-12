'use server'

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { TxStatus } from "@prisma/client";
import { getWorkspaceForUser, requireWorkspaceAccess } from "@/lib/auth-utils";

export async function confirmTransactions(transactionIds: string[]) {
  try {
    const { workspace } = await getWorkspaceForUser();

    // Recupera le transazioni richieste
    const txs = await prisma.transaction.findMany({
      where: { id: { in: transactionIds }, workspaceId: workspace.id },
      select: { id: true, transferGroupId: true },
    });

    const transferGroupIds = txs
      .map(t => t.transferGroupId)
      .filter((gid): gid is string => gid !== null);

    const allIdsToConfirm = new Set(txs.map(t => t.id));

    if (transferGroupIds.length > 0) {
      const counterparts = await prisma.transaction.findMany({
        where: { transferGroupId: { in: transferGroupIds }, workspaceId: workspace.id },
        select: { id: true },
      });
      counterparts.forEach(c => allIdsToConfirm.add(c.id));
    }

    await prisma.transaction.updateMany({
      where: { id: { in: [...allIdsToConfirm] }, workspaceId: workspace.id },
      data:  { status: 'CONFIRMED' },
    });

    revalidatePath('/app/transactions');
    revalidatePath('/app/dashboard');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function deleteTransactions(transactionIds: string[]) {
  try {
    const { workspace } = await getWorkspaceForUser();

    await prisma.transactionTag.deleteMany({
        where: { transactionId: { in: transactionIds } }
    });
    await prisma.transactionSplit.deleteMany({
        where: { transactionId: { in: transactionIds } }
    });

    await prisma.transaction.deleteMany({
        where: {
            id: { in: transactionIds },
            workspaceId: workspace.id,
        },
    });

    revalidatePath('/app/transactions');
    revalidatePath('/app/dashboard');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function setTransactionCategory(transactionIds: string[], categoryId: string | null) {
  try {
    const { workspace } = await getWorkspaceForUser();

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
    revalidatePath('/app/dashboard');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function createTransaction(formData: FormData) {
  try {
    const { workspace } = await getWorkspaceForUser();

    const description = (formData.get('description') as string)?.trim().substring(0, 255);
    const amountStr = formData.get('amount') as string;
    const dateStr = formData.get('date') as string;
    const categoryId = formData.get('categoryId') as string;
    const accountId = formData.get('accountId') as string;

    if (!description || !amountStr || !dateStr || !accountId) {
        throw new Error("Mancano campi obbligatori");
    }

    let amount = parseFloat(amountStr);
    if (isNaN(amount)) throw new Error("Importo non valido");

    await prisma.transaction.create({
        data: {
            workspaceId: workspace.id,
            accountId,
            categoryId: categoryId || null,
            description,
            amount,
            date: new Date(dateStr),
            status: 'CONFIRMED',
        }
    });

    revalidatePath('/app/dashboard');
    revalidatePath('/app/transactions');
    revalidatePath('/app/accounts');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function updateTransaction(id: string, formData: FormData) {
  try {
    const { workspace } = await getWorkspaceForUser();

    const description = (formData.get('description') as string)?.trim().substring(0, 255);
    const amountStr = formData.get('amount') as string;
    const dateStr = formData.get('date') as string;
    const categoryId = formData.get('categoryId') as string;
    const accountId = formData.get('accountId') as string;
    const status = formData.get('status') as TxStatus;

    if (!description || !amountStr || !dateStr || !accountId) {
      throw new Error("Mancano campi obbligatori");
    }

    let amount = parseFloat(amountStr);
    if (isNaN(amount)) throw new Error("Importo non valido");

    await prisma.transaction.update({
      where: { id, workspaceId: workspace.id },
      data: {
        description,
        amount,
        date: new Date(dateStr),
        categoryId: categoryId || null,
        accountId,
        status
      }
    });

    revalidatePath('/app/dashboard');
    revalidatePath('/app/transactions');
    revalidatePath('/app/accounts');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function getSuggestedRules(workspaceId: string) {
  await requireWorkspaceAccess(workspaceId);
  
  const transactions = await prisma.transaction.findMany({
    where: {
      workspaceId,
      status: 'CONFIRMED',
      categoryId: { not: null }
    },
    include: { category: true }
  });

  const existingRules = await prisma.rule.findMany({
    where: { workspaceId }
  });

  const patterns: Record<string, { pattern: string, categoryId: string, name: string, count: number, example: string }> = {};

  transactions.forEach(tx => {
    const pattern = tx.description.toLowerCase().trim().replace(/\d+/g, '').trim();
    if (pattern.length < 3) return;

    if (existingRules.some(r => r.contains?.toLowerCase() === pattern)) return;

    const key = `${pattern}:::${tx.categoryId}`;
    if (!patterns[key]) {
      patterns[key] = {
        pattern,
        categoryId: tx.categoryId!,
        name: tx.category!.name,
        count: 0,
        example: tx.description
      };
    }
    patterns[key].count++;
  });

  return Object.values(patterns)
    .filter(data => data.count >= 3)
    .map(data => ({
      pattern: data.pattern,
      categoryId: data.categoryId,
      categoryName: data.name,
      count: data.count,
      exampleDesc: data.example
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export async function searchTransactions(workspaceId: string, query: string, limit = 20) {
  await requireWorkspaceAccess(workspaceId);
  if (!query || query.trim().length < 2) return [];

  return prisma.transaction.findMany({
    where: {
      workspaceId,
      OR: [
        { description: { contains: query, mode: 'insensitive' } },
        { category: { name: { contains: query, mode: 'insensitive' } } },
        { account: { name: { contains: query, mode: 'insensitive' } } },
      ]
    },
    include: { category: true, account: true },
    orderBy: { date: 'desc' },
    take: limit,
  });
}
