'use client'

import dynamic from 'next/dynamic'
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

interface ReportsClientProps {
  historyData: any[]
  topCategories: any[]
}

const CAT_COLORS = [
  'var(--accent)',
  'var(--expense)',
  'var(--warning)',
  'var(--income)',
  'var(--fg-muted)',
]

export function ReportsClient({ historyData, topCategories }: ReportsClientProps) {
  
  const barOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'var(--bg-surface)',
      borderColor: 'var(--border-default)',
      textStyle: { color: 'var(--fg-primary)', fontFamily: 'Inter, sans-serif' },
      formatter: (params: any[]) => {
        return params.map(p => `${p.seriesName}: €${Number(p.value).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`).join('<br/>')
      }
    },
    grid: { left: '3%', right: '3%', bottom: '3%', top: '15%', containLabel: true },
    xAxis: { type: 'category', data: historyData.map(d => d.name), axisLabel: { color: 'var(--fg-subtle)', fontWeight: 700 }, axisLine: { show: false }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: { color: 'var(--fg-subtle)', formatter: (v: number) => '€' + (v >= 1000 ? (v/1000).toFixed(0) + 'k' : v) }, splitLine: { lineStyle: { type: 'dashed', color: 'var(--border-subtle)', opacity: 0.6 } } },
    series: [
      {
        name: 'Entrate', type: 'bar', data: historyData.map(d => d.income), barMaxWidth: 40,
        itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'var(--income)' }, { offset: 1, color: 'color-mix(in srgb, var(--income) 40%, transparent)' }] }, borderRadius: [8, 8, 0, 0] }
      },
      {
        name: 'Uscite', type: 'bar', data: historyData.map(d => d.expenses), barMaxWidth: 40,
        itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'var(--expense)' }, { offset: 1, color: 'color-mix(in srgb, var(--expense) 40%, transparent)' }] }, borderRadius: [8, 8, 0, 0] }
      }
    ]
  }

  const savingsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'var(--bg-surface)',
      borderColor: 'var(--border-default)',
      textStyle: { color: 'var(--fg-primary)', fontFamily: 'Inter, sans-serif' },
      formatter: (params: any[]) => {
        const val = params[0].value
        return `Risparmio<br/>€${Number(val).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
      }
    },
    grid: { left: '3%', right: '3%', bottom: '3%', top: '15%', containLabel: true },
    xAxis: { type: 'category', data: historyData.map(d => d.name), axisLabel: { color: 'var(--fg-subtle)', fontWeight: 700 }, axisLine: { show: false }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: { color: 'var(--fg-subtle)', formatter: (v: number) => '€' + (v >= 1000 ? (v/1000).toFixed(0) + 'k' : v) }, splitLine: { lineStyle: { type: 'dashed', color: 'var(--border-subtle)', opacity: 0.6 } } },
    series: [{
      name: 'Risparmio', type: 'line', smooth: true,
      data: historyData.map(d => d.savings),
      lineStyle: { color: 'var(--accent)', width: 3 },
      symbol: 'circle', symbolSize: 8,
      itemStyle: { color: 'var(--accent)' },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: 'color-mix(in srgb, var(--accent) 40%, transparent)' }, { offset: 1, color: 'transparent' }] } }
    }]
  }

  const catOption = {
    backgroundColor: 'transparent',
    tooltip: { 
      trigger: 'item',
      backgroundColor: 'var(--bg-surface)',
      borderColor: 'var(--border-default)',
      textStyle: { color: 'var(--fg-primary)', fontFamily: 'Inter, sans-serif' },
      formatter: (p: any) => `${p.name}: €${Number(p.value).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
    },
    grid: { left: '20%', right: '5%', top: '5%', bottom: '5%', containLabel: true },
    xAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed', color: 'var(--border-subtle)', opacity: 0.6 } }, axisLabel: { formatter: (v: number) => '€' + (v >= 1000 ? (v/1000).toFixed(0) + 'k' : v), color: 'var(--fg-subtle)' } },
    yAxis: { type: 'category', data: topCategories.map(c => c.name), axisLabel: { color: 'var(--fg-primary)', fontWeight: 700 }, axisLine: { show: false }, axisTick: { show: false } },
    series: [{
      type: 'bar', data: topCategories.map((c, i) => ({
        value: c.amount,
        itemStyle: { color: CAT_COLORS[i % CAT_COLORS.length], borderRadius: [0, 8, 8, 0] }
      })), barMaxWidth: 32,
      label: { show: true, position: 'right', formatter: (p: any) => `€${p.value}`, color: 'var(--fg-muted)', fontWeight: 'bold' }
    }]
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* ── Entrate vs Uscite ── */}
      <div className="glass p-8 rounded-[2.5rem] border border-[var(--border-subtle)] lg:col-span-2">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h3 className="text-xl font-display font-black text-[var(--fg-primary)] tracking-tight">Entrate vs Uscite</h3>
            <p className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest mt-1">Ultimi 6 mesi</p>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
            <span className="flex items-center gap-1.5 text-[var(--income)]">
              <span className="w-2 h-2 rounded-full bg-[var(--income)] shadow-[0_0_6px_var(--income)]" />
              Entrate
            </span>
            <span className="flex items-center gap-1.5 text-[var(--expense)]">
              <span className="w-2 h-2 rounded-full bg-[var(--expense)] shadow-[0_0_6px_var(--expense)]" />
              Uscite
            </span>
          </div>
        </div>
        <div className="h-[320px] w-full">
          <ReactECharts option={barOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
        </div>
      </div>

      {/* ── Trend Risparmio ── */}
      <div className="glass p-8 rounded-[2.5rem] border border-[var(--border-subtle)]">
        <div className="mb-6">
          <h3 className="text-xl font-display font-black text-[var(--fg-primary)] tracking-tight">Risparmio Netto</h3>
          <p className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest mt-1">Trend mensile</p>
        </div>
        <div className="h-[280px] w-full">
          <ReactECharts option={savingsOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
        </div>
      </div>

      {/* ── Top Categorie ── */}
      <div className="glass p-8 rounded-[2.5rem] border border-[var(--border-subtle)]">
        <div className="mb-6">
          <h3 className="text-xl font-display font-black text-[var(--fg-primary)] tracking-tight">Top Categorie</h3>
          <p className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest mt-1">Maggiori uscite · 6 mesi</p>
        </div>
        <div className="h-[280px] w-full">
          <ReactECharts option={catOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
        </div>
      </div>
    </div>
  )
}
