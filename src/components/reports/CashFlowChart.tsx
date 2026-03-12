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

const fmt = (n: number) => `€${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtShort = (n: number) => `€${n >= 1000 ? `${(n/1000).toFixed(0)}k` : n.toFixed(0)}`

// ── Custom tooltip ───────────────────────────────────────────────
function CashFlowTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const balance = payload[0]?.value as number
  const events: any[] = payload[0]?.payload?.events ?? []
  const date = new Date(label)

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 20,
      padding: '14px 18px',
      backdropFilter: 'blur(24px)',
      boxShadow: 'var(--shadow-lg)',
      minWidth: 190,
    }}>
      <p style={{ color: 'var(--fg-subtle)', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
        {date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
      </p>
      <p style={{ color: 'var(--accent)', fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', marginBottom: events.length ? 10 : 0 }}>
        {fmt(balance)}
      </p>
      {events.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {events.map((e: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <span style={{ color: 'var(--fg-muted)', fontSize: 10, fontWeight: 700, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }}>{e.name}</span>
              <span style={{
                fontSize: 11, fontWeight: 800, fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                color: e.amount > 0 ? 'var(--income)' : 'var(--expense)'
              }}>
                {e.amount > 0 ? '+' : ''}{fmt(e.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Custom active dot ────────────────────────────────────────────
function ActiveDot(props: any) {
  const { cx, cy } = props
  return (
    <g>
      <circle cx={cx} cy={cy} r={12} fill="var(--accent)" opacity={0.12} />
      <circle cx={cx} cy={cy} r={6} fill="var(--accent)" opacity={0.25} />
      <circle cx={cx} cy={cy} r={3.5} fill="var(--accent)" />
      <circle cx={cx} cy={cy} r={1.5} fill="var(--bg-elevated)" />
    </g>
  )
}

export default function CashFlowChart({ currentBalance, recurringItems }: CashFlowChartProps) {
  const [days, setDays] = useState<30 | 60 | 90>(30)

  const projectionData = useMemo(() => {
    return projectCashFlow(currentBalance, recurringItems, days)
  }, [currentBalance, recurringItems, days])

  // Min balance for domain padding
  const minBalance = Math.min(...projectionData.map((d: any) => d.balance))
  const maxBalance = Math.max(...projectionData.map((d: any) => d.balance))
  const padding = (maxBalance - minBalance) * 0.12

  return (
    <div className="glass p-8 rounded-[2.5rem] border border-[var(--border-subtle)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h3 className="text-xl font-display font-black text-[var(--fg-primary)] tracking-tight">Proiezione Flusso di Cassa</h3>
          <p className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest mt-1">Stima basata sulle ricorrenze attive</p>
        </div>

        <div className="flex p-1.5 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-default)] gap-1">
          {([30, 60, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200',
                days === d
                  ? 'bg-[var(--accent)] text-[var(--accent-on)] shadow-[0_4px_12px_var(--glow-accent)]'
                  : 'text-[var(--fg-muted)] hover:text-[var(--fg-primary)]'
              )}
            >
              {d}g
            </button>
          ))}
        </div>
      </div>

      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cashFlowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.40} />
                <stop offset="35%" stopColor="var(--accent)" stopOpacity={0.18} />
                <stop offset="75%" stopColor="var(--accent)" stopOpacity={0.05} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="var(--border-subtle)" opacity={0.6} />
            <XAxis
              dataKey="date"
              axisLine={false} tickLine={false}
              tick={{ fill: 'var(--fg-muted)', fontSize: 10, fontWeight: 600 }}
              tickFormatter={(str) => new Date(str).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
              dy={8}
              interval={days === 30 ? 6 : days === 60 ? 12 : 20}
            />
            <YAxis
              axisLine={false} tickLine={false}
              tick={{ fill: 'var(--fg-subtle)', fontSize: 10, fontWeight: 600 }}
              tickFormatter={fmtShort}
              domain={[minBalance - padding, maxBalance + padding]}
              width={48}
            />
            <Tooltip content={<CashFlowTooltip />} />
            <ReferenceLine
              y={currentBalance}
              stroke="var(--fg-subtle)"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{ position: 'insideTopRight', value: 'Oggi', fill: 'var(--fg-subtle)', fontSize: 9, fontWeight: 800 }}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="var(--accent)"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#cashFlowGrad)"
              dot={false}
              activeDot={<ActiveDot />}
              animationDuration={1200}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
