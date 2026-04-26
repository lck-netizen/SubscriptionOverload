import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ottService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/helpers';

const CATEGORIES = [
  'All',
  'Streaming',
  'Music',
  'Cloud Storage',
  'Productivity',
  'Gaming',
  'News',
  'Education',
  'Fitness',
  'Other',
];

export default function TestingModePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [otts, setOtts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [showModal, setShowModal] = useState(false);
  const [editingOTT, setEditingOTT] = useState(null);

  useEffect(() => {
    // Redirect if not admin
    if (user && !user.isAdmin) {
      alert('Access denied. Admin only.');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user?.isAdmin) {
      loadOTTs();
    }
  }, [user, selectedCategory, searchQuery, statusFilter, priceRange]);

  const loadOTTs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== 'all') params.status = statusFilter;

      const data = await ottService.getAllAdmin(params);
      setOtts(data);
    } catch (error) {
      console.error('Failed to load OTTs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await ottService.delete(id);
      setOtts(otts.filter(o => o.id !== id));
      alert(`${name} deleted successfully`);
    } catch (error) {
      alert('Failed to delete');
    }
  };

  const handleEdit = (ott) => {
    setEditingOTT(ott);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingOTT(null);
    setShowModal(true);
  };

  if (!user?.isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-400 hover:text-white text-sm"
              >
                ← Exit Testing Mode
              </button>
            </div>
            <button
              onClick={handleAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              + Add OTT Platform
            </button>
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-blue-500">⚡</span>
              Testing Mode
            </h1>
            <p className="text-gray-400 text-sm mt-1">Manage OTT platforms and system settings</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-xs uppercase mb-1">Total Platforms</div>
                <div className="text-2xl font-bold">{otts.length}</div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-900/30 flex items-center justify-center text-blue-500">
                📱
              </div>
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-xs uppercase mb-1">Active</div>
                <div className="text-2xl font-bold">
                  {otts.filter(o => o.status === 'active').length}
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-900/30 flex items-center justify-center text-green-500">
                ✓
              </div>
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-xs uppercase mb-1">Categories</div>
                <div className="text-2xl font-bold">{CATEGORIES.length - 1}</div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-900/30 flex items-center justify-center text-purple-500">
                🏷️
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Search platforms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Price Range Filter */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">
                Filter by Price Range
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Min Price ₹"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                  className="bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  min="0"
                />
                <input
                  type="number"
                  placeholder="Max Price ₹"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                  className="bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  min="0"
                />
              </div>
              {(priceRange.min || priceRange.max) && (
                <button
                  onClick={() => setPriceRange({ min: '', max: '' })}
                  className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                >
                  Clear price filter
                </button>
              )}
            </div>
          </div>
        </div>

        {/* OTT Grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : otts.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-gray-800 rounded-lg">
            No platforms found
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {otts.map((ott) => (
              <OTTCard
                key={ott.id}
                ott={ott}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <OTTModal
          ott={editingOTT}
          onClose={() => {
            setShowModal(false);
            setEditingOTT(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditingOTT(null);
            loadOTTs();
          }}
        />
      )}
    </div>
  );
}

function OTTCard({ ott, onEdit, onDelete }) {
  const minPrice = Math.min(...ott.pricingTiers.map(t => t.price));
  const maxPrice = Math.max(...ott.pricingTiers.map(t => t.price));

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-white">{ott.name}</h3>
          <span className="text-xs text-gray-400">{ott.category}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded ${
          ott.status === 'active'
            ? 'bg-green-900/50 text-green-400'
            : 'bg-red-900/50 text-red-400'
        }`}>
          {ott.status}
        </span>
      </div>

      {ott.description && (
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">{ott.description}</p>
      )}

      <div className="flex items-center gap-2 mb-3 text-sm">
        <span className="text-blue-400">₹</span>
        <span className="text-white font-medium">
          {formatCurrency(minPrice)} - {formatCurrency(maxPrice)}
        </span>
        <span className="text-gray-500">·</span>
        <span className="text-gray-400">{ott.pricingTiers.length} plans</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onEdit(ott)}
          className="flex-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white px-3 py-1.5 rounded text-sm"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(ott.id, ott.name)}
          className="px-3 py-1.5 text-sm text-red-400 hover:bg-red-900/30 rounded"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function OTTModal({ ott, onClose, onSaved }) {
  const [formData, setFormData] = useState({
    name: ott?.name || '',
    logo: ott?.logo || '',
    description: ott?.description || '',
    category: ott?.category || 'Other',
    status: ott?.status || 'active',
    pricingTiers: ott?.pricingTiers || [{ name: '', price: 0, features: '' }],
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        pricingTiers: formData.pricingTiers.map(t => ({
          ...t,
          price: Number(t.price),
          features: typeof t.features === 'string' 
            ? t.features.split(',').map(f => f.trim())
            : t.features,
        })),
      };

      if (ott) {
        await ottService.update(ott.id, payload);
      } else {
        await ottService.create(payload);
      }
      onSaved();
      alert('Saved successfully!');
    } catch (error) {
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addTier = () => {
    setFormData({
      ...formData,
      pricingTiers: [...formData.pricingTiers, { name: '', price: 0, features: '' }],
    });
  };

  const removeTier = (index) => {
    setFormData({
      ...formData,
      pricingTiers: formData.pricingTiers.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4">
          <h2 className="text-xl font-bold text-white">
            {ott ? 'Edit OTT Platform' : 'Add OTT Platform'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <input
            type="text"
            placeholder="Platform Name *"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
          />

          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
            rows={3}
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
            >
              {CATEGORIES.filter(c => c !== 'All').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-white">Pricing Tiers</label>
              <button type="button" onClick={addTier} className="text-xs text-blue-400 hover:text-blue-300">
                + Add Tier
              </button>
            </div>
            <div className="space-y-2">
              {formData.pricingTiers.map((tier, idx) => (
                <div key={idx} className="bg-gray-900 border border-gray-700 rounded p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Plan name *"
                      required
                      value={tier.name}
                      onChange={(e) => {
                        const updated = [...formData.pricingTiers];
                        updated[idx].name = e.target.value;
                        setFormData({ ...formData, pricingTiers: updated });
                      }}
                      className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                    />
                    <input
                      type="number"
                      placeholder="Price *"
                      required
                      value={tier.price}
                      onChange={(e) => {
                        const updated = [...formData.pricingTiers];
                        updated[idx].price = e.target.value;
                        setFormData({ ...formData, pricingTiers: updated });
                      }}
                      className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Features (comma-separated)"
                    value={Array.isArray(tier.features) ? tier.features.join(', ') : tier.features}
                    onChange={(e) => {
                      const updated = [...formData.pricingTiers];
                      updated[idx].features = e.target.value;
                      setFormData({ ...formData, pricingTiers: updated });
                    }}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                  />
                  {formData.pricingTiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTier(idx)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
