import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            Subscription Manager
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Welcome, {user?.firstName}!
            </span>
            {user?.isAdmin && (
              <Link
                to="/testing-mode"
                className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800"
              >
                🔧 Testing Mode
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="btn-secondary text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Total Subscriptions
            </h3>
            <p className="text-3xl font-bold text-blue-600">0</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Monthly Cost
            </h3>
            <p className="text-3xl font-bold text-green-600">₹0</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Renewals This Month
            </h3>
            <p className="text-3xl font-bold text-orange-600">0</p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/subscriptions"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 mb-1">
                Manage Subscriptions
              </h3>
              <p className="text-sm text-gray-600">
                View, add, and manage your subscriptions
              </p>
            </Link>
            <Link
              to="/settings"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 mb-1">
                Settings
              </h3>
              <p className="text-sm text-gray-600">
                Update profile and preferences
              </p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
