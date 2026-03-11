import { NextRequest, NextResponse } from 'next/server'
import prisma from "@/lib/prisma"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const overdueItems = await prisma.recurringItem.findMany({
      where: { nextDate: { lte: today } }
    });

    let processed = 0;
    for (const item of overdueItems) {
      if (!item.accountId) continue;

      await prisma.transaction.create({
        data: {
          workspaceId: item.workspaceId,
          accountId: item.accountId,
          categoryId: item.categoryId,
          description: item.name,
          amount: item.isIncome ? item.amount : -Math.abs(Number(item.amount)),
          date: item.nextDate,
          status: 'CONFIRMED',
        }
      });

      let nextDate = new Date(item.nextDate);
      if (item.cadence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
      else if (item.cadence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
      else if (item.cadence === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);

      await prisma.recurringItem.update({
        where: { id: item.id },
        data: { nextDate }
      });
      processed++;
    }

    return NextResponse.json({ processed, success: true });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
