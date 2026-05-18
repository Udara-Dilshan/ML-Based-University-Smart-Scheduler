import { useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";

const ManageRooms = () => {
  const [rooms] = useState([
    { id: 1, name: "A1 Smart", type: "Lecture Hall", capacity: 120, location: "A Block" },
    { id: 2, name: "C1 Lab", type: "Computer Lab", capacity: 40, location: "C Block" },
  ]);

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Manage Rooms
        </h2>

        <button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
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
              <tr key={room.id}>
                <td className="px-4 py-3">{room.name}</td>
                <td className="px-4 py-3">{room.type}</td>
                <td className="px-4 py-3">{room.capacity}</td>
                <td className="px-4 py-3">{room.location}</td>
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

export default ManageRooms;