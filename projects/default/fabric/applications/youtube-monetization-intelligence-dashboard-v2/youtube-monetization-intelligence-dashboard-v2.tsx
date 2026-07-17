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
  ReferenceLine,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from 'recharts';
import {
  RefreshCw,
  DollarSign,
  Gauge,
  Rocket,
  Clock,
  TrendingUp,
  Globe,
  Target,
} from 'lucide-react';

const CONNECTION = 'data_plane_motherduck';
const DATASET = '__ascend_workspace_template.youtube_trending_intelligence';

const KPI_QUERY = `
SELECT *
FROM ${DATASET}.dashboard1_monetization_kpis
`;

const HEALTH_TREND_QUERY = `
SELECT *
FROM ${DATASET}.dashboard1_platform_health_trend
ORDER BY snapshot_month
`;

const TOP_CATEGORIES_QUERY = `
SELECT *
FROM ${DATASET}.dashboard1_top_categories
ORDER BY snapshot_month DESC, monetization_category_rank ASC
`;

const FINGERPRINT_QUERY = `
SELECT *
FROM ${DATASET}.dashboard1_viral_fingerprint_profile
ORDER BY snapshot_month, viral_fingerprint
`;

const TIMING_HEATMAP_QUERY = `
SELECT *
FROM ${DATASET}.dashboard1_timing_engagement_heatmap
`;

const LAG_BY_CATEGORY_QUERY = `
SELECT *
FROM ${DATASET}.dashboard1_lag_by_category
ORDER BY avg_publish_to_trending_lag_hours DESC
`;

const LAG_TREND_QUERY = `
SELECT *
FROM ${DATASET}.dashboard1_lag_trend
ORDER BY snapshot_month
`;

const TOPIC_CLUSTER_QUERY = `
SELECT *
FROM ${DATASET}.dashboard1_topic_cluster_lifecycle
ORDER BY snapshot_month DESC, topic_revenue_momentum DESC
`;

const PREMIUM_QUERY = `
SELECT *
FROM ${DATASET}.dashboard1_premium_rankings
ORDER BY snapshot_month DESC, premium_category_rank ASC
`;

const NICHE_GEM_QUERY = `
SELECT *
FROM ${DATASET}.dashboard1_niche_gem_rankings
ORDER BY snapshot_month DESC, niche_gem_category_rank ASC
`;

const DIVERSITY_GROWTH_QUERY = `
SELECT *
FROM ${DATASET}.dashboard1_diversity_growth_rankings
ORDER BY snapshot_month DESC, fastest_diversity_growth_rank ASC
`;

const CONCENTRATION_TREND_QUERY = `
SELECT *
FROM ${DATASET}.dashboard1_concentration_score_trend
ORDER BY snapshot_month
`;

const BARRIER_TREND_QUERY = `
SELECT *
FROM ${DATASET}.dashboard1_barrier_to_entry_trend
ORDER BY snapshot_month
`;

const BENCHMARK_EVOLUTION_QUERY = `
SELECT *
FROM ${DATASET}.dashboard1_engagement_benchmark_evolution
ORDER BY snapshot_month
`;

const COLORS = {
  primary: '#0ea5e9',
  secondary: '#14b8a6',
  tertiary: '#8b5cf6',
  quaternary: '#f59e0b',
  quinary: '#ec4899',
  neutral: '#64748b',
  success: '#22c55e',
  warning: '#eab308',
};

const FINGERPRINT_COLORS = {
  evergreen: '#22c55e',
  flash: '#f97316',
  none: '#94a3b8',
  rocket: '#8b5cf6',
  slow_burner: '#0ea5e9',
};

function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number(value || 0));
}

function formatInteger(value) {
  return formatNumber(value, 0);
}

