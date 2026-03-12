'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, Legend } from 'recharts'

interface ReportsClientProps {
  historyData: any[]
  topCategories: any[]
}

const fmt = (n: number) => `€${n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

// ── Custom tooltip — income vs expenses ──────────────────────────
function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 20,
      padding: '14px 18px',
      backdropFilter: 'blur(24px)',
      boxShadow: 'var(--shadow-lg)',
      minWidth: 160,
    }}>
      <p style={{ color: 'var(--fg-subtle)', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < payload.length - 1 ? 6 : 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.fill, flexShrink: 0, boxShadow: `0 0 6px ${p.fill}` }} />
          <span style={{ color: 'var(--fg-muted)', fontSize: 11, fontWeight: 700, flex: 1 }}>{p.name}</span>
          <span style={{ color: 'var(--fg-primary)', fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{fmt(p.value)}</span>
        </div>
      ))}
      {payload.length === 2 && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 10, paddingTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ color: 'var(--fg-subtle)', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Risparmio</span>
            <span style={{
              fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
              color: payload[0].value - payload[1].value >= 0 ? 'var(--income)' : 'var(--expense)'
            }}>
              {payload[0].value - payload[1].value >= 0 ? '+' : ''}{fmt(payload[0].value - payload[1].value)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Custom tooltip — savings area ────────────────────────────────
function AreaTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value ?? 0
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 16,
      padding: '12px 16px',
      backdropFilter: 'blur(24px)',
      boxShadow: 'var(--shadow-lg)',
    }}>
      <p style={{ color: 'var(--fg-subtle)', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>{label}</p>
      <p style={{ color: val >= 0 ? 'var(--income)' : 'var(--expense)', fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
        {val >= 0 ? '+' : ''}{fmt(val)}
      </p>
    </div>
  )
}

// ── Custom tooltip — top categories ─────────────────────────────
function CatTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 16,
      padding: '12px 16px',
      backdropFilter: 'blur(24px)',
      boxShadow: 'var(--shadow-lg)',
    }}>
      <p style={{ color: 'var(--fg-primary)', fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{fmt(payload[0]?.value)}</p>
    </div>
  )
}

// ── Custom active dot ────────────────────────────────────────────
function ActiveDot(props: any) {
  const { cx, cy, stroke } = props
  return (
    <g>
      <circle cx={cx} cy={cy} r={10} fill={stroke} opacity={0.15} />
      <circle cx={cx} cy={cy} r={5} fill={stroke} />
      <circle cx={cx} cy={cy} r={2.5} fill="var(--bg-elevated)" />
    </g>
  )
}

// ── Expense-scale color per bar ───────────────────────────────────
const CAT_COLORS = [
  'var(--accent)',
  'var(--expense)',
  'var(--warning)',
  'var(--income)',
  'var(--fg-muted)',
]

export function ReportsClient({ historyData, topCategories }: ReportsClientProps) {
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
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={historyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--income)" stopOpacity={1} />
                  <stop offset="100%" stopColor="var(--income)" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--expense)" stopOpacity={1} />
                  <stop offset="100%" stopColor="var(--expense)" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="var(--border-subtle)" opacity={0.6} />
              <XAxis
                dataKey="name"
                axisLine={false} tickLine={false}
                tick={{ fill: 'var(--fg-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '-0.01em' }}
                dy={8}
              />
              <YAxis
                axisLine={false} tickLine={false}
                tick={{ fill: 'var(--fg-subtle)', fontSize: 10, fontWeight: 600 }}
                tickFormatter={(v) => `€${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                width={44}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: 'var(--border-subtle)', opacity: 0.5, radius: 8 }} />
              <Bar name="Entrate" dataKey="income" fill="url(#incomeGrad)" radius={[8, 8, 2, 2]} barSize={28} animationDuration={800} animationEasing="ease-out" />
              <Bar name="Uscite" dataKey="expenses" fill="url(#expenseGrad)" radius={[8, 8, 2, 2]} barSize={28} animationDuration={800} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Trend Risparmio ── */}
      <div className="glass p-8 rounded-[2.5rem] border border-[var(--border-subtle)]">
        <div className="mb-6">
          <h3 className="text-xl font-display font-black text-[var(--fg-primary)] tracking-tight">Risparmio Netto</h3>
          <p className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest mt-1">Trend mensile</p>
        </div>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                  <stop offset="40%" stopColor="var(--accent)" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="var(--border-subtle)" opacity={0.6} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--fg-muted)', fontSize: 11, fontWeight: 700 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--fg-subtle)', fontSize: 10, fontWeight: 600 }} tickFormatter={(v) => `€${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} width={44} />
              <Tooltip content={<AreaTooltip />} />
              <Area
                type="monotoneX"
                dataKey="savings"
                stroke="var(--accent)"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#savingsGrad)"
                dot={false}
                activeDot={<ActiveDot />}
                animationDuration={1000}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Top Categorie ── */}
      <div className="glass p-8 rounded-[2.5rem] border border-[var(--border-subtle)]">
        <div className="mb-6">
          <h3 className="text-xl font-display font-black text-[var(--fg-primary)] tracking-tight">Top Categorie</h3>
          <p className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest mt-1">Maggiori uscite · 6 mesi</p>
        </div>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topCategories} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="2 4" horizontal={false} stroke="var(--border-subtle)" opacity={0.5} />
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false} tickLine={false}
                tick={{ fill: 'var(--fg-muted)', fontSize: 11, fontWeight: 700 }}
                width={80}
              />
              <Tooltip content={<CatTooltip />} cursor={{ fill: 'var(--border-subtle)', opacity: 0.4, radius: 6 }} />
              <Bar dataKey="amount" radius={[0, 8, 8, 0]} barSize={22} animationDuration={900} animationEasing="ease-out">
                {topCategories.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CAT_COLORS[index % CAT_COLORS.length]}
                    fillOpacity={1 - index * 0.08}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}
