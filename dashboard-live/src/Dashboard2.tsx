// Dashboard 2 — Short Form vs Long Form Comparative Panel.
// Finished version of the hackathon draft (projects/default/fabric/applications/
// youtube-short-vs-long-panel-R4t5y6): restyled to the app's dark theme and the
// trend charts pivoted into one series per content-length track (the draft
// plotted a single series over interleaved short/long rows).
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
FROM dashboard2_panel_metrics
ORDER BY snapshot_month, content_length_track
`;

const REVENUE_TREND_QUERY = `
SELECT *
FROM dashboard2_revenue_trend
ORDER BY snapshot_month, content_length_track
`;

const PREMIUM_SHARE_TREND_QUERY = `
SELECT *
FROM dashboard2_premium_share_trend
ORDER BY snapshot_month, content_length_track
`;

const TRACK_COLORS = {
  long_form: '#0ea5e9',
  short_form: '#14b8a6',
};

const TRACK_LABELS = {
  long_form: 'Long form',
  short_form: 'Short form',
};

const chartAxisProps = { stroke: '#64748b', tick: { fill: '#94a3b8', fontSize: 12 } };
const tooltipStyle = {
  contentStyle: { backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 12 },
  labelStyle: { color: '#e2e8f0' },
};

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

// rows (one per month x track) -> one object per month with a key per track.
function pivotByTrack(rows, valueKey) {
  const byMonth = new Map();
  for (const row of rows) {
    const month = formatMonthLabel(row.snapshot_month);
    if (!byMonth.has(month)) byMonth.set(month, { month });
    byMonth.get(month)[row.content_length_track] = row[valueKey];
  }
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}

function StatCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
          <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
        </div>
        <div className="rounded-xl bg-slate-800 p-3 text-sky-300">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard2() {
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

  const latestMonth = useMemo(
    () => (rows.length ? rows.map((row) => row.snapshot_month).sort().slice(-1)[0] : null),
    [rows],
  );
  const latestRows = useMemo(
    () => rows.filter((row) => row.snapshot_month === latestMonth),
    [rows, latestMonth],
  );
  const shortRow = latestRows.find((row) => row.content_length_track === 'short_form');
  const longRow = latestRows.find((row) => row.content_length_track === 'long_form');

  const revenueByMonth = useMemo(
    () => pivotByTrack(revenueTrendRows, 'avg_estimated_revenue'),
    [revenueTrendRows],
  );
  const premiumShareByMonth = useMemo(
    () => pivotByTrack(premiumShareRows, 'premium_share'),
    [premiumShareRows],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">
            Dashboard 2 · Short vs Long Form
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">
            Short Form vs Long Form Comparative Panel
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            How short-form and long-form monetization and engagement diverge over time. Format
            classification comes from YouTube Data API durations, enriched daily.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && !shortRow && (
        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-slate-200">
          No short-form rows in the latest month yet — the format split depends on video-duration
          enrichment, which fills in as daily runs progress.
        </div>
      )}

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
          value={formatNumber(
            (shortRow?.avg_publish_to_trending_lag_hours || 0) -
              (longRow?.avg_publish_to_trending_lag_hours || 0),
            1,
          )}
          subtitle="Short-form minus long-form hours to trend"
          icon={Timer}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
          <h2 className="text-xl font-semibold text-white">Revenue trend by format</h2>
          <p className="mt-1 text-sm text-slate-400">Average estimated revenue per video, monthly.</p>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" {...chartAxisProps} />
                <YAxis {...chartAxisProps} />
                <Tooltip {...tooltipStyle} formatter={(value, name) => [formatCurrency(value), name]} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="long_form"
                  name={TRACK_LABELS.long_form}
                  stroke={TRACK_COLORS.long_form}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="short_form"
                  name={TRACK_LABELS.short_form}
                  stroke={TRACK_COLORS.short_form}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
          <h2 className="text-xl font-semibold text-white">Premium share by format</h2>
          <p className="mt-1 text-sm text-slate-400">
            Share of each format's videos landing in the premium monetization quadrant.
          </p>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={premiumShareByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" {...chartAxisProps} />
                <YAxis {...chartAxisProps} tickFormatter={formatPercent} />
                <Tooltip {...tooltipStyle} formatter={(value, name) => [formatPercent(value), name]} />
                <Legend />
                <Bar dataKey="long_form" name={TRACK_LABELS.long_form} fill={TRACK_COLORS.long_form} />
                <Bar dataKey="short_form" name={TRACK_LABELS.short_form} fill={TRACK_COLORS.short_form} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
        <h2 className="text-xl font-semibold text-white">Latest month comparison</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead>
              <tr className="text-left text-slate-400">
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
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {latestRows.map((row) => (
                <tr key={`${row.snapshot_month}-${row.content_length_track}`}>
                  <td className="px-3 py-2">{TRACK_LABELS[row.content_length_track] || row.content_length_track}</td>
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
    </div>
  );
}
