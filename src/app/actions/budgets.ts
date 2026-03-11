'use server'

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getPeriodRange } from "@/lib/period";
import { getWorkspaceForUser } from "@/lib/auth-utils";

export async function getBudgetsWithSpending(workspaceId: string, month: string) {
  const { start, end } = getPeriodRange(month);

  const budgets = await prisma.budget.findMany({
    where: {
      workspaceId,
      periodStart: { lte: end },
      periodEnd: { gte: start },
    },
    include: {
      category: true,
    },
  });

  const budgetsWithSpending = await Promise.all(
    budgets.map(async (budget) => {
      const spending = await prisma.transaction.aggregate({
        where: {
          workspaceId,
          categoryId: budget.categoryId,
          status: 'CONFIRMED',
          date: { gte: start, lte: end },
          amount: { lt: 0 }, // Solo uscite
        },
        _sum: { amount: true },
      });

      const spent = Math.abs(Number(spending._sum.amount || 0));
      const amount = Number(budget.amount);
      const remaining = amount - spent;
      const percentage = amount > 0 ? Math.min(100, (spent / amount) * 100) : 0;

      return {
        id: budget.id,
        category: budget.category,
        amount,
        spent,
        remaining,
        percentage,
      };
    })
  );

  return budgetsWithSpending;
}

export async function upsertBudget(formData: FormData) {
  try {
    const { workspace } = await getWorkspaceForUser();

    const categoryId = formData.get('categoryId') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const month = formData.get('month') as string;
    const { start, end } = getPeriodRange(month);

    if (!categoryId || isNaN(amount)) throw new Error("Categoria e Importo sono obbligatori");

    const existing = await prisma.budget.findFirst({
      where: {
        workspaceId: workspace.id,
        categoryId,
        periodStart: start,
      },
    });

    if (existing) {
      await prisma.budget.update({
        where: { id: existing.id },
        data: { amount },
      });
    } else {
      await prisma.budget.create({
        data: {
          workspaceId: workspace.id,
          categoryId,
          amount,
          periodStart: start,
          periodEnd: end,
        },
      });
    }

    revalidatePath('/app/budget');
    revalidatePath('/app/dashboard');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function deleteBudget(id: string) {
  try {
    const { workspace } = await getWorkspaceForUser();

    await prisma.budget.delete({
      where: { id, workspaceId: workspace.id },
    });

    revalidatePath('/app/budget');
    revalidatePath('/app/dashboard');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function copyBudgetFromPreviousMonth(workspaceId: string, currentMonth: string) {
  try {
    const { workspace } = await getWorkspaceForUser();
    if (workspace.id !== workspaceId) throw new Error("Unauthorized");

    const [y, m] = currentMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const { start: prevStart } = getPeriodRange(prevMonth);
    const { start: currStart, end: currEnd } = getPeriodRange(currentMonth);

    const prevBudgets = await prisma.budget.findMany({
      where: { workspaceId, periodStart: prevStart }
    });

    if (prevBudgets.length === 0) return { copied: 0 };

    let copiedCount = 0;
    for (const b of prevBudgets) {
      const existing = await prisma.budget.findFirst({
        where: { workspaceId, categoryId: b.categoryId, periodStart: currStart }
      });

      if (!existing) {
        await prisma.budget.create({
          data: {
            workspaceId,
            categoryId: b.categoryId,
            amount: b.amount,
            periodStart: currStart,
            periodEnd: currEnd,
          }
        });
        copiedCount++;
      }
    }

    revalidatePath('/app/budget');
    revalidatePath('/app/dashboard');
    return { copied: copiedCount };
  } catch (error: any) {
    throw new Error(error.message);
  }
}
