import { RecurringItem } from "@prisma/client"

export interface ProjectionPoint {
  date: string
  balance: number
  events: { name: string, amount: number }[]
}

export function projectCashFlow(
  currentBalance: number,
  recurringItems: RecurringItem[],
  days: number
): ProjectionPoint[] {
  const points: ProjectionPoint[] = []
  const startDate = new Date()
  startDate.setHours(0, 0, 0, 0)
  
  let runningBalance = currentBalance

  // Aggiungiamo il punto di partenza (oggi)
  points.push({
    date: startDate.toISOString().split('T')[0],
    balance: runningBalance,
    events: []
  })

  for (let i = 1; i <= days; i++) {
    const targetDate = new Date(startDate)
    targetDate.setDate(startDate.getDate() + i)
    const dateStr = targetDate.toISOString().split('T')[0]
    
    const dailyEvents: { name: string, amount: number }[] = []
    
    recurringItems.forEach(item => {
      let itemDate = new Date(item.nextDate);
      itemDate.setHours(0, 0, 0, 0);

      // Avanziamo alla prima occorrenza futura che rientra nel range
      while (itemDate.toISOString().split('T')[0] <= dateStr) {
        if (itemDate.toISOString().split('T')[0] === dateStr) {
          const amount = item.isIncome ? Number(item.amount) : -Math.abs(Number(item.amount))
          dailyEvents.push({ name: item.name, amount })
          runningBalance += amount
        }
        
        const day = itemDate.getDate();
        if (item.cadence === 'weekly') {
          itemDate.setDate(itemDate.getDate() + 7);
        } else if (item.cadence === 'monthly') {
          itemDate.setMonth(itemDate.getMonth() + 1);
          if (itemDate.getDate() !== day) itemDate.setDate(0);
        } else if (item.cadence === 'yearly') {
          itemDate.setFullYear(itemDate.getFullYear() + 1);
          if (itemDate.getDate() !== day) itemDate.setDate(0);
        } else {
          break;
        }
      }
    })

    if (dailyEvents.length > 0 || i === days) {
      points.push({
        date: dateStr,
        balance: parseFloat(runningBalance.toFixed(2)),
        events: dailyEvents
      })
    }
  }

  return points
}
