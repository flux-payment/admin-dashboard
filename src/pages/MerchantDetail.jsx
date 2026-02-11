import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './MerchantDetail.css';

function MerchantDetail() {
    const { merchantId } = useParams();
    const navigate = useNavigate();

    const [merchantInfo, setMerchantInfo] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [filter, setFilter] = useState('all'); // 'all', 'paid', 'unpaid', 'pending'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAllData();
    }, [merchantId]);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

            // Fetch merchant info and transactions in parallel
            const [merchantRes, transactionsRes] = await Promise.all([
                fetch(`${API_BASE}/admin/merchants/all`),
                fetch(`${API_BASE}/admin/merchants/${merchantId}/transactions`)
            ]);

            if (!merchantRes.ok || !transactionsRes.ok) {
                throw new Error('Failed to fetch data');
            }

            const allMerchants = await merchantRes.json();
            const merchant = allMerchants.find(m => m.merchant_id === merchantId);
            const txns = await transactionsRes.json();

            setMerchantInfo(merchant);
            setTransactions(txns);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredTransactions = transactions.filter(tx => {
        if (filter === 'paid') return tx.payout_status === 'paid';
        if (filter === 'unpaid') return (tx.status === 'settled_in_bank' || tx.status === 'settled') && tx.payout_status !== 'paid';
        if (filter === 'pending') return tx.status === 'pending';
        return true;
    });

    const getStatusBadge = (status, payoutStatus) => {
        if (payoutStatus === 'paid') {
            return <span className="status-badge paid">✅ Paid</span>;
        }
        if (status === 'settled_in_bank' || status === 'settled') {
            return <span className="status-badge unpaid">🟡 Ready to Settle</span>;
        }
        return <span className="status-badge pending">⚪ In Razorpay</span>;
    };

    if (loading) return <div className="loading">Loading merchant details...</div>;
    if (error) return <div className="error">Error: {error}</div>;
    if (!merchantInfo) return <div className="error">Merchant not found</div>;

    return (
        <div className="merchant-detail">
            {/* Header with Back Button */}
            <button className="back-btn" onClick={() => navigate('/all-merchants')}>
                ← Back to All Merchants
            </button>

            {/* Merchant Overview Card */}
            <div className="overview-card">
                <div className="overview-header">
                    <div>
                        <h1>{merchantInfo.merchant_name}</h1>
                        <p className="merchant-id">ID: {merchantInfo.merchant_id}</p>
                    </div>
                    {merchantInfo.has_pending_payout && (
                        <span className="urgent-badge">Pending Payout</span>
                    )}
                </div>

                <div className="contact-grid">
                    <div className="contact-item">
                        <span className="label">Email</span>
                        <span className="value">{merchantInfo.email || 'Not provided'}</span>
                    </div>
                    <div className="contact-item">
                        <span className="label">Phone</span>
                        <span className="value">{merchantInfo.phone || 'Not provided'}</span>
                    </div>
                    <div className="contact-item">
                        <span className="label">Bank Account</span>
                        <span className="value">
                            {merchantInfo.bank_account ? `${merchantInfo.bank_ifsc} | ****${merchantInfo.bank_account.slice(-4)}` : 'Not provided'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Payment Status Summary */}
            <div className="status-summary">
                <h2>Payment Status Summary</h2>
                <div className="summary-grid">
                    <div className="summary-card total">
                        <div className="summary-label">Total Collected</div>
                        <div className="summary-amount">₹{merchantInfo.total_collected.toFixed(2)}</div>
                        <div className="summary-meta">{merchantInfo.total_transactions} transactions</div>
                    </div>
                    <div className="summary-card paid">
                        <div className="summary-label">✅ Paid</div>
                        <div className="summary-amount">₹{merchantInfo.total_paid.toFixed(2)}</div>
                        <div className="summary-meta">{merchantInfo.paid_transactions} settled</div>
                    </div>
                    <div className="summary-card unpaid">
                        <div className="summary-label">🟡 Ready to Settle</div>
                        <div className="summary-amount">₹{merchantInfo.pending_payout.toFixed(2)}</div>
                        <div className="summary-meta">{merchantInfo.unpaid_transactions} transactions</div>
                    </div>
                    <div className="summary-card pending">
                        <div className="summary-label">⚪ In Razorpay</div>
                        <div className="summary-amount">₹{merchantInfo.in_razorpay_balance.toFixed(2)}</div>
                        <div className="summary-meta">{merchantInfo.pending_transactions} pending</div>
                    </div>
                </div>
            </div>

            {/* All Transactions Table */}
            <div className="transactions-section">
                <div className="section-header">
                    <h2>All Transactions ({transactions.length})</h2>
                    <div className="transaction-filters">
                        <button
                            className={filter === 'all' ? 'active' : ''}
                            onClick={() => setFilter('all')}
                        >
                            All ({transactions.length})
                        </button>
                        <button
                            className={filter === 'paid' ? 'active' : ''}
                            onClick={() => setFilter('paid')}
                        >
                            Paid ({transactions.filter(t => t.payout_status === 'paid').length})
                        </button>
                        <button
                            className={filter === 'unpaid' ? 'active' : ''}
                            onClick={() => setFilter('unpaid')}
                        >
                            Unpaid ({transactions.filter(t => (t.status === 'settled_in_bank' || t.status === 'settled') && t.payout_status !== 'paid').length})
                        </button>
                        <button
                            className={filter === 'pending' ? 'active' : ''}
                            onClick={() => setFilter('pending')}
                        >
                            Pending ({transactions.filter(t => t.status === 'pending').length})
                        </button>
                    </div>
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
                                <th>Settlement ID</th>
                                <th>Fees</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.map((tx) => (
                                <tr key={tx.payment_id}>
                                    <td>
                                        <code className="payment-id">{tx.payment_id}</code>
                                    </td>
                                    <td className="amount">₹{tx.amount_gross.toFixed(2)}</td>
                                    <td className="net-amount">
                                        {tx.amount_net > 0 ? `₹${tx.amount_net.toFixed(2)}` : '-'}
                                    </td>
                                    <td>{getStatusBadge(tx.status, tx.payout_status)}</td>
                                    <td className="date">{tx.transaction_date}</td>
                                    <td>
                                        {tx.settlement_id ? (
                                            <code className="settlement-id">{tx.settlement_id}</code>
                                        ) : (
                                            <span className="text-muted">-</span>
                                        )}
                                    </td>
                                    <td className="fees">
                                        {tx.razorpay_fee > 0 || tx.flux_fee > 0 ? (
                                            <div className="fee-breakdown">
                                                <div>RZP: ₹{tx.razorpay_fee.toFixed(2)}</div>
                                                <div>Flux: ₹{tx.flux_fee.toFixed(2)}</div>
                                            </div>
                                        ) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredTransactions.length === 0 && (
                    <div className="no-transactions">
                        No transactions found for filter "{filter}"
                    </div>
                )}
            </div>
        </div>
    );
}

export default MerchantDetail;
