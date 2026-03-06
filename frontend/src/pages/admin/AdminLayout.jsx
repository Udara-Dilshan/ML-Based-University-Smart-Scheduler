import React from 'react';
import { Link, Outlet } from 'react-router-dom';

const AdminLayout = () => {
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-blue-600">UniSchedule</h1>
          <p className="text-xs text-gray-500">Academic Portal</p>
        </div>
        <nav className="mt-6">
          <Link to="/admin/dashboard" className="flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition">
            Dashboard
          </Link>
          <Link to="/admin/users" className="flex items-center px-6 py-3 bg-blue-50 text-blue-600 font-medium">
            Users
          </Link>
          <Link to="/admin/resources" className="flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition">
            Resources
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between px-8 py-4 bg-white shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800">User Management</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 italic">Welcome, Udara</span>
            <button className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition">Logout</button>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto p-8 bg-gray-50">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;