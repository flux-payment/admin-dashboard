import { useState, useEffect } from 'react';
import './Dashboard.css';

function Dashboard() {
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'settlements', 'merchants'
    const [stats, setStats] = useState(null);
    const [pendingPayouts, setPendingPayouts] = useState([]);
    const [allMerchants, setAllMerchants] = useState([]);
    const [transactions, setTransactions] = useState([]);

    const [settlementModal, setSettlementModal] = useState(null); // { merchant, amount, transactions }
    const [transactionModal, setTransactionModal] = useState(null); // { merchant }
    const [transactionFilter, setTransactionFilter] = useState('all');

    const [utrInput, setUtrInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [statsRes, payoutsRes, merchantsRes] = await Promise.all([
                fetch(`${API_BASE}/admin/stats`),
                fetch(`${API_BASE}/admin/payouts`),
                fetch(`${API_BASE}/admin/merchants/all`)
            ]);

            if (!statsRes.ok || !payoutsRes.ok || !merchantsRes.ok) {
                throw new Error('Failed to fetch data');
            }

            setStats(await statsRes.json());
            setPendingPayouts(await payoutsRes.json());
            setAllMerchants(await merchantsRes.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const openSettlementModal = (merchant) => {
        setSettlementModal(merchant);
        setUtrInput('');
    };

    const closeSettlementModal = () => {
        setSettlementModal(null);
        setUtrInput('');
    };

    const handleSettlement = async () => {
        if (!utrInput.trim()) {
            alert('Please enter a UTR/Reference');
            return;
        }

        try {
            setProcessing(true);
            const res = await fetch(`${API_BASE}/admin/payouts/mark-paid`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    merchant_id: settlementModal.merchant_id,
                    payment_ids: settlementModal.payment_ids,
                    payout_reference: utrInput,
                }),
            });

            if (!res.ok) throw new Error('Failed to mark as paid');

            alert(`✅ Settlement successful! ${settlementModal.transaction_count} transactions marked as paid.`);
            closeSettlementModal();
            fetchAllData(); // Refresh data
        } catch (err) {
            alert(`❌ Error: ${err.message}`);
        } finally {
            setProcessing(false);
        }
    };

    const openTransactionModal = async (merchant) => {
        try {
            const res = await fetch(`${API_BASE}/admin/merchants/${merchant.merchant_id}/transactions`);
            if (!res.ok) throw new Error('Failed to fetch transactions');
            const txns = await res.json();
            setTransactions(txns);
            setTransactionModal(merchant);
            setTransactionFilter('all');
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    const closeTransactionModal = () => {
        setTransactionModal(null);
        setTransactions([]);
    };

    const filteredTransactions = transactions.filter(tx => {
        if (transactionFilter === 'paid') return tx.payout_status === 'paid';
        if (transactionFilter === 'unpaid') return (tx.status === 'settled_in_bank' || tx.status === 'settled') && tx.payout_status !== 'paid';
        if (transactionFilter === 'pending') return tx.status === 'pending';
        return true;
    });

    if (loading) return <div className="loading">Loading dashboard...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <h1>⚡ Flux Admin Portal</h1>
                <p>Settlement Management & Financial Reporting</p>
            </header>

            {/* Tab Navigation */}
            <nav className="tabs">
                <button
                    className={activeTab === 'overview' ? 'tab active' : 'tab'}
                    onClick={() => setActiveTab('overview')}
                >
                    Financial Overview
                </button>
                <button
                    className={activeTab === 'settlements' ? 'tab active' : 'tab'}
                    onClick={() => setActiveTab('settlements')}
                >
                    Settlements ({pendingPayouts.length})
                </button>
                <button
                    className={activeTab === 'merchants' ? 'tab active' : 'tab'}
                    onClick={() => setActiveTab('merchants')}
                >
                    All Merchants ({allMerchants.length})
                </button>
            </nav>

            {/* TAB 1: Financial Overview */}
            {activeTab === 'overview' && (
                <div className="tab-content">
                    <div className="stats-grid">
                        <div className="stat-card total">
                            <div className="stat-label">Total Collected</div>
                            <div className="stat-value">₹{stats.total_collected.toFixed(2)}</div>
                            <div className="stat-meta">{stats.total_transactions} transactions</div>
                        </div>

                        <div className="stat-card razorpay">
                            <div className="stat-label">💰 In Razorpay</div>
                            <div className="stat-value">₹{stats.in_razorpay_balance.toFixed(2)}</div>
                            <div className="stat-meta">{stats.razorpay_pending_count} pending</div>
                        </div>

                        <div className="stat-card bank">
                            <div className="stat-label">🏦 In Our Bank</div>
                            <div className="stat-value">₹{stats.in_our_bank.toFixed(2)}</div>
                            <div className="stat-meta">{stats.settled_to_us_count} ready to settle</div>
                        </div>

                        <div className="stat-card paid">
                            <div className="stat-label">✅ Paid Out</div>
                            <div className="stat-value">₹{stats.total_settled_to_merchants.toFixed(2)}</div>
                            <div className="stat-meta">{stats.paid_to_merchants_count} settled</div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: Settlements */}
            {activeTab === 'settlements' && (
                <div className="tab-content">
                    <h2>Pending Settlements</h2>
                    {pendingPayouts.length === 0 ? (
                        <div className="empty-state">✅ No pending settlements! All merchants are up to date.</div>
                    ) : (
                        <div className="settlements-list">
                            {pendingPayouts.map(merchant => (
                                <div key={merchant.merchant_id} className="settlement-card">
                                    <div className="settlement-info">
                                        <h3>{merchant.merchant_name}</h3>
                                        <p className="merchant-id">{merchant.merchant_id}</p>
                                        <div className="settlement-details">
                                            <div><strong>Amount to Settle:</strong> ₹{merchant.total_payable.toFixed(2)}</div>
                                            <div><strong>Transactions:</strong> {merchant.transaction_count}</div>
                                            <div><strong>Bank:</strong> {merchant.merchant_ifsc || 'Not provided'}</div>
                                        </div>
                                    </div>
                                    <button
                                        className="btn-primary"
                                        onClick={() => openSettlementModal(merchant)}
                                    >
                                        Settle Now →
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: All Merchants */}
            {activeTab === 'merchants' && (
                <div className="tab-content">
                    <h2>All Merchants</h2>
                    <div className="merchants-grid">
                        {allMerchants.map(merchant => (
                            <div key={merchant.merchant_id} className="merchant-card">
                                <div className="merchant-header">
                                    <h3>{merchant.merchant_name}</h3>
                                    {merchant.has_pending_payout && <span className="badge-pending">Pending</span>}
                                </div>
                                <div className="merchant-stats">
                                    <div className="stat-row">
                                        <span>Total Collected</span>
                                        <strong>₹{merchant.total_collected.toFixed(2)}</strong>
                                    </div>
                                    <div className="stat-row paid">
                                        <span>✅ Paid</span>
                                        <strong>₹{merchant.total_paid.toFixed(2)}</strong>
                                    </div>
                                    <div className="stat-row pending">
                                        <span>🟡 Unpaid</span>
                                        <strong>₹{merchant.pending_payout.toFixed(2)}</strong>
                                    </div>
                                </div>
                                <button
                                    className="btn-secondary"
                                    onClick={() => openTransactionModal(merchant)}
                                >
                                    View Transactions ({merchant.total_transactions})
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            { /* Settlement Modal */}
            {settlementModal && (
                <div className="modal-overlay" onClick={closeSettlementModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Settle Payout</h2>
                            <button className="modal-close" onClick={closeSettlementModal}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="settlement-summary">
                                <div><strong>Merchant:</strong> {settlementModal.merchant_name}</div>
                                <div><strong>Amount:</strong> ₹{settlementModal.total_payable.toFixed(2)}</div>
                                <div><strong>Transactions:</strong> {settlementModal.transaction_count}</div>
                            </div>

                            <div className="form-group">
                                <label>UTR / Payment Reference</label>
                                <input
                                    type="text"
                                    value={utrInput}
                                    onChange={(e) => setUtrInput(e.target.value)}
                                    placeholder="Enter UTR or bank reference"
                                    className="form-input"
                                />
                            </div>

                            <div className="transaction-list">
                                <strong>Payment IDs being settled:</strong>
                                {settlementModal.payment_ids.map(paymentId => (
                                    <div key={paymentId} className="transaction-item">
                                        <code>{paymentId}</code>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closeSettlementModal}>Cancel</button>
                            <button
                                className="btn-primary"
                                onClick={handleSettlement}
                                disabled={processing}
                            >
                                {processing ? 'Processing...' : 'Confirm Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Transaction Modal */}
            {transactionModal && (
                <div className="modal-overlay" onClick={closeTransactionModal}>
                    <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2>{transactionModal.merchant_name}</h2>
                                <p className="modal-subtitle">All Transactions ({transactions.length})</p>
                            </div>
                            <button className="modal-close" onClick={closeTransactionModal}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="filter-buttons">
                                <button
                                    className={transactionFilter === 'all' ? 'active' : ''}
                                    onClick={() => setTransactionFilter('all')}
                                >
                                    All ({transactions.length})
                                </button>
                                <button
                                    className={transactionFilter === 'paid' ? 'active' : ''}
                                    onClick={() => setTransactionFilter('paid')}
                                >
                                    Paid ({transactions.filter(t => t.payout_status === 'paid').length})
                                </button>
                                <button
                                    className={transactionFilter === 'unpaid' ? 'active' : ''}
                                    onClick={() => setTransactionFilter('unpaid')}
                                >
                                    Unpaid ({transactions.filter(t => (t.status === 'settled_in_bank' || t.status === 'settled') && t.payout_status !== 'paid').length})
                                </button>
                                <button
                                    className={transactionFilter === 'pending' ? 'active' : ''}
                                    onClick={() => setTransactionFilter('pending')}
                                >
                                    Pending ({transactions.filter(t => t.status === 'pending').length})
                                </button>
                            </div>

                            <div className="table-container">
                                <table className="transactions-table">
                                    <thead>
                                        <tr>
                                            <th>Payment ID</th>
                                            <th>Amount</th>
                                            <th>Net</th>
                                            <th>Status</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTransactions.map(tx => (
                                            <tr key={tx.payment_id}>
                                                <td><code>{tx.payment_id}</code></td>
                                                <td>₹{tx.amount_gross.toFixed(2)}</td>
                                                <td>₹{tx.amount_net.toFixed(2)}</td>
                                                <td>
                                                    {tx.payout_status === 'paid' && <span className="badge-paid">✅ Paid</span>}
                                                    {(tx.status === 'settled_in_bank' || tx.status === 'settled') && tx.payout_status !== 'paid' && <span className="badge-unpaid">🟡 Unpaid</span>}
                                                    {tx.status === 'pending' && <span className="badge-pending">⚪ Pending</span>}
                                                </td>
                                                <td>{tx.transaction_date}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;
