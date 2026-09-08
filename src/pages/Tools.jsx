import { useState } from 'react';
import { useToast } from '../components/Toast';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

export default function Tools() {
  const { showToast } = useToast();
  const [confirmModal, setConfirmModal] = useState(null);

  const run = async (url, method, body, successMsg) => {
    try {
      const res = await fetch(`${API}${url}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(await res.text() || 'Error');
      showToast(successMsg, 'success');
    } catch (err) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  const confirm = (action) => setConfirmModal(action);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Admin Tools</h1>
          <p>Bulk operations and communication tools</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>

        <ToolCard
          title="Settlement Holiday Notice"
          description="Send an email to all merchants notifying them of a settlement holiday. Useful before public holidays."
          icon="📧"
          action="Send Notice"
          variant="primary"
          onClick={() => confirm({
            title: 'Send Holiday Notice',
            body: 'This will send a settlement holiday email to all active merchants. Are you sure?',
            onConfirm: () => run('/admin/settlement-holiday', 'POST', {}, 'Holiday notice sent to all merchants'),
          })}
        />

        <ToolCard
          title="Test Holiday Email"
          description="Send a test holiday notice to yourself. Use before sending to all merchants."
          icon="🧪"
          action="Send Test"
          variant="ghost"
          onClick={() => run('/admin/test-holiday', 'GET', null, 'Test email sent')}
        />

        <ToolCard
          title="Reprocess Settlements"
          description="Re-run the settlement engine for any transactions that may have been missed or need reprocessing."
          icon="⚙️"
          action="Reprocess"
          variant="primary"
          onClick={() => confirm({
            title: 'Reprocess Settlements',
            body: 'This will re-run the settlement engine. It is safe to run multiple times. Continue?',
            onConfirm: () => run('/admin/reprocess-settlements', 'POST', {}, 'Settlement reprocessing started'),
          })}
        />

        <ToolCard
          title="Approve All Merchants"
          description="Activate all merchants that are currently pending approval."
          icon="✅"
          action="Approve All"
          variant="success"
          onClick={() => confirm({
            title: 'Approve All Merchants',
            body: 'This will activate all pending merchants. Are you sure?',
            onConfirm: () => run('/merchants/approve-all', 'POST', {}, 'All pending merchants approved'),
          })}
        />

        <SettlementReconciliation />

        <SettlementSummary />
      </div>

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          body={confirmModal.body}
          onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
          onClose={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}

function ToolCard({ title, description, icon, action, variant, onClick }) {
  const btnClass = {
    primary: 'btn btn-primary',
    success: 'btn btn-success',
    ghost: 'btn btn-ghost',
    danger: 'btn btn-danger',
  }[variant] || 'btn btn-primary';

  return (
    <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: 'var(--text-primary)' }}>{title}</div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{description}</div>
      </div>
      <button className={btnClass} onClick={onClick} style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>
        {action}
      </button>
    </div>
  );
}

function SettlementReconciliation() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/settlements/reconciliation`);
      const d = await r.json();
      setData(d);
    } catch {
      showToast('Failed to load reconciliation', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  return (
    <div className="card card-pad">
      <div style={{ fontSize: 28, marginBottom: 14 }}>📊</div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: 'var(--text-primary)' }}>Settlement Reconciliation</div>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
        Compare what Razorpay shows vs. what's in your database.
      </div>
      {!data ? (
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Load Report'}
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(data).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                {k.replace(/_/g, ' ')}
              </span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {typeof v === 'number' ? fmt(v) : String(v)}
              </span>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={load} style={{ marginTop: 8 }}>Refresh</button>
        </div>
      )}
    </div>
  );
}

function SettlementSummary() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/settlements/summary`);
      const d = await r.json();
      setData(d);
    } catch {
      showToast('Failed to load summary', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  return (
    <div className="card card-pad">
      <div style={{ fontSize: 28, marginBottom: 14 }}>📈</div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: 'var(--text-primary)' }}>Settlement Summary</div>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
        Aggregated settlement metrics across all payment cycles.
      </div>
      {!data ? (
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Load Summary'}
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(data).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                {k.replace(/_/g, ' ')}
              </span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {typeof v === 'number' ? fmt(v) : String(v)}
              </span>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={load} style={{ marginTop: 8 }}>Refresh</button>
        </div>
      )}
    </div>
  );
}

function ConfirmModal({ title, body, onConfirm, onClose }) {
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{body}</p>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
