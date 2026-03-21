import { useState, useRef, useMemo } from 'react';
import { Upload, LogOut, List, TrendingUp, TrendingDown, Activity, IndianRupee, Menu, X } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

// --- Type Definitions ---
interface Transaction {
  Date: string;
  Time: string | null;
  'Transaction Details': string;
  'Main Detail': string;
  Tags: string;
  Credit: number;
  Debit: number;
  Amount: number;
  Remarks?: string | null;
}

interface FilterState {
  startDate: string;
  endDate: string;
  minAmount: number;
  maxAmount: number;
  categories: string[];
}

// --- Colors for Charts ---
const COLORS = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#6366f1', '#14b8a6'];

// --- Helper Components ---
const MetricCard = ({ title, value, change, isPositive, icon: Icon }: any) => (
  <div className="glass-panel metric-card">
    <div className="metric-header">
      {title}
      <Icon size={20} style={{ color: "var(--accent-primary)" }} />
    </div>
    <div className="metric-value">{value}</div>
    {change !== null && (
      <div>
        <span className={`metric-change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '+' : ''}{change}%
        </span>
        <span className="text-muted" style={{ marginLeft: 8 }}>vs prev period</span>
      </div>
    )}
  </div>
);

// --- Main Dashboard Component ---
export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [data, setData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    minAmount: 0,
    maxAmount: 100000,
    categories: []
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    setLoading(true);
    setError(null);
    
    const formData = new FormData();
    Array.from(e.target.files).forEach(file => {
      formData.append('files', file);
    });

    try {
      const res = await fetch('http://127.0.0.1:8000/api/process', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      
      const parsedData = result.data.map((item: any) => ({
        ...item,
        Credit: item.Credit || 0,
        Debit: item.Debit || 0,
        Amount: item.Amount || 0,
        Date: item.Date || new Date().toISOString().split('T')[0]
      }));

      setData(parsedData);

      if (parsedData.length > 0) {
        const dates = parsedData.map((d: any) => new Date(d.Date).getTime());
        const minD = new Date(Math.min(...dates)).toISOString().split('T')[0];
        const maxD = new Date(Math.max(...dates)).toISOString().split('T')[0];
        setFilters(f => ({ ...f, startDate: minD, endDate: maxD }));
      }
    } catch (err: any) {
      setError(err.message || "Failed to process files");
    } finally {
      setLoading(false);
    }
  };

  // Extract unique categories
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    data.forEach(d => { if (d.Tags) cats.add(d.Tags); });
    return Array.from(cats);
  }, [data]);

  // Apply Filters
  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (filters.startDate && item.Date < filters.startDate) return false;
      if (filters.endDate && item.Date > filters.endDate) return false;
      
      const absAmount = Math.max(item.Credit, item.Debit);
      if (absAmount > 0 && (absAmount < filters.minAmount || absAmount > filters.maxAmount)) return false;

      if (filters.categories.length > 0 && !filters.categories.includes(item.Tags)) return false;

      return true;
    });
  }, [data, filters]);

  // Compute Metrics
  const metrics = useMemo(() => {
    const totalCredit = filteredData.reduce((sum, item) => sum + item.Credit, 0);
    const totalDebit = filteredData.reduce((sum, item) => sum + item.Debit, 0);
    const net = totalCredit - totalDebit;

    // A dummy previous period baseline comparison calculation
    const prevCredit = totalCredit * 0.9; 
    const prevDebit = totalDebit * 1.1;
    
    return {
      transactions: filteredData.length,
      txChange: 5.2, // Dummy change
      totalCredit,
      creditChange: prevCredit ? ((totalCredit - prevCredit) / prevCredit * 100).toFixed(1) : null,
      totalDebit,
      debitChange: prevDebit ? ((totalDebit - prevDebit) / prevDebit * 100).toFixed(1) : null,
      net
    };
  }, [filteredData]);

  // Prepare Chart Data
  const chartData = useMemo(() => {
    const grouped = filteredData.reduce((acc: any, curr) => {
      const tag = curr.Tags || 'Others';
      if (!acc[tag]) acc[tag] = { name: tag, Credit: 0, Debit: 0, value: 0 };
      acc[tag].Credit += curr.Credit;
      acc[tag].Debit += curr.Debit;
      acc[tag].value += curr.Debit; // Piechart uses debit mostly to see expenses
      return acc;
    }, {});
    
    return Object.values(grouped).sort((a: any, b: any) => b.Debit - a.Debit);
  }, [filteredData]);

  const timelineData = useMemo(() => {
     const grouped = filteredData.reduce((acc: any, curr) => {
      const date = curr.Date;
      if (!acc[date]) acc[date] = { date, Credit: 0, Debit: 0 };
      acc[date].Credit += curr.Credit;
      acc[date].Debit += curr.Debit;
      return acc;
    }, {});
    return Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [filteredData]);

  return (
    <div className="app-container">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ background: 'var(--accent-primary)', padding: 8, borderRadius: 8 }}>
            <Activity color="white" size={24} />
          </div>
          <h2 className="gradient-text" style={{ fontSize: 18, flex: 1 }}>UPI Expense Tracker</h2>
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
            <X size={18} />
          </button>
        </div>

        <div className="filter-group">
          <label className="filter-label">Filter by Date</label>
          <input 
            type="date" 
            className="input" 
            style={{ marginBottom: 12 }}
            value={filters.startDate}
            onChange={e => setFilters({...filters, startDate: e.target.value})}
          />
          <input 
            type="date" 
            className="input" 
            value={filters.endDate}
            onChange={e => setFilters({...filters, endDate: e.target.value})}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">Transaction Amount Limit</label>
          <div style={{ display: 'flex', gap: 12 }}>
            <input 
              type="number" 
              className="input" 
              placeholder="Min" 
              value={filters.minAmount}
              onChange={e => setFilters({...filters, minAmount: Number(e.target.value)})}
            />
            <input 
              type="number" 
              className="input" 
              placeholder="Max"
              value={filters.maxAmount}
              onChange={e => setFilters({...filters, maxAmount: Number(e.target.value)})}
            />
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            Categories
            {filters.categories.length > 0 && (
              <span 
                style={{ fontSize: 12, color: 'var(--accent-primary)', cursor: 'pointer' }}
                onClick={() => setFilters({...filters, categories: []})}
              >
                Clear
              </span>
            )}
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
            {allCategories.map(cat => (
              <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <input 
                  type="checkbox" 
                  checked={filters.categories.includes(cat)}
                  onChange={e => {
                    if (e.target.checked) {
                      setFilters(f => ({...f, categories: [...f.categories, cat]}));
                    } else {
                      setFilters(f => ({...f, categories: f.categories.filter(c => c !== cat)}));
                    }
                  }}
                />
                {cat}
              </label>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }}></div>
        <button className="btn btn-outline" onClick={onLogout}>
          <LogOut size={16} /> Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open filters">
              <Menu size={22} />
            </button>
            <div>
              <h1 style={{ fontSize: 24, marginBottom: 2 }}>UPI Expense Tracker</h1>
              <p className="text-muted" style={{ fontSize: 13 }}>Paytm, PhonePe &amp; GPay analysis</p>
            </div>
          </div>
          
          <div>
            <input 
              type="file" 
              multiple 
              accept=".pdf,.xlsx,.csv,.xls"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={loading}>
              <Upload size={18} /> {loading ? 'Processing...' : 'Upload Statements'}
            </button>
          </div>
        </header>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: 16, borderRadius: 8, border: '1px solid var(--danger)' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {data.length === 0 && !loading && !error ? (
          <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
            <Upload className="upload-icon" />
            <h3 style={{ marginBottom: 8 }}>Ready for your statements</h3>
            <p className="text-muted" style={{ maxWidth: 400, margin: '0 auto' }}>
              Drag and drop your files here or click to browse. We support Paytm (Excel/CSV), PhonePe (PDF - must contain 'phonepe' in filename), and GPay (PDF).
            </p>
          </div>
        ) : loading ? (
          <div className="rupee-loader-container glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 400, marginTop: 40 }}>
            <div className="rupee-loader pulse-animation" style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', marginBottom: 24, border: '2px solid var(--success)', boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)' }}>
              <IndianRupee size={40} color="var(--success)" />
            </div>
            <h2 className="gradient-text" style={{ fontSize: 24, marginBottom: 8 }}>Processing Currency Data...</h2>
            <p className="text-muted">Uncovering your financial footprint.</p>
          </div>
        ) : (
          <>
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
                value={`₹${metrics.totalCredit.toLocaleString(undefined, {minimumFractionDigits: 2})}`} 
                change={metrics.creditChange} 
                isPositive={Number(metrics.creditChange) > 0}
                icon={TrendingUp}
              />
              <MetricCard 
                title="Total Debit (Expense)" 
                value={`₹${metrics.totalDebit.toLocaleString(undefined, {minimumFractionDigits: 2})}`} 
                change={metrics.debitChange} 
                isPositive={Number(metrics.debitChange) < 0}
                icon={TrendingDown}
              />
              <MetricCard 
                title="Net Change" 
                value={`₹${metrics.net.toLocaleString(undefined, {minimumFractionDigits: 2})}`} 
                change={null} 
                isPositive={metrics.net >= 0}
                icon={IndianRupee}
              />
            </div>

            <div className="charts-grid">
              <div className="glass-panel chart-container">
                <h3 className="chart-title">Income vs Expense by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
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
              <div className="glass-panel chart-container">
                <h3 className="chart-title">Expense Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.filter((d: any) => d.Debit > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ background: 'var(--bg-top)', border: '1px solid var(--border-color)', borderRadius: 8 }}
                      formatter={(value: any) => `₹${Number(value).toLocaleString()}`}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel chart-container" style={{ minHeight: 300 }}>
              <h3 className="chart-title">Cash Flow Timeline</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="var(--text-secondary)" />
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
                          <div style={{ fontWeight: 500 }}>{row["Main Detail"] || '-'}</div>
                          <div className="text-muted" style={{ fontSize: 12 }}>{row["Transaction Details"]}</div>
                        </td>
                        <td>
                          <span className="tag-badge">
                            {row.Tags}
                          </span>
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
        )}
      </main>
    </div>
  );
}
