import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
    const [stats, setStats] = useState(null);
    const [merchants, setMerchants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

            // Fetch stats and merchants in parallel
            const [statsRes, merchantsRes] = await Promise.all([
                fetch(`${API_BASE}/admin/stats`),
                fetch(`${API_BASE}/admin/payouts`)
            ]);

            if (!statsRes.ok || !merchantsRes.ok) {
                throw new Error('Failed to fetch data');
            }

            const statsData = await statsRes.json();
            const merchantsData = await merchantsRes.json();

            setStats(statsData);
            setMerchants(merchantsData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="dashboard-loading">Loading dashboard...</div>;
    }

    if (error) {
        return <div className="dashboard-error">Error: {error}</div>;
    }

    return (
        <div className="dashboard">
            {/* Financial Stats Section */}
            <section className="stats-section">
                <h2>Financial Overview</h2>

                {/* Main Financial Metrics */}
                <div className="stats-grid">
                    <div className="stat-card highlight">
                        <div className="stat-label">Total Collected</div>
                        <div className="stat-value">₹{stats.total_collected.toFixed(2)}</div>
                        <div className="stat-meta">{stats.total_transactions} transactions</div>
                    </div>

                    <div className="stat-card" style={{ borderColor: '#facc15' }}>
                        <div className="stat-label">💰 In Razorpay Balance</div>
                        <div className="stat-value" style={{ color: '#facc15' }}>₹{stats.in_razorpay_balance.toFixed(2)}</div>
                        <div className="stat-meta">{stats.razorpay_pending_count} pending settlement</div>
                    </div>

                    <div className="stat-card" style={{ borderColor: '#3b82f6' }}>
                        <div className="stat-label">🏦 In Our Bank</div>
                        <div className="stat-value" style={{ color: '#3b82f6' }}>₹{stats.in_our_bank.toFixed(2)}</div>
                        <div className="stat-meta">{stats.settled_to_us_count} settled but unpaid</div>
                    </div>

                    <div className="stat-card" style={{ borderColor: '#22c55e' }}>
                        <div className="stat-label">✅ Paid to Merchants</div>
                        <div className="stat-value" style={{ color: '#22c55e' }}>₹{stats.total_settled_to_merchants.toFixed(2)}</div>
                        <div className="stat-meta">{stats.paid_to_merchants_count} settled</div>
                    </div>

                    <div className="stat-card warning">
                        <div className="stat-label">⏳ Pending Payouts</div>
                        <div className="stat-value">₹{stats.pending_payouts_volume.toFixed(2)}</div>
                        <div className="stat-meta">We owe merchants</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-label">🚀 Total In Transit</div>
                        <div className="stat-value">₹{stats.total_in_transit.toFixed(2)}</div>
                        <div className="stat-meta">Razorpay + Our Bank</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-label">Razorpay Fees</div>
                        <div className="stat-value cost">₹{stats.total_razorpay_fees.toFixed(2)}</div>
                        <div className="stat-meta">Gateway costs</div>
                    </div>

                    <div className="stat-card highlight">
                        <div className="stat-label">Flux Revenue</div>
                        <div className="stat-value revenue">₹{stats.total_flux_revenue.toFixed(2)}</div>
                        <div className="stat-meta">Platform earnings</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-label">GST Collected</div>
                        <div className="stat-value">₹{stats.total_gst.toFixed(2)}</div>
                        <div className="stat-meta">Tax liability</div>
                    </div>
                </div>
            </section>

            {/* Pending Merchants Section */}
            <section className="merchants-section">
                <h2>Pending Merchant Settlements</h2>
                {merchants.length === 0 ? (
                    <div className="no-data">✅ All settlements up to date!</div>
                ) : (
                    <div className="merchants-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Merchant</th>
                                    <th>Amount Payable</th>
                                    <th>Transactions</th>
                                    <th>Settlement IDs</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {merchants.map((merchant) => (
                                    <tr key={merchant.merchant_id}>
                                        <td>
                                            <div className="merchant-name">{merchant.merchant_name}</div>
                                            <div className="merchant-id">{merchant.merchant_id}</div>
                                        </td>
                                        <td className="amount">₹{merchant.total_payable.toFixed(2)}</td>
                                        <td>{merchant.transaction_count}</td>
                                        <td>
                                            <div className="settlement-ids">
                                                {merchant.settlement_ids.map((id, idx) => (
                                                    <span key={idx} className="settlement-id">{id}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            <button
                                                className="btn-primary"
                                                onClick={() => navigate(`/merchant/${merchant.merchant_id}`)}
                                            >
                                                View Details →
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

export default Dashboard;
