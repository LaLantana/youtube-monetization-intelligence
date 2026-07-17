import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    LineChart,
    Line,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    Cell,
} from 'recharts';
import {
    RefreshCw,
    LayoutDashboard,
    Building2,
    DollarSign,
    Cloud,
    Zap,
    Moon,
    Sun,
    Download,
    Filter,
    AlertCircle,
    TrendingUp,
} from 'lucide-react';

const CONNECTION = 'data_plane_fabric';
const COLORS = {
    primary: '#0ea5e9',
    secondary: '#14b8a6',
    tertiary: '#8b5cf6',
    quaternary: '#f59e0b',
    success: '#22c55e',
    warning: '#eab308',
    danger: '#ef4444',
    slate: '#64748b',
};

const FACILITY_QUERY = `
SELECT
    facility_id,
    facility_name,
    region,
    recommendation_count,
    total_savings_gbp,
    energy_cost_savings_gbp,
    carbon_cost_savings_gbp,
    carbon_savings_kg,
    summary_generated_at
FROM {{ ref('facility_savings_summary', flow='weather_carbon_optimization') }}
ORDER BY total_savings_gbp DESC
`;

const RECOMMENDATIONS_QUERY = `
SELECT TOP 500
    facility_id,
    facility_name,
    region,
    machine_id,
    machine_name,
    machine_type,
    day_of_week,
    shift,
    scheduled_hour,
    recommended_hour,
    runtime_hours,
    total_savings_gbp,
    energy_cost_savings_gbp,
    carbon_cost_savings_gbp,
    carbon_savings_kg,
    baseline_tariff_bucket,
    recommended_tariff_bucket,
    recommendation_generated_at
FROM {{ ref('operations_optimization_recommendations', flow='weather_carbon_optimization') }}
ORDER BY total_savings_gbp DESC
`;

