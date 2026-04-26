import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Subscription Manager
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Track and manage all your subscriptions in one place
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/auth"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition-colors"
          >
            Get Started
          </Link>
          <Link
            to="/auth"
            className="bg-white hover:bg-gray-50 text-gray-900 font-medium py-3 px-8 rounded-lg border-2 border-gray-200 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
