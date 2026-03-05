import prisma from "@/lib/prisma";

export async function processOverdueRecurring(workspaceId: string): Promise<number> {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const overdueItems = await prisma.recurringItem.findMany({
    where: {
      workspaceId,
      nextDate: { lte: today }
    }
  });

  if (overdueItems.length === 0) return 0;

  let processedCount = 0;

  for (const item of overdueItems) {
    if (!item.accountId) continue;

    // 1. Crea la transazione
    await prisma.transaction.create({
      data: {
        workspaceId: item.workspaceId,
        accountId: item.accountId,
        categoryId: item.categoryId,
        description: item.name,
        amount: item.isIncome ? item.amount : -Math.abs(Number(item.amount)),
        date: item.nextDate,
        status: 'CONFIRMED',
      },
    });

    // 2. Calcola la prossima data
    let nextDate = new Date(item.nextDate);
    if (item.cadence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
    else if (item.cadence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
    else if (item.cadence === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);

    await prisma.recurringItem.update({
      where: { id: item.id },
      data: { nextDate },
    });

    processedCount++;
  }

  return processedCount;
}
