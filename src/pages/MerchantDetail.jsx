import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './MerchantDetail.css';

function MerchantDetail() {
    const { merchantId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [utrReference, setUtrReference] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchMerchantDetails();
    }, [merchantId]);

    const fetchMerchantDetails = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/admin/payouts/${merchantId}`);
            if (!res.ok) throw new Error('Failed to fetch merchant details');
            const json = await res.json();
            setData(json);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSettlePayment = async () => {
        if (!utrReference.trim()) {
            alert('Please enter a UTR/Reference');
            return;
        }

        try {
            setProcessing(true);
            const res = await fetch('/admin/payouts/mark-paid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    merchant_id: merchantId,
                    payment_ids: data.transactions.map(t => t.razorpay_payment_id),
                    payout_reference: utrReference,
                }),
            });

            if (!res.ok) throw new Error('Failed to process settlement');

            const result = await res.json();
            alert(`✅ Settlement successful!\nInvoice: ${result.invoice_number}\nNet Settled: ₹${result.net_settled.toFixed(2)}\n${result.email_sent ? 'Email sent to merchant' : 'Email not sent (no merchant email)'}`);
            navigate('/');
        } catch (err) {
            alert('❌ Error: ' + err.message);
        } finally {
            setProcessing(false);
            setShowModal(false);
        }
    };

    if (loading) return <div className="detail-loading">Loading merchant details...</div>;
    if (error) return <div className="detail-error">Error: {error}</div>;

    return (
        <div className="merchant-detail">
            {/* Header */}
            <div className="detail-header">
                <button className="btn-back" onClick={() => navigate('/')}>← Back to Dashboard</button>
                <div className="merchant-info">
                    <h1>{data.merchant_name}</h1>
                    <p className="merchant-id">ID: {data.merchant_id}</p>
                    {data.bank_details && <p className="bank-details">Bank: {data.bank_details}</p>}
                </div>
                <div className="header-actions">
                    <div className="total-payable">
                        <span>Total Payable</span>
                        <strong>₹{data.total_payable.toFixed(2)}</strong>
                    </div>
                    <button
                        className="btn-settle"
                        onClick={() => setShowModal(true)}
                        disabled={data.transactions.length === 0}
                    >
                        💸 Settle & Send Invoice
                    </button>
                </div>
            </div>

            {/* Transactions Table */}
            <section className="transactions-section">
                <h2>Transaction Breakdown ({data.transactions.length} payments)</h2>
                {data.transactions.length === 0 ? (
                    <div className="no-transactions">No pending transactions</div>
                ) : (
                    <div className="transactions-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Payment ID</th>
                                    <th>Method</th>
                                    <th>Gross Amount</th>
                                    <th>Bank Fee</th>
                                    <th>Flux Fee</th>
                                    <th>GST</th>
                                    <th>Net Payout</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.transactions.map((txn) => (
                                    <tr key={txn.razorpay_payment_id}>
                                        <td className="payment-id">{txn.razorpay_payment_id}</td>
                                        <td className="payment-method">{txn.payment_method.toUpperCase()}</td>
                                        <td className="amount">₹{txn.amount_gross.toFixed(2)}</td>
                                        <td className="fee">₹{txn.razorpay_fee_actual.toFixed(2)}</td>
                                        <td className="fee">₹{txn.flux_fee_deducted.toFixed(2)}</td>
                                        <td className="fee">₹{txn.gst_component.toFixed(2)}</td>
                                        <td className="net-amount">₹{txn.net_payout.toFixed(2)}</td>
                                        <td>
                                            <span className="status-badge">{txn.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="total-row">
                                    <td colSpan="2"><strong>TOTAL</strong></td>
                                    <td className="amount">
                                        <strong>₹{data.transactions.reduce((sum, t) => sum + t.amount_gross, 0).toFixed(2)}</strong>
                                    </td>
                                    <td className="fee">
                                        <strong>₹{data.transactions.reduce((sum, t) => sum + t.razorpay_fee_actual, 0).toFixed(2)}</strong>
                                    </td>
                                    <td className="fee">
                                        <strong>₹{data.transactions.reduce((sum, t) => sum + t.flux_fee_deducted, 0).toFixed(2)}</strong>
                                    </td>
                                    <td className="fee">
                                        <strong>₹{data.transactions.reduce((sum, t) => sum + t.gst_component, 0).toFixed(2)}</strong>
                                    </td>
                                    <td className="net-amount">
                                        <strong>₹{data.total_payable.toFixed(2)}</strong>
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </section>

            {/* Settlement Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Confirm Settlement</h2>
                        <div className="modal-body">
                            <p>You are about to settle <strong>₹{data.total_payable.toFixed(2)}</strong> to <strong>{data.merchant_name}</strong>.</p>
                            <p>This will:</p>
                            <ul>
                                <li>Mark {data.transactions.length} transaction(s) as paid</li>
                                <li>Generate a professional invoice</li>
                                <li>Send the invoice to the merchant via email</li>
                            </ul>
                            <div className="form-group">
                                <label htmlFor="utr">UTR / Payment Reference *</label>
                                <input
                                    id="utr"
                                    type="text"
                                    placeholder="Enter bank UTR or reference number"
                                    value={utrReference}
                                    onChange={(e) => setUtrReference(e.target.value)}
                                    disabled={processing}
                                />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowModal(false)} disabled={processing}>
                                Cancel
                            </button>
                            <button className="btn-confirm" onClick={handleSettlePayment} disabled={processing || !utrReference.trim()}>
                                {processing ? 'Processing...' : 'Confirm & Send Invoice'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MerchantDetail;
