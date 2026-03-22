import { useMemo, useState, useCallback, Fragment, useRef, useEffect } from 'react';
import { Info, ChevronDown, ChevronRight, Layers, IndianRupee, Pencil, Check, X } from 'lucide-react';
import type { Transaction, TransactionRowRef } from '../types/transaction';
import ConfirmDialog from '../components/ConfirmDialog';

function counterpartyKey(row: Transaction): string {
  const main = (row['Main Detail'] || '').trim();
  const details = (row['Transaction Details'] || '').trim();
  return main || details || 'Unknown';
}

interface UserAgg {
  key: string;
  refs: TransactionRowRef[];
  count: number;
  totalCredit: number;
  totalDebit: number;
  totalVolume: number;
}

function aggregateByCounterparty(rows: TransactionRowRef[]): UserAgg[] {
  const map = new Map<string, TransactionRowRef[]>();
  for (const ref of rows) {
    const k = counterpartyKey(ref.item);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(ref);
  }
  return Array.from(map.entries()).map(([key, refs]) => {
    let totalCredit = 0;
    let totalDebit = 0;
    for (const r of refs) {
      totalCredit += r.item.Credit || 0;
      totalDebit += r.item.Debit || 0;
    }
    return {
      key,
      refs,
      count: refs.length,
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

function sortRefs(refs: TransactionRowRef[]): TransactionRowRef[] {
  return [...refs].sort((a, b) =>
    (b.item.Date + (b.item.Time || '')).localeCompare(a.item.Date + (a.item.Time || ''))
  );
}

function parseAmountInput(s: string): number {
  const n = parseFloat(String(s).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
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

type TaggingViewProps = {
  rows: TransactionRowRef[];
  onPatchTransaction: (dataIndex: number, patch: Partial<Transaction>) => void;
  taggingConfirmed: boolean;
  onConfirmTaggingComplete: () => void;
  onNavigateDashboard: () => void;
};

export default function TaggingView({
  rows,
  onPatchTransaction,
  taggingConfirmed,
  onConfirmTaggingComplete,
  onNavigateDashboard,
}: TaggingViewProps) {
  const [txnThresholdStr, setTxnThresholdStr] = useState('');
  const [moneyThresholdStr, setMoneyThresholdStr] = useState('');
  const [combineMode, setCombineMode] = useState<'and' | 'or'>('and');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ dataIndex: number; draft: Transaction } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const txnThreshold = txnThresholdStr.trim() === '' ? null : parseInt(txnThresholdStr, 10);
  const moneyThreshold = moneyThresholdStr.trim() === '' ? null : parseFloat(moneyThresholdStr);

  const userRows = useMemo(() => aggregateByCounterparty(rows), [rows]);

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

  const startEdit = (e: React.MouseEvent, ref: TransactionRowRef) => {
    e.stopPropagation();
    setEditing({
      dataIndex: ref.dataIndex,
      draft: { ...ref.item },
    });
  };

  const cancelEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditing(null);
  };

  const saveEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editing) return;
    const { dataIndex, draft } = editing;
    onPatchTransaction(dataIndex, {
      Date: draft.Date,
      Time: draft.Time,
      'Transaction Details': draft['Transaction Details'],
      'Main Detail': draft['Main Detail'],
      Tags: draft.Tags,
      Credit: parseAmountInput(String(draft.Credit)),
      Debit: parseAmountInput(String(draft.Debit)),
      Amount: parseAmountInput(String(draft.Amount)),
      Remarks: draft.Remarks ?? null,
    });
    setEditing(null);
  };

  return (
    <div className="tagging-root">
      <ConfirmDialog
        open={showConfirm}
        title="Continue to Dashboard?"
        message="Confirm that you are done reviewing and editing transactions in this step. You can still return to Tagging later from the tabs."
        confirmLabel="Confirm & unlock Dashboard"
        cancelLabel="Stay on Tagging"
        onConfirm={() => {
          setShowConfirm(false);
          onConfirmTaggingComplete();
        }}
        onCancel={() => setShowConfirm(false)}
      />

      <header className="tagging-header">
        <h2 className="tagging-title">Tagging</h2>
        <p className="tagging-subtitle">
          When categories from your statement are ambiguous, use counters below to find counterparties by activity
          volume and drill into every payment. Edit any cell, then confirm this step to unlock the dashboard.
        </p>
      </header>

      {taggingConfirmed && (
        <div className="tagging-banner-success glass-panel">
          <span>Tagging step completed — Dashboard is unlocked.</span>
          <button type="button" className="btn btn-outline btn-sm" onClick={onNavigateDashboard}>
            Open Dashboard
          </button>
        </div>
      )}

      <div className="tagging-controls glass-panel">
        <div className="tagging-field">
          <div className="tagging-field-label-row">
            <FieldHint text="Minimum number of transactions with the same counterparty (matched on main / detail). Only parties with more than this count are listed. Expand a row to see and edit all payments." />
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
          <p className="tagging-combine-footnote">
            If you only fill one field, that rule is used by itself. AND/OR applies when both count and amount are set.
          </p>
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

        {rows.length === 0 ? (
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
                  const ordered = sortRefs(agg.refs);
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
                            <div className="tagging-detail-panel" onClick={(e) => e.stopPropagation()}>
                              <div className="tagging-detail-title">All transactions ({ordered.length})</div>
                              <div className="tagging-nested-scroll">
                                <table className="tagging-nested-table tagging-editable-table">
                                  <thead>
                                    <tr>
                                      <th>Date</th>
                                      <th>Time</th>
                                      <th>Main detail</th>
                                      <th>Transaction details</th>
                                      <th>Category</th>
                                      <th style={{ textAlign: 'right' }}>Credit</th>
                                      <th style={{ textAlign: 'right' }}>Debit</th>
                                      <th style={{ textAlign: 'right' }}>Amount</th>
                                      <th>Remarks</th>
                                      <th style={{ width: 100 }}> </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {ordered.map((ref) => {
                                      const isEditing = editing?.dataIndex === ref.dataIndex;
                                      const d = isEditing ? editing!.draft : ref.item;
                                      return (
                                        <tr key={ref.dataIndex}>
                                          <td>
                                            {isEditing ? (
                                              <input
                                                className="input input-table"
                                                value={d.Date}
                                                onChange={(e) =>
                                                  setEditing((prev) =>
                                                    prev ? { ...prev, draft: { ...prev.draft, Date: e.target.value } } : prev
                                                  )
                                                }
                                              />
                                            ) : (
                                              d.Date
                                            )}
                                          </td>
                                          <td>
                                            {isEditing ? (
                                              <input
                                                className="input input-table"
                                                value={d.Time ?? ''}
                                                onChange={(e) =>
                                                  setEditing((prev) =>
                                                    prev
                                                      ? { ...prev, draft: { ...prev.draft, Time: e.target.value || null } }
                                                      : prev
                                                  )
                                                }
                                              />
                                            ) : (
                                              d.Time || '—'
                                            )}
                                          </td>
                                          <td>
                                            {isEditing ? (
                                              <input
                                                className="input input-table"
                                                value={d['Main Detail']}
                                                onChange={(e) =>
                                                  setEditing((prev) =>
                                                    prev
                                                      ? { ...prev, draft: { ...prev.draft, 'Main Detail': e.target.value } }
                                                      : prev
                                                  )
                                                }
                                              />
                                            ) : (
                                              d['Main Detail'] || '—'
                                            )}
                                          </td>
                                          <td>
                                            {isEditing ? (
                                              <input
                                                className="input input-table"
                                                value={d['Transaction Details']}
                                                onChange={(e) =>
                                                  setEditing((prev) =>
                                                    prev
                                                      ? {
                                                          ...prev,
                                                          draft: { ...prev.draft, 'Transaction Details': e.target.value },
                                                        }
                                                      : prev
                                                  )
                                                }
                                              />
                                            ) : (
                                              <span className="tagging-nested-sub">{d['Transaction Details']}</span>
                                            )}
                                          </td>
                                          <td>
                                            {isEditing ? (
                                              <input
                                                className="input input-table"
                                                value={d.Tags}
                                                onChange={(e) =>
                                                  setEditing((prev) =>
                                                    prev ? { ...prev, draft: { ...prev.draft, Tags: e.target.value } } : prev
                                                  )
                                                }
                                              />
                                            ) : (
                                              <span className="tag-badge">{d.Tags || '—'}</span>
                                            )}
                                          </td>
                                          <td style={{ textAlign: 'right' }}>
                                            {isEditing ? (
                                              <input
                                                className="input input-table input-num"
                                                value={String(d.Credit)}
                                                onChange={(e) =>
                                                  setEditing((prev) =>
                                                    prev
                                                      ? {
                                                          ...prev,
                                                          draft: {
                                                            ...prev.draft,
                                                            Credit: parseAmountInput(e.target.value),
                                                          },
                                                        }
                                                      : prev
                                                  )
                                                }
                                              />
                                            ) : (
                                              <span style={{ color: d.Credit > 0 ? 'var(--success)' : undefined }}>
                                                {d.Credit > 0 ? d.Credit.toLocaleString() : '—'}
                                              </span>
                                            )}
                                          </td>
                                          <td style={{ textAlign: 'right' }}>
                                            {isEditing ? (
                                              <input
                                                className="input input-table input-num"
                                                value={String(d.Debit)}
                                                onChange={(e) =>
                                                  setEditing((prev) =>
                                                    prev
                                                      ? {
                                                          ...prev,
                                                          draft: {
                                                            ...prev.draft,
                                                            Debit: parseAmountInput(e.target.value),
                                                          },
                                                        }
                                                      : prev
                                                  )
                                                }
                                              />
                                            ) : (
                                              <span style={{ color: d.Debit > 0 ? 'var(--danger)' : undefined }}>
                                                {d.Debit > 0 ? d.Debit.toLocaleString() : '—'}
                                              </span>
                                            )}
                                          </td>
                                          <td style={{ textAlign: 'right' }}>
                                            {isEditing ? (
                                              <input
                                                className="input input-table input-num"
                                                value={String(d.Amount)}
                                                onChange={(e) =>
                                                  setEditing((prev) =>
                                                    prev
                                                      ? {
                                                          ...prev,
                                                          draft: {
                                                            ...prev.draft,
                                                            Amount: parseAmountInput(e.target.value),
                                                          },
                                                        }
                                                      : prev
                                                  )
                                                }
                                              />
                                            ) : (
                                              d.Amount
                                            )}
                                          </td>
                                          <td>
                                            {isEditing ? (
                                              <input
                                                className="input input-table"
                                                value={d.Remarks ?? ''}
                                                onChange={(e) =>
                                                  setEditing((prev) =>
                                                    prev
                                                      ? { ...prev, draft: { ...prev.draft, Remarks: e.target.value } }
                                                      : prev
                                                  )
                                                }
                                              />
                                            ) : (
                                              d.Remarks || '—'
                                            )}
                                          </td>
                                          <td>
                                            {isEditing ? (
                                              <div className="tagging-row-actions">
                                                <button type="button" className="tagging-icon-btn" title="Save" onClick={saveEdit}>
                                                  <Check size={16} />
                                                </button>
                                                <button type="button" className="tagging-icon-btn" title="Cancel" onClick={cancelEdit}>
                                                  <X size={16} />
                                                </button>
                                              </div>
                                            ) : (
                                              <button
                                                type="button"
                                                className="tagging-icon-btn tagging-edit-btn"
                                                onClick={(e) => startEdit(e, ref)}
                                              >
                                                <Pencil size={16} />
                                                <span>Edit</span>
                                              </button>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
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

      {rows.length > 0 && (
        <footer className="tagging-footer glass-panel">
          <div className="tagging-footer-copy">
            <strong>Next step</strong>
            <span>When edits look good, confirm to unlock the Dashboard. You can come back to Tagging any time.</span>
          </div>
          {!taggingConfirmed ? (
            <button type="button" className="btn btn-primary" onClick={() => setShowConfirm(true)}>
              Confirm &amp; continue to Dashboard
            </button>
          ) : (
            <button type="button" className="btn btn-outline" onClick={onNavigateDashboard}>
              Go to Dashboard
            </button>
          )}
        </footer>
      )}
    </div>
  );
}
