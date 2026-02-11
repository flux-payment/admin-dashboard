import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AllMerchants.css';

function AllMerchants() {
    const navigate = useNavigate();
    const [merchants, setMerchants] = useState([]);
    const [filter, setFilter] = useState('all'); // 'all', 'has-pending', 'paid', 'active'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchMerchants();
    }, []);

    const fetchMerchants = async () => {
        try {
            setLoading(true);
            const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
            const res = await fetch(`${API_BASE}/admin/merchants/all`);

            if (!res.ok) throw new Error('Failed to fetch merchants');

            const data = await res.json();
            setMerchants(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredMerchants = merchants.filter(m => {
        if (filter === 'has-pending') return m.has_pending_payout;
        if (filter === 'paid') return m.paid_transactions > 0;
        if (filter === 'active') return m.is_active;
        return true; // 'all'
    });

    if (loading) return <div className="loading">Loading merchants...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="all-merchants">
            <div className="header">
                <h2>All Merchants ({merchants.length})</h2>
                <div className="filters">
                    <button
                        className={filter === 'all' ? 'active' : ''}
                        onClick={() => setFilter('all')}
                    >
                        All ({merchants.length})
                    </button>
                    <button
                        className={filter === 'has-pending' ? 'active' : ''}
                        onClick={() => setFilter('has-pending')}
                    >
                        Has Pending ({merchants.filter(m => m.has_pending_payout).length})
                    </button>
                    <button
                        className={filter === 'paid' ? 'active' : ''}
                        onClick={() => setFilter('paid')}
                    >
                        Recently Paid ({merchants.filter(m => m.paid_transactions > 0).length})
                    </button>
                    <button
                        className={filter === 'active' ? 'active' : ''}
                        onClick={() => setFilter('active')}
                    >
                        Active ({merchants.filter(m => m.is_active).length})
                    </button>
                </div>
            </div>

            <div className="merchants-grid">
                {filteredMerchants.map(merchant => (
                    <div key={merchant.merchant_id} className="merchant-card">
                        <div className="card-header">
                            <div>
                                <h3>{merchant.merchant_name}</h3>
                                <div className="merchant-id">ID: {merchant.merchant_id.substring(0, 8)}...</div>
                            </div>
                            {merchant.has_pending_payout && <span className="badge pending">Pending</span>}
                        </div>

                        <div className="contact-info">
                            {merchant.email && <div>📧 {merchant.email}</div>}
                            {merchant.phone && <div>📞 {merchant.phone}</div>}
                            {merchant.bank_account && (
                                <div>🏦 {merchant.bank_ifsc} | ****{merchant.bank_account.slice(-4)}</div>
                            )}
                        </div>

                        <div className="financial-summary">
                            <div className="summary-item">
                                <span className="label">Total Collected</span>
                                <span className="value">₹{merchant.total_collected.toFixed(2)}</span>
                                <span className="meta">{merchant.total_transactions} txns</span>
                            </div>
                        </div>

                        <div className="status-breakdown">
                            {merchant.paid_transactions > 0 && (
                                <div className="status-item paid">
                                    <span className="badge">🟢 Paid</span>
                                    <span>₹{merchant.total_paid.toFixed(2)}</span>
                                    <span className="count">({merchant.paid_transactions})</span>
                                </div>
                            )}
                            {merchant.unpaid_transactions > 0 && (
                                <div className="status-item unpaid">
                                    <span className="badge">🟡 Ready to Settle</span>
                                    <span>₹{merchant.pending_payout.toFixed(2)}</span>
                                    <span className="count">({merchant.unpaid_transactions})</span>
                                </div>
                            )}
                            {merchant.pending_transactions > 0 && (
                                <div className="status-item pending">
                                    <span className="badge">⚪ In Razorpay</span>
                                    <span>₹{merchant.in_razorpay_balance.toFixed(2)}</span>
                                    <span className="count">({merchant.pending_transactions})</span>
                                </div>
                            )}
                            {merchant.total_transactions === 0 && (
                                <div className="no-transactions">No transactions yet</div>
                            )}
                        </div>

                        {merchant.last_payout_date && (
                            <div className="last-payout">
                                Last payout: ₹{merchant.last_payout_amount.toFixed(2)} on {merchant.last_payout_date}
                                {merchant.last_payout_utr && <div className="utr">UTR: {merchant.last_payout_utr}</div>}
                            </div>
                        )}

                        <div className="actions">
                            <button
                                className="btn-view"
                                onClick={() => navigate(`/merchant/${merchant.merchant_id}`)}
                            >
                                View Details →
                            </button>
                            {merchant.has_pending_payout && (
                                <button className="btn-settle">Settle Now</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {filteredMerchants.length === 0 && (
                <div className="no-merchants">
                    No merchants found for filter "{filter}"
                </div>
            )}
        </div>
    );
}

export default AllMerchants;
