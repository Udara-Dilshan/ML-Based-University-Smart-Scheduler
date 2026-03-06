import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Briefcase, Building, Car, CheckCircle } from 'lucide-react';

const ResourceDashboard = () => {
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
            <h1 className="text-2xl font-bold text-gray-900">Resource Manager Dashboard</h1>
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
                <p className="text-sm text-gray-600">Total Rooms</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
              <Building className="text-blue-600" size={40} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Equipment</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
              <Briefcase className="text-purple-600" size={40} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Vehicles</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
              <Car className="text-green-600" size={40} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available</p>
                <p className="text-2xl font-bold text-green-600">0</p>
              </div>
              <CheckCircle className="text-green-600" size={40} />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-all text-left">
              <Building className="text-blue-600 mb-2" size={24} />
              <h3 className="font-semibold text-gray-900">Manage Rooms</h3>
              <p className="text-sm text-gray-600">Add or update room details</p>
            </button>

            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-600 hover:bg-purple-50 transition-all text-left">
              <Briefcase className="text-purple-600 mb-2" size={24} />
              <h3 className="font-semibold text-gray-900">Equipment</h3>
              <p className="text-sm text-gray-600">Manage equipment inventory</p>
            </button>

            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-600 hover:bg-green-50 transition-all text-left">
              <Car className="text-green-600 mb-2" size={24} />
              <h3 className="font-semibold text-gray-900">Vehicles</h3>
              <p className="text-sm text-gray-600">Manage vehicle fleet</p>
            </button>
          </div>
        </div>

        {/* Resource Availability */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Resource Availability</h2>
          <p className="text-gray-600">No resource bookings for today.</p>
        </div>
      </main>
    </div>
  );
};

export default ResourceDashboard;
