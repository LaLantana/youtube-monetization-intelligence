import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { RefreshCw, DollarSign, Gauge, Rocket, Clock3 } from 'lucide-react';

const CONNECTION = 'data_plane_motherduck';

const KPI_QUERY = `
SELECT *
FROM {{ ref('dashboard1_monetization_kpis', flow='youtube_trending_intelligence') }}
`;

const HEALTH_TREND_QUERY = `
SELECT *
FROM {{ ref('dashboard1_platform_health_trend', flow='youtube_trending_intelligence') }}
`;

const MONETIZATION_QUERY = `
SELECT *
FROM {{ ref('dashboard1_top_categories', flow='youtube_trending_intelligence') }}
`;

const FINGERPRINT_QUERY = `
SELECT *
FROM {{ ref('dashboard1_viral_fingerprint_profile', flow='youtube_trending_intelligence') }}
`;

function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number(value || 0));
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatMonthLabel(value) {
  if (!value) return '';
  return String(value).slice(0, 7);
}

function StatCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-xl bg-slate-900 p-3 text-white">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kpis, setKpis] = useState(null);
  const [healthTrend, setHealthTrend] = useState([]);
  const [monetizationRows, setMonetizationRows] = useState([]);
  const [fingerprintRows, setFingerprintRows] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const kpiResult = await window.ascend.runQuery(KPI_QUERY, { connection: CONNECTION });
      const healthTrendResult = await window.ascend.runQuery(HEALTH_TREND_QUERY, { connection: CONNECTION });
      const monetizationResult = await window.ascend.runQuery(MONETIZATION_QUERY, { connection: CONNECTION });
      const fingerprintResult = await window.ascend.runQuery(FINGERPRINT_QUERY, { connection: CONNECTION });

      setKpis(kpiResult.rows?.[0] || null);
      setHealthTrend(healthTrendResult.rows || []);
      setMonetizationRows(monetizationResult.rows || []);
      setFingerprintRows(fingerprintResult.rows || []);
    } catch (err) {
      setError(err?.message || 'Failed to load monetization dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const topMonetizationRows = useMemo(() => monetizationRows.slice(0, 12), [monetizationRows]);
  const topFingerprintRows = useMemo(() => fingerprintRows.slice(0, 12), [fingerprintRows]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">YouTube Monetization Intelligence Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Current monetization patterns, platform health, and viral revenue signals.</p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Average platform health"
            value={formatNumber(kpis?.avg_platform_health_index, 2)}
            subtitle="Monthly platform health index"
            icon={Gauge}
          />
          <StatCard
            title="Average monthly revenue"
            value={formatCurrency(kpis?.avg_monthly_estimated_revenue)}
            subtitle="Average monthly estimated revenue"
            icon={DollarSign}
          />
          <StatCard
            title="Average engagement quality"
            value={formatNumber(kpis?.avg_engagement_quality_score, 4)}
            subtitle="Like/comment quality score"
            icon={Rocket}
          />
          <StatCard
            title="Tracked unique videos"
            value={formatNumber(kpis?.total_unique_videos, 0)}
            subtitle="Unique videos across monthly output"
            icon={Clock3}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Long-form platform health trend</h2>
            <p className="mt-1 text-sm text-slate-500">Monthly health index and revenue trend for long-form content.</p>
            <div className="mt-4 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={healthTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="snapshot_month" tickFormatter={formatMonthLabel} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip labelFormatter={formatMonthLabel} />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="avg_monthly_platform_health_index" name="Platform health" stroke="#0f172a" fill="#cbd5e1" />
                  <Line yAxisId="right" type="monotone" dataKey="avg_estimated_revenue" name="Avg revenue" stroke="#2563eb" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Top monetization categories</h2>
            <p className="mt-1 text-sm text-slate-500">Highest recency-weighted revenue categories across monthly quadrant leaders.</p>
            <div className="mt-4 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topMonetizationRows} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" />
                  <YAxis dataKey="youtube_category_name" type="category" width={120} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="avg_recency_weighted_estimated_revenue" name="Recency-weighted revenue" fill="#0f766e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Viral fingerprint revenue profile</h2>
            <p className="mt-1 text-sm text-slate-500">How approved fingerprint classes compare on recency-weighted revenue.</p>
            <div className="mt-4 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topFingerprintRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="viral_fingerprint" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} labelFormatter={formatMonthLabel} />
                  <Legend />
                  <Bar dataKey="avg_recency_weighted_estimated_revenue" name="Recency-weighted revenue" fill="#7c3aed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Current leading monetization rows</h2>
            <p className="mt-1 text-sm text-slate-500">Top ranked category-month combinations from the validated monetization output.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="px-3 py-2 font-medium">Month</th>
                    <th className="px-3 py-2 font-medium">Quadrant</th>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Weighted revenue</th>
                    <th className="px-3 py-2 font-medium">RPM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topMonetizationRows.map((row, index) => (
                    <tr key={`${row.snapshot_month}-${row.monetization_quadrant}-${row.youtube_category_name}-${index}`}>
                      <td className="px-3 py-2">{formatMonthLabel(row.snapshot_month)}</td>
                      <td className="px-3 py-2">{row.monetization_quadrant}</td>
                      <td className="px-3 py-2">{row.youtube_category_name || 'Uncategorized'}</td>
                      <td className="px-3 py-2">{formatCurrency(row.avg_recency_weighted_estimated_revenue)}</td>
                      <td className="px-3 py-2">{formatNumber(row.avg_estimated_rpm, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}