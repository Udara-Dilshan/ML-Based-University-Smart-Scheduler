import { useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";

const ManageVehicles = () => {
  const vehicles= [
    { id: 1, name: "Bus 01", plate: "WP-1234", capacity: 45 },
    { id: 2, name: "Van 02", plate: "CP-5678", capacity: 15 },
  ];

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Vehicle Management
        </h2>

        <button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
          <Plus size={16} /> Add Vehicle
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Vehicle</th>
              <th className="px-4 py-3 text-left">Plate</th>
              <th className="px-4 py-3 text-left">Capacity</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {vehicles.map((v) => (
              <tr key={v.id}>
                <td className="px-4 py-3">{v.name}</td>
                <td className="px-4 py-3">{v.plate}</td>
                <td className="px-4 py-3">{v.capacity}</td>
                <td className="px-4 py-3 flex gap-3">
                  <button className="text-yellow-600">
                    <Edit size={16} />
                  </button>
                  <button className="text-red-600">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>

    </div>
  );
};

export default ManageVehicles;