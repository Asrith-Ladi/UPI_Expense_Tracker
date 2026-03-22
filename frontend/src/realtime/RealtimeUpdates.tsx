import { useCallback, useState } from 'react';
import { Send, Loader2, CheckCircle2, Info } from 'lucide-react';

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

function normalizePhone(raw: string): string {
  const t = raw.trim().replace(/\s/g, '');
  if (!t) return '';
  if (t.startsWith('+')) return `+${t.slice(1).replace(/\D/g, '')}`;
  if (/^\d{10}$/.test(t)) return `+91${t}`;
  return t.replace(/\D/g, '').length >= 10 ? `+${t.replace(/\D/g, '')}` : t;
}

export default function RealtimeUpdates({ totalCredit, totalDebit, transactionCount }: RealtimeUpdatesProps) {
  const [chatId, setChatId] = useState('');
  const [phone, setPhone] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<boolean | null>(null);

  const preview = buildAlertText({ totalCredit, totalDebit, transactionCount });

  const registerAlerts = useCallback(async () => {
    if (telegramEnabled && !chatId.trim()) {
      setSaveError('Enter your Telegram chat ID (see steps below).');
      return;
    }
    setSaveError(null);
    setSaving(true);
    setSaved(false);
    setLastSent(null);
    try {
      const res = await fetch(`${API_BASE}/api/telegram/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId.trim(),
          phone: normalizePhone(phone) || null,
          enabled: telegramEnabled,
          message_preview: preview,
        }),
      });
      const data = (await res.json()) as { detail?: string; telegram_sent?: boolean; send_error?: string | null };
      if (!res.ok) {
        throw new Error(typeof data.detail === 'string' ? data.detail : `HTTP ${res.status}`);
      }
      setSaved(true);
      if (typeof data.telegram_sent === 'boolean') setLastSent(data.telegram_sent);
      if (data.send_error) {
        setSaveError(`Telegram send failed: ${data.send_error}`);
      } else {
        setSaveError(null);
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not reach server');
    } finally {
      setSaving(false);
    }
  }, [chatId, phone, telegramEnabled, preview]);

  return (
    <div className="realtime-telegram-root">
      <section className="glass-panel realtime-panel realtime-panel--wide">
        <div className="realtime-icon-wrap">
          <Send size={36} strokeWidth={1.5} />
        </div>
        <h2 className="realtime-title">Real-time updates · Telegram</h2>
        <p className="realtime-copy">
          Alerts are sent as <strong>plain text</strong> (credit / debit summary) through your Telegram bot. The server
          reads <code>TELEGRAM_BOT_TOKEN</code> from its <code>.env</code> file — no WhatsApp setup required.
        </p>

        <div className="realtime-steps glass-panel">
          <div className="realtime-preview-label">What you do in Telegram (one-time)</div>
          <ol className="realtime-steps-list">
            <li>
              Open Telegram and search for <strong>@BotFather</strong>. Send <code>/newbot</code>, follow prompts, and copy
              the <strong>HTTP API token</strong>. Put it in the project root <code>.env</code> as{' '}
              <code>TELEGRAM_BOT_TOKEN=...</code> (see <code>.env.example</code>).
            </li>
            <li>
              BotFather gives you a link to your bot — open it and tap <strong>Start</strong> (or send{' '}
              <code>/start</code>). The bot is only allowed to message users who have started it.
            </li>
            <li>
              Get your <strong>chat ID</strong>: after messaging your bot, open this URL in a browser (replace{' '}
              <code>YOUR_TOKEN</code> with the same token as in <code>.env</code>):
              <pre className="realtime-code-block">
                https://api.telegram.org/botYOUR_TOKEN/getUpdates
              </pre>
              In the JSON, find <code>&quot;chat&quot;:&#123;&quot;id&quot;: 123456789</code> — that number is your{' '}
              <strong>chat ID</strong>. You can also use bots like @userinfobot to see your ID.
            </li>
            <li>
              Paste the chat ID below. Optionally add your phone number for your own records (Telegram delivery uses{' '}
              <strong>chat ID</strong>, not phone).
            </li>
          </ol>
        </div>

        <div className="realtime-info-banner">
          <Info size={18} />
          <span>
            If the token was ever shared publicly, open @BotFather → /revoke and generate a new token, then update{' '}
            <code>.env</code>.
          </span>
        </div>

        <div className="realtime-form">
          <label className="filter-label" htmlFor="tg-chat-id">
            Telegram chat ID <span className="text-muted">(required for delivery)</span>
          </label>
          <input
            id="tg-chat-id"
            type="text"
            inputMode="numeric"
            className="input"
            placeholder="e.g. 123456789"
            value={chatId}
            onChange={(e) => {
              setChatId(e.target.value);
              setSaved(false);
            }}
            autoComplete="off"
          />

          <label className="filter-label" htmlFor="tg-phone">
            Phone number <span className="text-muted">(optional)</span>
          </label>
          <input
            id="tg-phone"
            type="tel"
            className="input"
            placeholder="+91XXXXXXXXXX — optional, for your records only"
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
              checked={telegramEnabled}
              onChange={(e) => {
                setTelegramEnabled(e.target.checked);
                setSaved(false);
              }}
            />
            <span>Send this summary to my Telegram now (and use chat ID for future alerts)</span>
          </label>
        </div>

        <div className="realtime-preview glass-panel">
          <div className="realtime-preview-label">Message preview (plain text)</div>
          <pre className="realtime-preview-body">{preview}</pre>
        </div>

        <button type="button" className="btn btn-primary realtime-save-btn" onClick={registerAlerts} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="spin" size={18} /> Sending…
            </>
          ) : saved ? (
            <>
              <CheckCircle2 size={18} /> Done
              {lastSent === true ? ' — check Telegram' : lastSent === false ? ' (saved; see message above)' : ''}
            </>
          ) : (
            'Save & send test to Telegram'
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
