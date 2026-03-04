'use server'

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { applyRulesToTransactionCandidate } from "@/lib/rules";

type ImportData = {
  date: string;
  amount: string;
  description: string;
  payee?: string;
}

export async function processImport(data: ImportData[]) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const userId = (session.user as any).id;

  // Get user's first workspace
  const workspace = await prisma.workspace.findFirst({
    where: { members: { some: { userId } } },
    include: { accounts: true }
  });

  if (!workspace) throw new Error("Workspace not found");

  // Get or create a default account for MVP
  let account = workspace.accounts[0];
  if (!account) {
    account = await prisma.account.create({
      data: {
        name: "Main Account",
        type: "CHECKING",
        workspaceId: workspace.id,
      }
    });
  }

  // Create an ImportBatch
  const batch = await prisma.importBatch.create({
    data: {
      workspaceId: workspace.id,
      accountId: account.id,
      sourceType: "csv",
      fileName: "Manual Import",
    }
  });

  let importedCount = 0;
  let duplicateCount = 0;

  for (const row of data) {
    const rawAmount = parseFloat(row.amount.replace(',', '.'));
    if (isNaN(rawAmount)) continue; // skip invalid amounts

    // Parse date assuming DD/MM/YYYY or YYYY-MM-DD
    let parsedDate = new Date(row.date);
    if (isNaN(parsedDate.getTime())) {
      // try parsing DD/MM/YYYY
      const parts = row.date.split('/');
      if (parts.length === 3) {
        parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } else {
        parsedDate = new Date(); // fallback
      }
    }

    const description = row.description ? row.description.trim() : "Unknown";
    const payeeNormalized = row.payee ? row.payee.trim().toLowerCase() : "";

    // dedupeKey: accountId|dateISO|amount|description
    const dateISO = parsedDate.toISOString().split('T')[0];
    const dedupeKey = `${account.id}|${dateISO}|${rawAmount.toFixed(2)}|${description.toLowerCase()}`;

    // Check duplicate
    const existingTx = await prisma.transaction.findFirst({
      where: {
        workspaceId: workspace.id,
        imports: {
          some: { dedupeKey }
        }
      }
    });

    if (existingTx) {
      duplicateCount++;
      continue;
    }

    // Apply Rules
    const ruleResult = await applyRulesToTransactionCandidate(
      workspace.id,
      account.id,
      description,
      payeeNormalized
    );

    // Create Transaction
    const tx = await prisma.transaction.create({
      data: {
        workspaceId: workspace.id,
        accountId: account.id,
        date: parsedDate,
        amount: rawAmount,
        description,
        status: "STAGED",
        categoryId: ruleResult.categoryId,
        isTransfer: ruleResult.isTransfer,
      }
    });

    // Create ImportRow link
    await prisma.importRow.create({
      data: {
        batchId: batch.id,
        workspaceId: workspace.id,
        rawJson: row,
        parsedDate,
        parsedAmount: rawAmount,
        parsedDesc: description,
        dedupeKey,
        transactionId: tx.id
      }
    });

    // Handle Tags if rule returned one
    if (ruleResult.addTagName) {
      // Find or create tag
      let tag = await prisma.tag.findUnique({
        where: { workspaceId_name: { workspaceId: workspace.id, name: ruleResult.addTagName } }
      });
      if (!tag) {
        tag = await prisma.tag.create({
          data: { workspaceId: workspace.id, name: ruleResult.addTagName }
        });
      }
      await prisma.transactionTag.create({
        data: { transactionId: tx.id, tagId: tag.id }
      });
    }

    importedCount++;
  }

  return { success: true, importedCount, duplicateCount };
}
