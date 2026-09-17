import { NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

const IC = {
  overview: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  settlements: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  merchants: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  audit: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  tools: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
};

export default function Sidebar() {
  const [pendingCount, setPendingCount] = useState(0);

  const fetchCount = () => {
    fetch(`${API}/admin/payouts`)
      .then(r => r.json())
      .then(d => {
        if (!d) return;
        const list = Array.isArray(d) ? d : (d.merchants || []);
        setPendingCount(d.pending_count ?? list.length ?? 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchCount();
    // Re-fetch when a settlement is recorded anywhere in the app
    window.addEventListener('flux:settlement-recorded', fetchCount);
    return () => window.removeEventListener('flux:settlement-recorded', fetchCount);
  }, []);

  const navClass = ({ isActive }) => isActive ? 'nav-item active' : 'nav-item';

  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">F</div>
        <div className="brand-text">
          <span className="brand-name">Flux</span>
          <span className="brand-sub">Admin</span>
        </div>
      </div>

      <div className="nav-section-label">Main</div>
      <ul className="nav-list">
        <li>
          <NavLink to="/" end className={navClass}>
            {IC.overview}
            <span>Overview</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/settlements" className={navClass}>
            {IC.settlements}
            <span>Settlements</span>
            {pendingCount > 0 && <span className="nav-badge">{pendingCount}</span>}
          </NavLink>
        </li>
        <li>
          <NavLink to="/merchants" className={navClass}>
            {IC.merchants}
            <span>Merchants</span>
          </NavLink>
        </li>
      </ul>

      <div className="nav-section-label">Reports</div>
      <ul className="nav-list">
        <li>
          <NavLink to="/audit" className={navClass}>
            {IC.audit}
            <span>Audit Log</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/tools" className={navClass}>
            {IC.tools}
            <span>Admin Tools</span>
          </NavLink>
        </li>
      </ul>

      <div className="sidebar-footer">
        <div className="sidebar-footer-text">Flux Wallet Admin</div>
        <div className="sidebar-footer-sub">Internal use only</div>
      </div>

      <style>{`
        .sidebar {
          width: var(--sidebar-w);
          background: var(--sidebar-bg);
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 0;
          z-index: 100;
          border-right: 1px solid rgba(255,255,255,0.05);
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 24px 20px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .brand-logo {
          width: 36px;
          height: 36px;
          background: var(--indigo);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 800;
          font-size: 18px;
          flex-shrink: 0;
        }

        .brand-text {
          display: flex;
          flex-direction: column;
        }

        .brand-name {
          color: #f1f5f9;
          font-weight: 700;
          font-size: 16px;
          line-height: 1.1;
        }

        .brand-sub {
          color: #64748b;
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        .nav-section-label {
          padding: 20px 20px 6px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #475569;
        }

        .nav-list {
          list-style: none;
          padding: 0 10px;
          margin: 0;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 8px;
          color: #94a3b8;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.15s;
          position: relative;
          margin-bottom: 2px;
        }

        .nav-item:hover {
          background: var(--sidebar-hover);
          color: #e2e8f0;
        }

        .nav-item.active {
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
        }

        .nav-item.active svg {
          stroke: #818cf8;
        }

        .nav-badge {
          margin-left: auto;
          background: var(--danger);
          color: white;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 99px;
          min-width: 20px;
          text-align: center;
        }

        .sidebar-footer {
          margin-top: auto;
          padding: 16px 20px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }

        .sidebar-footer-text {
          font-size: 12px;
          color: #475569;
          font-weight: 500;
        }

        .sidebar-footer-sub {
          font-size: 11px;
          color: #334155;
          margin-top: 2px;
        }
      `}</style>
    </nav>
  );
}
