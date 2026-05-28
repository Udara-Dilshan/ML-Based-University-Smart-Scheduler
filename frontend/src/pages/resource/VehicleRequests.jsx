import { useState } from "react";
import { Check, X } from "lucide-react";

const VehicleRequests = () => {
  const [requests, setRequests] = useState([
    {
      id: 1,
      requester: "Dr. Perera",
      purpose: "Field Trip to Botanical Garden",
      date: "2024-11-20",
      time: "08:00 - 15:00",
      studentsCount: 40,
      status: "Pending",
      assignedVehicle: "",
    },
    {
      id: 2,
      requester: "Mr. Silva",
      purpose: "Research Visit",
      date: "2024-11-22",
      time: "09:00 - 12:00",
      studentsCount: 12,
      status: "Pending",
      assignedVehicle: "",
    },
  ]);

  const [availableVehicles] = useState([
    { id: "V1", name: "Bus 01 (WP-1234)", capacity: 45 },
    { id: "V2", name: "Van 02 (CP-5678)", capacity: 15 },
    { id: "V3", name: "Car (SP-9012)", capacity: 4 },
  ]);

  const handleApprove = (id, assignedVehicle) => {
    if (!assignedVehicle) {
      alert("Please assign a vehicle before approving.");
      return;
    }
    setRequests(requests.map(r => r.id === id ? { ...r, status: "Approved", assignedVehicle } : r));
  };

  const handleReject = (id) => {
    const reason = window.prompt("Reason for rejection:");
    if (reason !== null) {
      setRequests(requests.map(r => r.id === id ? { ...r, status: "Rejected", reason } : r));
    }
  };

  const handleVehicleSelect = (id, vehicleId) => {
    setRequests(requests.map(r => r.id === id ? { ...r, assignedVehicle: vehicleId } : r));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Vehicle Requests
        </h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Requester</th>
              <th className="px-4 py-3 text-left">Purpose</th>
              <th className="px-4 py-3 text-left">Date & Time</th>
              <th className="px-4 py-3 text-left">Capacity Needed</th>
              <th className="px-4 py-3 text-left">Assign Vehicle</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {requests.map((req) => (
              <tr key={req.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-900">{req.requester}</td>
                <td className="px-4 py-3 text-gray-600">{req.purpose}</td>
                <td className="px-4 py-3 text-gray-600">
                  <div>{req.date}</div>
                  <div className="text-xs">{req.time}</div>
                </td>
                <td className="px-4 py-3 text-gray-900 font-medium">
                  {req.studentsCount} Students
                </td>
                <td className="px-4 py-3">
                  {req.status === "Pending" ? (
                    <select
                      className="border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500 w-full"
                      value={req.assignedVehicle}
                      onChange={(e) => handleVehicleSelect(req.id, e.target.value)}
                    >
                      <option value="">-- Select Vehicle --</option>
                      {availableVehicles.map(v => (
                        <option 
                          key={v.id} 
                          value={v.name}
                          className={v.capacity >= req.studentsCount ? 'text-green-600' : 'text-red-600'}
                        >
                          {v.name} (Cap: {v.capacity}) {v.capacity < req.studentsCount ? '- Too small' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-gray-700">{req.assignedVehicle || "N/A"}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    req.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                    req.status === 'Approved' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {req.status}
                  </span>
                  {req.reason && <div className="text-xs text-gray-500 mt-1">Reason: {req.reason}</div>}
                </td>
                <td className="px-4 py-3 flex gap-2">
                  {req.status === "Pending" && (
                    <>
                      <button 
                        onClick={() => handleApprove(req.id, req.assignedVehicle)}
                        className="flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 transition-colors"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button 
                        onClick={() => handleReject(req.id)}
                        className="flex items-center gap-1 bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                      >
                        <X size={14} /> Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                  No vehicle requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VehicleRequests;
