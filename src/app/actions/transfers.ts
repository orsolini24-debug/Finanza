'use server'

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getWorkspaceForUser } from "@/lib/auth-utils";
import { randomUUID } from "crypto";

// Tolleranza importo per il rilevamento automatico (in EUR)
const TRANSFER_AMOUNT_TOLERANCE = 2;

// ── Crea un trasferimento manuale (2 transaction CONFIRMED collegate) ────────
export async function createTransfer(data: {
  fromAccountId: string;
  toAccountId:   string;
  amount:        number;   // positivo
  date:          string;   // ISO string
  description?:  string;
}) {
  const { workspace } = await getWorkspaceForUser();

  const [fromAcc, toAcc] = await Promise.all([
    prisma.account.findFirst({ where: { id: data.fromAccountId, workspaceId: workspace.id } }),
    prisma.account.findFirst({ where: { id: data.toAccountId,   workspaceId: workspace.id } }),
  ]);
  if (!fromAcc) throw new Error("Conto di partenza non trovato.");
  if (!toAcc)   throw new Error("Conto di arrivo non trovato.");
  if (fromAcc.id === toAcc.id) throw new Error("I due conti devono essere diversi.");

  const amount = Math.abs(data.amount);
  if (amount <= 0) throw new Error("L'importo deve essere maggiore di zero.");

  const date     = new Date(data.date);
  const groupId  = randomUUID();
  const desc     = (data.description?.trim()) || `Trasferimento ${fromAcc.name} → ${toAcc.name}`;

  // Leg uscente (fromAccount): importo negativo
  await prisma.transaction.create({
    data: {
      workspaceId:    workspace.id,
      accountId:      fromAcc.id,
      date,
      amount:         -amount,
      description:    desc,
      status:         'CONFIRMED',
      isTransfer:     true,
      transferGroupId: groupId,
    },
  });

  // Leg entrante (toAccount): importo positivo
  await prisma.transaction.create({
    data: {
      workspaceId:    workspace.id,
      accountId:      toAcc.id,
      date,
      amount:         amount,
      description:    desc,
      status:         'CONFIRMED',
      isTransfer:     true,
      transferGroupId: groupId,
    },
  });

  revalidatePath('/app/transactions');
  revalidatePath('/app/dashboard');
  revalidatePath('/app/accounts');
  return { success: true, transferGroupId: groupId };
}

// ── Collega due transazioni esistenti come trasferimento ──────────────────────
export async function linkAsTransfer(txId1: string, txId2: string) {
  const { workspace } = await getWorkspaceForUser();

  const [tx1, tx2] = await Promise.all([
    prisma.transaction.findFirst({ where: { id: txId1, workspaceId: workspace.id } }),
    prisma.transaction.findFirst({ where: { id: txId2, workspaceId: workspace.id } }),
  ]);
  if (!tx1 || !tx2) throw new Error("Transazioni non trovate o non autorizzate.");
  if (tx1.accountId === tx2.accountId) throw new Error("Le transazioni devono essere su conti diversi.");
  if (tx1.transferGroupId || tx2.transferGroupId) throw new Error("Una delle transazioni è già collegata a un trasferimento.");

  const groupId = randomUUID();

  await prisma.transaction.updateMany({
    where: { id: { in: [txId1, txId2] }, workspaceId: workspace.id },
    data:  { isTransfer: true, transferGroupId: groupId },
  });

  revalidatePath('/app/transactions');
  revalidatePath('/app/dashboard');
  return { success: true, transferGroupId: groupId };
}

// ── Scollega un trasferimento (rimuove il groupId da entrambe le leg) ─────────
export async function unlinkTransfer(txId: string) {
  const { workspace } = await getWorkspaceForUser();

  const tx = await prisma.transaction.findFirst({
    where: { id: txId, workspaceId: workspace.id },
  });
  if (!tx) throw new Error("Transazione non trovata.");
  if (!tx.transferGroupId) throw new Error("Questa transazione non fa parte di un trasferimento.");

  await prisma.transaction.updateMany({
    where: { transferGroupId: tx.transferGroupId, workspaceId: workspace.id },
    data:  { isTransfer: false, transferGroupId: null },
  });

  revalidatePath('/app/transactions');
  revalidatePath('/app/dashboard');
  return { success: true };
}

