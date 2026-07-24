import { useEffect, useState, useMemo } from "react";
import {
  Plus, Trash2, Calendar, Clock, MapPin, Tag, Users, Car,
  AlertTriangle, CheckCircle2, RefreshCw, X, Sparkles, Edit, Download, Search
} from "lucide-react";
import { bookingAPI, resourceAPI } from "../../services/api";

const initialForm = {
  assigned_vehicle_id: "",
  trip_date: "",
  start_time: "",
  end_time: "",
  passenger_count: 1,
  destination: "",
  purpose: "",
};

export default function ManageVehicleBookings() {
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [editingBookingId, setEditingBookingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [bookingsData, vehiclesData] = await Promise.all([
        bookingAPI.getDirectVehicles(),
        resourceAPI.getVehicles(),
      ]);
      setBookings(bookingsData || []);
      setVehicles(vehiclesData || []);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const vehicleName = b.assigned_vehicle_reg || b.vehicle_type_needed || "";
      const matchesSearch = !searchQuery.trim() || 
        (b.destination || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.purpose || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.requester_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicleName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesVehicle = !vehicleFilter || (b.assigned_vehicle_ids && b.assigned_vehicle_ids.includes(Number(vehicleFilter)));
      
      return matchesSearch && matchesVehicle;
    });
  }, [bookings, searchQuery, vehicleFilter]);

  const exportToCSV = () => {
    if (filteredBookings.length === 0) return;
    
    const headers = [
      "Booking ID", "Vehicle", "Destination", "Date", "Start Time", 
      "End Time", "Passengers", "Purpose", "Organizer", "Source"
    ];
    
    const csvRows = [];
    csvRows.push(headers.join(","));
    
    filteredBookings.forEach(b => {
      const source = (b.requester_role === "RESOURCE_MANAGER" || b.requester_role === "SUPER_ADMIN") 
        ? "Direct Add" 
        : `Via Request #${b.req_id}`;
      const row = [
        b.req_id,
        `"${(b.assigned_vehicle_reg || b.vehicle_type_needed || "Unknown").replace(/"/g, '""')}"`,
        `"${(b.destination || "Not specified").replace(/"/g, '""')}"`,
        b.trip_date,
        b.start_time,
        b.end_time,
        b.passenger_count,
        `"${(b.purpose || "").replace(/"/g, '""')}"`,
        `"${(b.requester_name || "").replace(/"/g, '""')}"`,
        `"${source.replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(","));
    });
    
    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `vehicle_bookings_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenModal = (booking = null) => {
    if (booking) {
      setFormData({
        assigned_vehicle_id: (booking.assigned_vehicle_ids && booking.assigned_vehicle_ids[0]) || "",
        trip_date: booking.trip_date || "",
        start_time: booking.start_time || "",
        end_time: booking.end_time || "",
        passenger_count: booking.passenger_count || 1,
        destination: booking.destination || "",
        purpose: booking.purpose || "",
      });
      setEditingBookingId(booking.req_id);
    } else {
      setFormData(initialForm);
      setEditingBookingId(null);
    }
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.assigned_vehicle_id || !formData.trip_date ||
        !formData.start_time || !formData.end_time || !formData.passenger_count) {
      setFormError("All required fields must be filled.");
      return;
    }
    if (formData.start_time >= formData.end_time) {
      setFormError("Start time must be before end time.");
      return;
    }
    try {
      setSaving(true);
      setFormError("");
      
      const payload = {
        assigned_vehicle_ids: [Number(formData.assigned_vehicle_id)],
        trip_date: formData.trip_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        passenger_count: Number(formData.passenger_count),
        destination: formData.destination || null,
        purpose: formData.purpose || null,
      };

      if (editingBookingId) {
        await bookingAPI.updateDirectVehicle(editingBookingId, payload);
        setSuccess("Vehicle booking updated successfully!");
      } else {
        await bookingAPI.createDirectVehicle(payload);
        setSuccess("Vehicle booking created successfully!");
      }
      
      setIsModalOpen(false);
      setTimeout(() => setSuccess(""), 4000);
      loadData();
    } catch (err) {
      const detail = err.response?.data?.detail || "Failed to save booking";
      setFormError(detail);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (reqId) => {
    if (!window.confirm("Delete this vehicle booking? This cannot be undone.")) return;
    try {
      await bookingAPI.deleteDirectVehicle(reqId);
      setBookings((prev) => prev.filter((b) => b.req_id !== reqId));
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete booking");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Manage Vehicle Bookings</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Directly allocate vehicles. AI conflict check runs before saving.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => handleOpenModal()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus size={16} /> Add Booking
          </button>
        </div>
      </div>

      {/* Filters and Export Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
          >
            <option value="">All Vehicles</option>
            {vehicles.map(v => (
              <option key={v.vehicle_id} value={v.vehicle_id}>
                {v.registration_number} ({v.type})
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bookings, destinations..."
              className="w-full sm:w-64 rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <button onClick={exportToCSV}
            className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* AI notice */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <Sparkles size={16} className="mt-0.5 text-blue-600 shrink-0" />
        <p className="text-sm text-blue-800">
          <strong>AI Conflict Guard:</strong> When you add a vehicle booking, the system automatically checks for overlapping bookings for that vehicle. If a conflict is found, the booking will not be saved and you'll see a clear explanation.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
          <CheckCircle2 size={16} />{success}
        </div>
      )}

      {/* Bookings Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-700">Vehicle</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Destination</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Date & Time</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Passengers</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Organizer</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Source</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan="7" className="px-4 py-10 text-center text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw size={16} className="animate-spin" /> Loading bookings...
                </div>
              </td></tr>
            )}
            {!loading && filteredBookings.length === 0 && (
              <tr><td colSpan="7" className="px-4 py-10 text-center text-gray-400">
                No direct vehicle bookings found matching your criteria.
              </td></tr>
            )}
            {!loading && filteredBookings.map((b) => (
              <tr key={b.req_id} className="border-t border-gray-100 hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-gray-800">
                    <Car size={14} className="text-blue-500" />
                    <span className="font-semibold">{b.assigned_vehicle_reg || b.vehicle_type_needed || "Unknown"}</span>
                  </div>
                  {b.purpose && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{b.purpose}</p>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-gray-800">
                    <MapPin size={12} className="text-purple-500" />
                    <span className="font-medium">{b.destination || "Not specified"}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 font-medium text-gray-800">
                    <Calendar size={12} className="text-blue-500" />{b.trip_date}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                    <Clock size={11} />{b.start_time} – {b.end_time}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-gray-600">
                    <Users size={12} />
                    <span>{b.passenger_count}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {b.requester_name}
                </td>
                <td className="px-4 py-3">
                  {b.requester_role === "RESOURCE_MANAGER" || b.requester_role === "SUPER_ADMIN" ? (
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                      Direct Add
                    </span>
                  ) : (
                    <span className="rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700">
                      Via Request #{b.req_id}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenModal(b)}
                      className="rounded bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(b.req_id)}
                      className="rounded bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-5">
              <div>
                <h3 className="text-base font-bold text-gray-900">{editingBookingId ? "Edit Vehicle Booking" : "Add Direct Booking"}</h3>
                <p className="mt-0.5 text-xs text-gray-500 flex items-center gap-1">
                  <Sparkles size={11} className="text-blue-500" />
                  AI will check for schedule conflicts before saving
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              {formError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {formError}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Vehicle <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.assigned_vehicle_id}
                  onChange={(e) => setFormData({ ...formData, assigned_vehicle_id: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">Select vehicle</option>
                  {vehicles.filter(v => v.is_available).map((v) => (
                    <option key={v.vehicle_id} value={v.vehicle_id}>
                      {v.reg_number} - {v.type} (Cap: {v.capacity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Destination
                  </label>
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    placeholder="e.g. Main Campus"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Passenger Count <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number" min="1" required
                    value={formData.passenger_count}
                    onChange={(e) => setFormData({ ...formData, passenger_count: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Trip Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date" required
                  value={formData.trip_date}
                  onChange={(e) => setFormData({ ...formData, trip_date: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time" required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time" required
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Purpose</label>
                <textarea
                  rows={2}
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="Brief description of the trip..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 border-t border-gray-100 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                  {saving ? <><RefreshCw size={14} className="animate-spin" /> Checking conflicts...</> : <><Sparkles size={14} /> {editingBookingId ? "Save Changes" : "Add Booking"}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
