import { useMemo, useState, useCallback, Fragment, useRef, useEffect } from 'react';
import { Info, ChevronDown, ChevronRight, Layers, IndianRupee } from 'lucide-react';

export interface TaggingTransaction {
  Date: string;
  Time: string | null;
  'Transaction Details': string;
  'Main Detail': string;
  Tags: string;
  Credit: number;
  Debit: number;
  Amount: number;
}

function counterpartyKey(row: TaggingTransaction): string {
  const main = (row['Main Detail'] || '').trim();
  const details = (row['Transaction Details'] || '').trim();
  return main || details || 'Unknown';
}

interface UserAgg {
  key: string;
  transactions: TaggingTransaction[];
  count: number;
  totalCredit: number;
  totalDebit: number;
  totalVolume: number;
}

function aggregateByCounterparty(rows: TaggingTransaction[]): UserAgg[] {
  const map = new Map<string, TaggingTransaction[]>();
  for (const row of rows) {
    const k = counterpartyKey(row);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(row);
  }
  return Array.from(map.entries()).map(([key, transactions]) => {
    let totalCredit = 0;
    let totalDebit = 0;
    for (const t of transactions) {
      totalCredit += t.Credit || 0;
      totalDebit += t.Debit || 0;
    }
    return {
      key,
      transactions,
      count: transactions.length,
      totalCredit,
      totalDebit,
      totalVolume: totalCredit + totalDebit,
    };
  });
}

function passesTxnCondition(count: number, threshold: number | null): boolean {
  if (threshold === null || Number.isNaN(threshold)) return false;
  return count > threshold;
}

function passesMoneyCondition(totalVolume: number, threshold: number | null): boolean {
  if (threshold === null || Number.isNaN(threshold)) return false;
  return totalVolume > threshold;
}

function FieldHint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="tagging-field-hint-wrap" ref={wrapRef}>
      <button
        type="button"
        className="tagging-info-btn"
        aria-label="Field description"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Info size={16} strokeWidth={2.25} />
      </button>
      {open && (
        <div className="tagging-tooltip" role="tooltip">
          {text}
        </div>
      )}
    </div>
  );
}

