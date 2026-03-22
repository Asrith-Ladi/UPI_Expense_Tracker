import { useCallback, useState } from 'react';
import { MessageCircle, Loader2, CheckCircle2, Info } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000';

export type RealtimeUpdatesProps = {
  totalCredit: number;
  totalDebit: number;
  transactionCount: number;
};

function formatInr(n: number): string {
  return `₹${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildAlertText(p: RealtimeUpdatesProps): string {
  return [
    'UPI Analysis tracker',
    `Total credit: ${formatInr(p.totalCredit)}`,
    `Total debit: ${formatInr(p.totalDebit)}`,
    `Transactions (current filters): ${p.transactionCount}`,
  ].join('\n');
}

/** E.164-style: digits with optional leading + */
function normalizePhone(raw: string): string {
  const t = raw.trim().replace(/\s/g, '');
  if (!t) return '';
  if (t.startsWith('+')) return `+${t.slice(1).replace(/\D/g, '')}`;
  if (/^\d{10}$/.test(t)) return `+91${t}`;
  return t.replace(/\D/g, '').length >= 10 ? `+${t.replace(/\D/g, '')}` : t;
}

function isPlausiblePhone(e164: string): boolean {
  const digits = e164.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export default function RealtimeUpdates({ totalCredit, totalDebit, transactionCount }: RealtimeUpdatesProps) {
  const [phone, setPhone] = useState('');
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const preview = buildAlertText({ totalCredit, totalDebit, transactionCount });

  const registerAlerts = useCallback(async () => {
    const normalized = normalizePhone(phone);
    if (whatsappEnabled && !isPlausiblePhone(normalized)) {
      setSaveError('Enter a valid mobile number (10 digits or +country code).');
      return;
    }
    setSaveError(null);
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: normalized || null,
          enabled: whatsappEnabled,
          message_preview: preview,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      setSaved(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not reach server');
    } finally {
      setSaving(false);
    }
  }, [phone, whatsappEnabled, preview]);

  return (
    <div className="realtime-whatsapp-root">
      <section className="glass-panel realtime-panel realtime-panel--wide">
        <div className="realtime-icon-wrap">
          <MessageCircle size={36} strokeWidth={1.5} />
        </div>
        <h2 className="realtime-title">Real-time updates · WhatsApp</h2>
        <p className="realtime-copy">
          Yes — you can send <strong>credit / debit summaries as text</strong> to a user&apos;s WhatsApp, but delivery is
          not done in the browser alone. You need a provider such as{' '}
          <strong>Meta WhatsApp Cloud API</strong>, <strong>Twilio WhatsApp</strong>, or{' '}
          <strong>MessageBird</strong>, plus a verified business number. This screen collects the phone number and
          registers intent; the sample API route logs the payload so you can wire sending server-side.
        </p>

        <div className="realtime-info-banner">
          <Info size={18} />
          <span>
            Flow: user opts in → backend schedules or sends templated messages → provider delivers to WhatsApp. Template
            messages must be approved by Meta for marketing/utility categories.
          </span>
        </div>

        <div className="realtime-form">
          <label className="filter-label" htmlFor="wa-phone">
            WhatsApp number
          </label>
          <input
            id="wa-phone"
            type="tel"
            className="input"
            placeholder="+91XXXXXXXXXX or 10-digit mobile"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setSaved(false);
            }}
            autoComplete="tel"
          />

          <label className="realtime-checkbox-row">
            <input
              type="checkbox"
              checked={whatsappEnabled}
              onChange={(e) => {
                setWhatsappEnabled(e.target.checked);
                setSaved(false);
              }}
            />
            <span>Send me WhatsApp alerts with credit &amp; debit summary text (when backend is connected)</span>
          </label>
        </div>

        <div className="realtime-preview glass-panel">
          <div className="realtime-preview-label">Message preview (plain text)</div>
          <pre className="realtime-preview-body">{preview}</pre>
        </div>

        <button type="button" className="btn btn-primary realtime-save-btn" onClick={registerAlerts} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="spin" size={18} /> Saving…
            </>
          ) : saved ? (
            <>
              <CheckCircle2 size={18} /> Saved (stub)
            </>
          ) : (
            'Save preferences & register with server'
          )}
        </button>

        {saveError && (
          <p className="realtime-error" role="alert">
            {saveError}
          </p>
        )}
      </section>
    </div>
  );
}
