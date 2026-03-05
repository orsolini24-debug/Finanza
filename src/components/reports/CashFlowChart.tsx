'use client'

import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { RecurringItem } from '@prisma/client'
import { projectCashFlow } from '@/lib/cashflow'
import { cn } from '@/lib/utils'

interface CashFlowChartProps {
  currentBalance: number
  recurringItems: RecurringItem[]
}

export default function CashFlowChart({ currentBalance, recurringItems }: CashFlowChartProps) {
  const [days, setDays] = useState<30 | 60 | 90>(30)

  const projectionData = useMemo(() => {
    return projectCashFlow(currentBalance, recurringItems, days)
  }, [currentBalance, recurringItems, days])

  const fmt = (n: number) => `€${n.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`;

  return (
    <div className="glass p-8 rounded-[2.5rem] border border-[var(--border-subtle)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h3 className="text-xl font-display font-bold text-[var(--fg-primary)]">Proiezione Flusso di Cassa</h3>
          <p className="text-xs text-[var(--fg-muted)] font-medium mt-1">Stima del saldo futuro basata sulle ricorrenze</p>
        </div>
        
        <div className="flex p-1 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-default)]">
          {[30, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                days === d ? "bg-[var(--accent)] text-[var(--accent-on)] shadow-lg" : "text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
              )}
            >
              {d} Giorni
            </button>
          ))}
        </div>
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--fg-muted)', fontSize: 10 }}
              tickFormatter={(str) => new Date(str).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--fg-muted)', fontSize: 10 }}
              tickFormatter={(v) => `€${v}`}
              domain={['auto', 'auto']}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}
              labelFormatter={(str) => new Date(str).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
              formatter={(value: any, name: any, item: any) => {
                const v = value as number;
                const events = item.payload.events
                return [
                  <div key="val" className="space-y-2">
                    <div className="font-bold text-lg">{fmt(v)}</div>
                    {events.length > 0 && (
                      <div className="border-t border-[var(--border-subtle)] pt-2 space-y-1">
                        {events.map((e: any, i: number) => (
                          <div key={i} className="flex justify-between gap-4 text-[10px] uppercase font-bold">
                            <span className="text-[var(--fg-muted)]">{e.name}</span>
                            <span className={e.amount > 0 ? "text-[var(--income)]" : "text-[var(--expense)]"}>
                              {e.amount > 0 ? '+' : ''}{fmt(e.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>,
                  "Saldo Stimato"
                ]
              }}
            />
            <ReferenceLine y={currentBalance} stroke="var(--fg-subtle)" strokeDasharray="3 3" label={{ position: 'right', value: 'Oggi', fill: 'var(--fg-subtle)', fontSize: 10, fontWeight: 'bold' }} />
            <Area 
              type="monotone" 
              dataKey="balance" 
              stroke="var(--accent)" 
              strokeWidth={3} 
              fillOpacity={1} 
              fill="url(#colorBalance)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
