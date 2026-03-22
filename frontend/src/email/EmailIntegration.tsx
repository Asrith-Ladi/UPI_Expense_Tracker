import { useCallback, useEffect, useState } from 'react';
import { Mail, Loader2, AlertCircle, ExternalLink } from 'lucide-react';

const GMAIL_READONLY = 'https://www.googleapis.com/auth/gmail.readonly';
const GSI_SCRIPT = 'https://accounts.google.com/gsi/client';

type GmailHeader = { name: string; value: string };

export type GmailMessageRow = {
  id: string;
  subject: string;
  from: string;
  date: string;
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
  return {
    id,
    subject: headerVal(headers, 'Subject') || '(no subject)',
    from: headerVal(headers, 'From') || '—',
    date: headerVal(headers, 'Date') || '—',
    snippet: data.snippet || '',
  };
}

async function fetchTop10Messages(token: string): Promise<GmailMessageRow[]> {
  const listR = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10',
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!listR.ok) {
    const t = await listR.text();
    throw new Error(t || `Gmail list failed (${listR.status})`);
  }
  const list = (await listR.json()) as { messages?: { id: string }[] };
  const ids = (list.messages || []).map((m) => m.id).filter(Boolean);
  const rows = await Promise.all(ids.map((id) => fetchMessageRow(id, token)));
  return rows;
}

const LS_CLIENT_ID = 'upi_gmail_client_id';

export default function EmailIntegration() {
  const envId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const [clientIdInput, setClientIdInput] = useState(() => {
    try {
      return localStorage.getItem(LS_CLIENT_ID) || envId || '';
    } catch {
      return envId || '';
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<GmailMessageRow[] | null>(null);

  useEffect(() => {
    if (envId && !clientIdInput) setClientIdInput(envId);
  }, [envId, clientIdInput]);

  const persistClientId = useCallback((id: string) => {
    setClientIdInput(id);
    try {
      localStorage.setItem(LS_CLIENT_ID, id);
    } catch {
      /* ignore */
    }
  }, []);

  const connectGmail = useCallback(async () => {
    const clientId = clientIdInput.trim();
    if (!clientId) {
      setError('Enter your Google OAuth Client ID (Web application).');
      return;
    }
    setError(null);
    setRows(null);
    setLoading(true);
    try {
      await loadGsiScript();
      const oauth2 = window.google?.accounts?.oauth2;
      if (!oauth2) throw new Error('Google Identity Services not available');

      await new Promise<void>((resolve, reject) => {
        const client = oauth2.initTokenClient({
          client_id: clientId,
          scope: GMAIL_READONLY,
          callback: async (resp) => {
            if (resp.error) {
              reject(new Error(resp.error));
              return;
            }
            if (!resp.access_token) {
              reject(new Error('No access token'));
              return;
            }
            try {
              const data = await fetchTop10Messages(resp.access_token);
              setRows(data);
              resolve();
            } catch (e) {
              reject(e instanceof Error ? e : new Error(String(e)));
            }
          },
        });
        client.requestAccessToken();
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gmail connection failed');
    } finally {
      setLoading(false);
    }
  }, [clientIdInput]);

  return (
    <div className="email-gmail-root">
      <section className="glass-panel email-gmail-card">
        <div className="email-integration-icon-wrap">
          <Mail size={36} strokeWidth={1.5} />
        </div>
        <h2 className="email-integration-title">Gmail integration</h2>
        <p className="email-integration-copy">
          Connect with read-only Gmail access to list your <strong>10 most recent messages</strong> (by internal time). You
          need a Google Cloud project with the <strong>Gmail API</strong> enabled and an <strong>OAuth 2.0 Web client</strong>{' '}
          ID. Add your app origin (e.g. <code>http://localhost:5173</code>) under Authorized JavaScript origins.
        </p>
        <a
          className="email-doc-link"
          href="https://developers.google.com/gmail/api/quickstart/js"
          target="_blank"
          rel="noreferrer"
        >
          Gmail API browser guide <ExternalLink size={14} />
        </a>

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

        <button type="button" className="btn btn-primary email-connect-btn" onClick={connectGmail} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="spin" size={18} /> Connecting…
            </>
          ) : (
            <>
              <Mail size={18} /> Connect Gmail &amp; load top 10
            </>
          )}
        </button>

        {error && (
          <div className="email-error-banner" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
      </section>

      {rows && rows.length > 0 && (
        <section className="glass-panel email-gmail-table-wrap">
          <h3 className="chart-title">Latest 10 messages</h3>
          <div className="email-table-scroll">
            <table className="data-table email-messages-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>From</th>
                  <th>Subject</th>
                  <th>Snippet</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="email-cell-date">{r.date}</td>
                    <td className="email-cell-from">{r.from}</td>
                    <td>{r.subject}</td>
                    <td className="text-muted email-cell-snippet">{r.snippet}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {rows && rows.length === 0 && (
        <p className="text-muted" style={{ textAlign: 'center' }}>
          No messages returned.
        </p>
      )}
    </div>
  );
}
