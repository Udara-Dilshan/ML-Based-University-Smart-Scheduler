import { useState } from "react";
import { Plus, Edit, Trash2, X } from "lucide-react";

const ManageRooms = () => {
  const [rooms, setRooms] = useState([
    { id: 1, name: "A1 Smart", type: "Lecture Hall", capacity: 120, location: "A Block" },
    { id: 2, name: "C1 Lab", type: "Computer Lab", capacity: 40, location: "C Block" },
    { id: 3, name: "Main Auditorium", type: "Auditorium", capacity: 500, location: "Main Building" },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  
  const [formData, setFormData] = useState({
    name: "",
    type: "Lecture Hall",
    capacity: "",
    location: "",
  });

  const handleOpenModal = (room = null) => {
    if (room) {
      setEditingRoom(room.id);
      setFormData(room);
    } else {
      setEditingRoom(null);
      setFormData({ name: "", type: "Lecture Hall", capacity: "", location: "" });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRoom(null);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editingRoom) {
      setRooms(rooms.map(r => r.id === editingRoom ? { ...formData, id: editingRoom } : r));
    } else {
      setRooms([...rooms, { ...formData, id: Date.now() }]);
    }
    handleCloseModal();
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this room?")) {
      setRooms(rooms.filter(r => r.id !== id));
    }
  };

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Manage Rooms
        </h2>

        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
        >
          <Plus size={16} /> Add Room
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Capacity</th>
              <th className="px-4 py-3 text-left">Location</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rooms.map((room) => (
              <tr key={room.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-900">{room.name}</td>
                <td className="px-4 py-3 text-gray-600">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    room.type === 'Lecture Hall' ? 'bg-blue-50 text-blue-700' :
                    room.type === 'Computer Lab' ? 'bg-purple-50 text-purple-700' :
                    'bg-orange-50 text-orange-700'
                  }`}>
                    {room.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{room.capacity}</td>
                <td className="px-4 py-3 text-gray-600">{room.location}</td>
                <td className="px-4 py-3 flex gap-3">
                  <button onClick={() => handleOpenModal(room)} className="text-blue-600 hover:text-blue-800 transition-colors">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(room.id)} className="text-red-600 hover:text-red-800 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {rooms.length === 0 && (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                  No rooms found. Add a room to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-semibold text-lg">{editingRoom ? "Edit Room" : "Add Room"}</h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. A1 Smart"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resource Type <span className="text-red-500">*</span></label>
                <select 
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  <option value="Lecture Hall">Lecture Hall</option>
                  <option value="Computer Lab">Computer Lab</option>
                  <option value="Auditorium">Auditorium</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity <span className="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                    placeholder="e.g. 100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="e.g. Block A"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  {editingRoom ? "Save Changes" : "Add Room"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageRooms;