/* ============================================================
   TESTING MODE (ADMIN PANEL) — Dark themed admin interface
   for managing OTT platforms, viewing analytics, and testing.
============================================================ */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { 
    ArrowLeft, 
    Plus, 
    Search, 
    Filter, 
    Edit2, 
    Trash2, 
    Eye, 
    DollarSign,
    TrendingUp,
    Zap
} from 'lucide-react';

const OTT_CATEGORIES = [
    'All',
    'Streaming',
    'Music',
    'Cloud Storage',
    'Productivity',
    'Gaming',
    'News',
    'Education',
    'Fitness',
    'Other'
];

export default function TestingMode() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [otts, setOtts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editingOTT, setEditingOTT] = useState(null);

    // Redirect if not admin
    useEffect(() => {
        if (user && !user.isAdmin) {
            toast.error('Access denied. Admin only.');
            navigate('/app');
        }
    }, [user, navigate]);

    useEffect(() => {
        loadOTTs();
    }, [selectedCategory, searchQuery, statusFilter]);

    const loadOTTs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedCategory !== 'All') params.append('category', selectedCategory);
            if (searchQuery) params.append('search', searchQuery);
            if (statusFilter !== 'all') params.append('status', statusFilter);
            
            const { data } = await api.get(`/otts/all?${params.toString()}`);
            setOtts(data);
        } catch (e) {
            toast.error('Failed to load OTT platforms');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
        try {
            await api.delete(`/otts/${id}`);
            toast.success(`${name} deleted`);
            loadOTTs();
        } catch {
            toast.error('Failed to delete');
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
        <div className="min-h-screen bg-[#18181B] text-white">
            {/* Header */}
            <div className="border-b border-[#27272A] bg-[#09090B]">
                <div className="max-w-[1600px] mx-auto px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/app')}
                                className="flex items-center gap-2 text-sm text-[#A1A1AA] hover:text-white transition-colors"
                            >
                                <ArrowLeft size={16} />
                                Exit Testing Mode
                            </button>
                        </div>
                        <button
                            onClick={handleAdd}
                            className="flex items-center gap-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                            <Plus size={16} />
                            Add OTT Platform
                        </button>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Zap size={24} className="text-[#3B82F6]" />
                            Testing Mode
                        </h1>
                        <p className="text-sm text-[#A1A1AA] mt-1">Manage OTT platforms and system settings</p>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-6 py-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <StatCard
                        label="Total Platforms"
                        value={otts.length}
                        icon={<Eye size={20} />}
                        color="blue"
                    />
                    <StatCard
                        label="Active"
                        value={otts.filter(o => o.status === 'active').length}
                        icon={<TrendingUp size={20} />}
                        color="green"
                    />
                    <StatCard
                        label="Categories"
                        value={OTT_CATEGORIES.length - 1}
                        icon={<Filter size={20} />}
                        color="purple"
                    />
                </div>

                {/* Filters */}
                <div className="bg-[#09090B] border border-[#27272A] rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Search */}
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B]" />
                            <input
                                type="text"
                                placeholder="Search platforms..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[#18181B] border border-[#27272A] rounded-md pl-10 pr-3 py-2 text-sm text-white placeholder:text-[#52525B] focus:outline-none focus:border-[#3B82F6]"
                            />
                        </div>

                        {/* Category Filter */}
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="bg-[#18181B] border border-[#27272A] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3B82F6]"
                        >
                            {OTT_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>

                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-[#18181B] border border-[#27272A] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3B82F6]"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                {/* OTT Grid */}
                {loading ? (
                    <div className="text-center py-12 text-[#52525B]">Loading...</div>
                ) : otts.length === 0 ? (
                    <div className="text-center py-12 text-[#52525B]">
                        No platforms found. Try adjusting your filters.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {otts.map(ott => (
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

const StatCard = ({ label, value, icon, color }) => {
    const colorClasses = {
        blue: 'bg-[#1E3A8A]/20 text-[#3B82F6]',
        green: 'bg-[#14532D]/20 text-[#22C55E]',
        purple: 'bg-[#4C1D95]/20 text-[#A78BFA]'
    };

    return (
        <div className="bg-[#09090B] border border-[#27272A] rounded-lg p-4">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-[#A1A1AA] text-xs uppercase tracking-wider mb-1">{label}</div>
                    <div className="text-2xl font-bold">{value}</div>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
};

const OTTCard = ({ ott, onEdit, onDelete }) => {
    const minPrice = Math.min(...ott.pricingTiers.map(t => t.price));
    const maxPrice = Math.max(...ott.pricingTiers.map(t => t.price));

    return (
        <div className="bg-[#09090B] border border-[#27272A] rounded-lg p-4 hover:border-[#3B82F6] transition-colors">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    {ott.logo ? (
                        <img src={ott.logo} alt={ott.name} className="w-10 h-10 rounded object-cover" />
                    ) : (
                        <div className="w-10 h-10 rounded bg-[#27272A] flex items-center justify-center text-lg font-bold">
                            {ott.name[0]}
                        </div>
                    )}
                    <div>
                        <h3 className="font-semibold text-white">{ott.name}</h3>
                        <div className="text-xs text-[#A1A1AA]">{ott.category}</div>
                    </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                    ott.status === 'active' 
                        ? 'bg-[#14532D] text-[#22C55E]' 
                        : 'bg-[#450A0A] text-[#F87171]'
                }`}>
                    {ott.status}
                </span>
            </div>

            {ott.description && (
                <p className="text-sm text-[#71717A] mb-3 line-clamp-2">{ott.description}</p>
            )}

            <div className="flex items-center gap-2 mb-3 text-sm">
                <DollarSign size={14} className="text-[#3B82F6]" />
                <span className="text-white font-medium">
                    ₹{minPrice} - ₹{maxPrice}
                </span>
                <span className="text-[#52525B]">·</span>
                <span className="text-[#52525B]">{ott.pricingTiers.length} plans</span>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => onEdit(ott)}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-white px-3 py-1.5 rounded text-sm transition-colors"
                >
                    <Edit2 size={14} />
                    Edit
                </button>
                <button
                    onClick={() => onDelete(ott.id, ott.name)}
                    className="flex items-center justify-center gap-2 bg-[#450A0A] hover:bg-[#7F1D1D] text-[#F87171] px-3 py-1.5 rounded text-sm transition-colors"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
};

const OTTModal = ({ ott, onClose, onSaved }) => {
    const [name, setName] = useState(ott?.name || '');
    const [logo, setLogo] = useState(ott?.logo || '');
    const [description, setDescription] = useState(ott?.description || '');
    const [category, setCategory] = useState(ott?.category || 'Other');
    const [status, setStatus] = useState(ott?.status || 'active');
    const [pricingTiers, setPricingTiers] = useState(ott?.pricingTiers || [{ name: '', price: 0, features: [''] }]);
    const [saving, setSaving] = useState(false);

    const addTier = () => {
        setPricingTiers([...pricingTiers, { name: '', price: 0, features: [''] }]);
    };

    const removeTier = (index) => {
        setPricingTiers(pricingTiers.filter((_, i) => i !== index));
    };

    const updateTier = (index, field, value) => {
        const updated = [...pricingTiers];
        updated[index][field] = value;
        setPricingTiers(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                name,
                logo,
                description,
                category,
                status,
                pricingTiers: pricingTiers.map(t => ({
                    ...t,
                    price: Number(t.price),
                    features: typeof t.features === 'string' ? t.features.split(',').map(f => f.trim()) : t.features
                }))
            };

            if (ott) {
                await api.put(`/otts/${ott.id}`, payload);
                toast.success('OTT platform updated');
            } else {
                await api.post('/otts', payload);
                toast.success('OTT platform created');
            }
            onSaved();
        } catch {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#09090B] border border-[#27272A] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-[#09090B] border-b border-[#27272A] px-6 py-4">
                    <h2 className="text-xl font-bold text-white">
                        {ott ? 'Edit OTT Platform' : 'Add OTT Platform'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <InputDark label="Name" value={name} onChange={setName} required />
                    <InputDark label="Logo URL" value={logo} onChange={setLogo} />
                    <TextareaDark label="Description" value={description} onChange={setDescription} rows={3} />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <SelectDark label="Category" value={category} onChange={setCategory}>
                            {OTT_CATEGORIES.filter(c => c !== 'All').map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </SelectDark>
                        <SelectDark label="Status" value={status} onChange={setStatus}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </SelectDark>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-white">Pricing Tiers</label>
                            <button
                                type="button"
                                onClick={addTier}
                                className="text-xs text-[#3B82F6] hover:text-[#2563EB] flex items-center gap-1"
                            >
                                <Plus size={14} /> Add Tier
                            </button>
                        </div>
                        <div className="space-y-3">
                            {pricingTiers.map((tier, idx) => (
                                <div key={idx} className="bg-[#18181B] border border-[#27272A] rounded-lg p-3">
                                    <div className="grid grid-cols-2 gap-3 mb-2">
                                        <input
                                            type="text"
                                            placeholder="Plan name"
                                            value={tier.name}
                                            onChange={(e) => updateTier(idx, 'name', e.target.value)}
                                            className="bg-[#09090B] border border-[#27272A] rounded px-3 py-2 text-sm text-white"
                                            required
                                        />
                                        <input
                                            type="number"
                                            placeholder="Price"
                                            value={tier.price}
                                            onChange={(e) => updateTier(idx, 'price', e.target.value)}
                                            className="bg-[#09090B] border border-[#27272A] rounded px-3 py-2 text-sm text-white"
                                            required
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Features (comma-separated)"
                                        value={Array.isArray(tier.features) ? tier.features.join(', ') : tier.features}
                                        onChange={(e) => updateTier(idx, 'features', e.target.value)}
                                        className="w-full bg-[#09090B] border border-[#27272A] rounded px-3 py-2 text-sm text-white mb-2"
                                    />
                                    {pricingTiers.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeTier(idx)}
                                            className="text-xs text-[#F87171] hover:text-[#EF4444]"
                                        >
                                            Remove tier
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-2 rounded-md font-medium disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : (ott ? 'Update' : 'Create')}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-[#A1A1AA] hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const InputDark = ({ label, value, onChange, type = 'text', required = false }) => (
    <div>
        <label className="block text-sm font-medium text-white mb-1">{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            className="w-full bg-[#18181B] border border-[#27272A] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3B82F6]"
        />
    </div>
);

const TextareaDark = ({ label, value, onChange, rows = 3 }) => (
    <div>
        <label className="block text-sm font-medium text-white mb-1">{label}</label>
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            className="w-full bg-[#18181B] border border-[#27272A] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3B82F6]"
        />
    </div>
);

const SelectDark = ({ label, value, onChange, children }) => (
    <div>
        <label className="block text-sm font-medium text-white mb-1">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-[#18181B] border border-[#27272A] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3B82F6]"
        >
            {children}
        </select>
    </div>
);
