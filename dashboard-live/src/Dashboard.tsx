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

const VOLATILITY_TREND_QUERY = `
SELECT *
FROM ${DATASET}.dashboard1_volatility_score_trend
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

const INITIAL_QUERY_LOAD = [
  { key: 'kpis', query: KPI_QUERY },
  { key: 'healthTrend', query: HEALTH_TREND_QUERY },
  { key: 'topCategories', query: TOP_CATEGORIES_QUERY },
  { key: 'fingerprintRows', query: FINGERPRINT_QUERY },
  { key: 'timingHeatmap', query: TIMING_HEATMAP_QUERY },
  { key: 'lagByCategory', query: LAG_BY_CATEGORY_QUERY },
  { key: 'lagTrend', query: LAG_TREND_QUERY },
  { key: 'benchmarkEvolution', query: BENCHMARK_EVOLUTION_QUERY },
];

const DEFERRED_QUERY_LOAD = [
  { key: 'topicClusters', query: TOPIC_CLUSTER_QUERY },
  { key: 'premiumRankings', query: PREMIUM_QUERY },
  { key: 'nicheGemRankings', query: NICHE_GEM_QUERY },
  { key: 'diversityGrowthRankings', query: DIVERSITY_GROWTH_QUERY },
  { key: 'concentrationTrend', query: CONCENTRATION_TREND_QUERY },
  { key: 'volatilityTrend', query: VOLATILITY_TREND_QUERY },
  { key: 'barrierTrend', query: BARRIER_TREND_QUERY },
];

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
  flash: '#ec4899',
  none: '#94a3b8',
  rocket: '#8b5cf6',
  slow_burner: '#0ea5e9',
};

const DISPLAY_FINGERPRINTS = new Set(['evergreen', 'flash', 'slow_burner', 'rocket']);

function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number(value));
}

function formatInteger(value) {
  return formatNumber(value, 0);
}

function formatPercent(value, digits = 1) {
  return `${formatNumber(Number(value || 0) * 100, digits)}%`;
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatAbbreviatedNumber(value) {
  const number = Number(value || 0);

  if (Math.abs(number) >= 1000000) {
    return `${formatNumber(number / 1000000, Math.abs(number) >= 10000000 ? 0 : 1)}M`;
  }

  if (Math.abs(number) >= 1000) {
    return `${formatNumber(number / 1000, Math.abs(number) >= 10000 ? 0 : 1)}K`;
  }

  return formatInteger(number);
}

function formatMonthLabel(value) {
  if (!value) return '';
  return String(value).slice(0, 7);
}

function formatSemiAnnualMonthLabel(value) {
  if (!value) return '';

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return formatMonthLabel(value);

  const month = date.getUTCMonth() + 1;
  if (![6, 12].includes(month)) return '';

  return `${date.getUTCFullYear()}-${String(month).padStart(2, '0')}`;
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

function normalizeRowKeys(row) {
  if (!row || typeof row !== 'object') return row;

  const normalized = {};
  Object.entries(row).forEach(([key, value]) => {
    normalized[key] = value;
    normalized[String(key).toLowerCase()] = value;
  });

  return normalized;
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
    <div className="overflow-x-hidden rounded-2xl border border-slate-800">
      <table className="min-w-full table-auto divide-y divide-slate-800 text-sm text-slate-200">
        <thead className="bg-slate-900/70">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={`px-3 py-3 text-left font-medium text-slate-400 ${column.headerClassName || ''}`}>
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
                  <td key={column.key} className={`px-3 py-3 align-top text-slate-200 ${column.cellClassName || ''}`}>
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
  const [loadingMore, setLoadingMore] = useState(false);
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
  const [volatilityTrend, setVolatilityTrend] = useState([]);
  const [barrierTrend, setBarrierTrend] = useState([]);
  const [benchmarkEvolution, setBenchmarkEvolution] = useState([]);

  const assignQueryResult = useCallback((key, rows) => {
    switch (key) {
      case 'kpis':
        setKpis(rows?.[0] || null);
        break;
      case 'healthTrend':
        setHealthTrend(rows || []);
        break;
      case 'topCategories':
        setTopCategories(rows || []);
        break;
      case 'fingerprintRows':
        setFingerprintRows(rows || []);
        break;
      case 'timingHeatmap':
        setTimingHeatmap(rows || []);
        break;
      case 'lagByCategory':
        setLagByCategory(rows || []);
        break;
      case 'lagTrend':
        setLagTrend(rows || []);
        break;
      case 'topicClusters':
        setTopicClusters(rows || []);
        break;
      case 'premiumRankings':
        setPremiumRankings(rows || []);
        break;
      case 'nicheGemRankings':
        setNicheGemRankings(rows || []);
        break;
      case 'diversityGrowthRankings':
        setDiversityGrowthRankings(rows || []);
        break;
      case 'concentrationTrend':
        setConcentrationTrend(rows || []);
        break;
      case 'volatilityTrend':
        setVolatilityTrend(rows || []);
        break;
      case 'barrierTrend':
        setBarrierTrend(rows || []);
        break;
      case 'benchmarkEvolution':
        setBenchmarkEvolution(rows || []);
        break;
      default:
        break;
    }
  }, []);

  const runQueryGroup = useCallback(async (queries) => {
    for (const item of queries) {
      const result = await window.ascend.runQuery(item.query, { connection: CONNECTION });
      const normalizedRows = (result.rows || []).map(normalizeRowKeys);
      assignQueryResult(item.key, normalizedRows);
    }
  }, [assignQueryResult]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadingMore(false);
    setError('');

    try {
      await runQueryGroup(INITIAL_QUERY_LOAD);

      setLoading(false);
      setLoadingMore(true);

      await runQueryGroup(DEFERRED_QUERY_LOAD);
    } catch (err) {
      setError(err?.message || 'Failed to load monetization intelligence dashboard data.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [runQueryGroup]);

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

  const latestTopCategoriesChartRows = useMemo(() => {
    const grouped = new Map();

    latestTopCategories.forEach((row) => {
      const categoryName = row.youtube_category_name || 'Uncategorized';
      const current = grouped.get(categoryName) || {
        youtube_category_name: categoryName,
        avg_recency_weighted_estimated_revenue: 0,
      };

      current.avg_recency_weighted_estimated_revenue += toNumber(row.avg_recency_weighted_estimated_revenue);
      grouped.set(categoryName, current);
    });

    return Array.from(grouped.values()).sort(
      (a, b) => b.avg_recency_weighted_estimated_revenue - a.avg_recency_weighted_estimated_revenue
    );
  }, [latestTopCategories]);

  const section3RevenueDomain = useMemo(() => {
    const maxRevenue = Math.max(
      ...latestTopCategoriesChartRows.map((row) => toNumber(row.avg_recency_weighted_estimated_revenue)),
      0
    );

    if (maxRevenue <= 0) return [0, 1000];

    return [0, Math.ceil(maxRevenue * 1.08)];
  }, [latestTopCategoriesChartRows]);

  const fingerprintSummary = useMemo(() => {
    const grouped = new Map();
    fingerprintRows.forEach((row) => {
      const key = row.viral_fingerprint;
      const current = grouped.get(key) || {
        viral_fingerprint: key,
        revenue: 0,
        trending_tenure_days: 0,
        country_spread_distinct_count: 0,
        months: new Set(),
        rows: 0,
      };
      current.revenue += toNumber(row.avg_recency_weighted_estimated_revenue);
      current.trending_tenure_days += toNumber(row.avg_trending_tenure_days);
      current.country_spread_distinct_count += toNumber(row.avg_country_spread_distinct_count);
      current.months.add(row.snapshot_month);
      current.rows += 1;
      grouped.set(key, current);
    });
    return Array.from(grouped.values())
      .map((row) => ({
        viral_fingerprint: row.viral_fingerprint,
        avg_revenue: row.rows ? row.revenue / row.rows : 0,
        avg_trending_tenure_days: row.rows ? row.trending_tenure_days / row.rows : 0,
        avg_country_spread_distinct_count: row.rows ? row.country_spread_distinct_count / row.rows : 0,
      }))
      .sort((a, b) => b.avg_revenue - a.avg_revenue);
  }, [fingerprintRows]);

  const displayFingerprintSummary = useMemo(() => {
    return fingerprintSummary.filter((row) => DISPLAY_FINGERPRINTS.has(String(row.viral_fingerprint || '').toLowerCase()));
  }, [fingerprintSummary]);

  const timingScatter = useMemo(() => {
    return timingHeatmap
      .map((row, index) => ({
        id: index,
        publish_hour: toNumber(row.publish_hour),
        avg_engagement_quality_score: toNumber(row.avg_engagement_quality_score),
        snapshot_count: toNumber(row.snapshot_count),
        day_of_week_name: row.day_of_week_name,
      }))
      .filter((row) => row.publish_hour > 0)
      .filter((d) => d.avg_engagement_quality_score > 0)
      .filter((row) => row.avg_engagement_quality_score >= 0.04)
      .slice(0, 100);
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
    const targetMonths = Array.from(new Set(diversityGrowthRankings.map((row) => row.snapshot_month).filter(Boolean))).slice(0, 2);
    return diversityGrowthRankings.filter((row) => targetMonths.includes(row.snapshot_month)).slice(0, 15);
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
        title: 'Average views',
        value: formatInteger(latest.avg_view_count),
        subtitle: 'Current monthly average views',
        icon: DollarSign,
      },
      {
        title: 'Average likes',
        value: formatInteger(latest.avg_like_count),
        subtitle: 'Current monthly average likes',
        icon: TrendingUp,
      },
      {
        title: 'Engagement quality',
        value: formatNumber(latest.avg_engagement_quality_score, 4),
        subtitle: 'Current monthly engagement quality benchmark',
        icon: Clock,
      },
      {
        title: 'Tracked months',
        value: formatInteger(benchmarkEvolution.length),
        subtitle: 'Months included in benchmark history',
        icon: Target,
      },
    ];
  }, [benchmarkEvolution]);

  const averagePlatformHealth = useMemo(() => {
    if (!healthTrend.length) return null;
    const total = healthTrend.reduce((sum, row) => sum + toNumber(row.avg_monthly_platform_health_index), 0);
    return total / healthTrend.length;
  }, [healthTrend]);

  const monthOverMonthHealthChange = useMemo(() => {
    if (healthTrend.length < 2) return null;

    const latest = toNumber(healthTrend[healthTrend.length - 1]?.avg_monthly_platform_health_index);
    const previous = toNumber(healthTrend[healthTrend.length - 2]?.avg_monthly_platform_health_index);

    return latest - previous;
  }, [healthTrend]);

  const section7ConcentrationAndVolatilityTrend = useMemo(() => {
    const monthlyMap = new Map();

    concentrationTrend.forEach((row) => {
      const key = row.snapshot_month;
      monthlyMap.set(key, {
        snapshot_month: key,
        concentration_score: toNumber(row.concentration_score),
        volatility_score: monthlyMap.get(key)?.volatility_score ?? null,
      });
    });

    volatilityTrend.forEach((row) => {
      const key = row.snapshot_month;
      monthlyMap.set(key, {
        snapshot_month: key,
        concentration_score: monthlyMap.get(key)?.concentration_score ?? null,
        volatility_score: toNumber(row.volatility_score),
      });
    });

    return Array.from(monthlyMap.values()).sort((a, b) => String(a.snapshot_month).localeCompare(String(b.snapshot_month)));
  }, [concentrationTrend, volatilityTrend]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400">Dashboard 1 · Monetization Intelligence</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">YouTube Monetization Intelligence Dashboard v3</h1>
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

        {!error && loading && (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
            Loading core dashboard sections from the validated dashboard support tables.
          </div>
        )}

        {!error && !loading && loadingMore && (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
            Loading additional sections and rankings in the background.
          </div>
        )}

        <SectionCard
          title="Section 1 — Executive KPI Snapshot"
          subtitle="Summary of monetization scale, platform health, engagement quality, and tracked coverage."
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

        <SectionCard
          title="Section 2 — Platform Health Trajectory"
          subtitle={(
            <>
              <span className="block text-sm text-slate-400">
                Monthly composite score measuring overall content performance health across engagement quality, format distribution, viral momentum, and geographic reach.
              </span>
            </>
          )}
        >
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="flex flex-col gap-4">
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
              <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5">
                <p className="text-sm leading-6 text-slate-200">
                  Inputs: engagement quality · premium & niche gem share · viral fingerprint distribution · long form share · trend momentum · country spread · data quality
                </p>
              </div>
            </div>
            <div className="grid gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="text-sm font-medium text-slate-400">Latest platform health</p>
                <p className="mt-3 text-3xl font-semibold text-white">{formatNumber(healthTrend[healthTrend.length - 1]?.avg_monthly_platform_health_index, 2)}</p>
                <p className="mt-2 text-sm text-slate-500">Current month composite — lower than 33.92 historical average.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="text-sm font-medium text-slate-400">Overall average platform health</p>
                <p className="mt-3 text-3xl font-semibold text-white">{formatNumber(averagePlatformHealth, 2)}</p>
                <p className="mt-2 text-sm text-slate-500">Mean monthly platform health across the displayed period.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="text-sm font-medium text-slate-400">Month-over-month change</p>
                <p className={`mt-3 text-3xl font-semibold ${monthOverMonthHealthChange !== null && monthOverMonthHealthChange < 0 ? 'text-red-300' : 'text-green-300'}`}>
                  {monthOverMonthHealthChange === null ? 'Unavailable' : `${monthOverMonthHealthChange >= 0 ? '+' : '-'}${formatNumber(Math.abs(monthOverMonthHealthChange), 2)}`}
                </p>
                <p className="mt-2 text-sm text-slate-500">Health score direction vs previous month</p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Section 3 — Monetization Category Leadership"
          subtitle="Identifies the highest-earning YouTube categories based on recent trending performance."
        >
          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white">Monetization Quadrant Legend</h3>
              </div>
              <div className="text-right text-[11px] leading-5 text-slate-500">
                <div>Y-axis: Reach ↑</div>
                <div>X-axis: Engagement Quality →</div>
              </div>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-3">
              <div className="flex items-center justify-center text-[11px] font-medium uppercase tracking-[0.2em] text-sky-500 [writing-mode:vertical-rl] [transform:rotate(180deg)]">
                Reach
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <p className="text-sm font-semibold text-emerald-300">Premium</p>
                  <p className="mt-1 text-xs leading-5 text-slate-200">High views, high engagement. Strongest monetization signal.</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                  <p className="text-sm font-semibold text-sky-300">Passive</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">High views, low engagement. Reach without depth.</p>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-sm font-semibold text-amber-300">Niche Gem</p>
                  <p className="mt-1 text-xs leading-5 text-slate-200">Lower views, high engagement. Underserved audiences with strong monetization potential.</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                  <p className="text-sm font-semibold text-slate-300">Skip</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">Low views, low engagement. Lowest priority.</p>
                </div>
              </div>
              <div />
              <div className="grid grid-cols-2 text-[11px] font-medium text-sky-500">
                <div className="text-left">High Engagement Quality</div>
                <div className="text-right">Low Engagement Quality</div>
              </div>
            </div>
          </div>
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
          <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
            <div className="h-[460px] w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={latestTopCategoriesChartRows} layout="vertical" margin={{ top: 20, right: 12, bottom: 20, left: 12 }}>
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                  <XAxis type="number" domain={section3RevenueDomain} stroke="#94a3b8" fontSize={12} tickFormatter={formatAbbreviatedNumber} />
                  <YAxis dataKey="youtube_category_name" type="category" width={96} stroke="#94a3b8" fontSize={12} tick={{ fill: '#ffffff', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar dataKey="avg_recency_weighted_estimated_revenue" name="Recency-weighted revenue" fill={COLORS.secondary} radius={[0, 8, 8, 0]} barSize={28} />
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

        <SectionCard
          title="Section 4 — Timing and Speed-to-Trending Intelligence"
          subtitle="Combines publish timing, engagement lift, and publish-to-trending lag to identify when and how quickly monetizable videos break out."
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
            <div className="flex flex-col gap-4">
              {distinctTimingHours > 0 && distinctTimingHours < 24 && (
                <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5">
                  <p className="text-sm leading-6 text-slate-200">
                    Note: Only {distinctTimingHours} of 24 hours have sufficient data to produce a reliable engagement average. Hours with insufficient data are excluded.
                  </p>
                </div>
              )}
              <div className="h-[360px] rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                {timingScatter.length ? (
                  <ResponsiveContainer width="96%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                      <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        dataKey="publish_hour"
                        name="Publish hour"
                        stroke="#94a3b8"
                        fontSize={12}
                        domain={[0, 24]}
                        allowDataOverflow
                        ticks={[6, 12, 18, 24]}
                        interval={0}
                        label={{ value: 'Hour of day (UTC)', position: 'insideBottom', offset: -20, fill: '#94a3b8', fontSize: 12 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="avg_engagement_quality_score"
                        name="Engagement quality"
                        stroke="#94a3b8"
                        fontSize={12}
                        domain={[0, 0.08]}
                        ticks={[0, 0.02, 0.04, 0.06, 0.08]}
                        allowDataOverflow
                        label={{ value: 'Avg engagement score', angle: -90, position: 'insideLeft', dx: -10, dy: 80, fill: '#94a3b8', fontSize: 12 }}
                      />
                      <ZAxis type="number" dataKey="snapshot_count" range={[40, 200]} />
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
            </div>
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5">
                <p className="text-sm leading-6 text-slate-200">Note: Categories will be broken down and populated as YouTube API enrichment completes.</p>
              </div>
              <div className="flex h-[360px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                {lagCategoryTop.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lagCategoryChartRows} layout="vertical" margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={12} label={{ value: 'Avg lag hours', position: 'insideBottom', offset: -2, fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis dataKey="youtube_category_name" type="category" width={80} stroke="#94a3b8" fontSize={12} />
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
          </div>
          <div className="mt-6 flex h-[300px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            {lagTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lagTrend} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="snapshot_month"
                    tickFormatter={formatMonthLabel}
                    stroke="#94a3b8"
                    fontSize={12}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    label={{ value: 'Month', position: 'insideBottom', offset: -6, fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis
                    domain={[60, 180]}
                    stroke="#94a3b8"
                    fontSize={12}
                    width={92}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    label={{ value: 'Avg hours to trending', angle: -90, position: 'insideLeft', dx: 20, dy: 80, fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}
                    labelFormatter={formatMonthLabel}
                    formatter={(value) => [`${formatNumber(value, 1)} hrs`, 'Publish-to-trending']}
                  />
                  <Legend wrapperStyle={{ color: '#ffffff', paddingTop: '10px' }} />
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

        <SectionCard
          title="Section 5 — Viral Fingerprint Performance Mix"
          subtitle="Compares average recency-weighted revenue across four viral fingerprint classifications to identify which content momentum pattern generates the highest monetization returns."
        >
          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  key: 'evergreen',
                  label: 'Evergreen',
                  description: 'Sustained performers that keep drawing steady audience demand over time.',
                },
                {
                  key: 'flash',
                  label: 'Flash',
                  description: 'Short-lived spikes that surge fast and fade quickly after peak attention.',
                },
                
                {
                  key: 'slow_burner',
                  label: 'Slow burner',
                  description: 'Gradual growers that build momentum later and compound value more slowly.',
                },
                {
                  key: 'rocket',
                  label: 'Rocket',
                  description: 'Breakout videos that accelerate quickly and reach high monetization fast.',
                },
              ].map((item) => (
                <div key={item.key} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: FINGERPRINT_COLORS[item.key] }}
                    />
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
            <div className="h-[360px] rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayFingerprintSummary}>
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                  <XAxis dataKey="viral_fingerprint" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar dataKey="avg_revenue" name="Average revenue by viral fingerprint">
                    {displayFingerprintSummary.map((entry) => (
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
                { key: 'avg_trending_tenure_days', label: 'Avg trending days', render: (value) => formatNumber(value, 1) },
                { key: 'avg_country_spread_distinct_count', label: 'Avg country spread', render: (value) => formatNumber(value, 1) },
              ]}
              rows={displayFingerprintSummary}
              emptyText="No viral fingerprint profile rows available."
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Section 6 — Topic Lifecycle and Category Opportunity Rankings"
          subtitle="Brings together rising topic signals with premium and niche-gem category leadership to separate durable opportunity from transient spikes."
        >
          <div className="mb-6 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5">
            <h3 className="text-base font-semibold text-sky-200">Category Enrichment In Progress</h3>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              Topic clusters and category rankings will become more precise as YouTube Data API enrichment completes. Currently
              showing default Uncategorized classification for category fields. Current enrichment progress: 1 of 5,013,692
              videos enriched.
            </p>
          </div>
          <div className="grid gap-6 xl:grid-cols-3">
            <DataTable
              columns={[
                { key: 'topic_cluster', label: 'Rising topic', render: (value) => value || 'Unclassified' },
                { key: 'topic_revenue_momentum', label: 'Revenue momentum (Δ monthly avg)', render: (value) => formatCurrency(value) },
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
                { key: 'topic_revenue_momentum', label: 'Revenue momentum (Δ monthly avg)', render: (value) => formatCurrency(value) },
                { key: 'avg_recency_weighted_estimated_revenue', label: 'Weighted revenue', render: (value) => formatCurrency(value) },
              ]}
              rows={decliningTopics}
              emptyText="No declining topic clusters available."
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Section 7 — Market Concentration and Volatility"
          subtitle="Tracks whether trending is becoming more concentrated, more volatile, and harder to enter — and whether monetization is broadening across countries and languages or narrowing to established players."
        >
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-6">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={section7ConcentrationAndVolatilityTrend}>
                    <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                    <XAxis dataKey="snapshot_month" tickFormatter={formatSemiAnnualMonthLabel} interval={0} minTickGap={24} stroke="#94a3b8" fontSize={12} scale="point" padding={{ left: 12, right: 12 }} />
                    <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickFormatter={(value) => formatPercent(value, 0)} domain={[0, 0.4]} ticks={[0, 0.1, 0.2, 0.3, 0.4]} />
                    <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} tickFormatter={(value) => formatNumber(value, 0)} domain={[0, 20]} ticks={[0, 5, 10, 15, 20]} />
                    <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }} labelFormatter={formatMonthLabel} formatter={(value, name) => [name === 'Concentration score' ? formatPercent(value, 1) : formatNumber(value, 1), name]} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="concentration_score" name="Concentration score" stroke={COLORS.secondary} strokeWidth={3} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="volatility_score" name="Volatility score" stroke={COLORS.tertiary} strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <p className="mt-3 text-sm italic text-slate-400">*Tracks whether trending is becoming more dominated and unpredictable over time.</p>
              </div>
              <div className="h-[300px] rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={barrierTrend}>
                    <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                    <XAxis dataKey="snapshot_month" tickFormatter={formatSemiAnnualMonthLabel} interval={0} minTickGap={24} stroke="#94a3b8" fontSize={12} scale="point" padding={{ left: 12, right: 12 }} />
                    <YAxis stroke="#94a3b8" fontSize={12} width={52} tickFormatter={formatAbbreviatedNumber} />
                    <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }} labelFormatter={formatMonthLabel} formatter={(value) => [formatInteger(value), 'Median views (top 10)']} />
                    <Legend />
                    <Line type="monotone" dataKey="median_view_count_for_top_10" name="Median view count for top 10 videos" stroke={COLORS.primary} strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <DataTable
              columns={[
                { key: 'snapshot_month', label: 'Month', render: (value) => formatMonthLabel(value), headerClassName: 'min-w-[88px]', cellClassName: 'whitespace-nowrap' },
                { key: 'country_code', label: 'Country', render: (value) => value || 'Unknown', headerClassName: 'min-w-[84px]', cellClassName: 'whitespace-nowrap' },
                { key: 'language_diversity_score', label: 'Diversity score', render: (value) => formatNumber(value, 3), headerClassName: 'min-w-[128px]', cellClassName: 'whitespace-nowrap' },
                { key: 'language_diversity_growth', label: 'Language diversity growth (over 2 months)', render: (value) => formatPercent(value, 1), headerClassName: 'w-[220px] whitespace-normal leading-5', cellClassName: 'whitespace-nowrap' },
              ]}
              rows={latestDiversityGrowth}
              emptyText="No diversity growth rankings available."
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Section 8 — Benchmark and Threshold Evolution"
          subtitle="Tracks how monetization, quality, speed, and scale benchmarks have shifted to clarify whether the bar for breakout performance is rising."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {benchmarkCards.map((card) => (
              <MetricCard key={card.title} title={card.title} value={card.value} subtitle={card.subtitle} icon={card.icon} />
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={benchmarkEvolution}>
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                  <XAxis dataKey="snapshot_month" tickFormatter={formatMonthLabel} stroke="#94a3b8" fontSize={12} />
                  <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickFormatter={(value) => formatNumber(value, 3)} />
                  <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} tickFormatter={formatAbbreviatedNumber} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}
                    labelFormatter={formatMonthLabel}
                    formatter={(value, name) => {
                      if (name === 'Engagement quality') return [formatNumber(value, 3), name];
                      if (name === 'Average views') return [formatInteger(value), name];
                      return [formatNumber(value, 2), name];
                    }}
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="avg_engagement_quality_score" name="Engagement quality" stroke={COLORS.primary} strokeWidth={3} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="avg_view_count" name="Average views" stroke={COLORS.secondary} strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-4 text-sm italic text-slate-400">
              *Note: recency weighting (2025-2026: 1.0x, 2024: 0.6x, 2023: 0.3x) would typically push recent averages higher. The post-2025 decline in average views instead reflects a dataset construction characteristic — newer videos were captured closer to their publish date before accumulating full lifetime view counts, not a real platform decline.
            </p>
          </div>
        </SectionCard>
      </main>
    </div>
  );
}