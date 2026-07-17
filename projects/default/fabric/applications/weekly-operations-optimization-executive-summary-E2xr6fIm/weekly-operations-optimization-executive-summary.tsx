import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  LineChart,
  Line,
} from 'recharts';
import {
  RefreshCw,
  LayoutDashboard,
  Building2,
  Clock3,
  DollarSign,
  Cloud,
  Lock,
  CheckCircle2,
  ArrowRight,
  Download,
  Filter,
  TrendingUp,
  Factory,
} from 'lucide-react';

const CONNECTION = 'data_plane_fabric';
const COLORS = {
  primary: '#0ea5e9',
  secondary: '#14b8a6',
  tertiary: '#8b5cf6',
  quaternary: '#f59e0b',
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
  neutral: '#64748b',
};

const EXECUTIVE_QUERY = `
WITH schedulable_schedule AS (
    SELECT
        ps.facility_id,
        f.facility_name,
        f.region,
        ps.machine_id,
        m.machine_name,
        m.machine_type,
        m.schedulable,
        ps.day_of_week,
        ps.shift,
        ps.scheduled_hour,
        ps.runtime_hours,
        ps.energy_kwh
    FROM {{ ref('read_production_schedule', flow='weather_carbon_optimization') }} ps
    INNER JOIN {{ ref('read_machines', flow='weather_carbon_optimization') }} m
        ON ps.machine_id = m.machine_id
       AND ps.facility_id = m.facility_id
    INNER JOIN {{ ref('read_facilities', flow='weather_carbon_optimization') }} f
        ON ps.facility_id = f.facility_id
), best_costs AS (
    SELECT
        facility_id,
        facility_name,
        region,
        day_of_week_name,
        MIN(predicted_combined_cost_gbp_per_kwh) AS best_combined_cost_gbp_per_kwh
    FROM {{ ref('forecast_carbon_predictions', flow='weather_carbon_optimization') }}
    GROUP BY facility_id, facility_name, region, day_of_week_name
), best_hours AS (
    SELECT
        fcp.facility_id,
        fcp.facility_name,
        fcp.region,
        fcp.day_of_week_name,
        MIN(fcp.timestamp_hour) AS best_hour
    FROM {{ ref('forecast_carbon_predictions', flow='weather_carbon_optimization') }} fcp
    INNER JOIN best_costs bc
        ON fcp.facility_id = bc.facility_id
       AND fcp.facility_name = bc.facility_name
       AND fcp.region = bc.region
       AND fcp.day_of_week_name = bc.day_of_week_name
       AND fcp.predicted_combined_cost_gbp_per_kwh = bc.best_combined_cost_gbp_per_kwh
    GROUP BY fcp.facility_id, fcp.facility_name, fcp.region, fcp.day_of_week_name
), scheduled_costs AS (
    SELECT
        ss.facility_id,
        ss.facility_name,
        ss.region,
        ss.machine_id,
        ss.machine_name,
        ss.machine_type,
        ss.schedulable,
        ss.day_of_week,
        ss.shift,
        ss.scheduled_hour,
        ss.runtime_hours,
        ss.energy_kwh,
        MIN(fcp.predicted_combined_cost_gbp_per_kwh) AS scheduled_combined_cost_gbp_per_kwh,
        MIN(fcp.predicted_intensity_gco2_per_kwh) AS scheduled_intensity_gco2_per_kwh
    FROM schedulable_schedule ss
    INNER JOIN {{ ref('forecast_carbon_predictions', flow='weather_carbon_optimization') }} fcp
        ON ss.facility_id = fcp.facility_id
       AND ss.day_of_week = fcp.day_of_week_name
       AND ss.scheduled_hour = fcp.timestamp_hour
    GROUP BY
        ss.facility_id,
        ss.facility_name,
        ss.region,
        ss.machine_id,
        ss.machine_name,
        ss.machine_type,
        ss.schedulable,
        ss.day_of_week,
        ss.shift,
        ss.scheduled_hour,
        ss.runtime_hours,
        ss.energy_kwh
), recommendation_rows AS (
    SELECT DISTINCT
        facility_id,
        machine_id,
        day_of_week,
        shift,
        scheduled_hour,
        recommended_hour,
        total_savings_gbp,
        energy_cost_savings_gbp,
        carbon_cost_savings_gbp,
        carbon_savings_kg
    FROM {{ ref('operations_optimization_recommendations', flow='weather_carbon_optimization') }}
)
SELECT
    sc.facility_id,
    sc.facility_name,
    sc.region,
    sc.machine_id,
    sc.machine_name,
    sc.machine_type,
    sc.schedulable,
    sc.day_of_week,
    sc.shift,
    sc.scheduled_hour,
    sc.runtime_hours,
    sc.energy_kwh,
    sc.scheduled_combined_cost_gbp_per_kwh,
    sc.scheduled_intensity_gco2_per_kwh,
    bc.best_combined_cost_gbp_per_kwh,
    bh.best_hour,
    rr.recommended_hour,
    rr.total_savings_gbp,
    rr.energy_cost_savings_gbp,
    rr.carbon_cost_savings_gbp,
    rr.carbon_savings_kg,
    CASE
        WHEN sc.schedulable = 0 THEN 'cannot_move'
        WHEN rr.machine_id IS NOT NULL THEN 'reschedule'
        WHEN ABS(sc.scheduled_combined_cost_gbp_per_kwh - bc.best_combined_cost_gbp_per_kwh) < 0.000001 THEN 'already_optimal'
        ELSE 'kept_current'
    END AS optimization_status
FROM scheduled_costs sc
INNER JOIN best_costs bc
    ON sc.facility_id = bc.facility_id
   AND sc.facility_name = bc.facility_name
   AND sc.region = bc.region
   AND sc.day_of_week = bc.day_of_week_name
INNER JOIN best_hours bh
    ON sc.facility_id = bh.facility_id
   AND sc.facility_name = bh.facility_name
   AND sc.region = bh.region
   AND sc.day_of_week = bh.day_of_week_name
LEFT JOIN recommendation_rows rr
    ON sc.facility_id = rr.facility_id
   AND sc.machine_id = rr.machine_id
   AND sc.day_of_week = rr.day_of_week
   AND sc.shift = rr.shift
   AND sc.scheduled_hour = rr.scheduled_hour
`;