export default function TaggingView({ transactions }: { transactions: TaggingTransaction[] }) {
  const [txnThresholdStr, setTxnThresholdStr] = useState('');
  const [moneyThresholdStr, setMoneyThresholdStr] = useState('');
  const [combineMode, setCombineMode] = useState<'and' | 'or'>('and');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const txnThreshold = txnThresholdStr.trim() === '' ? null : parseInt(txnThresholdStr, 10);
  const moneyThreshold = moneyThresholdStr.trim() === '' ? null : parseFloat(moneyThresholdStr);

  const userRows = useMemo(() => aggregateByCounterparty(transactions), [transactions]);

  const filteredRows = useMemo(() => {
    const hasTxn = txnThreshold !== null && !Number.isNaN(txnThreshold);
    const hasMoney = moneyThreshold !== null && !Number.isNaN(moneyThreshold);
    if (!hasTxn && !hasMoney) return [];

    return userRows.filter((row) => {
      const tOk = hasTxn ? passesTxnCondition(row.count, txnThreshold) : false;
      const mOk = hasMoney ? passesMoneyCondition(row.totalVolume, moneyThreshold) : false;

      if (hasTxn && hasMoney) {
        return combineMode === 'and' ? tOk && mOk : tOk || mOk;
      }
      if (hasTxn) return tOk;
      return mOk;
    });
  }, [userRows, txnThreshold, moneyThreshold, combineMode]);

  const toggleExpand = useCallback((key: string) => {
    setExpandedKey((k) => (k === key ? null : key));
  }, []);

  const sampleTxnCount = useCallback((agg: UserAgg) => {
    const n = Math.min(3, agg.transactions.length);
    return [...agg.transactions]
      .sort((a, b) => (b.Date + (b.Time || '')).localeCompare(a.Date + (a.Time || '')))
      .slice(0, n);
  }, []);

  return (
    <div className="tagging-root">
      <header className="tagging-header">
        <h2 className="tagging-title">Tagging</h2>
        <p className="tagging-subtitle">
          When categories from your statement are ambiguous, use counters below to find counterparties by activity
          volume and drill into individual payments.
        </p>
      </header>

      <div className="tagging-controls glass-panel">
        <div className="tagging-field">
          <div className="tagging-field-label-row">
            <FieldHint text="Minimum number of transactions with the same counterparty (matched on main / detail). Only parties with more than this count are listed. Expand a row to inspect up to three recent payments." />
            <span className="tagging-field-label">
              <Layers size={16} className="tagging-field-icon" aria-hidden />
              No. of transactions (threshold)
            </span>
          </div>
          <input
            type="number"
            min={0}
            className="input tagging-input"
            placeholder="e.g. 3"
            value={txnThresholdStr}
            onChange={(e) => setTxnThresholdStr(e.target.value)}
          />
        </div>

        <div className="tagging-combine" role="group" aria-label="Combine transaction count and amount rules">
          <span className="tagging-combine-label">Between count &amp; amount</span>
          <button
            type="button"
            className={`tagging-switch ${combineMode === 'and' ? 'is-and' : 'is-or'}`}
            onClick={() => setCombineMode((m) => (m === 'and' ? 'or' : 'and'))}
            aria-pressed={combineMode === 'and'}
          >
            <span className="tagging-switch-track">
              <span className="tagging-switch-thumb" />
            </span>
            <span className="tagging-switch-text">
              <strong>{combineMode === 'and' ? 'AND' : 'OR'}</strong>
              <small>
                {combineMode === 'and'
                  ? 'Counterparty must pass both thresholds'
                  : 'Either threshold is enough'}
              </small>
            </span>
          </button>
        </div>

        <div className="tagging-field">
          <div className="tagging-field-label-row">
            <FieldHint text="Total money movement (credit + debit) with that counterparty must exceed this rupee amount. Use together with transaction count or alone, depending on AND/OR." />
            <span className="tagging-field-label">
              <IndianRupee size={16} className="tagging-field-icon" aria-hidden />
              Transactional amount (₹)
            </span>
          </div>
          <input
            type="number"
            min={0}
            step="0.01"
            className="input tagging-input"
            placeholder="e.g. 5000"
            value={moneyThresholdStr}
            onChange={(e) => setMoneyThresholdStr(e.target.value)}
          />
        </div>
      </div>

      <div className="glass-panel tagging-table-wrap">
        <div className="tagging-table-head">
          <h3 className="chart-title" style={{ marginBottom: 0 }}>
            Counterparties
          </h3>
          <span className="tagging-meta">
            {filteredRows.length} match
            {filteredRows.length === 1 ? '' : 'es'}
          </span>
        </div>

        {transactions.length === 0 ? (
          <p className="tagging-empty">Upload statements to use tagging analysis.</p>
        ) : txnThreshold === null && moneyThreshold === null ? (
          <p className="tagging-empty">Enter a transaction count and/or an amount threshold to see results.</p>
        ) : txnThreshold !== null && Number.isNaN(txnThreshold) ? (
          <p className="tagging-empty">Transaction threshold must be a whole number.</p>
        ) : moneyThreshold !== null && Number.isNaN(moneyThreshold) ? (
          <p className="tagging-empty">Amount threshold must be a valid number.</p>
        ) : filteredRows.length === 0 ? (
          <p className="tagging-empty">No counterparties match the current rules. Try relaxing thresholds or switching AND/OR.</p>
        ) : (
          <div className="tagging-table-scroll">
            <table className="data-table tagging-table">
              <thead>
                <tr>
                  <th className="tagging-col-expand" />
                  <th>Counterparty</th>
                  <th style={{ textAlign: 'right' }}>Txns</th>
                  <th style={{ textAlign: 'right' }}>Credit (₹)</th>
                  <th style={{ textAlign: 'right' }}>Debit (₹)</th>
                  <th style={{ textAlign: 'right' }}>Total flow (₹)</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((agg) => {
                  const open = expandedKey === agg.key;
                  const samples = sampleTxnCount(agg);
                  return (
                    <Fragment key={agg.key}>
                      <tr
                        className={`tagging-row-main ${open ? 'is-open' : ''}`}
                        onClick={() => toggleExpand(agg.key)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="tagging-col-expand">
                          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </td>
                        <td>
                          <div className="tagging-party-name">{agg.key}</div>
                        </td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{agg.count}</td>
                        <td style={{ textAlign: 'right', color: 'var(--success)', fontVariantNumeric: 'tabular-nums' }}>
                          {agg.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>
                          {agg.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {agg.totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                      {open && (
                        <tr className="tagging-detail-row">
                          <td colSpan={6}>
                            <div className="tagging-detail-panel">
                              <div className="tagging-detail-title">Sample transactions (up to 3)</div>
                              <table className="tagging-nested-table">
                                <thead>
                                  <tr>
                                    <th>Date</th>
                                    <th>Details</th>
                                    <th>Tag</th>
                                    <th style={{ textAlign: 'right' }}>Cr</th>
                                    <th style={{ textAlign: 'right' }}>Dr</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {samples.map((t, i) => (
                                    <tr key={i}>
                                      <td>{t.Date}</td>
                                      <td>
                                        <div className="tagging-nested-main">{t['Main Detail'] || '—'}</div>
                                        <div className="tagging-nested-sub">{t['Transaction Details']}</div>
                                      </td>
                                      <td>
                                        <span className="tag-badge">{t.Tags || '—'}</span>
                                      </td>
                                      <td style={{ textAlign: 'right', color: t.Credit > 0 ? 'var(--success)' : undefined }}>
                                        {t.Credit > 0 ? t.Credit.toLocaleString() : '—'}
                                      </td>
                                      <td style={{ textAlign: 'right', color: t.Debit > 0 ? 'var(--danger)' : undefined }}>
                                        {t.Debit > 0 ? t.Debit.toLocaleString() : '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
