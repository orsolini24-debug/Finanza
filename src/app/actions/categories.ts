'use server'

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { CategoryType } from "@prisma/client";
import { getWorkspaceForUser } from "@/lib/auth-utils";

export async function createCategory(formData: FormData) {
  try {
    const { workspace } = await getWorkspaceForUser();

    const name = (formData.get('name') as string)?.trim();
    const type = formData.get('type') as CategoryType || 'BOTH';
    const parentId = (formData.get('parentId') as string) || null;
    const icon = (formData.get('icon') as string) || null;

    if (!name) throw new Error("Nome categoria obbligatorio");

    await prisma.category.create({
      data: {
        workspaceId: workspace.id,
        name,
        type,
        parentId,
        icon,
      }
    });

    revalidatePath('/app/categories');
    revalidatePath('/app/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('[createCategory]', error?.message, error?.kind, error?.code);
    throw new Error(error.message || 'Errore durante la creazione');
  }
}

export async function updateCategory(id: string, formData: FormData) {
  try {
    const { workspace } = await getWorkspaceForUser();

    const name = (formData.get('name') as string)?.trim();
    const type = formData.get('type') as CategoryType || 'BOTH';
    const parentId = (formData.get('parentId') as string) || null;
    const icon = (formData.get('icon') as string) || null;

    if (!name) throw new Error("Nome categoria obbligatorio");

    await prisma.category.update({
      where: { id, workspaceId: workspace.id },
      data: {
        name,
        type,
        parentId,
        icon,
      }
    });

    revalidatePath('/app/categories');
    revalidatePath('/app/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('[updateCategory]', error?.message, error?.kind, error?.code);
    throw new Error(error.message || 'Errore durante la modifica');
  }
}

export async function deleteCategory(id: string) {
  try {
    const { workspace } = await getWorkspaceForUser();

    // Eseguito con chiamate separate (no $transaction — non supportato dal Neon serverless adapter)
    await prisma.transaction.updateMany({
      where: { categoryId: id, workspaceId: workspace.id },
      data: { categoryId: null }
    });

    await prisma.recurringItem.updateMany({
      where: { categoryId: id, workspaceId: workspace.id },
      data: { categoryId: null }
    });

    await prisma.rule.updateMany({
      where: { setCategoryId: id, workspaceId: workspace.id },
      data: { setCategoryId: null }
    });

    await prisma.budget.deleteMany({
      where: { categoryId: id, workspaceId: workspace.id }
    });

    await prisma.category.updateMany({
      where: { parentId: id, workspaceId: workspace.id },
      data: { parentId: null }
    });

    await prisma.category.delete({
      where: { id, workspaceId: workspace.id }
    });

    revalidatePath('/app/categories');
    revalidatePath('/app/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('[deleteCategory]', error?.message, error?.kind, error?.code);
    throw new Error(error.message || 'Errore durante l\'eliminazione');
  }
}
