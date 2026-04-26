import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { subscriptionService, analyticsService } from '../services';
import { formatCurrency } from '../utils/helpers';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalSubs: 0,
    monthlyCost: 0,
    renewalsThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [subs, analytics] = await Promise.all([
        subscriptionService.getAll(),
        analyticsService.getSummary().catch(() => null),
      ]);

      const activeSubs = subs.filter(s => s.status === 'active');
      const monthlyCost = activeSubs.reduce((sum, sub) => {
        let cost = sub.cost;
        if (sub.billing_cycle === 'yearly') cost = cost / 12;
        if (sub.billing_cycle === 'weekly') cost = cost * 4;
        return sum + cost;
      }, 0);

      setStats({
        totalSubs: activeSubs.length,
        monthlyCost: Math.round(monthlyCost),
        renewalsThisMonth: analytics?.upcoming_renewals?.length || 0,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your subscriptions</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card bg-blue-50 border-blue-200">
          <h3 className="text-sm font-medium text-blue-900 mb-1">
            Active Subscriptions
          </h3>
          <p className="text-3xl font-bold text-blue-600">{stats.totalSubs}</p>
        </div>
        <div className="card bg-green-50 border-green-200">
          <h3 className="text-sm font-medium text-green-900 mb-1">
            Monthly Cost
          </h3>
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(stats.monthlyCost)}
          </p>
        </div>
        <div className="card bg-orange-50 border-orange-200">
          <h3 className="text-sm font-medium text-orange-900 mb-1">
            Renewals This Month
          </h3>
          <p className="text-3xl font-bold text-orange-600">{stats.renewalsThisMonth}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/subscriptions"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <h3 className="font-semibold text-gray-900 mb-1">
              📱 Manage Subscriptions
            </h3>
            <p className="text-sm text-gray-600">
              View, add, edit, and cancel your subscriptions
            </p>
          </Link>
          <Link
            to="/settings"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <h3 className="font-semibold text-gray-900 mb-1">
              ⚙️ Settings
            </h3>
            <p className="text-sm text-gray-600">
              Update profile, email preferences, and budget
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
