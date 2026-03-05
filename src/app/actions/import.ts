'use server'

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getWorkspaceForUser } from "@/lib/auth-utils";

export async function processImport(data: any[]) {
  try {
    const { workspace } = await getWorkspaceForUser();

    const defaultAccount = await prisma.account.findFirst({
      where: { workspaceId: workspace.id },
    });

    if (!defaultAccount) {
      throw new Error("Crea almeno un conto prima di importare transazioni.");
    }

    // Crea il batch prima di processare le righe
    const batch = await prisma.importBatch.create({
      data: {
        workspaceId: workspace.id,
        accountId: defaultAccount.id,
        sourceType: 'csv',
        fileName: 'import.csv',
      }
    });

    let importedCount = 0;
    let duplicateCount = 0;

    // Processo righe senza $transaction (non supportato dal Neon serverless adapter)
    for (const row of data) {
      const date = new Date(row.date);
      const amount = parseFloat(row.amount.toString().replace(',', '.'));
      const description = row.description?.trim();

      const existing = await prisma.transaction.findFirst({
        where: {
          workspaceId: workspace.id,
          accountId: defaultAccount.id,
          date,
          amount,
          description,
        }
      });

      if (existing) {
        duplicateCount++;
        continue;
      }

      const transaction = await prisma.transaction.create({
        data: {
          workspaceId: workspace.id,
          accountId: defaultAccount.id,
          date,
          amount,
          description,
          status: 'STAGED',
        }
      });

      await prisma.importRow.create({
        data: {
          batchId: batch.id,
          workspaceId: workspace.id,
          rawJson: row,
          parsedDate: date,
          parsedAmount: amount,
          parsedDesc: description,
          transactionId: transaction.id,
        }
      });

      importedCount++;
    }

    revalidatePath('/app/dashboard');
    revalidatePath('/app/transactions');
    revalidatePath('/app/accounts');

    return { success: true, importedCount, duplicateCount };
  } catch (error: any) {
    throw new Error(error.message);
  }
}
