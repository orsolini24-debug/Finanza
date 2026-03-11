'use server'

import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createDefaultWorkspace } from "@/lib/workspace";

export async function registerUser(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const username = (formData.get('username') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!email || !username || !password) {
    throw new Error("Tutti i campi sono obbligatori");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Email non valida");
  }

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    throw new Error("Username: 3-20 caratteri, solo lettere minuscole, numeri e _");
  }

  if (password.length < 6) {
    throw new Error("La password deve essere di almeno 6 caratteri");
  }

  if (password !== confirmPassword) {
    throw new Error("Le password non coincidono");
  }

  // Verifica duplicati
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existing?.email === email) throw new Error("Email già registrata");
  if (existing?.username === username) throw new Error("Username già in uso");

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
      name: username,
      isOnboarded: false,
    },
  });

  try {
    await createDefaultWorkspace(user.id);
  } catch (err: any) {
    console.error('[registerUser] workspace creation failed:', err?.message, err?.kind, err?.code);
    // Non blocca la registrazione: il workspace verrà creato all'onboarding
  }

  return { success: true };
}

export async function completeOnboarding(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Non autorizzato");

  const userId = (session.user as any).id;
  const displayName = (formData.get('displayName') as string)?.trim();

  if (!displayName || displayName.length < 2) {
    throw new Error("Il nome deve avere almeno 2 caratteri");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: displayName.substring(0, 50),
      isOnboarded: true,
    },
  });

  console.log(`[completeOnboarding] User ${userId} marked as onboarded.`);

  // Cerchiamo di creare il workspace se manca, ma non blocchiamo l'utente se fallisce
  // La dashboard lo farà comunque come fallback di emergenza.
  const existing = await prisma.workspace.findFirst({
    where: { members: { some: { userId } } },
  });

  if (!existing) {
    try {
      console.log(`[completeOnboarding] No workspace found for user ${userId}. Creating default...`);
      await createDefaultWorkspace(userId);
      console.log(`[completeOnboarding] Workspace created successfully for ${userId}.`);
    } catch (err: any) {
      console.error('[completeOnboarding] workspace creation failed, user will still proceed:', err?.message);
      // NON lanciamo l'errore qui per evitare di bloccare l'onboarding se il DB ha latenza
    }
  }

  return { success: true };
}
