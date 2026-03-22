import { useEffect, useMemo, useState } from 'react';
import { List, TrendingUp, TrendingDown, IndianRupee } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import type { Transaction } from '../types/transaction';
import DashboardGranularityBar from './DashboardGranularityBar';
import {
  aggregateTimeline,
  dataSpanDays,
  enabledGranularities,
  type Granularity,
} from './granularity';

const COLORS = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#6366f1', '#14b8a6'];

const MetricCard = ({ title, value, change, isPositive, icon: Icon }: any) => (
  <div className="glass-panel metric-card" style={{ position: 'relative' }}>
    <Icon size={20} style={{ color: 'var(--accent-primary)', position: 'absolute', top: 20, right: 20 }} />
    <div className="metric-header">{title}</div>
    <div className="metric-value">{value}</div>
    {change !== null && (
      <div>
        <span className={`metric-change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '+' : ''}
          {change}%
        </span>
        <span className="text-muted" style={{ marginLeft: 8 }}>
          vs prev period
        </span>
      </div>
    )}
  </div>
);

type DashboardHomeProps = {
  filteredData: Transaction[];
  metrics: {
    transactions: number;
    txChange: number;
    totalCredit: number;
    creditChange: string | null;
    totalDebit: number;
    debitChange: string | null;
    net: number;
  };
  chartData: { name: string; Credit: number; Debit: number; value: number }[];
};

export default function DashboardHome({ filteredData, metrics, chartData }: DashboardHomeProps) {
  const dates = useMemo(() => filteredData.map((r) => r.Date).filter(Boolean), [filteredData]);
  const daysSpan = useMemo(() => dataSpanDays(dates), [dates]);
  const enabled = useMemo(() => enabledGranularities(daysSpan), [daysSpan]);

  const [granularity, setGranularity] = useState<Granularity>('daily');

  useEffect(() => {
    setGranularity((g) => (enabled.includes(g) ? g : enabled[0]));
  }, [enabled]);

  const timelineData = useMemo(
    () => aggregateTimeline(filteredData, granularity),
    [filteredData, granularity]
  );

  const lineChartData = useMemo(
    () => timelineData.map((p) => ({ ...p, date: p.label })),
    [timelineData]
  );

  const timelineTitle =
    granularity === 'daily'
      ? 'Cash flow (daily)'
      : granularity === 'month'
        ? 'Cash flow (by month)'
        : 'Cash flow (by year)';

  return (
    <>
      <DashboardGranularityBar
        enabled={enabled}
        value={granularity}
        onChange={setGranularity}
        daysSpan={daysSpan}
      />

      <div className="metrics-grid">
        <MetricCard
          title="Total Transactions"
          value={metrics.transactions}
          change={metrics.txChange}
          isPositive={true}
          icon={List}
        />
        <MetricCard
          title="Total Credit (Income)"
          value={`₹${metrics.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          change={metrics.creditChange}
          isPositive={Number(metrics.creditChange) > 0}
          icon={TrendingUp}
        />
        <MetricCard
          title="Total Debit (Expense)"
          value={`₹${metrics.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          change={metrics.debitChange}
          isPositive={Number(metrics.debitChange) < 0}
          icon={TrendingDown}
        />
        <MetricCard
          title="Net Change"
          value={`₹${metrics.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          change={null}
          isPositive={metrics.net >= 0}
          icon={IndianRupee}
        />
      </div>

      <div className="charts-grid">
        <div className="glass-panel chart-container">
          <h3 className="chart-title">Expense Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.filter((d) => d.Debit > 0)}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip
                contentStyle={{ background: 'var(--bg-top)', border: '1px solid var(--border-color)', borderRadius: 8 }}
                formatter={(value) => `₹${Number(value ?? 0).toLocaleString()}`}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-panel chart-container">
          <h3 className="chart-title">Income vs Expense by Category</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="var(--text-secondary)" angle={-45} textAnchor="end" height={60} />
              <YAxis stroke="var(--text-secondary)" />
              <RechartsTooltip
                contentStyle={{ background: 'var(--bg-top)', border: '1px solid var(--border-color)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--text-primary)' }}
              />
              <Legend />
              <Bar dataKey="Credit" fill="var(--success)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Debit" fill="var(--danger)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-panel chart-container" style={{ minHeight: 400 }}>
        <h3 className="chart-title">{timelineTitle}</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={lineChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="date" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
            <YAxis stroke="var(--text-secondary)" />
            <RechartsTooltip
              contentStyle={{ background: 'var(--bg-top)', border: '1px solid var(--border-color)', borderRadius: 8 }}
            />
            <Legend />
            <Line type="monotone" dataKey="Credit" stroke="var(--success)" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="Debit" stroke="var(--danger)" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-panel table-container" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
        <h3 className="chart-title">Recent Transactions</h3>
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', minHeight: '300px', maxHeight: '600px' }}>
          <table className="data-table">
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#0d0f1a' }}>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Details</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Credit (₹)</th>
                <th style={{ textAlign: 'right' }}>Debit (₹)</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.Date}</td>
                  <td>{row.Time || '-'}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{row['Main Detail'] || '-'}</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>
                      {row['Transaction Details']}
                    </div>
                  </td>
                  <td>
                    <span className="tag-badge">{row.Tags}</span>
                  </td>
                  <td style={{ textAlign: 'right', color: row.Credit > 0 ? 'var(--success)' : 'inherit' }}>
                    {row.Credit > 0 ? row.Credit.toLocaleString() : '-'}
                  </td>
                  <td style={{ textAlign: 'right', color: row.Debit > 0 ? 'var(--danger)' : 'inherit' }}>
                    {row.Debit > 0 ? row.Debit.toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
                    No transactions found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-secondary)' }}>
          Showing all {filteredData.length} transactions
        </div>
      </div>
    </>
  );
}
