import { Link, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
                  S
                </div>
                <span className="font-bold text-gray-900">SubManager</span>
              </Link>

              {/* Navigation */}
              <nav className="hidden md:flex gap-1">
                <NavLink to="/dashboard">Dashboard</NavLink>
                <NavLink to="/subscriptions">Subscriptions</NavLink>
                <NavLink to="/settings">Settings</NavLink>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:block">
                {user?.firstName} {user?.lastName}
              </span>
              
              {user?.isAdmin && (
                <Link
                  to="/testing-mode"
                  className="bg-gray-900 text-white px-3 py-1.5 rounded-md text-sm hover:bg-gray-800 flex items-center gap-1"
                >
                  🔧 Testing Mode
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <nav className="md:hidden flex gap-1 pb-3 overflow-x-auto">
            <NavLink to="/dashboard" mobile>Dashboard</NavLink>
            <NavLink to="/subscriptions" mobile>Subscriptions</NavLink>
            <NavLink to="/settings" mobile>Settings</NavLink>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}

function NavLink({ to, children, mobile }) {
  return (
    <Link
      to={to}
      className={({ isActive }) => `
        ${mobile ? 'text-xs px-3 py-1.5 whitespace-nowrap' : 'px-3 py-2'}
        rounded-md font-medium transition-colors
        ${isActive 
          ? 'bg-gray-100 text-gray-900' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }
      `}
    >
      {children}
    </Link>
  );
}
