import prisma from "./prisma";
import { Rule, Transaction } from "@prisma/client";

export async function applyRulesToTransactionCandidate(
  workspaceId: string,
  accountId: string,
  description: string,
  payeeNormalized?: string
) {
  // Load enabled rules ordered by priority asc
  const rules = await prisma.rule.findMany({
    where: {
      workspaceId,
      isEnabled: true,
    },
    orderBy: {
      priority: 'asc',
    },
  });

  let matchedRuleId: string | null = null;
  let categoryId: string | null = null;
  let addTagName: string | null = null;
  let isTransfer = false;

  for (const rule of rules) {
    let match = false;

    // Conditions: contains OR payeeId OR accountId
    if (rule.contains && description.toLowerCase().includes(rule.contains.toLowerCase())) {
      match = true;
    }

    // You could expand this to check payeeId and accountId matches if needed
    if (rule.accountId && rule.accountId === accountId) {
       // if we have other conditions, we might want AND/OR logic.
       // For MVP, let's keep it simple: if account matches, it might contribute to match.
    }

    if (match) {
      matchedRuleId = rule.id;
      if (rule.setCategoryId) categoryId = rule.setCategoryId;
      if (rule.addTagName) addTagName = rule.addTagName;
      if (rule.markTransfer) isTransfer = true;
      
      // Stop at first matching rule if priority is asc
      break;
    }
  }

  return {
    categoryId,
    addTagName,
    isTransfer,
    trace: matchedRuleId ? { ruleId: matchedRuleId } : null,
  };
}
