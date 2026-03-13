'use client'
import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })
import { cn } from '@/lib/utils'
import { TrendingUp } from 'lucide-react'

interface Props {
  initialNetWorth: number
  avgMonthlySavings: number
}

export default function SimulatorClient({ initialNetWorth, avgMonthlySavings }: Props) {
  const [monthlySavings, setMonthlySavings] = useState(Math.max(0, Math.round(avgMonthlySavings)))
  const [annualReturn, setAnnualReturn] = useState(5)
  const [years, setYears] = useState(10)

  const projectionData = useMemo(() => {
    const points = []
    let capital = initialNetWorth
    const monthlyReturn = annualReturn / 100 / 12
    for (let m = 0; m <= years * 12; m++) {
      if (m > 0) capital = capital * (1 + monthlyReturn) + monthlySavings
      points.push({ month: m, value: Math.round(capital) })
    }
    return points
  }, [initialNetWorth, monthlySavings, annualReturn, years])

  const finalValue = projectionData[projectionData.length - 1]?.value ?? 0
  const totalContributed = initialNetWorth + monthlySavings * years * 12
  const totalInterest = finalValue - totalContributed

  const chartOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', formatter: (params: any[]) => `Mese ${params[0].data[0]}: €${params[0].data[1].toLocaleString('it-IT')}` },
    grid: { left: '3%', right: '3%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', name: 'Mesi', axisLabel: { color: 'var(--fg-subtle)' } },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => '€' + (v >= 1000 ? (v/1000 % 1 === 0 ? (v/1000).toFixed(0) : (v/1000).toFixed(1)) + 'k' : v), color: 'var(--fg-subtle)' } },
    series: [{
      type: 'line', smooth: true,
      data: projectionData.map(p => [p.month, p.value]),
      lineStyle: { color: 'var(--accent)', width: 3 },
      itemStyle: { color: 'var(--accent)' },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: 'color-mix(in srgb, var(--accent) 40%, transparent)' }, { offset: 1, color: 'transparent' }] } },
      showSymbol: false,
    }]
  }

  const fmt = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-[var(--accent)] text-[var(--accent-on)] rounded-2xl"><TrendingUp size={20} /></div>
        <div>
          <h1 className="text-2xl font-display font-black text-[var(--fg-primary)]">Simulatore Patrimoniale</h1>
          <p className="text-[11px] text-[var(--fg-muted)] font-medium uppercase tracking-wider">Proiezione compound interest</p>
        </div>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Risparmio mensile', value: monthlySavings, min: 0, max: 5000, step: 50, set: setMonthlySavings, unit: '€/mese' },
          { label: 'Rendimento annuo', value: annualReturn, min: 0, max: 15, step: 0.5, set: setAnnualReturn, unit: '%/anno' },
          { label: 'Orizzonte temporale', value: years, min: 1, max: 40, step: 1, set: setYears, unit: 'anni' },
        ].map(({ label, value, min, max, step, set, unit }) => (
          <div key={label} className="glass p-6 rounded-2xl border border-[var(--border-subtle)] space-y-3">
            <div className="flex justify-between items-baseline">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--fg-subtle)]">{label}</label>
              <span className="text-lg font-black font-mono text-[var(--accent)]">{value} <span className="text-[10px] text-[var(--fg-muted)]">{unit}</span></span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value}
              onChange={e => set(Number(e.target.value))}
              className="w-full accent-[var(--accent)] cursor-pointer" />
          </div>
        ))}
      </div>

      {/* KPI proiezione */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Valore finale', value: fmt(finalValue), color: 'var(--income)' },
          { label: 'Contribuiti', value: fmt(totalContributed), color: 'var(--fg-primary)' },
          { label: 'Interessi maturati', value: fmt(totalInterest), color: 'var(--accent)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass p-5 rounded-2xl border border-[var(--border-subtle)] text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--fg-subtle)] mb-1">{label}</p>
            <p className="text-xl font-mono font-black truncate" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Grafico */}
      <div className="glass p-6 rounded-[2rem] border border-[var(--border-subtle)]">
        <ReactECharts option={chartOption} style={{ height: '320px', width: '100%' }} />
      </div>

      <p className="text-[10px] text-[var(--fg-subtle)] font-medium text-center">
        Simulazione basata su interesse composto mensile. I rendimenti passati non garantiscono quelli futuri.<br/>
        Patrimonio netto attuale: <span className="font-bold text-[var(--fg-primary)]">{fmt(initialNetWorth)}</span>.
      </p>
    </div>
  )
}