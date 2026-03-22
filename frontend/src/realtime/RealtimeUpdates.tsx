import { Radio } from 'lucide-react';

export default function RealtimeUpdates() {
  return (
    <section className="realtime-panel glass-panel">
      <div className="realtime-icon-wrap">
        <Radio size={36} strokeWidth={1.5} />
      </div>
      <h2 className="realtime-title">Real-time updates</h2>
      <p className="realtime-copy">
        Live sync and push notifications will appear here. The workspace stays open so you can explore other steps while
        this is under development.
      </p>
    </section>
  );
}
