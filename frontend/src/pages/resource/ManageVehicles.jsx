import { useState } from "react";
import { Plus, Edit, Trash2, X, Bus, Car, Truck } from "lucide-react";

const ManageVehicles = () => {
  const [vehicles, setVehicles] = useState([
    { id: 1, type: "Bus", plate: "WP-1234", capacity: 45 },
    { id: 2, type: "Van", plate: "CP-5678", capacity: 15 },
    { id: 3, type: "Car", plate: "SP-9012", capacity: 4 },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  
  const [formData, setFormData] = useState({
    type: "Bus",
    plate: "",
    capacity: "",
  });

  const handleOpenModal = (vehicle = null) => {
    if (vehicle) {
      setEditingVehicle(vehicle.id);
      setFormData(vehicle);
    } else {
      setEditingVehicle(null);
      setFormData({ type: "Bus", plate: "", capacity: "" });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editingVehicle) {
      setVehicles(vehicles.map(v => v.id === editingVehicle ? { ...formData, id: editingVehicle } : v));
    } else {
      setVehicles([...vehicles, { ...formData, id: Date.now() }]);
    }
    handleCloseModal();
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this vehicle?")) {
      setVehicles(vehicles.filter(v => v.id !== id));
    }
  };

  const getVehicleIcon = (type) => {
    switch (type) {
      case 'Bus': return <Bus size={18} className="text-blue-600" />;
      case 'Van': return <Truck size={18} className="text-orange-600" />;
      case 'Car': return <Car size={18} className="text-purple-600" />;
      default: return <Car size={18} className="text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Manage Vehicles
        </h2>

        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
        >
          <Plus size={16} /> Add Vehicle
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Reg No (Plate)</th>
              <th className="px-4 py-3 text-left">Capacity</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {vehicles.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 flex items-center gap-2 font-medium text-gray-900">
                  {getVehicleIcon(v.type)} {v.type}
                </td>
                <td className="px-4 py-3 text-gray-600">{v.plate}</td>
                <td className="px-4 py-3 text-gray-600">{v.capacity} Passengers</td>
                <td className="px-4 py-3 flex gap-3">
                  <button onClick={() => handleOpenModal(v)} className="text-blue-600 hover:text-blue-800 transition-colors">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(v.id)} className="text-red-600 hover:text-red-800 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr>
                <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                  No vehicles found. Add a vehicle to get started.
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
              <h3 className="font-semibold text-lg">{editingVehicle ? "Edit Vehicle" : "Add Vehicle"}</h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type <span className="text-red-500">*</span></label>
                <select 
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  <option value="Bus">Bus</option>
                  <option value="Van">Van</option>
                  <option value="Car">Car</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration No (Plate) <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  value={formData.plate}
                  onChange={(e) => setFormData({...formData, plate: e.target.value})}
                  placeholder="e.g. WP-1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Passenger Capacity <span className="text-red-500">*</span></label>
                <input 
                  type="number" 
                  required
                  min="1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  value={formData.capacity}
                  onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                  placeholder="e.g. 45"
                />
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
                  {editingVehicle ? "Save Changes" : "Add Vehicle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManageVehicles;