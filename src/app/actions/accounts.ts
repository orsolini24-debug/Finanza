'use server'

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { AccountType } from "@prisma/client";
import { getWorkspaceForUser } from "@/lib/auth-utils";

export async function createAccount(formData: FormData) {
  try {
    const { workspace } = await getWorkspaceForUser();

    const name = (formData.get('name') as string)?.trim();
    const type = formData.get('type') as AccountType;
    const openingBal = parseFloat(formData.get('openingBal') as string || "0");
    const currency = (formData.get('currency') as string || "EUR").trim().toUpperCase();

    if (!name || !type) throw new Error("Nome e Tipo sono obbligatori");

    await prisma.account.create({
      data: {
        workspaceId: workspace.id,
        name,
        type,
        openingBal,
        currency,
      }
    });

    revalidatePath('/app/accounts');
    revalidatePath('/app/dashboard');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function updateAccount(id: string, formData: FormData) {
  try {
    const { workspace } = await getWorkspaceForUser();

    const name = (formData.get('name') as string)?.trim();
    const type = formData.get('type') as AccountType;
    const openingBal = parseFloat(formData.get('openingBal') as string || "0");

    if (!name || !type) throw new Error("Nome e Tipo sono obbligatori");

    await prisma.account.update({
      where: { id, workspaceId: workspace.id },
      data: {
        name,
        type,
        openingBal,
      }
    });

    revalidatePath('/app/accounts');
    revalidatePath('/app/dashboard');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function deleteAccount(id: string) {
  try {
    const { workspace } = await getWorkspaceForUser();

    // Check if there are transactions (Problem #4 - logical guard before DB cascade)
    const transactionsCount = await prisma.transaction.count({
      where: { accountId: id, workspaceId: workspace.id }
    });

    if (transactionsCount > 0) {
      throw new Error("Impossibile eliminare: esistono transazioni collegate");
    }

    await prisma.account.delete({
      where: { id, workspaceId: workspace.id }
    });

    revalidatePath('/app/accounts');
    revalidatePath('/app/dashboard');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}