const FORECAST_QUERY = `
SELECT TOP 1000
    facility_id,
    facility_name,
    region,
    forecast_timestamp,
    timestamp_hour,
    tariff_bucket,
    tariff_gbp_per_kwh,
    predicted_intensity_gco2_per_kwh,
    predicted_carbon_kg_per_kwh,
    predicted_carbon_cost_gbp_per_kwh,
    predicted_combined_cost_gbp_per_kwh
FROM {{ ref('forecast_carbon_predictions', flow='weather_carbon_optimization') }}
ORDER BY forecast_timestamp ASC
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
    const normalized = Number(hour || 0);
    return `${String(normalized).padStart(2, '0')}:00`;
}

function downloadCsv(filename, rows) {
    if (!rows.length) {
        return;
    }

    const headers = Object.keys(rows[0]);
    const csv = [headers.join(',')]
        .concat(
            rows.map((row) =>
                headers
                    .map((key) => {
                        const value = row[key] ?? '';
                        const escaped = String(value).replaceAll('"', '""');
                        return `"${escaped}"`;
                    })
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

function StatCard({ title, value, subtitle, icon: Icon, theme, accent }) {
    return (
        <div
            className={`rounded-2xl border p-5 shadow-sm ${
                theme === 'dark' ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'
            }`}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium opacity-70">{title}</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
                    <p className="mt-2 text-sm opacity-70">{subtitle}</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: accent }}>
                    <Icon className="h-5 w-5 text-white" />
                </div>
            </div>
        </div>
    );
}

export default function App() {
    const [theme, setTheme] = useState('dark');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [facilityRows, setFacilityRows] = useState([]);
    const [recommendationRows, setRecommendationRows] = useState([]);
    const [forecastRows, setForecastRows] = useState([]);
    const [selectedRegion, setSelectedRegion] = useState('All');
    const [selectedFacility, setSelectedFacility] = useState('All');

    const loadData = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const facilityResult = await window.ascend.runQuery(FACILITY_QUERY, { connection: CONNECTION });
            const recommendationResult = await window.ascend.runQuery(RECOMMENDATIONS_QUERY, { connection: CONNECTION });
            const forecastResult = await window.ascend.runQuery(FORECAST_QUERY, { connection: CONNECTION });

            setFacilityRows(facilityResult.rows || []);
            setRecommendationRows(recommendationResult.rows || []);
            setForecastRows(forecastResult.rows || []);
        } catch (err) {
            setError(err?.message || 'Failed to load dashboard data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const regions = useMemo(() => {
        const values = [...new Set(facilityRows.map((row) => row.region).filter(Boolean))];
        return ['All', ...values];
    }, [facilityRows]);

    const facilities = useMemo(() => {
        const source = selectedRegion === 'All'
            ? facilityRows
            : facilityRows.filter((row) => row.region === selectedRegion);
        return ['All', ...source.map((row) => row.facility_name)];
    }, [facilityRows, selectedRegion]);

    const filteredFacilityRows = useMemo(() => {
        return facilityRows.filter((row) => {
            const regionMatch = selectedRegion === 'All' || row.region === selectedRegion;
            const facilityMatch = selectedFacility === 'All' || row.facility_name === selectedFacility;
            return regionMatch && facilityMatch;
        });
    }, [facilityRows, selectedRegion, selectedFacility]);

    const filteredRecommendationRows = useMemo(() => {
        return recommendationRows.filter((row) => {
            const regionMatch = selectedRegion === 'All' || row.region === selectedRegion;
            const facilityMatch = selectedFacility === 'All' || row.facility_name === selectedFacility;
            return regionMatch && facilityMatch;
        });
    }, [recommendationRows, selectedRegion, selectedFacility]);

    const filteredForecastRows = useMemo(() => {
        return forecastRows.filter((row) => {
            const regionMatch = selectedRegion === 'All' || row.region === selectedRegion;
            const facilityMatch = selectedFacility === 'All' || row.facility_name === selectedFacility;
            return regionMatch && facilityMatch;
        });
    }, [forecastRows, selectedRegion, selectedFacility]);

    const kpis = useMemo(() => {
        const totalSavings = filteredFacilityRows.reduce((sum, row) => sum + Number(row.total_savings_gbp || 0), 0);
        const totalCarbon = filteredFacilityRows.reduce((sum, row) => sum + Number(row.carbon_savings_kg || 0), 0);
        const totalRecommendations = filteredFacilityRows.reduce((sum, row) => sum + Number(row.recommendation_count || 0), 0);
        const avgCombinedCost = filteredForecastRows.length
            ? filteredForecastRows.reduce((sum, row) => sum + Number(row.predicted_combined_cost_gbp_per_kwh || 0), 0) / filteredForecastRows.length
            : 0;
        return { totalSavings, totalCarbon, totalRecommendations, avgCombinedCost };
    }, [filteredFacilityRows, filteredForecastRows]);

    const hourlyTrend = useMemo(() => {
        const map = new Map();
        filteredForecastRows.forEach((row) => {
            const key = String(row.forecast_timestamp).slice(0, 13);
            const current = map.get(key) || {
                label: key.replace('T', ' '),
                predicted_intensity_gco2_per_kwh: 0,
                predicted_combined_cost_gbp_per_kwh: 0,
                count: 0,
            };
            current.predicted_intensity_gco2_per_kwh += Number(row.predicted_intensity_gco2_per_kwh || 0);
            current.predicted_combined_cost_gbp_per_kwh += Number(row.predicted_combined_cost_gbp_per_kwh || 0);
            current.count += 1;
            map.set(key, current);
        });

        return [...map.values()].slice(0, 72).map((row) => ({
            label: row.label,
            predicted_intensity_gco2_per_kwh: row.count ? row.predicted_intensity_gco2_per_kwh / row.count : 0,
            predicted_combined_cost_gbp_per_kwh: row.count ? row.predicted_combined_cost_gbp_per_kwh / row.count : 0,
        }));
    }, [filteredForecastRows]);

    const topRecommendations = useMemo(() => filteredRecommendationRows.slice(0, 8), [filteredRecommendationRows]);

    const tariffMix = useMemo(() => {
        const counts = filteredForecastRows.reduce((acc, row) => {
            const key = row.tariff_bucket || 'unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        return Object.entries(counts).map(([name, value], index) => ({
            name,
            value,
            fill: [COLORS.primary, COLORS.secondary, COLORS.quaternary, COLORS.tertiary][index % 4],
        }));
    }, [filteredForecastRows]);

    const containerClass = theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900';
    const panelClass = theme === 'dark' ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white';
    const mutedClass = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';

    return (
        <div className={`min-h-screen ${containerClass}`}>
            <div className="mx-auto max-w-7xl p-6">
                <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950 p-6 shadow-xl lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="mb-3 flex items-center gap-2 text-sky-300">
                            <LayoutDashboard className="h-5 w-5" />
                            <span className="text-sm font-semibold uppercase tracking-[0.2em]">Operations dashboard</span>
                        </div>
                        <h1 className="text-3xl font-semibold tracking-tight text-white">Weather Carbon Optimization</h1>
                        <p className="mt-2 max-w-3xl text-sm text-slate-300">
                            Monitor predicted carbon intensity, financial savings, and machine rescheduling recommendations across facilities.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-800"
                        >
                            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                        </button>
                        <button
                            onClick={loadData}
                            disabled={loading}
                            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            {loading ? 'Loading…' : 'Refresh'}
                        </button>
                        <button
                            onClick={() => downloadCsv('operations_recommendations.csv', filteredRecommendationRows)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-800"
                        >
                            <Download className="h-4 w-4" />
                            Export CSV
                        </button>
                    </div>
                </header>

                <div className={`mb-6 grid gap-4 rounded-2xl border p-4 ${panelClass} md:grid-cols-2 xl:grid-cols-4`}>
                    <div>
                        <label className={`mb-2 flex items-center gap-2 text-sm font-medium ${mutedClass}`}>
                            <Filter className="h-4 w-4" /> Region
                        </label>
                        <select
                            value={selectedRegion}
                            onChange={(e) => {
                                setSelectedRegion(e.target.value);
                                setSelectedFacility('All');
                            }}
                            className={`w-full rounded-xl border px-3 py-2 text-sm ${theme === 'dark' ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900'}`}
                        >
                            {regions.map((region) => (
                                <option key={region} value={region}>{region}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={`mb-2 block text-sm font-medium ${mutedClass}`}>Facility</label>
                        <select
                            value={selectedFacility}
                            onChange={(e) => setSelectedFacility(e.target.value)}
                            className={`w-full rounded-xl border px-3 py-2 text-sm ${theme === 'dark' ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900'}`}
                        >
                            {facilities.map((facility) => (
                                <option key={facility} value={facility}>{facility}</option>
                            ))}
                        </select>
                    </div>
                    <div className={`rounded-xl border p-4 ${theme === 'dark' ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
                        <p className={`text-sm ${mutedClass}`}>Visible facilities</p>
                        <p className="mt-2 text-2xl font-semibold">{filteredFacilityRows.length}</p>
                    </div>
                    <div className={`rounded-xl border p-4 ${theme === 'dark' ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
                        <p className={`text-sm ${mutedClass}`}>Visible recommendations</p>
                        <p className="mt-2 text-2xl font-semibold">{filteredRecommendationRows.length}</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-200">
                        <AlertCircle className="mt-0.5 h-5 w-5" />
                        <div>
                            <p className="font-medium">Data load failed</p>
                            <p className="text-sm opacity-90">{error}</p>
                        </div>
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard title="Total savings" value={formatCurrency(kpis.totalSavings)} subtitle="Combined energy and carbon cost savings" icon={DollarSign} theme={theme} accent={COLORS.primary} />
                    <StatCard title="Carbon reduction" value={`${formatNumber(kpis.totalCarbon, 1)} kg`} subtitle="Projected emissions avoided" icon={Cloud} theme={theme} accent={COLORS.secondary} />
                    <StatCard title="Recommended moves" value={formatNumber(kpis.totalRecommendations)} subtitle="Positive-savings schedule changes" icon={Zap} theme={theme} accent={COLORS.tertiary} />
                    <StatCard title="Avg cost / kWh" value={formatCurrency(kpis.avgCombinedCost)} subtitle="Forecast combined energy plus carbon cost" icon={TrendingUp} theme={theme} accent={COLORS.quaternary} />
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-3">
                    <div className={`xl:col-span-2 rounded-2xl border p-5 ${panelClass}`}>
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">72-hour carbon intensity outlook</h2>
                                <p className={`text-sm ${mutedClass}`}>Average predicted carbon intensity and combined cost across the filtered scope.</p>
                            </div>
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={hourlyTrend}>
                                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                                    <XAxis dataKey="label" tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }} minTickGap={28} />
                                    <YAxis yAxisId="left" tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Line yAxisId="left" type="monotone" dataKey="predicted_intensity_gco2_per_kwh" stroke={COLORS.secondary} strokeWidth={3} dot={false} name="Predicted intensity (gCO₂/kWh)" />
                                    <Line yAxisId="right" type="monotone" dataKey="predicted_combined_cost_gbp_per_kwh" stroke={COLORS.primary} strokeWidth={3} dot={false} name="Combined cost (£/kWh)" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className={`rounded-2xl border p-5 ${panelClass}`}>
                        <h2 className="text-lg font-semibold">Tariff mix</h2>
                        <p className={`mb-4 text-sm ${mutedClass}`}>Distribution of forecast hours by tariff bucket.</p>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={tariffMix} layout="vertical" margin={{ left: 16, right: 16 }}>
                                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                                    <XAxis type="number" tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                                    <YAxis type="category" dataKey="name" tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }} width={90} />
                                    <Tooltip />
                                    <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                                        {tariffMix.map((entry) => (
                                            <Cell key={entry.name} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-2">
                    <div className={`rounded-2xl border p-5 ${panelClass}`}>
                        <div className="mb-4 flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-sky-400" />
                            <div>
                                <h2 className="text-lg font-semibold">Facility savings comparison</h2>
                                <p className={`text-sm ${mutedClass}`}>Total forecast savings by facility for the current filter set.</p>
                            </div>
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={filteredFacilityRows}>
                                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                                    <XAxis dataKey="facility_name" tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                                    <YAxis tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                                    <Tooltip formatter={(value) => formatCurrency(value)} />
                                    <Legend />
                                    <Bar dataKey="energy_cost_savings_gbp" stackId="a" fill={COLORS.primary} name="Energy savings" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="carbon_cost_savings_gbp" stackId="a" fill={COLORS.secondary} name="Carbon savings" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className={`rounded-2xl border p-5 ${panelClass}`}>
                        <div className="mb-4 flex items-center gap-2">
                            <Cloud className="h-5 w-5 text-teal-400" />
                            <div>
                                <h2 className="text-lg font-semibold">Carbon savings by facility</h2>
                                <p className={`text-sm ${mutedClass}`}>Projected kilograms of CO₂ avoided by acting on recommendations.</p>
                            </div>
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={filteredFacilityRows}>
                                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                                    <XAxis dataKey="facility_name" tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                                    <YAxis tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                                    <Tooltip formatter={(value) => `${formatNumber(value, 1)} kg`} />
                                    <Area type="monotone" dataKey="carbon_savings_kg" stroke={COLORS.secondary} fill={COLORS.secondary} fillOpacity={0.35} name="Carbon savings (kg)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className={`mt-6 rounded-2xl border p-5 ${panelClass}`}>
                    <h2 className="text-lg font-semibold">Top machine recommendations</h2>
                    <p className={`mb-4 text-sm ${mutedClass}`}>Highest-value suggested schedule changes from the optimization engine.</p>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>
                                <tr className="border-b border-slate-700">
                                    <th className="px-3 py-3">Facility</th>
                                    <th className="px-3 py-3">Machine</th>
                                    <th className="px-3 py-3">Shift</th>
                                    <th className="px-3 py-3">Move</th>
                                    <th className="px-3 py-3">Savings</th>
                                    <th className="px-3 py-3">Carbon</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topRecommendations.map((row, index) => (
                                    <tr key={`${row.machine_id}-${index}`} className="border-b border-slate-800/60">
                                        <td className="px-3 py-3">
                                            <div className="font-medium">{row.facility_name}</div>
                                            <div className={`text-xs ${mutedClass}`}>{row.region}</div>
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="font-medium">{row.machine_name}</div>
                                            <div className={`text-xs ${mutedClass}`}>{row.machine_type}</div>
                                        </td>
                                        <td className="px-3 py-3">{row.day_of_week} · {row.shift}</td>
                                        <td className="px-3 py-3">
                                            <div>{formatHour(row.scheduled_hour)} → {formatHour(row.recommended_hour)}</div>
                                            <div className={`text-xs ${mutedClass}`}>{row.baseline_tariff_bucket} → {row.recommended_tariff_bucket}</div>
                                        </td>
                                        <td className="px-3 py-3 font-medium text-emerald-400">{formatCurrency(row.total_savings_gbp)}</td>
                                        <td className="px-3 py-3">{formatNumber(row.carbon_savings_kg, 1)} kg</td>
                                    </tr>
                                ))}
                                {!topRecommendations.length && !loading && (
                                    <tr>
                                        <td colSpan={6} className={`px-3 py-8 text-center ${mutedClass}`}>
                                            No recommendations match the current filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}