import { Mail } from 'lucide-react';

export default function EmailIntegration() {
  return (
    <section className="email-integration-panel glass-panel">
      <div className="email-integration-icon-wrap">
        <Mail size={36} strokeWidth={1.5} />
      </div>
      <h2 className="email-integration-title">Email integration</h2>
      <p className="email-integration-copy">
        Connect your inbox to pull statement attachments automatically. This section is coming next.
      </p>
    </section>
  );
}
