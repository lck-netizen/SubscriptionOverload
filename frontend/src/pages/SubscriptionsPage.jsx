import { useState, useEffect } from 'react';
import { subscriptionService } from '../services';
import { formatCurrency, formatDate, daysUntil } from '../utils/helpers';

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, cancelled
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [showModal, setShowModal] = useState(false);
  const [editingSub, setEditingSub] = useState(null);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const data = await subscriptionService.getAll();
      setSubscriptions(data);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    try {
      await subscriptionService.delete(id);
      setSubscriptions(subscriptions.filter(s => s.id !== id));
    } catch (error) {
      alert('Failed to delete subscription');
    }
  };

  const handleEdit = (sub) => {
    setEditingSub(sub);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingSub(null);
    setShowModal(true);
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesFilter = filter === 'all' || sub.status === filter;
    const matchesSearch = sub.service_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Price filter
    const matchesPrice = 
      (!priceRange.min || sub.cost >= Number(priceRange.min)) &&
      (!priceRange.max || sub.cost <= Number(priceRange.max));
    
    // Date filter
    const matchesDate = 
      (!dateRange.from || sub.renewal_date >= dateRange.from) &&
      (!dateRange.to || sub.renewal_date <= dateRange.to);
    
    return matchesFilter && matchesSearch && matchesPrice && matchesDate;
  });

  const clearFilters = () => {
    setFilter('all');
    setSearchQuery('');
    setPriceRange({ min: '', max: '' });
    setDateRange({ from: '', to: '' });
  };

  const hasActiveFilters = 
    filter !== 'all' || 
    searchQuery !== '' || 
    priceRange.min !== '' || 
    priceRange.max !== '' ||
    dateRange.from !== '' ||
    dateRange.to !== '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Subscriptions</h1>
              <p className="text-gray-600 mt-1">Manage all your subscriptions</p>
            </div>
            <button
              onClick={handleAdd}
              className="btn-primary"
            >
              + Add Subscription
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Filters</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Search and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Search subscriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
              />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="input-field"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Price Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Price Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min ₹"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                    className="input-field"
                    min="0"
                  />
                  <input
                    type="number"
                    placeholder="Max ₹"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                    className="input-field"
                    min="0"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Renewal Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    placeholder="From"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                    className="input-field"
                  />
                  <input
                    type="date"
                    placeholder="To"
                    value={dateRange.to}
                    onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 pt-2">
                {filter !== 'all' && (
                  <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                    Status: {filter}
                    <button onClick={() => setFilter('all')} className="hover:text-blue-900">×</button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                    Search: "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="hover:text-blue-900">×</button>
                  </span>
                )}
                {(priceRange.min || priceRange.max) && (
                  <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                    Price: ₹{priceRange.min || '0'} - ₹{priceRange.max || '∞'}
                    <button onClick={() => setPriceRange({ min: '', max: '' })} className="hover:text-blue-900">×</button>
                  </span>
                )}
                {(dateRange.from || dateRange.to) && (
                  <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                    Date: {dateRange.from || '...'} to {dateRange.to || '...'}
                    <button onClick={() => setDateRange({ from: '', to: '' })} className="hover:text-blue-900">×</button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4 text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{filteredSubscriptions.length}</span> of{' '}
          <span className="font-semibold text-gray-900">{subscriptions.length}</span> subscriptions
        </div>

        {/* Subscriptions List */}
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-500 mb-2">No subscriptions found</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubscriptions.map((sub) => (
              <SubscriptionCard
                key={sub.id}
                subscription={sub}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <SubscriptionModal
          subscription={editingSub}
          onClose={() => {
            setShowModal(false);
            setEditingSub(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditingSub(null);
            loadSubscriptions();
          }}
        />
      )}
    </div>
  );
}

function SubscriptionCard({ subscription, onEdit, onDelete }) {
  const days = daysUntil(subscription.renewal_date);
  const isExpiringSoon = days <= 7 && days >= 0;

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-lg text-gray-900">
            {subscription.service_name}
          </h3>
          <span className="text-xs text-gray-500">{subscription.category}</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${
          subscription.status === 'active'
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700'
        }`}>
          {subscription.status}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Cost:</span>
          <span className="font-semibold">{formatCurrency(subscription.cost)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Billing:</span>
          <span>{subscription.billing_cycle}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Renewal:</span>
          <span className={isExpiringSoon ? 'text-orange-600 font-semibold' : ''}>
            {formatDate(subscription.renewal_date)}
          </span>
        </div>
        {days >= 0 && (
          <div className="text-xs text-gray-500">
            Renews in {days} day{days !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onEdit(subscription)}
          className="flex-1 btn-secondary text-sm py-1.5"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(subscription.id, subscription.service_name)}
          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function SubscriptionModal({ subscription, onClose, onSaved }) {
  const [formData, setFormData] = useState({
    service_name: subscription?.service_name || '',
    cost: subscription?.cost || '',
    billing_cycle: subscription?.billing_cycle || 'monthly',
    renewal_date: subscription?.renewal_date || '',
    category: subscription?.category || 'Other',
    status: subscription?.status || 'active',
    notes: subscription?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (subscription) {
        await subscriptionService.update(subscription.id, formData);
      } else {
        await subscriptionService.create(formData);
      }
      onSaved();
    } catch (error) {
      alert('Failed to save subscription');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">
          {subscription ? 'Edit Subscription' : 'Add Subscription'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Name *
            </label>
            <input
              type="text"
              required
              value={formData.service_name}
              onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
              className="input-field"
              placeholder="Netflix, Spotify, etc."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cost (₹) *
              </label>
              <input
                type="number"
                required
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                className="input-field"
                placeholder="199"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Billing Cycle *
              </label>
              <select
                value={formData.billing_cycle}
                onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value })}
                className="input-field"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Renewal Date *
            </label>
            <input
              type="date"
              required
              value={formData.renewal_date}
              onChange={(e) => setFormData({ ...formData, renewal_date: e.target.value })}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-field"
              >
                <option value="Streaming">Streaming</option>
                <option value="Music">Music</option>
                <option value="Cloud Storage">Cloud Storage</option>
                <option value="Productivity">Productivity</option>
                <option value="Gaming">Gaming</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input-field"
              >
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-field"
              rows={3}
              placeholder="Any additional notes..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 btn-primary"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