function formatCurrency(value) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat('en-GB', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number(value || 0));
}

function formatHour(hour) {
  return `${String(Number(hour || 0)).padStart(2, '0')}:00`;
}

function statusLabel(status) {
  if (status === 'reschedule') return 'Reschedule';
  if (status === 'already_optimal') return 'Already optimal';
  if (status === 'cannot_move') return 'Cannot move';
  return 'Kept current';
}

function statusColor(status) {
  if (status === 'reschedule') return COLORS.primary;
  if (status === 'already_optimal') return COLORS.success;
  if (status === 'cannot_move') return COLORS.error;
  return COLORS.warning;
}

function tooltipValueFormatter(value, name) {
    if (typeof value !== 'number') {
        return value;
    }

    const metricName = String(name || '').toLowerCase();
    if (metricName.includes('savings') || metricName.includes('cost')) {
        return formatCurrency(value);
    }

    return formatNumber(value, 0);
}

function statusPillColor(status) {
    return status === 'Already optimal' ? statusColor('already_optimal') : statusColor('cannot_move');
}

function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(',')]
    .concat(
      rows.map((row) =>
        headers
          .map((key) => `"${String(row[key] ?? '').replaceAll('"', '""')}"`)
          .join(',')
      )
    )
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function StatCard({ title, value, subtitle, icon: Icon, accent }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-xl p-3" style={{ backgroundColor: accent }}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [regionFilter, setRegionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await window.ascend.runQuery(EXECUTIVE_QUERY, { connection: CONNECTION });
      setRows(result.rows || []);
    } catch (err) {
      setError(err?.message || 'Failed to load executive summary data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const regions = useMemo(() => ['All', ...Array.from(new Set(rows.map((row) => row.region).filter(Boolean)))], [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const regionMatch = regionFilter === 'All' || row.region === regionFilter;
      const statusMatch = statusFilter === 'All' || row.optimization_status === statusFilter;
      return regionMatch && statusMatch;
    });
  }, [rows, regionFilter, statusFilter]);

  const summary = useMemo(() => {
    const rescheduleRows = filteredRows.filter((row) => row.optimization_status === 'reschedule');
    const optimalRows = filteredRows.filter((row) => row.optimization_status === 'already_optimal');
    const fixedRows = filteredRows.filter((row) => row.optimization_status === 'cannot_move');
    const totalWeeklySavings = rescheduleRows.reduce((sum, row) => sum + Number(row.total_savings_gbp || 0), 0);
    const annualizedSavings = totalWeeklySavings * 52;
    const carbonSavings = rescheduleRows.reduce((sum, row) => sum + Number(row.carbon_savings_kg || 0), 0);
    const movedEnergy = rescheduleRows.reduce((sum, row) => sum + Number(row.energy_kwh || 0), 0);

    return {
      totalRows: filteredRows.length,
      rescheduleCount: rescheduleRows.length,
      optimalCount: optimalRows.length,
      fixedCount: fixedRows.length,
      weeklySavings: totalWeeklySavings,
      annualizedSavings,
      carbonSavings,
      movedEnergy,
    };
  }, [filteredRows]);

  const facilityImpact = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((row) => {
      const key = row.facility_name;
      const current = map.get(key) || {
        facility_name: row.facility_name,
        region: row.region,
        weekly_savings_gbp: 0,
        annualized_savings_gbp: 0,
        carbon_savings_kg: 0,
        reschedule_count: 0,
        already_optimal_count: 0,
        cannot_move_count: 0,
      };
      if (row.optimization_status === 'reschedule') {
        current.weekly_savings_gbp += Number(row.total_savings_gbp || 0);
        current.carbon_savings_kg += Number(row.carbon_savings_kg || 0);
        current.reschedule_count += 1;
      } else if (row.optimization_status === 'already_optimal') {
        current.already_optimal_count += 1;
      } else if (row.optimization_status === 'cannot_move') {
        current.cannot_move_count += 1;
      }
      map.set(key, current);
    });

    return [...map.values()]
      .map((row) => ({ ...row, annualized_savings_gbp: row.weekly_savings_gbp * 52 }))
      .sort((a, b) => b.weekly_savings_gbp - a.weekly_savings_gbp);
  }, [filteredRows]);

  const statusMix = useMemo(() => {
    const counts = ['reschedule', 'already_optimal', 'cannot_move'].map((status) => ({
      name: statusLabel(status),
      value: filteredRows.filter((row) => row.optimization_status === status).length,
      fill: statusColor(status),
    }));
    return counts;
  }, [filteredRows]);

  const machineTypeImpact = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((row) => {
      const key = row.machine_type;
      const current = map.get(key) || {
        machine_type: row.machine_type,
        reschedule_count: 0,
        already_optimal_count: 0,
        cannot_move_count: 0,
        weekly_savings_gbp: 0,
      };
      if (row.optimization_status === 'reschedule') {
        current.reschedule_count += 1;
        current.weekly_savings_gbp += Number(row.total_savings_gbp || 0);
      } else if (row.optimization_status === 'already_optimal') {
        current.already_optimal_count += 1;
      } else if (row.optimization_status === 'cannot_move') {
        current.cannot_move_count += 1;
      }
      map.set(key, current);
    });
    return [...map.values()].sort((a, b) => b.weekly_savings_gbp - a.weekly_savings_gbp);
  }, [filteredRows]);

  const shiftTransitionRows = useMemo(() => {
    return filteredRows
      .filter((row) => row.optimization_status === 'reschedule')
      .map((row) => ({
        facility_name: row.facility_name,
        machine_name: row.machine_name,
        machine_type: row.machine_type,
        day_of_week: row.day_of_week,
        scheduled_window: formatHour(row.scheduled_hour),
        optimal_window: formatHour(row.recommended_hour ?? row.best_hour),
        weekly_savings_gbp: Number(row.total_savings_gbp || 0),
        carbon_savings_kg: Number(row.carbon_savings_kg || 0),
      }))
      .sort((a, b) => b.weekly_savings_gbp - a.weekly_savings_gbp)
      .slice(0, 12);
  }, [filteredRows]);

  const lockedOrOptimalRows = useMemo(() => {
    return filteredRows
      .filter((row) => row.optimization_status === 'cannot_move' || row.optimization_status === 'already_optimal')
      .map((row) => ({
        facility_name: row.facility_name,
        machine_name: row.machine_name,
        machine_type: row.machine_type,
        day_of_week: row.day_of_week,
        status: statusLabel(row.optimization_status),
        scheduled_window: formatHour(row.scheduled_hour),
        optimal_window: formatHour(row.best_hour),
        scheduled_cost: Number(row.scheduled_combined_cost_gbp_per_kwh || 0),
        best_cost: Number(row.best_combined_cost_gbp_per_kwh || 0),
      }))
      .sort((a, b) => a.status.localeCompare(b.status) || a.facility_name.localeCompare(b.facility_name))
      .slice(0, 15);
  }, [filteredRows]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-7xl p-6">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sky-600">
              <LayoutDashboard className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-[0.2em]">Executive operations summary</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Weekly Operations Optimization Impact</h1>
            <p className="mt-2 max-w-4xl text-sm text-slate-600">
              Executive view of how weekly scheduling optimization shifts operations from static windows into lower-cost, lower-carbon operating periods while clearly showing what remains fixed or already optimal.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            <button
              onClick={() => downloadCsv('weekly_operations_optimization_executive_summary.csv', filteredRows)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Export data
            </button>
          </div>
        </header>

        <div className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <Filter className="h-4 w-4" /> Region
            </label>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {regions.map((region) => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-500">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="All">All statuses</option>
              <option value="reschedule">Reschedule</option>
              <option value="already_optimal">Already optimal</option>
              <option value="cannot_move">Cannot move</option>
            </select>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Executive summary statement</p>
            <p className="mt-2 text-sm font-medium text-slate-800">
              Switching from static scheduling to weekly optimized windows unlocks {formatCurrency(summary.weeklySavings)} in weekly savings and {formatNumber(summary.carbonSavings, 0)} kg of carbon reduction across the visible scope.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Weekly savings" value={formatCurrency(summary.weeklySavings)} subtitle="Direct benefit from rescheduling eligible operations" icon={DollarSign} accent={COLORS.primary} />
          <StatCard title="Annualized savings" value={formatCurrency(summary.annualizedSavings)} subtitle="Illustrative run-rate if weekly optimization persists" icon={TrendingUp} accent={COLORS.secondary} />
          <StatCard title="Carbon reduction" value={`${formatNumber(summary.carbonSavings, 0)} kg`} subtitle="Weekly avoided emissions from moved operations" icon={Cloud} accent={COLORS.tertiary} />
          <StatCard title="Operations moved" value={formatNumber(summary.rescheduleCount)} subtitle={`${formatNumber(summary.optimalCount)} already optimal · ${formatNumber(summary.fixedCount)} cannot move`} icon={Clock3} accent={COLORS.quaternary} />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-sky-500" />
              <div>
                <h2 className="text-lg font-semibold">Facility-level impact next week</h2>
                <p className="text-sm text-slate-500">Weekly savings split by facility, with annualized context for executive prioritization.</p>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={facilityImpact}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="facility_name" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip formatter={tooltipValueFormatter} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="weekly_savings_gbp" fill={COLORS.primary} name="Weekly savings" radius={[6, 6, 0, 0]} />
                  <Bar yAxisId="right" dataKey="reschedule_count" fill={COLORS.secondary} name="Operations moved" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Operation status mix</h2>
            <p className="mb-4 text-sm text-slate-500">Which operations move, stay optimal, or remain fixed because they cannot be rescheduled.</p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusMix} dataKey="value" nameKey="name" outerRadius={110} innerRadius={60} paddingAngle={3}>
                    {statusMix.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Factory className="h-5 w-5 text-violet-500" />
              <div>
                <h2 className="text-lg font-semibold">Machine type opportunity</h2>
                <p className="text-sm text-slate-500">Where optimization changes generate the largest weekly economic impact.</p>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={machineTypeImpact}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="machine_type" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip formatter={tooltipValueFormatter} />
                  <Area type="monotone" dataKey="weekly_savings_gbp" stroke={COLORS.tertiary} fill={COLORS.tertiary} fillOpacity={0.3} name="Weekly savings" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-emerald-500" />
              <div>
                <h2 className="text-lg font-semibold">Top schedule transitions</h2>
                <p className="text-sm text-slate-500">Highest-value moves from static windows to optimized operating windows for next week.</p>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={shiftTransitionRows}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="machine_name" tick={{ fill: '#6b7280', fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={70} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip formatter={tooltipValueFormatter} />
                  <Legend />
                  <Line type="monotone" dataKey="weekly_savings_gbp" stroke={COLORS.success} strokeWidth={3} dot={{ r: 4 }} name="Weekly savings" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <div>
                <h2 className="text-lg font-semibold">Operations to reschedule next week</h2>
                <p className="text-sm text-slate-500">Recommended moves showing current static slot, optimal slot, and expected weekly savings.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-600">
                  <tr className="border-b border-slate-200">
                    <th className="px-3 py-3">Facility</th>
                    <th className="px-3 py-3">Machine</th>
                    <th className="px-3 py-3">Day</th>
                    <th className="px-3 py-3">Current</th>
                    <th className="px-3 py-3">Optimal</th>
                    <th className="px-3 py-3">Weekly savings</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftTransitionRows.map((row, index) => (
                    <tr key={`${row.machine_name}-${index}`} className="border-b border-slate-100">
                      <td className="px-3 py-3">{row.facility_name}</td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-900">{row.machine_name}</div>
                        <div className="text-xs text-slate-500">{row.machine_type}</div>
                      </td>
                      <td className="px-3 py-3">{row.day_of_week}</td>
                      <td className="px-3 py-3">{row.scheduled_window}</td>
                      <td className="px-3 py-3 text-sky-600">{row.optimal_window}</td>
                      <td className="px-3 py-3 font-medium text-emerald-600">{formatCurrency(row.weekly_savings_gbp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-rose-500" />
              <div>
                <h2 className="text-lg font-semibold">Already optimal or fixed in place</h2>
                <p className="text-sm text-slate-500">Operations that either already sit in the best window or cannot be moved despite a better slot.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-600">
                  <tr className="border-b border-slate-200">
                    <th className="px-3 py-3">Facility</th>
                    <th className="px-3 py-3">Machine</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Current</th>
                    <th className="px-3 py-3">Best</th>
                    <th className="px-3 py-3">Cost gap</th>
                  </tr>
                </thead>
                <tbody>
                  {lockedOrOptimalRows.map((row, index) => (
                    <tr key={`${row.machine_name}-${index}`} className="border-b border-slate-100">
                      <td className="px-3 py-3">{row.facility_name}</td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-900">{row.machine_name}</div>
                        <div className="text-xs text-slate-500">{row.machine_type}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-full px-2 py-1 text-xs font-medium" style={{ backgroundColor: `${statusPillColor(row.status)}20`, color: statusPillColor(row.status) }}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">{row.day_of_week} · {row.scheduled_window}</td>
                      <td className="px-3 py-3">{row.optimal_window}</td>
                      <td className="px-3 py-3">{formatCurrency(row.scheduled_cost - row.best_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
