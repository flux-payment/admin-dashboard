import { useState, useEffect, useRef } from 'react';
import { useToast } from '../components/Toast';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });

export default function Settlements() {
  const { showToast } = useToast();
  const [payouts, setPayouts] = useState([]);
  const [merchants, setMerchants] = useState({});
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/admin/payouts`).then(r => r.json()),
      fetch(`${API}/admin/merchants/all`).then(r => r.json()),
    ])
      .then(([pData, mData]) => {
        const pendingList = Array.isArray(pData) ? pData : (pData?.merchants || []);
        setPayouts(pendingList);
        const map = {};
        const merchantList = Array.isArray(mData) ? mData : (mData?.merchants || []);
        merchantList.forEach(m => { map[m.merchant_id] = m; });
        setMerchants(map);
      })
      .catch(() => showToast('Failed to load settlements', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const onSettled = (merchantId) => {
    setPayouts(prev => prev.filter(p => p.merchant_id !== merchantId));
    setSettling(null);
  };

  if (loading) return (
    <div className="loading-state">
      <div className="spinner" />
      <p>Loading settlements…</p>
    </div>
  );

  const totalPending = payouts.reduce((s, p) => s + (p.total_payable || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Settlements</h1>
          <p>Merchants waiting for their payout</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>Refresh</button>
      </div>

      {payouts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <p style={{ fontWeight: 600, fontSize: 16 }}>All caught up!</p>
            <p style={{ marginTop: 6 }}>No pending settlements right now.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="alert alert-info" style={{ marginBottom: 24 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>
              <strong>{payouts.length} merchants</strong> waiting &mdash; total outstanding: <strong>{fmt(totalPending)}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {payouts.map(p => {
              const m = merchants[p.merchant_id] || {};
              return (
                <MerchantPayoutCard
                  key={p.merchant_id}
                  payout={p}
                  merchant={m}
                  onSettle={() => setSettling({ payout: p, merchant: m })}
                />
              );
            })}
          </div>
        </>
      )}

      {settling && (
        <SettleModal
          payout={settling.payout}
          merchant={settling.merchant}
          onClose={() => setSettling(null)}
          onSuccess={onSettled}
        />
      )}
    </div>
  );
}

function MerchantPayoutCard({ payout, merchant, onSettle }) {
  const bankAcct = merchant.bank_account
    ? `···${merchant.bank_account.slice(-4)}`
    : 'N/A';

  return (
    <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <div className="avatar avatar-lg">
        {(payout.merchant_name || 'M').charAt(0).toUpperCase()}
      </div>

      <div style={{ flex: 2, minWidth: 180 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>
          {payout.merchant_name}
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {payout.transaction_count} transactions
          </span>
          {merchant.email && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{merchant.email}</span>
          )}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Bank Details
        </div>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
          {payout.merchant_ifsc || merchant.bank_ifsc || 'N/A'}
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Account: {bankAcct}
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
          Amount to Transfer
        </div>
        <div style={{ fontWeight: 800, fontSize: 24, color: 'var(--success)' }}>
          {fmt(payout.total_payable)}
        </div>
      </div>

      <button className="btn btn-success" onClick={onSettle}>
        Settle Now
      </button>
    </div>
  );
}

function SettleModal({ payout, merchant, onClose, onSuccess }) {
  const { showToast } = useToast();
  const [utr, setUtr] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const bankAcct = merchant.bank_account
    ? `${merchant.bank_ifsc || payout.merchant_ifsc} — ···${merchant.bank_account.slice(-4)}`
    : payout.merchant_ifsc || 'N/A';

  const handleConfirm = async () => {
    if (!utr.trim() || !confirmed) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/payouts/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: payout.merchant_id,
          utr_number: utr.trim(),
          payment_ids: payout.payment_ids || [],
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Server error');
      }
      showToast(`Settlement recorded for ${payout.merchant_name}`, 'success');
      onSuccess(payout.merchant_id);
    } catch (err) {
      showToast(err.message || 'Settlement failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = utr.trim().length >= 8 && confirmed;

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <div>
            <h2>Confirm Settlement</h2>
            <p>Record a bank transfer to this merchant</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Merchant */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
            <div className="avatar avatar-lg">
              {(payout.merchant_name || 'M').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-primary)' }}>{payout.merchant_name}</div>
              {merchant.email && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{merchant.email}</div>}
            </div>
          </div>

          {/* Amount highlight */}
          <div style={{
            background: 'var(--success-bg)',
            border: '1.5px solid #6ee7b7',
            borderRadius: 'var(--r-lg)',
            padding: '20px 24px',
            marginBottom: 20,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, color: 'var(--success-text)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Transfer Amount
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#065f46' }}>
              {fmt(payout.total_payable)}
            </div>
            <div style={{ fontSize: 13, color: 'var(--success-text)', marginTop: 6 }}>
              {payout.transaction_count} transactions
            </div>
          </div>

          {/* Bank details */}
          <div style={{
            background: 'var(--page-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            padding: '14px 18px',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Destination Bank Account
            </div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{bankAcct}</div>
            {merchant.phone && (
              <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Phone: {merchant.phone}</div>
            )}
          </div>

          {/* UTR input */}
          <div className="form-field">
            <label>UTR / Transaction Reference *</label>
            <input
              ref={inputRef}
              className="form-input"
              placeholder="e.g. HDFC123456789012"
              value={utr}
              onChange={e => setUtr(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canSubmit && handleConfirm()}
            />
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              Enter the UTR from your bank transfer
            </div>
          </div>

          {/* Confirmation checkbox */}
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              style={{ marginTop: 3, accentColor: 'var(--indigo)', width: 16, height: 16, flexShrink: 0 }}
            />
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              I confirm I have transferred <strong>{fmt(payout.total_payable)}</strong> to the bank account above.
            </span>
          </label>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button
            className="btn btn-success"
            onClick={handleConfirm}
            disabled={!canSubmit || loading}
          >
            {loading ? 'Recording…' : 'Confirm Settlement'}
          </button>
        </div>
      </div>
    </div>
  );
}
