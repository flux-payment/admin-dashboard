import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const fmtDate = (s) => s ? new Date(s).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function AuditLog() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`${API}/admin/payout-audit`)
      .then(r => r.json())
      .then(d => setRecords(Array.isArray(d) ? d : (d.records || d.audits || [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    return (
      (r.merchant_name || '').toLowerCase().includes(q) ||
      (r.invoice_number || '').toLowerCase().includes(q) ||
      (r.payout_reference || '').toLowerCase().includes(q)
    );
  });

  const handleInvoice = async (id) => {
    window.open(`${API}/admin/payout-audit/${id}/invoice`, '_blank');
  };

  if (loading) return (
    <div className="loading-state">
      <div className="spinner" />
      <p>Loading audit log…</p>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Audit Log</h1>
          <p>Full history of all merchant payouts</p>
        </div>
      </div>

      <div className="search-row">
        <div className="search-input-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="search-input"
            placeholder="Search by merchant, invoice, or UTR…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>{records.length === 0 ? 'No payouts recorded yet.' : 'No results match your search.'}</p>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Merchant</th>
                <th>Amount Paid</th>
                <th>Invoice #</th>
                <th>UTR / Reference</th>
                <th>Invoice</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.payment_id || i}>
                  <td>{fmtDate(r.payout_date || r.payment_date || r.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>
                        {(r.merchant_name || 'M').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-primary">{r.merchant_name || '—'}</span>
                    </div>
                  </td>
                  <td><span className="amount">{fmt(r.net_payout || r.amount)}</span></td>
                  <td>
                    {r.invoice_number
                      ? <span className="mono">{r.invoice_number}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    {r.payout_reference
                      ? <span className="mono">{r.payout_reference}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    {r.invoice_number ? (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleInvoice(r.invoice_number)}
                      >
                        View Invoice
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: 13 }}>
        Showing {filtered.length} of {records.length} records
      </div>
    </div>
  );
}
