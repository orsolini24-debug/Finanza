import prisma from "@/lib/prisma";

function calcNextDate(currentDate: Date, cadence: string): Date {
  const next = new Date(currentDate);
  const day = next.getDate();
  if (cadence === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else if (cadence === 'monthly') {
    next.setMonth(next.getMonth() + 1);
    if (next.getDate() !== day) next.setDate(0); // gestione fine mese (es. 31 gen → 28 feb)
  } else if (cadence === 'yearly') {
    next.setFullYear(next.getFullYear() + 1);
    if (next.getDate() !== day) next.setDate(0);
  }
  return next;
}

export async function processOverdueRecurring(workspaceId: string): Promise<number> {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const overdueItems = await prisma.recurringItem.findMany({
    where: {
      workspaceId,
      nextDate: { lte: today },
    }
  });

  if (overdueItems.length === 0) return 0;

  let processedCount = 0;

  for (const item of overdueItems) {
    // Se la ricorrenza ha una data di fine ed è già scaduta, eliminala e salta
    if (item.endDate && item.nextDate > item.endDate) {
      await prisma.recurringItem.delete({ where: { id: item.id } });
      continue;
    }

    if (!item.accountId) continue;

    const nextDate = calcNextDate(item.nextDate, item.cadence);
    const shouldDelete = !!(item.endDate && nextDate > item.endDate);

    // Idempotenza via optimistic locking:
    // Avanziamo nextDate usando il valore CORRENTE come condizione WHERE.
    // Se un altro processo ha già avanzato la data, updateMany restituisce count=0 → skip.
    // Nota: avanziamo sempre nextDate (anche se poi elimineremo il record) per "reclamare" l'item.
    const claimed = await prisma.recurringItem.updateMany({
      where: { id: item.id, nextDate: item.nextDate },
      data: { nextDate },
    });

    if (claimed.count === 0) continue; // già processata da una richiesta concorrente

    // Crea la transazione solo se abbiamo "vinto" la race
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

    // Se la prossima occorrenza supera endDate, elimina la ricorrenza
    if (shouldDelete) {
      await prisma.recurringItem.delete({ where: { id: item.id } });
    }

    processedCount++;
  }

  return processedCount;
}
