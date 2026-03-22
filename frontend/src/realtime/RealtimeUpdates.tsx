import { useCallback, useState } from 'react';
import { Send, Loader2, CheckCircle2, Crown, ExternalLink, Zap } from 'lucide-react';

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
    '📊 UPI Analysis Summary',
    `💚 Total credit : ${formatInr(p.totalCredit)}`,
    `🔴 Total debit  : ${formatInr(p.totalDebit)}`,
    `📋 Transactions : ${p.transactionCount}`,
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
      setSaveError('Enter your Telegram Chat ID first.');
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
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : `HTTP ${res.status}`);
      setSaved(true);
      if (typeof data.telegram_sent === 'boolean') setLastSent(data.telegram_sent);
      setSaveError(data.send_error ? `Send failed: ${data.send_error}` : null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not reach server');
    } finally {
      setSaving(false);
    }
  }, [chatId, phone, telegramEnabled, preview]);

  return (
    <div className="realtime-telegram-root">
      <section className="glass-panel realtime-panel realtime-panel--wide">

        {/* Header */}
        <div className="rt-header">
          <div className="rt-icon-ring">
            <Send size={22} strokeWidth={1.8} />
          </div>
          <div>
            <h2 className="realtime-title">Telegram Alerts</h2>
            <p className="rt-subtitle">Push your UPI summary straight to Telegram — instant &amp; private.</p>
          </div>
        </div>

        {/* Gold: How to get Chat ID */}
        <div className="realtime-chatid-premium">
          <div className="realtime-chatid-premium__header">
            <Crown size={16} className="realtime-chatid-crown" />
            <span className="realtime-chatid-premium__title">How to get your Telegram Chat ID</span>
          </div>
          <p className="realtime-chatid-premium__desc">
            Your <strong>Chat ID</strong> is a unique number that tells the bot where to deliver alerts. Two quick methods:
          </p>

          <div className="realtime-chatid-methods">
            <div className="realtime-chatid-method">
              <div className="realtime-chatid-method__num">1</div>
              <div className="realtime-chatid-method__body">
                <strong>Via an ID-bot</strong> — Message{' '}
                <a href="https://t.me/chatIDrobot" target="_blank" rel="noopener noreferrer" className="realtime-chatid-link">
                  @chatIDrobot
                </a>{' '}
                or{' '}
                <a href="https://t.me/GetTheirIDBot" target="_blank" rel="noopener noreferrer" className="realtime-chatid-link">
                  @GetTheirIDBot
                </a>{' '}
                on Telegram — they reply instantly with your numeric ID.
              </div>
            </div>

            <div className="realtime-chatid-method">
              <div className="realtime-chatid-method__num">2</div>
              <div className="realtime-chatid-method__body">
                <strong>Via getUpdates</strong> — After messaging your bot, open in a browser:
                <pre className="realtime-code-block">https://api.telegram.org/botYOUR_TOKEN/getUpdates</pre>
                Look for <code>"chat":{"{ "}"id": 123456789</code> — that number is your Chat ID.
              </div>
            </div>
          </div>

          <a
            href="https://www.forwardmsg.com/docs/how_to_obtain_telegram_chat_id"
            target="_blank"
            rel="noopener noreferrer"
            className="realtime-chatid-doclink"
          >
            <ExternalLink size={13} />
            Full guide on forwardmsg.com
          </a>
        </div>

        {/* Form */}
        <div className="realtime-form">
          <label className="filter-label" htmlFor="tg-chat-id">
            Your Telegram Chat ID <span className="text-muted">(required)</span>
          </label>
          <input
            id="tg-chat-id"
            type="text"
            inputMode="numeric"
            className="input"
            placeholder="e.g. 123456789"
            value={chatId}
            onChange={(e) => { setChatId(e.target.value); setSaved(false); }}
            autoComplete="off"
          />

          <label className="filter-label" htmlFor="tg-phone">
            Phone number <span className="text-muted">(optional — for your records only)</span>
          </label>
          <input
            id="tg-phone"
            type="tel"
            className="input"
            placeholder="+91XXXXXXXXXX"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setSaved(false); }}
            autoComplete="tel"
          />

          <label className="realtime-checkbox-row">
            <input
              type="checkbox"
              checked={telegramEnabled}
              onChange={(e) => { setTelegramEnabled(e.target.checked); setSaved(false); }}
            />
            <span>Send a test message to my Telegram now</span>
          </label>
        </div>

        {/* Preview */}
        <div className="realtime-preview glass-panel">
          <div className="realtime-preview-label">
            <Zap size={12} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
            Message preview
          </div>
          <pre className="realtime-preview-body">{preview}</pre>
        </div>

        {/* CTA */}
        <button
          type="button"
          className="btn btn-primary realtime-save-btn"
          onClick={registerAlerts}
          disabled={saving}
        >
          {saving ? (
            <><Loader2 className="spin" size={18} /> Sending…</>
          ) : saved ? (
            <>
              <CheckCircle2 size={18} /> Done
              {lastSent === true ? ' — check Telegram ✅' : lastSent === false ? ' (see message above)' : ''}
            </>
          ) : (
            <><Send size={16} /> Save &amp; send test</>
          )}
        </button>

        {saveError && (
          <p className="realtime-error" role="alert">{saveError}</p>
        )}
      </section>
    </div>
  );
}
