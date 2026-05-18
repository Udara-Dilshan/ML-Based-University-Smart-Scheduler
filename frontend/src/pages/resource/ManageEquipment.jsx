import { useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";

const ManageEquipment = () => {
  const equipment = [
    { id: 1, name: "Projector", quantity: 12 },
    { id: 2, name: "Smart Board", quantity: 8 },
  ];

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Equipment Management
        </h2>

        <button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
          <Plus size={16} /> Add Equipment
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Quantity</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {equipment.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">{item.name}</td>
                <td className="px-4 py-3">{item.quantity}</td>
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

export default ManageEquipment;
