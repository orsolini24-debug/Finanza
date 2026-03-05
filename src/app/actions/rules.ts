'use server'

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getWorkspaceForUser } from "@/lib/auth-utils";

export async function createRule(formData: FormData) {
  try {
    const { workspace } = await getWorkspaceForUser();

    const name = (formData.get('name') as string)?.trim();
    const contains = (formData.get('contains') as string)?.trim().toLowerCase();
    const setCategoryId = formData.get('setCategoryId') as string || null;
    const addTagName = (formData.get('addTagName') as string)?.trim() || null;
    const markTransfer = formData.get('markTransfer') === 'true';
    const priority = parseInt(formData.get('priority') as string || "100");

    if (!name || !contains) throw new Error("Nome e Condizione sono obbligatori");

    await prisma.rule.create({
      data: {
        workspaceId: workspace.id,
        name,
        contains,
        setCategoryId,
        addTagName,
        markTransfer,
        priority,
      }
    });

    revalidatePath('/app/rules');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function updateRule(id: string, formData: FormData) {
  try {
    const { workspace } = await getWorkspaceForUser();

    const name = (formData.get('name') as string)?.trim();
    const contains = (formData.get('contains') as string)?.trim().toLowerCase();
    const setCategoryId = formData.get('setCategoryId') as string || null;
    const addTagName = (formData.get('addTagName') as string)?.trim() || null;
    const markTransfer = formData.get('markTransfer') === 'true';
    const priority = parseInt(formData.get('priority') as string || "100");

    if (!name || !contains) throw new Error("Nome e Condizione sono obbligatori");

    await prisma.rule.update({
      where: { id, workspaceId: workspace.id },
      data: {
        name,
        contains,
        setCategoryId,
        addTagName,
        markTransfer,
        priority,
      }
    });

    revalidatePath('/app/rules');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function deleteRule(id: string) {
  try {
    const { workspace } = await getWorkspaceForUser();

    await prisma.rule.delete({
      where: { id, workspaceId: workspace.id },
    });

    revalidatePath('/app/rules');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function toggleRule(id: string, isEnabled: boolean) {
  try {
    const { workspace } = await getWorkspaceForUser();

    await prisma.rule.update({
      where: { id, workspaceId: workspace.id },
      data: { isEnabled },
    });

    revalidatePath('/app/rules');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}
