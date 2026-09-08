import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const fmtDate = (s) => s ? new Date(s).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function MerchantDetail() {
  const { merchantId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [merchant, setMerchant] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [settling, setSettling] = useState(false);
  const [utr, setUtr] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [settlingLoading, setSettlingLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [allRes, txRes] = await Promise.all([
        fetch(`${API}/admin/merchants/all`),
        fetch(`${API}/admin/merchants/${merchantId}/transactions`),
      ]);
      const allData = await allRes.json();
      const txData = await txRes.json();
      const m = (allData.merchants || allData || []).find(x => x.merchant_id === merchantId);
      setMerchant(m || null);
      setTransactions(Array.isArray(txData) ? txData : (txData.transactions || []));
    } catch {
      showToast('Failed to load merchant details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [merchantId]);

  const handleSettle = async () => {
    if (!utr.trim() || !confirmed) return;
    setSettlingLoading(true);
    try {
      const payoutsRes = await fetch(`${API}/admin/payouts`);
      const payoutsData = await payoutsRes.json();
      const payout = (payoutsData.merchants || []).find(p => p.merchant_id === merchantId);
      const res = await fetch(`${API}/admin/payouts/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: merchantId,
          utr_number: utr.trim(),
          payment_ids: payout?.payment_ids || [],
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast('Settlement recorded', 'success');
      setSettling(false);
      setUtr('');
      setConfirmed(false);
      load();
    } catch (err) {
      showToast(err.message || 'Settlement failed', 'error');
    } finally {
      setSettlingLoading(false);
    }
  };

  const filteredTx = transactions.filter(tx => {
    if (filter === 'paid') return tx.payout_status === 'paid';
    if (filter === 'unpaid') return (tx.status === 'settled_in_bank' || tx.status === 'settled') && tx.payout_status !== 'paid';
    if (filter === 'pending') return tx.status === 'pending' || tx.status === 'captured';
    return true;
  });

  const paidCount = transactions.filter(t => t.payout_status === 'paid').length;
  const unpaidCount = transactions.filter(t =>
    (t.status === 'settled_in_bank' || t.status === 'settled') && t.payout_status !== 'paid'
  ).length;
  const pendingCount = transactions.filter(t => t.status === 'pending' || t.status === 'captured').length;

  if (loading) return (
    <div className="loading-state">
      <div className="spinner" />
      <p>Loading merchant…</p>
    </div>
  );

  if (!merchant) return (
    <div>
      <button className="back-btn" onClick={() => navigate('/merchants')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to Merchants
      </button>
      <div className="card">
        <div className="empty-state">
          <p>Merchant not found.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/merchants')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to Merchants
      </button>

      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="avatar" style={{ width: 52, height: 52, fontSize: 20 }}>
            {(merchant.merchant_name || 'M').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                {merchant.merchant_name}
              </h1>
              <span className={`badge ${merchant.is_active ? 'badge-success' : 'badge-gray'}`}>
                {merchant.is_active ? 'Active' : 'Inactive'}
              </span>
              {merchant.has_pending_payout && (
                <span className="badge badge-warning">Pending Payout</span>
              )}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 3 }}>
              ID: <span style={{ fontFamily: 'monospace' }}>{merchant.merchant_id}</span>
            </div>
          </div>
        </div>
        {merchant.has_pending_payout && (
          <button className="btn btn-success" onClick={() => setSettling(true)}>
            Settle {fmt(merchant.pending_payout)}
          </button>
        )}
      </div>

      {/* Info cards row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
        <InfoSection title="Contact">
          <InfoPair label="Email" value={merchant.email || '—'} />
          <InfoPair label="Phone" value={merchant.phone || '—'} />
        </InfoSection>
        <InfoSection title="Bank Details">
          <InfoPair label="IFSC" value={merchant.bank_ifsc || '—'} mono />
          <InfoPair
            label="Account"
            value={merchant.bank_account ? `···${merchant.bank_account.slice(-4)}` : '—'}
            mono
          />
        </InfoSection>
        <InfoSection title="Last Payout">
          <InfoPair label="Date" value={fmtDate(merchant.last_payout_date)} />
          <InfoPair label="Amount" value={fmt(merchant.last_payout_amount)} />
          {merchant.last_payout_utr && (
            <InfoPair label="UTR" value={merchant.last_payout_utr} mono />
          )}
        </InfoSection>
      </div>

      {/* Stats row */}
      <div className="stats-row" style={{ marginBottom: 24 }}>
        <div className="stat-card blue">
          <div className="stat-label">Total Collected</div>
          <div className="stat-value">{fmt(merchant.total_collected)}</div>
          <div className="stat-meta">{merchant.total_transactions || 0} transactions</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">Pending Payout</div>
          <div className="stat-value">{fmt(merchant.pending_payout)}</div>
          <div className="stat-meta">{merchant.unpaid_transactions || 0} transactions</div>
        </div>
        <div className="stat-card gray">
          <div className="stat-label">In Razorpay</div>
          <div className="stat-value">{fmt(merchant.in_razorpay_balance)}</div>
          <div className="stat-meta">{merchant.pending_transactions || 0} settling</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Total Paid Out</div>
          <div className="stat-value">{fmt(merchant.total_paid)}</div>
          <div className="stat-meta">{merchant.paid_transactions || 0} settled</div>
        </div>
      </div>

      {/* Transactions */}
      <div className="section-header">
        <h2>Transaction History ({transactions.length})</h2>
      </div>

      <div className="search-row" style={{ marginBottom: 16 }}>
        <div className="filter-pills">
          {[
            { key: 'all', label: `All (${transactions.length})` },
            { key: 'paid', label: `Paid Out (${paidCount})` },
            { key: 'unpaid', label: `Ready to Settle (${unpaidCount})` },
            { key: 'pending', label: `In Razorpay (${pendingCount})` },
          ].map(f => (
            <button
              key={f.key}
              className={`filter-pill ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filteredTx.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p>No transactions for this filter.</p>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Date</th>
                <th>Gross</th>
                <th>RZP Fee</th>
                <th>Flux Fee</th>
                <th>Net</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.map(tx => (
                <tr key={tx.payment_id}>
                  <td><span className="mono">{tx.payment_id}</span></td>
                  <td style={{ fontSize: 13 }}>{fmtDate(tx.transaction_date)}</td>
                  <td><span className="amount">{fmt(tx.amount_gross)}</span></td>
                  <td style={{ fontSize: 13, color: 'var(--danger)' }}>
                    {(tx.razorpay_fee || 0) > 0 ? fmt(tx.razorpay_fee) : '—'}
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--indigo)' }}>
                    {(tx.flux_fee || 0) > 0 ? fmt(tx.flux_fee) : '—'}
                  </td>
                  <td><span style={{ fontWeight: 700, fontSize: 14, color: 'var(--success)' }}>{fmt(tx.amount_net)}</span></td>
                  <td><TxStatusBadge status={tx.status} payoutStatus={tx.payout_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Settle modal */}
      {settling && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setSettling(false)}>
          <div className="modal">
            <div className="modal-head">
              <div>
                <h2>Settle {merchant.merchant_name}</h2>
                <p>Record a bank transfer</p>
              </div>
              <button className="modal-close-btn" onClick={() => setSettling(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div style={{
                background: 'var(--success-bg)', border: '1.5px solid #6ee7b7',
                borderRadius: 'var(--r-lg)', padding: '16px 20px', textAlign: 'center', marginBottom: 20,
              }}>
                <div style={{ fontSize: 13, color: 'var(--success-text)', fontWeight: 600, marginBottom: 4 }}>Transfer Amount</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#065f46' }}>{fmt(merchant.pending_payout)}</div>
              </div>
              <div className="form-field">
                <label>Bank: {merchant.bank_ifsc} — Account ···{(merchant.bank_account || '').slice(-4)}</label>
              </div>
              <div className="form-field">
                <label>UTR / Transaction Reference *</label>
                <input
                  autoFocus
                  className="form-input"
                  placeholder="e.g. HDFC123456789012"
                  value={utr}
                  onChange={e => setUtr(e.target.value)}
                />
              </div>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontSize: 14, color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ marginTop: 3, accentColor: 'var(--indigo)', flexShrink: 0 }} />
                I confirm I transferred {fmt(merchant.pending_payout)} to this account.
              </label>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setSettling(false)}>Cancel</button>
              <button
                className="btn btn-success"
                onClick={handleSettle}
                disabled={!utr.trim() || !confirmed || settlingLoading}
              >
                {settlingLoading ? 'Recording…' : 'Confirm Settlement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoSection({ title, children }) {
  return (
    <div className="card card-pad">
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

function InfoPair({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', fontFamily: mono ? 'monospace' : undefined }}>
        {value}
      </div>
    </div>
  );
}

function TxStatusBadge({ status, payoutStatus }) {
  if (payoutStatus === 'paid') return <span className="badge badge-success">Paid Out</span>;
  if (status === 'settled_in_bank' || status === 'settled') return <span className="badge badge-warning">Ready to Settle</span>;
  if (status === 'captured') return <span className="badge badge-info">Captured</span>;
  return <span className="badge badge-gray">{status || 'Unknown'}</span>;
}
