import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'student',
    password: 'user123',
    contact_number: ''
  });

  const fetchUsers = () => {
    api.get('/api/users/')
      .then(res => {
        setUsers(res.data);
      })
      .catch(err => console.error("Error fetching users:", err));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    api.post('/api/users/', formData)
      .then(() => {
        alert("User added successfully!");
        setShowModal(false);
        fetchUsers();
        setFormData({ 
          first_name: '', 
          last_name: '', 
          email: '', 
          role: 'student', 
          password: 'user123',
          contact_number: ''
        });
      })
      .catch(err => {
        console.error("Error details:", err.response?.data);
        alert("Error adding user: " + (err.response?.data?.detail || "Check backend connection"));
      });
  };

  const deleteUser = (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      api.delete(`/api/users/${userId}`)
        .then(() => {
          alert("User deleted!");
          fetchUsers();
        })
        .catch(err => console.error(err));
    }
  };

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">System Users</h3>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          >
            + Add New User
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-600">
              <tr>
                <th className="px-6 py-3 border-b">Name</th>
                <th className="px-6 py-3 border-b">Email</th>
                <th className="px-6 py-3 border-b">Role</th>
                <th className="px-6 py-3 border-b">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length > 0 ? (
                users.map(user => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {user.first_name} {user.last_name}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium uppercase">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 space-x-3">
                      <button className="text-blue-600 hover:underline text-sm font-medium">Edit</button>
                      <button 
                        onClick={() => deleteUser(user.user_id)}
                        className="text-red-500 hover:underline text-sm font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-gray-500">
                    No users found in the system.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Add New User</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="text" name="first_name" placeholder="First Name" 
                  value={formData.first_name} onChange={handleChange} 
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required 
                />
                <input 
                  type="text" name="last_name" placeholder="Last Name" 
                  value={formData.last_name} onChange={handleChange} 
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required 
                />
              </div>
              <input 
                type="email" name="email" placeholder="Email Address" 
                value={formData.email} onChange={handleChange} 
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required 
              />
              <input 
                type="text" name="contact_number" placeholder="Contact Number (Optional)" 
                value={formData.contact_number} onChange={handleChange} 
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
              <select 
                name="role" value={formData.role} onChange={handleChange} 
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="student">Student</option>
                <option value="lecturer">Lecturer</option>
                <option value="resource_manager">Resource Manager</option>
                <option value="admin">Admin</option>
              </select>
              <div className="flex justify-end space-x-3 mt-8">
                <button 
                  type="button" onClick={() => setShowModal(false)} 
                  className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-md transition"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;