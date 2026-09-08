import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });

export default function Overview() {
  const [stats, setStats] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      fetch(`${API}/admin/stats`).then(r => r.json()),
      fetch(`${API}/admin/payouts`).then(r => r.json()),
    ])
      .then(([s, p]) => {
        setStats(s);
        setPayouts(Array.isArray(p) ? p : (p?.merchants || []));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading-state">
      <div className="spinner" />
      <p>Loading dashboard…</p>
    </div>
  );

  const topPending = payouts.slice(0, 3);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Overview</h1>
          <p>Live financial summary for Flux Wallet</p>
        </div>
        {payouts.length > 0 && (
          <button className="btn btn-success" onClick={() => navigate('/settlements')}>
            Settle {payouts.length} merchant{payouts.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {payouts.length > 0 && (
        <div className="alert alert-warning">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>
            <strong>{payouts.length} merchant{payouts.length > 1 ? 's' : ''}</strong> waiting for settlement.{' '}
            <button
              style={{background:'none',border:'none',fontWeight:700,cursor:'pointer',color:'inherit',textDecoration:'underline',padding:0}}
              onClick={() => navigate('/settlements')}
            >
              Go to Settlements
            </button>
          </span>
        </div>
      )}

      <div className="stats-row">
        <div className="stat-card blue">
          <div className="stat-label">Total Collected</div>
          <div className="stat-value">{fmt(stats?.total_collected)}</div>
          <div className="stat-meta">{stats?.total_transactions?.toLocaleString() || 0} transactions</div>
        </div>
        <div className="stat-card gray">
          <div className="stat-label">In Razorpay</div>
          <div className="stat-value">{fmt(stats?.in_razorpay_balance)}</div>
          <div className="stat-meta">{stats?.razorpay_pending_count || 0} pending settlements</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">In Our Bank</div>
          <div className="stat-value">{fmt(stats?.in_our_bank)}</div>
          <div className="stat-meta">{stats?.settled_to_us_count || 0} settled to us</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">Paid to Merchants</div>
          <div className="stat-value">{fmt(stats?.total_settled_to_merchants)}</div>
          <div className="stat-meta">{stats?.paid_to_merchants_count || 0} payouts made</div>
        </div>
      </div>

      {topPending.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div className="section-header">
            <h2>Pending Settlements</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/settlements')}>
              View all
            </button>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {topPending.map(m => (
              <div key={m.merchant_id} className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div className="avatar avatar-lg">
                  {(m.merchant_name || 'M').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>{m.merchant_name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{m.transaction_count} transactions</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>{fmt(m.total_payable)}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>IFSC: {m.merchant_ifsc || 'N/A'}</div>
                </div>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => navigate('/settlements')}
                >
                  Settle
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card card-pad">
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h2>Quick Links</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'View all merchants', path: '/merchants' },
              { label: 'Payout audit log', path: '/audit' },
              { label: 'Admin tools', path: '/tools' },
            ].map(l => (
              <button
                key={l.path}
                className="btn btn-ghost"
                style={{ justifyContent: 'flex-start' }}
                onClick={() => navigate(l.path)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card card-pad">
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h2>Settlement Health</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <HealthRow label="Pending payouts" value={payouts.length} ok={payouts.length === 0} />
            <HealthRow
              label="In Razorpay"
              value={fmt(stats?.in_razorpay_balance)}
              ok={(stats?.in_razorpay_balance || 0) < 50000}
            />
            <HealthRow
              label="Collection efficiency"
              value={stats?.total_collected > 0
                ? `${((stats.total_settled_to_merchants / stats.total_collected) * 100).toFixed(1)}%`
                : 'N/A'}
              ok
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthRow({ label, value, ok }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{value}</span>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: ok ? 'var(--success)' : 'var(--warning)',
          flexShrink: 0,
        }} />
      </div>
    </div>
  );
}