// ── Conferma entrambe le leg di un trasferimento ─────────────────────────────
export async function confirmTransferPair(txId: string) {
  const { workspace } = await getWorkspaceForUser();

  const tx = await prisma.transaction.findFirst({
    where: { id: txId, workspaceId: workspace.id },
  });
  if (!tx) throw new Error("Transazione non trovata.");
  if (!tx.transferGroupId) throw new Error("Questa transazione non fa parte di un trasferimento.");

  await prisma.transaction.updateMany({
    where: { transferGroupId: tx.transferGroupId, workspaceId: workspace.id },
    data:  { status: 'CONFIRMED' },
  });

  revalidatePath('/app/transactions');
  revalidatePath('/app/dashboard');
  return { success: true };
}

// ── Rileva automaticamente possibili trasferimenti tra STAGED transactions ────
// Regole: stesso workspace, stesso giorno, conti diversi, |amount1 + amount2| <= 2€,
// nessuna delle due già collegata a un transfer.
export async function detectTransferCandidates() {
  const { workspace } = await getWorkspaceForUser();

  const staged = await prisma.transaction.findMany({
    where: {
      workspaceId:    workspace.id,
      status:         'STAGED',
      transferGroupId: null,
    },
    include: { account: { select: { id: true, name: true } } },
    orderBy: { date: 'asc' },
  });

  const candidates: Array<{
    tx1: { id: string; accountId: string; accountName: string; amount: number; date: string; description: string };
    tx2: { id: string; accountId: string; accountName: string; amount: number; date: string; description: string };
    diff: number;  // |amount1 + amount2| — più è piccolo, più sono simili
  }> = [];

  const used = new Set<string>();

  for (let i = 0; i < staged.length; i++) {
    if (used.has(staged[i].id)) continue;
    const a = staged[i];

    for (let j = i + 1; j < staged.length; j++) {
      if (used.has(staged[j].id)) continue;
      const b = staged[j];

      // Devono essere sullo stesso giorno
      const sameDay = a.date.toISOString().slice(0, 10) === b.date.toISOString().slice(0, 10);
      if (!sameDay) continue;

      // Devono essere su conti diversi
      if (a.accountId === b.accountId) continue;

      // La somma degli importi deve essere vicina a zero (uno in uscita, uno in entrata)
      const diff = Math.abs(Number(a.amount) + Number(b.amount));
      if (diff > TRANSFER_AMOUNT_TOLERANCE) continue;

      candidates.push({
        tx1: {
          id:          a.id,
          accountId:   a.accountId,
          accountName: a.account.name,
          amount:      Number(a.amount),
          date:        a.date.toISOString(),
          description: a.description,
        },
        tx2: {
          id:          b.id,
          accountId:   b.accountId,
          accountName: b.account.name,
          amount:      Number(b.amount),
          date:        b.date.toISOString(),
          description: b.description,
        },
        diff,
      });

      // Una volta accoppiata, non riutilizzare nessuna delle due
      used.add(a.id);
      used.add(b.id);
      break;
    }
  }

  return candidates;
}

// ── Conferma un candidato: collega + conferma entrambe le leg ─────────────────
export async function confirmTransferCandidate(txId1: string, txId2: string) {
  const { workspace } = await getWorkspaceForUser();

  const [tx1, tx2] = await Promise.all([
    prisma.transaction.findFirst({ where: { id: txId1, workspaceId: workspace.id } }),
    prisma.transaction.findFirst({ where: { id: txId2, workspaceId: workspace.id } }),
  ]);
  if (!tx1 || !tx2) throw new Error("Transazioni non trovate.");

  const groupId = randomUUID();

  await prisma.transaction.updateMany({
    where: { id: { in: [txId1, txId2] }, workspaceId: workspace.id },
    data:  { isTransfer: true, transferGroupId: groupId, status: 'CONFIRMED' },
  });

  revalidatePath('/app/transactions');
  revalidatePath('/app/dashboard');
  revalidatePath('/app/accounts');
  return { success: true, transferGroupId: groupId };
}

// ── Ignora un candidato (non fa nulla — usato dalla UI per rimuovere dalla lista)
export async function ignoreTransferCandidate(_txId1: string, _txId2: string) {
  // Non serve persistere nulla: la UI rimuove il candidato dalla lista locale.
  // Se in futuro si vuole persistere gli "ignorati", aggiungere un campo ignored.
  return { success: true };
}
