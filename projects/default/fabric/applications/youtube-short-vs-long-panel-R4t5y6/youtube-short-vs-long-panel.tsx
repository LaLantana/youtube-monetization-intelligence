import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { RefreshCw, Timer, PlaySquare, TrendingUp } from 'lucide-react';

const CONNECTION = 'data_plane_motherduck';

const PANEL_QUERY = `
SELECT *
FROM {{ ref('dashboard2_panel_metrics', flow='youtube_trending_intelligence') }}
ORDER BY snapshot_month, content_length_track
`;

const REVENUE_TREND_QUERY = `
SELECT *
FROM {{ ref('dashboard2_revenue_trend', flow='youtube_trending_intelligence') }}
`;

const PREMIUM_SHARE_TREND_QUERY = `
SELECT *
FROM {{ ref('dashboard2_premium_share_trend', flow='youtube_trending_intelligence') }}
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

function formatPercent(value) {
  return `${formatNumber(Number(value || 0) * 100, 1)}%`;
}

function formatMonthLabel(value) {
  return value ? String(value).slice(0, 7) : '';
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
  const [rows, setRows] = useState([]);
  const [revenueTrendRows, setRevenueTrendRows] = useState([]);
  const [premiumShareRows, setPremiumShareRows] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const panelResult = await window.ascend.runQuery(PANEL_QUERY, { connection: CONNECTION });
      const revenueTrendResult = await window.ascend.runQuery(REVENUE_TREND_QUERY, { connection: CONNECTION });
      const premiumShareTrendResult = await window.ascend.runQuery(PREMIUM_SHARE_TREND_QUERY, { connection: CONNECTION });

      setRows(panelResult.rows || []);
      setRevenueTrendRows(revenueTrendResult.rows || []);
      setPremiumShareRows(premiumShareTrendResult.rows || []);
    } catch (err) {
      setError(err?.message || 'Failed to load comparative panel data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const latestMonth = useMemo(() => {
    return rows.length ? rows.map((row) => row.snapshot_month).sort().slice(-1)[0] : null;
  }, [rows]);

  const latestRows = useMemo(() => rows.filter((row) => row.snapshot_month === latestMonth), [rows, latestMonth]);

  const shortRow = latestRows.find((row) => row.content_length_track === 'short_form');
  const longRow = latestRows.find((row) => row.content_length_track === 'long_form');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Short Form vs Long Form Comparative Panel</h1>
            <p className="mt-1 text-sm text-slate-500">Track how short-form and long-form monetization and engagement diverge over time.</p>
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

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Latest long-form revenue"
            value={formatCurrency(longRow?.avg_estimated_revenue)}
            subtitle={`Month ${formatMonthLabel(latestMonth)}`}
            icon={TrendingUp}
          />
          <StatCard
            title="Latest short-form revenue"
            value={formatCurrency(shortRow?.avg_estimated_revenue)}
            subtitle={`Month ${formatMonthLabel(latestMonth)}`}
            icon={PlaySquare}
          />
          <StatCard
            title="Lag delta vs long-form"
            value={formatNumber(shortRow?.avg_publish_to_trending_lag_hours - (longRow?.avg_publish_to_trending_lag_hours || 0), 1)}
            subtitle="Short-form minus long-form hours"
            icon={Timer}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Revenue trend by format</h2>
            <div className="mt-4 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrendRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="snapshot_month" tickFormatter={formatMonthLabel} />
                  <YAxis />
                  <Tooltip labelFormatter={formatMonthLabel} formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="avg_estimated_revenue" name="Avg revenue" stroke="#0f172a" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Premium share by format</h2>
            <div className="mt-4 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={premiumShareRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="snapshot_month" tickFormatter={formatMonthLabel} />
                  <YAxis tickFormatter={formatPercent} />
                  <Tooltip labelFormatter={formatMonthLabel} formatter={(value) => formatPercent(value)} />
                  <Legend />
                  <Bar dataKey="premium_share" name="Premium share" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Latest month comparison</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2 font-medium">Format</th>
                  <th className="px-3 py-2 font-medium">Videos</th>
                  <th className="px-3 py-2 font-medium">Avg revenue</th>
                  <th className="px-3 py-2 font-medium">Weighted revenue</th>
                  <th className="px-3 py-2 font-medium">Engagement</th>
                  <th className="px-3 py-2 font-medium">Lag hours</th>
                  <th className="px-3 py-2 font-medium">Premium share</th>
                  <th className="px-3 py-2 font-medium">Fingerprint share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {latestRows.map((row) => (
                  <tr key={`${row.snapshot_month}-${row.content_length_track}`}>
                    <td className="px-3 py-2">{row.content_length_track}</td>
                    <td className="px-3 py-2">{formatNumber(row.unique_video_count)}</td>
                    <td className="px-3 py-2">{formatCurrency(row.avg_estimated_revenue)}</td>
                    <td className="px-3 py-2">{formatCurrency(row.avg_recency_weighted_estimated_revenue)}</td>
                    <td className="px-3 py-2">{formatNumber(row.avg_engagement_quality_score, 4)}</td>
                    <td className="px-3 py-2">{formatNumber(row.avg_publish_to_trending_lag_hours, 1)}</td>
                    <td className="px-3 py-2">{formatPercent(row.premium_share)}</td>
                    <td className="px-3 py-2">{formatPercent(row.viral_fingerprint_share)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}