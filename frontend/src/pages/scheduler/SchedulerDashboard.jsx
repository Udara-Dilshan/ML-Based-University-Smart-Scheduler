import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const SchedulerDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Scheduler Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome back, {user.first_name} {user.last_name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Schedules</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
              <Calendar className="text-blue-600" size={40} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
              <Clock className="text-orange-600" size={40} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
              <CheckCircle className="text-green-600" size={40} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conflicts</p>
                <p className="text-2xl font-bold text-red-600">0</p>
              </div>
              <AlertCircle className="text-red-600" size={40} />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-all text-left">
              <Calendar className="text-blue-600 mb-2" size={24} />
              <h3 className="font-semibold text-gray-900">Create Schedule</h3>
              <p className="text-sm text-gray-600">Generate new schedule</p>
            </button>

            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-600 hover:bg-green-50 transition-all text-left">
              <CheckCircle className="text-green-600 mb-2" size={24} />
              <h3 className="font-semibold text-gray-900">Review Schedules</h3>
              <p className="text-sm text-gray-600">Check and approve schedules</p>
            </button>

            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-orange-600 hover:bg-orange-50 transition-all text-left">
              <AlertCircle className="text-orange-600 mb-2" size={24} />
              <h3 className="font-semibold text-gray-900">Resolve Conflicts</h3>
              <p className="text-sm text-gray-600">Handle scheduling conflicts</p>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
          <p className="text-gray-600">No recent scheduling activity.</p>
        </div>
      </main>
    </div>
  );
};

export default SchedulerDashboard;
