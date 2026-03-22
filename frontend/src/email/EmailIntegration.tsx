import { useCallback, useEffect, useState, useMemo } from 'react';
import { Mail, Loader2, AlertCircle, ExternalLink, Send, CheckCircle2, Sparkles } from 'lucide-react';
import { BANK_OPTIONS, type BankId } from './bankConfig';

const GMAIL_READONLY = 'https://www.googleapis.com/auth/gmail.readonly';
const GSI_SCRIPT = 'https://accounts.google.com/gsi/client';
const API_BASE = 'http://127.0.0.1:8000';

type GmailHeader = { name: string; value: string };

export type GmailMessageRow = {
  id: string;
  subject: string;
  from: string;
  date: string;         // raw RFC-2822 string from Gmail
  parsedMs: number;     // epoch ms for filtering
  snippet: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GSI_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Google script failed')));
      return;
    }
    const s = document.createElement('script');
    s.src = GSI_SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load Google Identity Services'));
    document.body.appendChild(s);
  });
}

function headerVal(headers: GmailHeader[] | undefined, name: string): string {
  if (!headers) return '';
  const h = headers.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h?.value ?? '';
}

async function fetchMessageRow(id: string, token: string): Promise<GmailMessageRow> {
  const r = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!r.ok) throw new Error(await r.text());
  const data = (await r.json()) as {
    snippet?: string;
    payload?: { headers?: GmailHeader[] };
  };
  const headers = data.payload?.headers;
  const dateStr = headerVal(headers, 'Date') || '';
  return {
    id,
    subject: headerVal(headers, 'Subject') || '(no subject)',
    from: headerVal(headers, 'From') || '—',
    date: dateStr,
    parsedMs: dateStr ? new Date(dateStr).getTime() : 0,
    snippet: data.snippet || '',
  };
}

async function fetchTop10WithQuery(token: string, searchQuery: string): Promise<GmailMessageRow[]> {
  const params = new URLSearchParams({ maxResults: '10' });
  if (searchQuery.trim()) params.set('q', searchQuery.trim());

  const listR = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!listR.ok) {
    const t = await listR.text();
    throw new Error(t || `Gmail list failed (${listR.status})`);
  }
  const list = (await listR.json()) as { messages?: { id: string }[] };
  const ids = (list.messages || []).map((m) => m.id).filter(Boolean);
  return Promise.all(ids.map((id) => fetchMessageRow(id, token)));
}

/** Format a raw RFC-2822 date string into a short readable form */
function fmtDate(raw: string): string {
  try {
    return new Date(raw).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return raw;
  }
}

const LS_CLIENT_ID = 'upi_gmail_client_id';