function formatPercent(value, digits = 1) {
  return `${formatNumber(Number(value || 0) * 100, digits)}%`;
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

function formatTitle(value) {
  return String(value || '')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isPreviewEnabled() {
  return true;
}

function SectionCard({ title, subtitle, children }) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-2xl shadow-slate-950/20">
      <div className="mb-5">
        <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
        {subtitle && <p className="mt-2 max-w-3xl text-sm text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-xl bg-slate-800 p-3 text-sky-400">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function DataTable({ columns, rows, emptyText }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800">
      <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
        <thead className="bg-slate-900/70">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-3 text-left font-medium text-slate-400">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 bg-slate-950/50">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-slate-500">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td key={column.key} className="px-3 py-3 align-top text-slate-200">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kpis, setKpis] = useState(null);
  const [healthTrend, setHealthTrend] = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [fingerprintRows, setFingerprintRows] = useState([]);
  const [timingHeatmap, setTimingHeatmap] = useState([]);
  const [lagByCategory, setLagByCategory] = useState([]);
  const [lagTrend, setLagTrend] = useState([]);
  const [topicClusters, setTopicClusters] = useState([]);
  const [premiumRankings, setPremiumRankings] = useState([]);
  const [nicheGemRankings, setNicheGemRankings] = useState([]);
  const [diversityGrowthRankings, setDiversityGrowthRankings] = useState([]);
  const [concentrationTrend, setConcentrationTrend] = useState([]);
  const [barrierTrend, setBarrierTrend] = useState([]);
  const [benchmarkEvolution, setBenchmarkEvolution] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      if (isPreviewEnabled('section_4')) {
        const timingHeatmapResult = await window.ascend.runQuery(TIMING_HEATMAP_QUERY, { connection: CONNECTION });
        const lagByCategoryResult = await window.ascend.runQuery(LAG_BY_CATEGORY_QUERY, { connection: CONNECTION });
        const lagTrendResult = await window.ascend.runQuery(LAG_TREND_QUERY, { connection: CONNECTION });
        setTimingHeatmap(timingHeatmapResult.rows || []);
        setLagByCategory(lagByCategoryResult.rows || []);
        setLagTrend(lagTrendResult.rows || []);
      } else {
        setTimingHeatmap([]);
        setLagByCategory([]);
        setLagTrend([]);
      }

      setKpis(null);
      setHealthTrend([]);
      setTopCategories([]);
      setFingerprintRows([]);
      setTopicClusters([]);
      setPremiumRankings([]);
      setNicheGemRankings([]);
      setDiversityGrowthRankings([]);
      setConcentrationTrend([]);
      setBarrierTrend([]);
      setBenchmarkEvolution([]);
    } catch (err) {
      setError(err?.message || 'Failed to load monetization intelligence dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const latestMonth = useMemo(() => {
    const source = healthTrend[healthTrend.length - 1]?.snapshot_month || topCategories[0]?.snapshot_month || lagTrend[lagTrend.length - 1]?.snapshot_month;
    return formatMonthLabel(source);
  }, [healthTrend, topCategories, lagTrend]);

  const latestTopCategories = useMemo(() => {
    if (!topCategories.length) return [];
    const targetMonth = topCategories[0]?.snapshot_month;
    return topCategories
      .filter((row) => row.snapshot_month === targetMonth)
      .slice(0, 10)
      .map((row) => ({
        ...row,
        youtube_category_name: row.youtube_category_name || 'Uncategorized',
      }));
  }, [topCategories]);

  const fingerprintSummary = useMemo(() => {
    const grouped = new Map();
    fingerprintRows.forEach((row) => {
      const key = row.viral_fingerprint;
      const current = grouped.get(key) || {
        viral_fingerprint: key,
        revenue: 0,
        videos: 0,
        months: new Set(),
      };
      current.revenue += toNumber(row.avg_recency_weighted_estimated_revenue);
      current.videos += toNumber(row.distinct_video_count || row.video_count);
      current.months.add(row.snapshot_month);
      grouped.set(key, current);
    });
    return Array.from(grouped.values())
      .map((row) => ({
        viral_fingerprint: row.viral_fingerprint,
        avg_revenue: row.months.size ? row.revenue / row.months.size : row.revenue,
        avg_videos: row.months.size ? row.videos / row.months.size : row.videos,
      }))
      .sort((a, b) => b.avg_revenue - a.avg_revenue);
  }, [fingerprintRows]);

  const timingScatter = useMemo(() => {
    return timingHeatmap.slice(0, 100).map((row, index) => ({
      id: index,
      publish_hour: toNumber(row.publish_hour),
      avg_engagement_quality_score: toNumber(row.avg_engagement_quality_score),
      snapshot_count: toNumber(row.snapshot_count),
      day_of_week_name: row.day_of_week_name,
    }));
  }, [timingHeatmap]);

  const distinctTimingHours = useMemo(() => {
    return new Set(timingScatter.map((row) => row.publish_hour)).size;
  }, [timingScatter]);

  const lagCategoryTop = useMemo(() => lagByCategory.slice(0, 8), [lagByCategory]);

  const lagCategoryChartRows = useMemo(() => {
    return lagCategoryTop.map((row) => ({
      ...row,
      youtube_category_name: row.youtube_category_name || 'Uncategorized',
    }));
  }, [lagCategoryTop]);

  const section4LatestMonth = useMemo(() => {
    if (!lagTrend.length) return 'Unavailable';
    return formatMonthLabel(lagTrend[lagTrend.length - 1]?.snapshot_month) || 'Unavailable';
  }, [lagTrend]);

  const averageLagToTrending = useMemo(() => {
    if (!lagTrend.length) return null;
    const total = lagTrend.reduce((sum, row) => sum + toNumber(row.avg_publish_to_trending_lag_hours), 0);
    return total / lagTrend.length;
  }, [lagTrend]);

  const latestPremium = useMemo(() => {
    if (!premiumRankings.length) return [];
    const targetMonth = premiumRankings[0]?.snapshot_month;
    return premiumRankings.filter((row) => row.snapshot_month === targetMonth).slice(0, 8);
  }, [premiumRankings]);

  const latestNicheGems = useMemo(() => {
    if (!nicheGemRankings.length) return [];
    const targetMonth = nicheGemRankings[0]?.snapshot_month;
    return nicheGemRankings.filter((row) => row.snapshot_month === targetMonth).slice(0, 8);
  }, [nicheGemRankings]);

  const latestDiversityGrowth = useMemo(() => {
    if (!diversityGrowthRankings.length) return [];
    const targetMonth = diversityGrowthRankings[0]?.snapshot_month;
    return diversityGrowthRankings.filter((row) => row.snapshot_month === targetMonth).slice(0, 8);
  }, [diversityGrowthRankings]);

  const risingTopics = useMemo(() => {
    return topicClusters.filter((row) => toNumber(row.rising_topic_rank) > 0 && toNumber(row.rising_topic_rank) <= 10).slice(0, 10);
  }, [topicClusters]);

  const decliningTopics = useMemo(() => {
    return topicClusters.filter((row) => toNumber(row.declining_topic_rank) > 0 && toNumber(row.declining_topic_rank) <= 10).slice(0, 10);
  }, [topicClusters]);

  const benchmarkCards = useMemo(() => {
    const latest = benchmarkEvolution[benchmarkEvolution.length - 1] || {};
    return [
      {
        title: 'Revenue benchmark',
        value: formatCurrency(latest.avg_estimated_revenue_benchmark),
        subtitle: 'Current monetization benchmark',
        icon: DollarSign,
      },
      {
        title: 'Views benchmark',
        value: formatInteger(latest.avg_view_count_benchmark),
        subtitle: 'Typical view threshold',
        icon: TrendingUp,
      },
      {
        title: 'Lag benchmark',
        value: `${formatNumber(latest.avg_publish_to_trending_hours_benchmark, 1)} hrs`,
        subtitle: 'Current speed-to-trending norm',
        icon: Clock,
      },
      {
        title: 'Quality benchmark',
        value: formatNumber(latest.avg_engagement_quality_benchmark, 3),
        subtitle: 'Current engagement quality norm',
        icon: Target,
      },
    ];
  }, [benchmarkEvolution]);

  const averagePlatformHealth = useMemo(() => {
    if (!healthTrend.length) return null;
    const total = healthTrend.reduce((sum, row) => sum + toNumber(row.avg_monthly_platform_health_index), 0);
    return total / healthTrend.length;
  }, [healthTrend]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400">Dashboard 1 · Monetization Intelligence</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">YouTube Monetization Intelligence Dashboard v2</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Full-page scrolling view across platform health, monetization structure, timing, viral fingerprints, topic momentum,
              category leadership, international breadth, and threshold evolution.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-400">
              Latest month: <span className="font-medium text-white">{latestMonth || 'Unavailable'}</span>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
        {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

        {!error && !loading && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Preview mode is disabled. All eight sections are rendered together in this application.
          </div>
        )}

        {isPreviewEnabled('section_1') && (
          <SectionCard
            title="Section 1 — Executive KPI Snapshot"
            subtitle="Immediate readout of monetization scale, platform health, engagement quality, and tracked coverage from the validated dashboard support layer."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Average platform health"
                value={formatNumber(kpis?.avg_platform_health_index, 2)}
                subtitle="Monthly platform health index"
                icon={Gauge}
              />
              <MetricCard
                title="Average monthly revenue"
                value={formatCurrency(kpis?.avg_monthly_estimated_revenue)}
                subtitle="Average estimated revenue across the monitored window"
                icon={DollarSign}
              />
              <MetricCard
                title="Average engagement quality"
                value={formatNumber(kpis?.avg_engagement_quality_score, 4)}
                subtitle="Like/comment quality efficiency"
                icon={Rocket}
              />
              <MetricCard
                title="Tracked unique videos"
                value={formatInteger(kpis?.total_unique_videos)}
                subtitle="Distinct videos represented in the dashboard output layer"
                icon={Globe}
              />
            </div>
          </SectionCard>
        )}

        {isPreviewEnabled('section_2') && (
          <SectionCard
            title="Section 2 — Platform Health Trajectory"
            subtitle="Longitudinal view of monthly platform health with a zoomed axis to make mid-range variation visible."
          >
            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <div className="h-[360px] rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={healthTrend}>
                    <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                    <XAxis dataKey="snapshot_month" tickFormatter={formatMonthLabel} stroke="#94a3b8" fontSize={12} />
                    <YAxis domain={[28, 40]} stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}
                      labelFormatter={formatMonthLabel}
                      formatter={(value) => [formatNumber(value, 2), 'Platform health']}
                    />
                    <Legend />
                    {averagePlatformHealth !== null && (
                      <ReferenceLine
                        y={averagePlatformHealth}
                        stroke="#94a3b8"
                        strokeDasharray="6 4"
                        label={{ value: 'Overall average', fill: '#cbd5e1', fontSize: 12 }}
                      />
                    )}
                    <Area type="monotone" dataKey="avg_monthly_platform_health_index" name="Platform health" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="grid gap-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                  <p className="text-sm font-medium text-slate-400">Latest platform health</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{formatNumber(healthTrend[healthTrend.length - 1]?.avg_monthly_platform_health_index, 2)}</p>
                  <p className="mt-2 text-sm text-slate-500">Most recent monthly signal from dashboard1_platform_health_trend.</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                  <p className="text-sm font-medium text-slate-400">Overall average platform health</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{formatNumber(averagePlatformHealth, 2)}</p>
                  <p className="mt-2 text-sm text-slate-500">Mean monthly platform health across the displayed period.</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                  <p className="text-sm font-medium text-slate-400">Monthly coverage points</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{formatInteger(healthTrend.length)}</p>
                  <p className="mt-2 text-sm text-slate-500">Trend continuity available for the current dashboard build.</p>
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {isPreviewEnabled('section_3') && (
          <SectionCard
            title="Section 3 — Monetization Category Leadership"
            subtitle="Recency-weighted leaders reveal which categories capture the strongest revenue density within the premium monetization mix."
          >
            <div className="mb-6 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5">
              <h3 className="text-base font-semibold text-sky-200">Category Enrichment In Progress</h3>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                YouTube Data API category data is being enriched incrementally due to API quota limits of 10,000 units per day.
                The charts below show current data — all videos are temporarily classified as Uncategorized with a default RPM of
                $3.50 pending enrichment. Revenue estimates by category will become precise over subsequent pipeline runs. Once
                enrichment completes, this section will show top 10 categories by estimated revenue, Premium quadrant share
                rankings, and Niche Gem share rankings.
              </p>
              <p className="mt-3 text-sm font-medium text-sky-100">Current enrichment progress: 1 of 5,013,692 videos enriched</p>
            </div>
            <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
              <div className="h-[380px] w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={latestTopCategories} layout="vertical" margin={{ top: 20, right: 12, bottom: 20, left: 12 }}>
                    <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                    <YAxis dataKey="youtube_category_name" type="category" width={96} stroke="#94a3b8" fontSize={12} tick={{ fill: '#ffffff', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}
                      formatter={(value) => formatCurrency(value)}
                    />
                    <Legend />
                    <Bar dataKey="avg_recency_weighted_estimated_revenue" name="Recency-weighted revenue" fill={COLORS.secondary} radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <DataTable
                columns={[
                  { key: 'youtube_category_name', label: 'Category', render: (value) => value || 'Uncategorized' },
                  { key: 'monetization_quadrant', label: 'Quadrant' },
                  { key: 'avg_recency_weighted_estimated_revenue', label: 'Weighted revenue', render: (value) => formatCurrency(value) },
                  { key: 'avg_estimated_rpm', label: 'RPM', render: (value) => formatNumber(value, 2) },
                ]}
                rows={latestTopCategories}
                emptyText="No category leadership rows available."
              />
            </div>
          </SectionCard>
        )}

        {isPreviewEnabled('section_4') && (
          <SectionCard
            title="Section 4 — Timing and Speed-to-Trending Intelligence"
            subtitle="This section combines publish timing, engagement lift, and publish-to-trending lag to identify when and how quickly monetizable videos break out."
          >
            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="text-sm font-medium text-slate-400">Timing scatter points</p>
                <p className="mt-3 text-3xl font-semibold text-white">{formatInteger(timingScatter.length)}</p>
                <p className="mt-2 text-sm text-slate-500">Day/hour engagement observations currently available.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="text-sm font-medium text-slate-400">Lag category rows</p>
                <p className="mt-3 text-3xl font-semibold text-white">{formatInteger(lagCategoryTop.length)}</p>
                <p className="mt-2 text-sm text-slate-500">Category lag rows available for the current build.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="text-sm font-medium text-slate-400">Lag trend latest month</p>
                <p className="mt-3 text-3xl font-semibold text-white">{section4LatestMonth}</p>
                <p className="mt-2 text-sm text-slate-500">Monthly lag trend availability from the support view.</p>
              </div>
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="h-[360px] rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                {distinctTimingHours > 0 && distinctTimingHours < 24 && (
                  <div className="mb-6 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5">
                    <p className="text-sm leading-6 text-slate-200">
                      Note: only {distinctTimingHours} of 24 hours have sufficient data to produce a reliable engagement average. Hours with insufficient data are excluded.
                    </p>
                  </div>
                )}
                {timingScatter.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 40, left: 20 }}>
                      <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        dataKey="publish_hour"
                        name="Publish hour"
                        stroke="#94a3b8"
                        fontSize={12}
                        domain={[0, 23]}
                        label={{ value: 'Hour of day (UTC)', position: 'insideBottom', offset: -8, fill: '#94a3b8', fontSize: 12 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="avg_engagement_quality_score"
                        name="Engagement quality"
                        stroke="#94a3b8"
                        fontSize={12}
                        label={{ value: 'Avg engagement score', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }}
                      />
                      <ZAxis type="number" dataKey="snapshot_count" range={[80, 500]} />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}
                        formatter={(value, name) => {
                          if (name === 'snapshot_count') return [formatInteger(value), 'Snapshot count'];
                          if (name === 'publish_hour') return [formatInteger(value), 'Hour of day (UTC)'];
                          if (name === 'avg_engagement_quality_score') return [formatNumber(value, 4), 'Avg engagement score'];
                          return [formatNumber(value, 2), formatTitle(name)];
                        }}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.day_of_week_name || 'Timing profile'}
                      />
                      <Legend />
                      <Scatter data={timingScatter} fill={COLORS.primary} />
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-sm text-slate-400">
                    No timing heatmap rows are available in the current support view yet.
                  </div>
                )}
              </div>
              <div className="h-[360px] rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="mb-6 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5">
                  <p className="text-sm leading-6 text-slate-200">Category breakdown will populate as YouTube API enrichment completes.</p>
                </div>
                {lagCategoryTop.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lagCategoryChartRows} layout="vertical" margin={{ left: 24, right: 12 }}>
                      <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                      <YAxis dataKey="youtube_category_name" type="category" width={130} stroke="#94a3b8" fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}
                        formatter={(value) => [`${formatNumber(value, 1)} hrs`, 'Avg lag']}
                      />
                      <Bar dataKey="avg_publish_to_trending_lag_hours" name="Avg lag hours" fill={COLORS.secondary} radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-sm text-slate-400">
                    No lag-by-category rows are available in the current support view yet.
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 h-[300px] rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              {lagTrend.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={lagTrend}>
                    <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="snapshot_month"
                      tickFormatter={formatMonthLabel}
                      stroke="#ffffff"
                      fontSize={12}
                      tick={{ fill: '#ffffff', fontSize: 12 }}
                      label={{ value: 'Month', position: 'insideBottom', offset: -8, fill: '#ffffff', fontSize: 12 }}
                    />
                    <YAxis
                      domain={[60, 180]}
                      stroke="#ffffff"
                      fontSize={12}
                      tick={{ fill: '#ffffff', fontSize: 12 }}
                      label={{ value: 'Avg hours to trending', angle: -90, position: 'insideLeft', fill: '#ffffff', fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}
                      labelFormatter={formatMonthLabel}
                      formatter={(value) => [`${formatNumber(value, 1)} hrs`, 'Publish-to-trending']}
                    />
                    <Legend wrapperStyle={{ color: '#ffffff' }} />
                    {averageLagToTrending !== null && (
                      <ReferenceLine
                        y={averageLagToTrending}
                        stroke="#94a3b8"
                        strokeDasharray="6 4"
                        label={{ value: 'Overall average', fill: '#cbd5e1', fontSize: 12 }}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="avg_publish_to_trending_lag_hours"
                      name="Avg publish-to-trending hours"
                      stroke={COLORS.primary}
                      fill={COLORS.primary}
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-center text-sm text-slate-400">
                  No monthly lag trend rows are available in the current support view yet.
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {isPreviewEnabled('section_5') && (
          <SectionCard
            title="Section 5 — Viral Fingerprint Performance Mix"
            subtitle="Uses the exact validated fingerprint labels in the pipeline output: evergreen, flash, none, rocket, and slow_burner."
          >
            <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
              <div className="h-[360px] rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fingerprintSummary}>
                    <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                    <XAxis dataKey="viral_fingerprint" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}
                      formatter={(value) => formatCurrency(value)}
                    />
                    <Legend />
                    <Bar dataKey="avg_revenue" name="Average revenue by fingerprint">
                      {fingerprintSummary.map((entry) => (
                        <Cell key={entry.viral_fingerprint} fill={FINGERPRINT_COLORS[entry.viral_fingerprint] || COLORS.neutral} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <DataTable
                columns={[
                  { key: 'viral_fingerprint', label: 'Fingerprint', render: (value) => formatTitle(value) },
                  { key: 'avg_revenue', label: 'Avg revenue', render: (value) => formatCurrency(value) },
                  { key: 'avg_videos', label: 'Avg videos', render: (value) => formatNumber(value, 1) },
                ]}
                rows={fingerprintSummary}
                emptyText="No viral fingerprint profile rows available."
              />
            </div>
          </SectionCard>
        )}

        {isPreviewEnabled('section_6') && (
          <SectionCard
            title="Section 6 — Topic Lifecycle and Category Opportunity Rankings"
            subtitle="Brings together rising topic signals with premium and niche-gem category leadership to separate durable opportunity from transient spikes."
          >
            <div className="grid gap-6 xl:grid-cols-3">
              <DataTable
                columns={[
                  { key: 'topic_cluster', label: 'Rising topic', render: (value) => value || 'Unclassified' },
                  { key: 'topic_revenue_momentum', label: 'Revenue momentum', render: (value) => formatPercent(value, 1) },
                  { key: 'avg_recency_weighted_estimated_revenue', label: 'Weighted revenue', render: (value) => formatCurrency(value) },
                ]}
                rows={risingTopics}
                emptyText="No rising topic clusters available."
              />
              <DataTable
                columns={[
                  { key: 'youtube_category_name', label: 'Premium category', render: (value) => value || 'Uncategorized' },
                  { key: 'avg_recency_weighted_estimated_revenue', label: 'Weighted revenue', render: (value) => formatCurrency(value) },
                  { key: 'avg_estimated_rpm', label: 'RPM', render: (value) => formatNumber(value, 2) },
                ]}
                rows={latestPremium}
                emptyText="No premium category rankings available."
              />
              <DataTable
                columns={[
                  { key: 'youtube_category_name', label: 'Niche gem category', render: (value) => value || 'Uncategorized' },
                  { key: 'avg_recency_weighted_estimated_revenue', label: 'Weighted revenue', render: (value) => formatCurrency(value) },
                  { key: 'avg_engagement_quality_score', label: 'Quality score', render: (value) => formatNumber(value, 3) },
                ]}
                rows={latestNicheGems}
                emptyText="No niche gem rankings available."
              />
            </div>
            <div className="mt-6">
              <DataTable
                columns={[
                  { key: 'topic_cluster', label: 'Declining topic', render: (value) => value || 'Unclassified' },
                  { key: 'topic_revenue_momentum', label: 'Revenue momentum', render: (value) => formatPercent(value, 1) },
                  { key: 'avg_recency_weighted_estimated_revenue', label: 'Weighted revenue', render: (value) => formatCurrency(value) },
                ]}
                rows={decliningTopics}
                emptyText="No declining topic clusters available."
              />
            </div>
          </SectionCard>
        )}

        {isPreviewEnabled('section_7') && (
          <SectionCard
            title="Section 7 — International Diversity, Concentration, and Entry Conditions"
            subtitle="Assesses whether monetization is broadening across countries and languages or becoming more concentrated and harder to enter."
          >
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="grid gap-6">
                <div className="h-[300px] rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={concentrationTrend}>
                      <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                      <XAxis dataKey="snapshot_month" tickFormatter={formatMonthLabel} stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }} labelFormatter={formatMonthLabel} />
                      <Legend />
                      <Line type="monotone" dataKey="concentration_score" name="Concentration score" stroke={COLORS.secondary} strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-[300px] rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={barrierTrend}>
                      <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                      <XAxis dataKey="snapshot_month" tickFormatter={formatMonthLabel} stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }} labelFormatter={formatMonthLabel} />
                      <Legend />
                      <Line type="monotone" dataKey="barrier_to_entry_score" name="Barrier to entry score" stroke={COLORS.quinary} strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <DataTable
                columns={[
                  { key: 'country_name', label: 'Country', render: (value, row) => value || row.country_code || 'Unknown' },
                  { key: 'language_diversity_growth_rate', label: 'Language diversity growth', render: (value) => formatPercent(value, 1) },
                  { key: 'country_revenue_growth_rate', label: 'Revenue growth', render: (value) => formatPercent(value, 1) },
                  { key: 'country_volatility_score', label: 'Volatility', render: (value) => formatNumber(value, 2) },
                ]}
                rows={latestDiversityGrowth}
                emptyText="No diversity growth rankings available."
              />
            </div>
          </SectionCard>
        )}

        {isPreviewEnabled('section_8') && (
          <SectionCard
            title="Section 8 — Benchmark and Threshold Evolution"
            subtitle="Tracks how monetization, quality, speed, and scale benchmarks have shifted to clarify whether the bar for breakout performance is rising."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {benchmarkCards.map((card) => (
                <MetricCard key={card.title} title={card.title} value={card.value} subtitle={card.subtitle} icon={card.icon} />
              ))}
            </div>
            <div className="mt-6 h-[340px] rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={benchmarkEvolution}>
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                  <XAxis dataKey="snapshot_month" tickFormatter={formatMonthLabel} stroke="#94a3b8" fontSize={12} />
                  <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }} labelFormatter={formatMonthLabel} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="avg_engagement_quality_benchmark" name="Engagement quality benchmark" stroke={COLORS.primary} strokeWidth={3} dot={false} />
                  <Line yAxisId="left" type="monotone" dataKey="avg_publish_to_trending_hours_benchmark" name="Lag benchmark" stroke={COLORS.quinary} strokeWidth={3} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="avg_estimated_revenue_benchmark" name="Revenue benchmark" stroke={COLORS.quaternary} strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        )}
      </main>
    </div>
  );
}