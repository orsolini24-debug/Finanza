'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })
import { RecurringItem } from '@prisma/client'
import { projectCashFlow } from '@/lib/cashflow'
import { cn } from '@/lib/utils'

interface CashFlowChartProps {
  currentBalance: number
  recurringItems: RecurringItem[]
}

const fmtShort = (n: number) => `€${n >= 1000 ? `${(n/1000).toFixed(0)}k` : n.toFixed(0)}`

export default function CashFlowChart({ currentBalance, recurringItems }: CashFlowChartProps) {
  const [days, setDays] = useState<30 | 60 | 90>(30)

  const projectionData = useMemo(() => {
    return projectCashFlow(currentBalance, recurringItems, days)
  }, [currentBalance, recurringItems, days])

  const minBalance = Math.min(...projectionData.map((d: any) => d.balance))
  const maxBalance = Math.max(...projectionData.map((d: any) => d.balance))
  const padding = (maxBalance - minBalance) * 0.12

  const cashFlowOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'var(--bg-surface)',
      borderColor: 'var(--border-default)',
      textStyle: { color: 'var(--fg-primary)', fontFamily: 'Inter, sans-serif' },
      formatter: (params: any[]) => {
        const p = params[0]
        const dataPoint = projectionData.find(d => d.date === p.name)
        const eventsHtml = dataPoint && dataPoint.events && dataPoint.events.length > 0 
          ? `<div style="border-top: 1px solid var(--border-subtle); margin-top: 8px; padding-top: 8px;">` + 
            dataPoint.events.map((e: any) => 
              `<div style="display: flex; justify-content: space-between; font-size: 11px;">` +
              `<span style="color: var(--fg-muted);">${e.name}</span>` +
              `<span style="color: ${e.amount > 0 ? 'var(--income)' : 'var(--expense)'}; font-weight: bold; margin-left: 12px;">${e.amount > 0 ? '+' : ''}${e.amount}</span>` +
              `</div>`
            ).join('') + `</div>`
          : ''
        return `${new Date(p.name).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}<br/><span style="font-weight: bold; font-size: 14px;">Saldo: €${Number(p.value).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>${eventsHtml}`
      }
    },
    grid: { left: '3%', right: '3%', bottom: '3%', top: '15%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: projectionData.map(d => d.date), 
      axisLabel: { color: 'var(--fg-subtle)', formatter: (v: string) => new Date(v).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    yAxis: { 
      type: 'value', 
      axisLabel: { formatter: (v: number) => '€' + (v >= 1000 ? (v/1000 % 1 === 0 ? (v/1000).toFixed(0) : (v/1000).toFixed(1)) + 'k' : v), color: 'var(--fg-subtle)' },
      splitLine: { lineStyle: { type: 'dashed', color: 'var(--border-subtle)', opacity: 0.6 } },
      min: minBalance - padding,
      max: maxBalance + padding
    },
    series: [{
      name: 'Saldo', type: 'line', smooth: true,
      data: projectionData.map(d => d.balance),
      lineStyle: { color: 'var(--accent)', width: 3 },
      symbol: 'circle', symbolSize: 6,
      itemStyle: { color: 'var(--accent)' },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: 'color-mix(in srgb, var(--accent) 35%, transparent)' }, { offset: 1, color: 'transparent' }] } },
      markLine: {
        data: [{ yAxis: currentBalance, label: { position: 'insideStartTop', formatter: 'Oggi' }, lineStyle: { color: 'var(--fg-subtle)', type: 'dashed' } }]
      }
    }]
  }

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
        <ReactECharts option={cashFlowOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
      </div>
    </div>
  )
}
