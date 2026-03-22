import { useState, useRef, useMemo, useCallback } from 'react';
import { IndianRupee, Upload } from 'lucide-react';
import UploadSection from './components/UploadSection';
import { categoriesFromData, type FilterState } from './components/FilterSidebar';
import StepTabs, { type AppTab } from './components/StepTabs';
import DashboardHome from './dashboard/DashboardHome';
import TaggingView from './tagging/TaggingView';
import EmailIntegration from './email/EmailIntegration';
import RealtimeUpdates from './realtime/RealtimeUpdates';
import { WorkflowProvider, useWorkflow } from './context/WorkflowContext';
import type { Transaction } from './types/transaction';

type AppShellProps = {
  onLogout: () => void;
};

function AppShellInner({ onLogout }: AppShellProps) {
  const { taggingConfirmed, confirmTaggingStep, resetWorkflow } = useWorkflow();

  const [data, setData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('tagging');

  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    minAmount: 0,
    maxAmount: 100000,
    categories: [],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    Array.from(e.target.files).forEach((file) => {
      formData.append('files', file);
    });

    try {
      const res = await fetch('http://127.0.0.1:8000/api/process', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();

      const parsedData = result.data.map((item: Record<string, unknown>) => ({
        ...item,
        Credit: item.Credit || 0,
        Debit: item.Debit || 0,
        Amount: item.Amount || 0,
        Date: item.Date || new Date().toISOString().split('T')[0],
      })) as Transaction[];

      setData(parsedData);
      resetWorkflow();

      if (parsedData.length > 0) {
        const dates = parsedData.map((d) => new Date(d.Date).getTime());
        const minD = new Date(Math.min(...dates)).toISOString().split('T')[0];
        const maxD = new Date(Math.max(...dates)).toISOString().split('T')[0];
        setFilters((f) => ({ ...f, startDate: minD, endDate: maxD }));
        setActiveTab('tagging');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to process files');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handlePatchTransaction = useCallback((dataIndex: number, patch: Partial<Transaction>) => {
    setData((prev) => {
      const next = [...prev];
      const merged = { ...next[dataIndex], ...patch };
      merged.Credit = Number(merged.Credit) || 0;
      merged.Debit = Number(merged.Debit) || 0;
      merged.Amount = Number(merged.Amount) || 0;
      next[dataIndex] = merged;
      return next;
    });
  }, []);

  const allCategories = useMemo(() => categoriesFromData(data), [data]);

  const filteredRowsWithIndices = useMemo(() => {
    return data
      .map((item, dataIndex) => ({ item, dataIndex }))
      .filter(({ item }) => {
        if (filters.startDate && item.Date < filters.startDate) return false;
        if (filters.endDate && item.Date > filters.endDate) return false;

        const absAmount = Math.max(item.Credit, item.Debit);
        if (absAmount > 0 && (absAmount < filters.minAmount || absAmount > filters.maxAmount)) return false;

        if (filters.categories.length > 0 && !filters.categories.includes(item.Tags)) return false;

        return true;
      });
  }, [data, filters]);

  const filteredData = useMemo(() => filteredRowsWithIndices.map((r) => r.item), [filteredRowsWithIndices]);

  const metrics = useMemo(() => {
    const totalCredit = filteredData.reduce((sum, item) => sum + item.Credit, 0);
    const totalDebit = filteredData.reduce((sum, item) => sum + item.Debit, 0);
    const net = totalCredit - totalDebit;

    const prevCredit = totalCredit * 0.9;
    const prevDebit = totalDebit * 1.1;

    return {
      transactions: filteredData.length,
      txChange: 5.2,
      totalCredit,
      creditChange: prevCredit ? ((totalCredit - prevCredit) / prevCredit * 100).toFixed(1) : null,
      totalDebit,
      debitChange: prevDebit ? ((totalDebit - prevDebit) / prevDebit * 100).toFixed(1) : null,
      net,
    };
  }, [filteredData]);

  const chartData = useMemo(() => {
    const grouped = filteredData.reduce(
      (acc: Record<string, { name: string; Credit: number; Debit: number; value: number }>, curr) => {
        const tag = curr.Tags || 'Others';
        if (!acc[tag]) acc[tag] = { name: tag, Credit: 0, Debit: 0, value: 0 };
        acc[tag].Credit += curr.Credit;
        acc[tag].Debit += curr.Debit;
        acc[tag].value += curr.Debit;
        return acc;
      },
      {}
    );

    return Object.values(grouped).sort((a, b) => b.Debit - a.Debit);
  }, [filteredData]);

  const hasData = data.length > 0;

  const handleConfirmTagging = useCallback(() => {
    confirmTaggingStep();
    setActiveTab('dashboard');
  }, [confirmTaggingStep]);

  return (
    <div className="app-container">
      {/* Sidebar removed for inline dashboard filters */}

      <main className="main-content">
        <input
          type="file"
          multiple
          accept=".pdf,.xlsx,.csv,.xls"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />

        <header className="app-shell-header">
          <div className="app-shell-header-left">
            <UploadSection
              loading={loading}
              uploadComplete={hasData}
              onTriggerFileDialog={() => fileInputRef.current?.click()}
            />
          </div>
          <div className="app-shell-header-mid">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Hamburger removed */}
              <div>
                <h1 style={{ fontSize: 22, marginBottom: 4 }}>UPI Analysis tracker</h1>
                {!hasData ? (
                  <p className="app-shell-subtitle app-shell-subtitle--prompt">
                    Please upload your statement documents (Excel, CSV, or PDF) to begin. After processing, Tagging opens
                    automatically; other steps stay locked until you confirm tagging.
                  </p>
                ) : !taggingConfirmed ? (
                  <p className="app-shell-subtitle app-shell-subtitle--prompt">
                    Review and confirm the Tagging step to unlock Dashboard, Real-time, and Email.
                  </p>
                ) : (
                  <p className="text-muted" style={{ fontSize: 13 }}>
                    Paytm, PhonePe &amp; GPay analysis
                  </p>
                )}
              </div>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            <button className="btn btn-outline" onClick={onLogout} style={{ fontSize: 13, padding: '8px 16px' }}>
              Logout
            </button>
          </div>
        </header>

        <StepTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          hasData={hasData}
          taggingConfirmed={taggingConfirmed}
        />

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--danger)',
              padding: 16,
              borderRadius: 8,
              border: '1px solid var(--danger)',
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {loading ? (
          <div
            className="rupee-loader-container glass-panel"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              minHeight: 400,
              marginTop: 24,
            }}
          >
            <div
              className="rupee-loader pulse-animation"
              style={{
                width: 80,
                height: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(16, 185, 129, 0.1)',
                borderRadius: '50%',
                marginBottom: 24,
                border: '2px solid var(--success)',
                boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)',
              }}
            >
              <IndianRupee size={40} color="var(--success)" />
            </div>
            <h2 className="gradient-text" style={{ fontSize: 24, marginBottom: 8 }}>
              Processing Currency Data...
            </h2>
            <p className="text-muted">Uncovering your financial footprint.</p>
          </div>
        ) : activeTab === 'realtime' ? (
          taggingConfirmed ? (
            <RealtimeUpdates
              totalCredit={metrics.totalCredit}
              totalDebit={metrics.totalDebit}
              transactionCount={metrics.transactions}
            />
          ) : (
            <div className="glass-panel step-locked-panel">
              <h3 className="chart-title">Real-time updates</h3>
              <p className="text-muted" style={{ lineHeight: 1.6 }}>
                Confirm the Tagging step to unlock real-time updates.
              </p>
              <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setActiveTab('tagging')}>
                Go to Tagging
              </button>
            </div>
          )
        ) : activeTab === 'email' ? (
          taggingConfirmed ? (
            <EmailIntegration />
          ) : (
            <div className="glass-panel step-locked-panel">
              <h3 className="chart-title">Email integration</h3>
              <p className="text-muted" style={{ lineHeight: 1.6 }}>
                Confirm the Tagging step to connect Gmail and load messages.
              </p>
              <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setActiveTab('tagging')}>
                Go to Tagging
              </button>
            </div>
          )
        ) : activeTab === 'tagging' && hasData ? (
          <TaggingView
            rows={filteredRowsWithIndices}
            onPatchTransaction={handlePatchTransaction}
            taggingConfirmed={taggingConfirmed}
            onConfirmTaggingComplete={handleConfirmTagging}
            onNavigateDashboard={() => setActiveTab('dashboard')}
          />
        ) : activeTab === 'tagging' && !hasData ? (
          <div className="glass-panel step-locked-panel">
            <h3 className="chart-title">Tagging</h3>
            <p className="text-muted" style={{ lineHeight: 1.6 }}>
              Upload at least one statement using the control on the top left. After processing finishes, this step
              unlocks automatically.
            </p>
          </div>
        ) : activeTab === 'dashboard' && hasData && taggingConfirmed ? (
          <DashboardHome 
            filteredData={filteredData} 
            metrics={metrics} 
            chartData={chartData} 
            filters={filters}
            setFilters={setFilters}
            allCategories={allCategories}
          />
        ) : activeTab === 'dashboard' && hasData && !taggingConfirmed ? (
          <div className="glass-panel step-locked-panel">
            <h3 className="chart-title">Dashboard</h3>
            <p className="text-muted" style={{ lineHeight: 1.6 }}>
              Complete the Tagging step and confirm to unlock charts and metrics.
            </p>
            <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setActiveTab('tagging')}>
              Go to Tagging
            </button>
          </div>
        ) : activeTab === 'dashboard' && !hasData ? (
          <div className="premium-upload-wrapper">
            <div className="premium-upload-zone" onClick={() => fileInputRef.current?.click()}>
              <div className="premium-upload-icon-wrap glow-pulse">
                <Upload size={32} strokeWidth={1.5} />
              </div>
              <h2 className="premium-upload-title">Connect your data</h2>
              <p className="premium-upload-subtitle">
                Upload your bank or UPI exports (Excel, CSV, PDF) to instantly generate AI-powered insights, tag categories, and build your dashboard.
              </p>
              <button className="btn btn-primary premium-upload-action">
                Select Files to Begin
              </button>
            </div>
            
            <div className="premium-upload-features">
              <div className="feature-item">
                <div className="f-icon">🔒</div><span>Secure local parsing</span>
              </div>
              <div className="feature-item">
                <div className="f-icon">✨</div><span>AI-powered auto-tagging</span>
              </div>
              <div className="feature-item">
                <div className="f-icon">📊</div><span>Instant visual dashboards</span>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default function AppShell(props: AppShellProps) {
  return (
    <WorkflowProvider>
      <AppShellInner {...props} />
    </WorkflowProvider>
  );
}
