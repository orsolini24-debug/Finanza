'use server'

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getWorkspaceForUser } from "@/lib/auth-utils";

export async function createGoal(formData: FormData) {
  try {
    const { workspace } = await getWorkspaceForUser();

    const name = (formData.get('name') as string)?.trim();
    const targetAmount = parseFloat(formData.get('targetAmount') as string);
    const currentAmount = parseFloat(formData.get('currentAmount') as string || "0");
    const type = formData.get('type') as string;
    const startDate = new Date(formData.get('startDate') as string);
    const endDate = new Date(formData.get('endDate') as string);
    const accountId = formData.get('accountId') as string || null;

    if (!name || isNaN(targetAmount)) throw new Error("Nome e Target sono obbligatori");
    
    // Problem #22 - Date validation
    if (endDate <= startDate) {
      throw new Error("La data di fine deve essere successiva alla data di inizio");
    }

    await prisma.goal.create({
      data: {
        workspaceId: workspace.id,
        name,
        targetAmount,
        currentAmount,
        type,
        startDate,
        endDate,
        accountId
      },
    });

    revalidatePath('/app/goals');
    revalidatePath('/app/dashboard');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function updateGoal(id: string, formData: FormData) {
  try {
    const { workspace } = await getWorkspaceForUser();

    const name = (formData.get('name') as string)?.trim();
    const targetAmount = parseFloat(formData.get('targetAmount') as string);
    const currentAmount = parseFloat(formData.get('currentAmount') as string || "0");
    const type = formData.get('type') as string;
    const startDate = new Date(formData.get('startDate') as string);
    const endDate = new Date(formData.get('endDate') as string);
    const accountId = formData.get('accountId') as string || null;

    if (!name || isNaN(targetAmount)) throw new Error("Nome e Target sono obbligatori");

    // Problem #22 - Date validation
    if (endDate <= startDate) {
      throw new Error("La data di fine deve essere successiva alla data di inizio");
    }

    await prisma.goal.update({
      where: { id, workspaceId: workspace.id },
      data: {
        name,
        targetAmount,
        currentAmount,
        type,
        startDate,
        endDate,
        accountId
      },
    });

    revalidatePath('/app/goals');
    revalidatePath('/app/dashboard');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function deleteGoal(id: string) {
  try {
    const { workspace } = await getWorkspaceForUser();

    await prisma.goal.delete({
      where: { id, workspaceId: workspace.id },
    });

    revalidatePath('/app/goals');
    revalidatePath('/app/dashboard');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}
