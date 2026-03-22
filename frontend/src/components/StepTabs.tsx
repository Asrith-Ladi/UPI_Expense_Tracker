import { Tags, LayoutDashboard, Radio, Mail, Lock } from 'lucide-react';

export type AppTab = 'tagging' | 'dashboard' | 'realtime' | 'email';

type StepTabsProps = {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  hasData: boolean;
  taggingConfirmed: boolean;
};

export default function StepTabs({ activeTab, onTabChange, hasData, taggingConfirmed }: StepTabsProps) {
  const lockTagging = !hasData;
  const lockDashboard = !hasData || !taggingConfirmed;
  const lockRealtime = !taggingConfirmed;
  const lockEmail = !taggingConfirmed;

  const renderTab = (id: AppTab, label: string, Icon: typeof Tags, locked: boolean, title: string) => (
    <button
      key={id}
      type="button"
      className={`app-tab ${activeTab === id ? 'active' : ''} ${locked ? 'is-locked' : ''}`}
      onClick={() => onTabChange(id)}
      disabled={locked}
      title={locked ? title : label}
    >
      {locked ? <Lock size={14} className="app-tab-lock" aria-hidden /> : null}
      <Icon size={17} strokeWidth={2.25} />
      {label}
    </button>
  );

  return (
    <nav className="app-top-tabs app-step-tabs" aria-label="Workflow steps">
      {renderTab('tagging', 'Tagging', Tags, lockTagging, 'Upload a document first to unlock tagging.')}
      {renderTab('dashboard', 'Dashboard', LayoutDashboard, lockDashboard, 'Complete tagging confirmation to unlock the dashboard.')}
      {renderTab(
        'realtime',
        'Real-time updates',
        Radio,
        lockRealtime,
        'Confirm tagging to unlock real-time updates.'
      )}
      {renderTab('email', 'Email integration', Mail, lockEmail, 'Confirm tagging to unlock Gmail integration.')}
    </nav>
  );
}