export default function EmailIntegration() {
  const envId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const [clientIdInput, setClientIdInput] = useState(() => {
    try { return localStorage.getItem(LS_CLIENT_ID) || envId || ''; }
    catch { return envId || ''; }
  });
  const [selectedBank, setSelectedBank] = useState<BankId>('AXIS');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<GmailMessageRow[] | null>(null);

  // Telegram send state (for summary panel)
  const [tgChatId, setTgChatId]   = useState('');
  const [tgSending, setTgSending] = useState(false);
  const [tgSent, setTgSent]       = useState(false);
  const [tgError, setTgError]     = useState<string | null>(null);

  useEffect(() => {
    if (envId && !clientIdInput) setClientIdInput(envId);
  }, [envId, clientIdInput]);

  const persistClientId = useCallback((id: string) => {
    setClientIdInput(id);
    try { localStorage.setItem(LS_CLIENT_ID, id); } catch { /* ignore */ }
  }, []);

  const bankQuery = BANK_OPTIONS.find((b) => b.id === selectedBank)?.query ?? 'axis';

  const runFetch = useCallback(async (token: string) => {
    const data = await fetchTop10WithQuery(token, bankQuery);
    setRows(data);
    setTgSent(false);
    setTgError(null);
  }, [bankQuery]);

  const connectGmail = useCallback(async () => {
    const clientId = clientIdInput.trim();
    if (!clientId) { setError('Enter your Google OAuth Client ID (Web application).'); return; }
    const bank = BANK_OPTIONS.find((b) => b.id === selectedBank);
    if (!bank?.enabled) { setError('Only AXIS is available right now.'); return; }
    setError(null); setRows(null); setLoading(true);
    try {
      await loadGsiScript();
      const oauth2 = window.google?.accounts?.oauth2;
      if (!oauth2) throw new Error('Google Identity Services not available');
      await new Promise<void>((resolve, reject) => {
        const client = oauth2.initTokenClient({
          client_id: clientId,
          scope: GMAIL_READONLY,
          callback: async (resp) => {
            if (resp.error) { reject(new Error(resp.error)); return; }
            if (!resp.access_token) { reject(new Error('No access token')); return; }
            try {
              setAccessToken(resp.access_token);
              await runFetch(resp.access_token);
              resolve();
            } catch (e) { reject(e instanceof Error ? e : new Error(String(e))); }
          },
        });
        client.requestAccessToken();
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gmail connection failed');
    } finally {
      setLoading(false);
    }
  }, [clientIdInput, selectedBank, runFetch]);

  const refreshMails = useCallback(async () => {
    if (!accessToken) { setError('Connect Gmail first.'); return; }
    const bank = BANK_OPTIONS.find((b) => b.id === selectedBank);
    if (!bank?.enabled) { setError('Only AXIS is available right now.'); return; }
    setError(null); setLoading(true);
    try { await runFetch(accessToken); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load messages'); }
    finally { setLoading(false); }
  }, [accessToken, selectedBank, runFetch]);

  // ── Top 10 Rows (Already limited by API to 10 max) ─────────
  const top10Rows = useMemo(() => rows || [], [rows]);

  const sendToTelegram = useCallback(async () => {
    const chatId = tgChatId.trim();
    if (!chatId) { setTgError('Enter your Telegram Chat ID.'); return; }
    setTgSending(true); setTgSent(false); setTgError(null);
    try {
      const payload = {
        chat_id: chatId,
        bank: selectedBank,
        rows: top10Rows.map((r) => ({
          date: fmtDate(r.date),
          from_: r.from,
          subject: r.subject,
          snippet: r.snippet,
        })),
      };
      const res = await fetch(`${API_BASE}/api/telegram/send-email-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok: boolean; sent: boolean; error?: string | null };
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setTgSent(true);
    } catch (e) {
      setTgError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setTgSending(false);
    }
  }, [tgChatId, top10Rows, selectedBank]);

  return (
    <div className="email-gmail-root">

      {/* ── Connect Card ────────────────────────────────────────────────── */}
      <section className="glass-panel email-gmail-card">
        <div className="email-integration-icon-wrap">
          <Mail size={36} strokeWidth={1.5} />
        </div>
        <h2 className="email-integration-title">Gmail Integration</h2>
        <p className="email-integration-copy">
          Authorize Gmail read-only access to pull the latest bank emails and send a summary to Telegram.
          You need a Google Cloud project with <strong>Gmail API</strong> enabled and an{' '}
          <strong>OAuth 2.0 Web client</strong>.
        </p>
        <a
          className="email-doc-link"
          href="https://developers.google.com/gmail/api/reference/rest/v1/users.messages/list"
          target="_blank"
          rel="noreferrer"
        >
          Gmail API docs <ExternalLink size={14} />
        </a>

        {/* Bank selector */}
        <div className="email-bank-row" role="group" aria-label="Bank">
          <span className="filter-label">Bank</span>
          <div className="email-bank-pills">
            {BANK_OPTIONS.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`email-bank-pill ${selectedBank === b.id ? 'is-active' : ''} ${!b.enabled ? 'is-disabled' : ''}`}
                disabled={!b.enabled}
                onClick={() => b.enabled && setSelectedBank(b.id)}
                title={!b.enabled ? `${b.display} — coming soon` : `Search query: ${b.query}`}
              >
                {b.display}
              </button>
            ))}
          </div>
          <p className="email-bank-hint text-muted">
            Search query: <code>{bankQuery}</code>
          </p>
        </div>

        {/* OAuth Client ID */}
        <div className="email-client-field">
          <label className="filter-label" htmlFor="gmail-client-id">
            OAuth Web Client ID
          </label>
          <input
            id="gmail-client-id"
            className="input"
            placeholder="xxxx.apps.googleusercontent.com"
            value={clientIdInput}
            onChange={(e) => persistClientId(e.target.value)}
            autoComplete="off"
          />
        </div>

        {/* Actions */}
        <div className="email-actions-row">
          <button type="button" className="btn btn-primary email-connect-btn" onClick={connectGmail} disabled={loading}>
            {loading ? <><Loader2 className="spin" size={18} /> Working…</> : <><Mail size={18} /> Connect Gmail &amp; fetch</>}
          </button>
          {accessToken && (
            <button type="button" className="btn btn-outline" onClick={refreshMails} disabled={loading}>
              Refresh
            </button>
          )}
        </div>

        {error && (
          <div className="email-error-banner" role="alert">
            <AlertCircle size={18} /><span>{error}</span>
          </div>
        )}
      </section>

      {/* ── Premium: Top 10 Summary Panel ──────────────────────────── */}
      {rows && (
        <section className="glass-panel email-summary-premium">
          {/* Header */}
          <div className="email-summary-premium__header">
            <div className="email-summary-premium__icon">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="email-summary-premium__title">Top 10 Recent Transactions</h3>
              <p className="email-summary-premium__meta">
                {top10Rows.length > 0
                  ? `Showing latest ${top10Rows.length} email${top10Rows.length > 1 ? 's' : ''} from ${selectedBank}`
                  : `No emails found for ${selectedBank}`}
              </p>
            </div>
          </div>

          {/* Mini table */}
          {top10Rows.length > 0 ? (
            <div className="email-table-scroll email-summary-table-wrap">
              <table className="data-table email-messages-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>From</th>
                    <th>Subject</th>
                    <th>Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {top10Rows.map((r) => (
                    <tr key={r.id}>
                      <td className="email-cell-date">{fmtDate(r.date)}</td>
                      <td className="email-cell-from" style={{ fontWeight: 500 }}>{r.from}</td>
                      <td>{r.subject}</td>
                      <td className="text-muted email-cell-snippet">{r.snippet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="email-summary-empty">
              No messages matched the query.
            </p>
          )}

          {/* Telegram send row */}
          <div className="email-summary-tg-row">
            <div className="email-summary-tg-input-wrap">
              <label className="filter-label" htmlFor="es-tg-chat-id">
                Telegram Chat ID
              </label>
              <input
                id="es-tg-chat-id"
                type="text"
                inputMode="numeric"
                className="input"
                placeholder="e.g. 123456789"
                value={tgChatId}
                onChange={(e) => { setTgChatId(e.target.value); setTgSent(false); setTgError(null); }}
                autoComplete="off"
              />
            </div>
            <button
              type="button"
              className="btn btn-primary email-summary-send-btn"
              onClick={sendToTelegram}
              disabled={tgSending || top10Rows.length === 0}
              title={top10Rows.length === 0 ? 'No emails to send' : 'Send summary PDF to Telegram'}
            >
              {tgSending ? (
                <><Loader2 className="spin" size={16} /> Generating PDF…</>
              ) : tgSent ? (
                <><CheckCircle2 size={16} /> PDF Sent ✅</>
              ) : (
                <><Send size={16} /> Send as PDF to Telegram</>
              )}
            </button>
          </div>

          {tgSent && (
            <p className="email-summary-tg-success">
              ✅ PDF Summary sent to Telegram. Check your messages!
            </p>
          )}
          {tgError && (
            <div className="email-error-banner" role="alert" style={{ marginTop: 8 }}>
              <AlertCircle size={16} /><span>{tgError}</span>
            </div>
          )}
        </section>
      )}

      {rows && rows.length === 0 && accessToken && (
        <p className="text-muted" style={{ textAlign: 'center' }}>
          No messages matched <code>{bankQuery}</code>.
        </p>
      )}
    </div>
  );
}
