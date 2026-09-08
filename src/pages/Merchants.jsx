import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—';

export default function Merchants() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [toggling, setToggling] = useState(null);

  const load = () => {
    setLoading(true);
    fetch(`${API}/admin/merchants/all`)
      .then(r => r.json())
      .then(d => setMerchants(d.merchants || d || []))
      .catch(() => showToast('Failed to load merchants', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggleStatus = async (m) => {
    setToggling(m.merchant_id);
    try {
      const res = await fetch(`${API}/merchants/${m.merchant_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !m.is_active }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMerchants(prev =>
        prev.map(x => x.merchant_id === m.merchant_id ? { ...x, is_active: !x.is_active } : x)
      );
      showToast(`${m.merchant_name} ${!m.is_active ? 'activated' : 'deactivated'}`, 'success');
    } catch (err) {
      showToast(err.message || 'Status update failed', 'error');
    } finally {
      setToggling(null);
    }
  };

  const filtered = merchants.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (m.merchant_name || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.phone || '').includes(q);

    const matchFilter =
      filter === 'all' ? true :
      filter === 'pending' ? m.has_pending_payout :
      filter === 'active' ? m.is_active :
      filter === 'inactive' ? !m.is_active : true;

    return matchSearch && matchFilter;
  });

  if (loading) return (
    <div className="loading-state">
      <div className="spinner" />
      <p>Loading merchants…</p>
    </div>
  );

  const pendingCount = merchants.filter(m => m.has_pending_payout).length;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Merchants</h1>
          <p>{merchants.length} total &middot; {pendingCount} pending settlement</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>Refresh</button>
      </div>

      <div className="search-row">
        <div className="search-input-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="search-input"
            placeholder="Search by name, email, or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-pills">
          {[
            { key: 'all', label: `All (${merchants.length})` },
            { key: 'pending', label: `Pending (${pendingCount})` },
            { key: 'active', label: 'Active' },
            { key: 'inactive', label: 'Inactive' },
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

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p>No merchants match your search.</p>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Merchant</th>
                <th>Total Collected</th>
                <th>Pending Payout</th>
                <th>In Razorpay</th>
                <th>Transactions</th>
                <th>Last Payout</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.merchant_id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/merchants/${m.merchant_id}`)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="avatar">{(m.merchant_name || 'M').charAt(0).toUpperCase()}</div>
                      <div>
                        <div className="text-primary">{m.merchant_name || 'Unnamed'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.email || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="amount">{fmt(m.total_collected)}</span></td>
                  <td>
                    {m.has_pending_payout
                      ? <span style={{ fontWeight: 700, color: 'var(--warning)', fontSize: 14 }}>{fmt(m.pending_payout)}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    {(m.in_razorpay_balance || 0) > 0
                      ? <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--info)' }}>{fmt(m.in_razorpay_balance)}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    <div style={{ fontSize: 13 }}>
                      <span className="text-primary">{m.total_transactions || 0}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {' '}({m.paid_transactions || 0} paid)
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {m.last_payout_date ? (
                      <div>
                        <div>{fmtDate(m.last_payout_date)}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{fmt(m.last_payout_amount)}</div>
                      </div>
                    ) : <span style={{ color: 'var(--text-muted)' }}>Never</span>}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {m.has_pending_payout && (
                        <span className="badge badge-warning">Pending</span>
                      )}
                      <span className={`badge ${m.is_active ? 'badge-success' : 'badge-gray'}`}>
                        {m.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => navigate(`/merchants/${m.merchant_id}`)}
                      >
                        View
                      </button>
                      <button
                        className={`btn btn-sm ${m.is_active ? 'btn-ghost' : 'btn-success'}`}
                        onClick={() => toggleStatus(m)}
                        disabled={toggling === m.merchant_id}
                        style={{ fontSize: 12 }}
                      >
                        {toggling === m.merchant_id ? '…' : m.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
