import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import './AdminVouchers.css';

const AdminVouchers = () => {
    const { showToast } = useToast();
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState(null);
    const [formData, setFormData] = useState({
        voucher_code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: '',
        min_purchase_amount: '',
        max_discount_amount: '',
        valid_from: '',
        valid_until: '',
        usage_limit: '',
        is_active: true
    });

    useEffect(() => {
        fetchVouchers();
    }, []);

    const fetchVouchers = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/admin/vouchers', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                setVouchers(data.vouchers);
            }
        } catch (error) {
            console.error('Error fetching vouchers:', error);
            showToast('Failed to load vouchers', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate
        if (!formData.voucher_code || !formData.description || !formData.discount_value) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        try {
            const url = editingVoucher 
                ? `http://localhost:8000/api/admin/vouchers/${editingVoucher.voucher_code}`
                : 'http://localhost:8000/api/admin/vouchers';
            
            const method = editingVoucher ? 'PUT' : 'POST';

            const payload = {
                ...formData,
                discount_value: parseFloat(formData.discount_value),
                min_purchase_amount: formData.min_purchase_amount ? parseFloat(formData.min_purchase_amount) : null,
                max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
                usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null
            };

            // Remove voucher_code for edit requests
            if (editingVoucher) {
                delete payload.voucher_code;
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                showToast(editingVoucher ? 'Voucher updated successfully' : 'Voucher created successfully', 'success');
                setShowModal(false);
                setEditingVoucher(null);
                resetForm();
                fetchVouchers();
            } else {
                showToast(data.detail || 'Failed to save voucher', 'error');
            }
        } catch (error) {
            console.error('Error saving voucher:', error);
            showToast('Failed to save voucher', 'error');
        }
    };

    const handleEdit = (voucher) => {
        setEditingVoucher(voucher);
        setFormData({
            voucher_code: voucher.voucher_code,
            description: voucher.description,
            discount_type: voucher.discount_type,
            discount_value: voucher.discount_value,
            min_purchase_amount: voucher.min_purchase_amount || '',
            max_discount_amount: voucher.max_discount_amount || '',
            valid_from: voucher.valid_from ? voucher.valid_from.substring(0, 16) : '',
            valid_until: voucher.valid_until ? voucher.valid_until.substring(0, 16) : '',
            usage_limit: voucher.usage_limit || '',
            is_active: voucher.is_active
        });
        setShowModal(true);
    };

    const handleDelete = async (voucherCode) => {
        if (!window.confirm(`Are you sure you want to delete voucher ${voucherCode}?`)) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:8000/api/admin/vouchers/${voucherCode}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                showToast(data.message, 'success');
                fetchVouchers();
            } else {
                showToast(data.detail || 'Failed to delete voucher', 'error');
            }
        } catch (error) {
            console.error('Error deleting voucher:', error);
            showToast('Failed to delete voucher', 'error');
        }
    };

    const toggleStatus = async (voucher) => {
        try {
            const response = await fetch(`http://localhost:8000/api/admin/vouchers/${voucher.voucher_code}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    is_active: !voucher.is_active
                })
            });

            if (response.ok) {
                showToast(`Voucher ${!voucher.is_active ? 'activated' : 'deactivated'}`, 'success');
                fetchVouchers();
            } else {
                showToast('Failed to update voucher status', 'error');
            }
        } catch (error) {
            console.error('Error updating voucher:', error);
            showToast('Failed to update voucher status', 'error');
        }
    };

    const resetForm = () => {
        setFormData({
            voucher_code: '',
            description: '',
            discount_type: 'percentage',
            discount_value: '',
            min_purchase_amount: '',
            max_discount_amount: '',
            valid_from: '',
            valid_until: '',
            usage_limit: '',
            is_active: true
        });
    };

    const openCreateModal = () => {
        setEditingVoucher(null);
        resetForm();
        setShowModal(true);
    };

    const getStatusBadge = (voucher) => {
        const now = new Date();
        const validUntil = new Date(voucher.valid_until);

        if (!voucher.is_active) {
            return <span className="status-badge inactive">Inactive</span>;
        } else if (validUntil < now) {
            return <span className="status-badge expired">Expired</span>;
        } else if (voucher.usage_limit && voucher.usage_count >= voucher.usage_limit) {
            return <span className="status-badge used-up">Used Up</span>;
        } else {
            return <span className="status-badge active">Active</span>;
        }
    };

    const formatDiscount = (voucher) => {
        if (voucher.discount_type === 'percentage') {
            return `${voucher.discount_value}%${voucher.max_discount_amount ? ` (max ₱${voucher.max_discount_amount})` : ''}`;
        } else {
            return `₱${voucher.discount_value}`;
        }
    };

    if (loading) {
        return <div className="admin-vouchers-container">Loading...</div>;
    }

    return (
        <div className="admin-vouchers-container">
            <div className="vouchers-header">
                <h1>Voucher Management</h1>
                <button className="create-btn" onClick={openCreateModal}>
                    + Create New Voucher
                </button>
            </div>

            <div className="vouchers-table-wrapper">
                <table className="vouchers-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Description</th>
                            <th>Discount</th>
                            <th>Min Purchase</th>
                            <th>Valid Until</th>
                            <th>Usage</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vouchers.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="no-data">No vouchers found</td>
                            </tr>
                        ) : (
                            vouchers.map(voucher => (
                                <tr key={voucher.voucher_code}>
                                    <td className="code-cell">{voucher.voucher_code}</td>
                                    <td>{voucher.description}</td>
                                    <td>{formatDiscount(voucher)}</td>
                                    <td>{voucher.min_purchase_amount ? `₱${voucher.min_purchase_amount}` : '-'}</td>
                                    <td>{new Date(voucher.valid_until).toLocaleDateString()}</td>
                                    <td>
                                        {voucher.usage_count}
                                        {voucher.usage_limit ? ` / ${voucher.usage_limit}` : ''}
                                    </td>
                                    <td>{getStatusBadge(voucher)}</td>
                                    <td className="actions-cell">
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <button
                                                className="action-btn edit-btn"
                                                onClick={() => handleEdit(voucher)}
                                                title="Edit"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className={`action-btn toggle-btn ${voucher.is_active ? 'deactivate-btn' : 'activate-btn'}`}
                                                onClick={() => toggleStatus(voucher)}
                                                title={voucher.is_active ? 'Deactivate' : 'Activate'}
                                                style={{ marginBottom: '0.2rem' }}
                                            >
                                                {voucher.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                            <button
                                                className="action-btn delete-btn"
                                                onClick={() => handleDelete(voucher.voucher_code)}
                                                title="Delete"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingVoucher ? 'Edit Voucher' : 'Create New Voucher'}</h2>
                            <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Voucher Code *</label>
                                    <input
                                        type="text"
                                        name="voucher_code"
                                        value={formData.voucher_code}
                                        onChange={handleInputChange}
                                        disabled={editingVoucher !== null}
                                        placeholder="e.g., WELCOME10"
                                        required
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Discount Type *</label>
                                    <select
                                        name="discount_type"
                                        value={formData.discount_type}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="percentage">Percentage</option>
                                        <option value="fixed_amount">Fixed Amount</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Description *</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Welcome discount for new customers"
                                    required
                                    rows="2"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Discount Value *</label>
                                    <input
                                        type="number"
                                        name="discount_value"
                                        value={formData.discount_value}
                                        onChange={handleInputChange}
                                        placeholder={formData.discount_type === 'percentage' ? '10' : '100'}
                                        step="0.01"
                                        min="0"
                                        required
                                    />
                                    <small>{formData.discount_type === 'percentage' ? 'Percentage (e.g., 10 for 10%)' : 'Amount in pesos'}</small>
                                </div>
                                {formData.discount_type === 'percentage' && (
                                    <div className="form-group">
                                        <label>Max Discount Amount</label>
                                        <input
                                            type="number"
                                            name="max_discount_amount"
                                            value={formData.max_discount_amount}
                                            onChange={handleInputChange}
                                            placeholder="Optional cap"
                                            step="0.01"
                                            min="0"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Min Purchase Amount</label>
                                    <input
                                        type="number"
                                        name="min_purchase_amount"
                                        value={formData.min_purchase_amount}
                                        onChange={handleInputChange}
                                        placeholder="Optional"
                                        step="0.01"
                                        min="0"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Usage Limit</label>
                                    <input
                                        type="number"
                                        name="usage_limit"
                                        value={formData.usage_limit}
                                        onChange={handleInputChange}
                                        placeholder="Optional"
                                        min="1"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Valid From *</label>
                                    <input
                                        type="datetime-local"
                                        name="valid_from"
                                        value={formData.valid_from}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Valid Until *</label>
                                    <input
                                        type="datetime-local"
                                        name="valid_until"
                                        value={formData.valid_until}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        checked={formData.is_active}
                                        onChange={handleInputChange}
                                    />
                                    Active
                                </label>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="submit-btn">
                                    {editingVoucher ? 'Update' : 'Create'} Voucher
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminVouchers;
