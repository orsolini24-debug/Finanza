'use server'

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getWorkspaceForUser } from "@/lib/auth-utils";

export async function createRecurringItem(formData: FormData) {
  try {
    const { workspace } = await getWorkspaceForUser();

    const name = (formData.get('name') as string)?.trim();
    const amount = parseFloat(formData.get('amount') as string);
    const cadence = formData.get('cadence') as string;
    const nextDate = new Date(formData.get('nextDate') as string);
    const endDateStr = formData.get('endDate') as string;
    const endDate = endDateStr ? new Date(endDateStr) : null;
    const categoryId = formData.get('categoryId') as string || null;
    const accountId = formData.get('accountId') as string || null;
    const isIncome = formData.get('isIncome') === 'true';

    if (!name || isNaN(amount)) throw new Error("Nome e Importo obbligatori");

    await prisma.recurringItem.create({
      data: {
        workspaceId: workspace.id,
        name,
        amount,
        cadence,
        nextDate,
        endDate,
        categoryId,
        accountId,
        isIncome,
      },
    });

    revalidatePath('/app/recurring');
    revalidatePath('/app/dashboard');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function updateRecurringItem(id: string, formData: FormData) {
  try {
    const { workspace } = await getWorkspaceForUser();

    const name = (formData.get('name') as string)?.trim();
    const amount = parseFloat(formData.get('amount') as string);
    const cadence = formData.get('cadence') as string;
    const nextDate = new Date(formData.get('nextDate') as string);
    const endDateStr = formData.get('endDate') as string;
    const endDate = endDateStr ? new Date(endDateStr) : null;
    const categoryId = formData.get('categoryId') as string || null;
    const accountId = formData.get('accountId') as string || null;
    const isIncome = formData.get('isIncome') === 'true';

    if (!name || isNaN(amount)) throw new Error("Nome e Importo obbligatori");

    await prisma.recurringItem.update({
      where: { id, workspaceId: workspace.id },
      data: {
        name,
        amount,
        cadence,
        nextDate,
        endDate,
        categoryId,
        accountId,
        isIncome,
      },
    });

    revalidatePath('/app/recurring');
    revalidatePath('/app/dashboard');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function deleteRecurringItem(id: string) {
  try {
    const { workspace } = await getWorkspaceForUser();

    await prisma.recurringItem.delete({
      where: { id, workspaceId: workspace.id },
    });

    revalidatePath('/app/recurring');
    revalidatePath('/app/dashboard');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function executeRecurring(id: string) {
  try {
    const { workspace } = await getWorkspaceForUser();

    const item = await prisma.recurringItem.findUnique({
      where: { id, workspaceId: workspace.id },
    });
    if (!item) throw new Error("Elemento non trovato");

    if (!item.accountId) throw new Error("Conto non configurato per questa ricorrenza");

    // 1. Crea la transazione
    await prisma.transaction.create({
      data: {
        workspaceId: workspace.id,
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
    const day = nextDate.getDate();

    if (item.cadence === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (item.cadence === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
      if (nextDate.getDate() !== day) nextDate.setDate(0);
    } else if (item.cadence === 'yearly') {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      if (nextDate.getDate() !== day) nextDate.setDate(0);
    }

    // 3. Se la prossima occorrenza supera endDate, elimina la ricorrenza
    if (item.endDate && nextDate > item.endDate) {
      await prisma.recurringItem.delete({ where: { id } });
    } else {
      await prisma.recurringItem.update({
        where: { id },
        data: { nextDate },
      });
    }

    revalidatePath('/app/recurring');
    revalidatePath('/app/dashboard');
    revalidatePath('/app/transactions');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}
