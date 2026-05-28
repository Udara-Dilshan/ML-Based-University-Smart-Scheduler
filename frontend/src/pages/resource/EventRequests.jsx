import { useState } from "react";
import { Check, X, AlertTriangle, CheckCircle } from "lucide-react";

const EventRequests = () => {
  const [requests, setRequests] = useState([
    {
      id: 1,
      requester: "John Doe (Student)",
      event: "Batch Party",
      venue: "Main Auditorium",
      date: "2024-11-15",
      time: "14:00 - 16:00",
      status: "Pending",
      conflict: false,
    },
    {
      id: 2,
      requester: "Dr. Smith (Lecturer)",
      event: "Guest Lecture",
      venue: "A1 Smart",
      date: "2024-11-16",
      time: "10:00 - 12:00",
      status: "Pending",
      conflict: true,
      conflictReason: "AI Timetable: CS101 Class Scheduled",
    },
  ]);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = (id, hasConflict) => {
    if (hasConflict) {
      if (!window.confirm("Warning: There is a conflict with the AI Timetable. Are you sure you want to approve this?")) {
        return;
      }
    }
    setRequests(requests.map(r => r.id === id ? { ...r, status: "Approved" } : r));
  };

  const openRejectModal = (id) => {
    setRejectingId(id);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = (e) => {
    e.preventDefault();
    setRequests(requests.map(r => r.id === rejectingId ? { ...r, status: "Rejected", reason: rejectReason } : r));
    setRejectModalOpen(false);
    setRejectingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Event / Venue Requests
        </h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Requester</th>
              <th className="px-4 py-3 text-left">Event Details</th>
              <th className="px-4 py-3 text-left">Venue & Time</th>
              <th className="px-4 py-3 text-left">AI Timetable Check</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {requests.map((req) => (
              <tr key={req.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-900">{req.requester}</td>
                <td className="px-4 py-3 text-gray-600">{req.event}</td>
                <td className="px-4 py-3 text-gray-600">
                  <div className="font-medium text-gray-800">{req.venue}</div>
                  <div className="text-xs">{req.date} | {req.time}</div>
                </td>
                <td className="px-4 py-3">
                  {req.conflict ? (
                    <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-md max-w-fit">
                      <AlertTriangle size={14} />
                      <span className="text-xs font-medium">Conflict: {req.conflictReason}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-md max-w-fit">
                      <CheckCircle size={14} />
                      <span className="text-xs font-medium">No Conflict</span>
                    </div>
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
                        onClick={() => handleApprove(req.id, req.conflict)}
                        className="flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 transition-colors"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button 
                        onClick={() => openRejectModal(req.id)}
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
                <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                  No venue requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-semibold text-lg text-gray-900">Reject Request</h3>
              <button onClick={() => setRejectModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRejectSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Rejection <span className="text-red-500">*</span></label>
                <textarea 
                  required
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. The venue is undergoing maintenance."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Confirm Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventRequests;
