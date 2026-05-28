import { useEffect, useState } from "react";
import {
  Plus, Trash2, Calendar, Clock, MapPin, Tag,
  AlertTriangle, CheckCircle2, RefreshCw, X, Sparkles, Edit
} from "lucide-react";
import { bookingAPI, resourceAPI } from "../../services/api";

const EVENT_TYPES = ["General", "Academic", "Sports", "Cultural", "Technical", "Official"];

const initialForm = {
  resource_id: "",
  event_name: "",
  event_date: "",
  start_time: "",
  end_time: "",
  description: "",
  event_type: "General",
};

export default function ManageEvents() {
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [editingEventId, setEditingEventId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [eventsData, resourcesData] = await Promise.all([
        bookingAPI.getDirectEvents(),
        resourceAPI.getResources(),
      ]);
      setEvents(eventsData || []);
      setResources(resourcesData || []);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenModal = (event = null) => {
    if (event) {
      setFormData({
        resource_id: event.resource_id || "",
        event_name: event.event_name || "",
        event_date: event.event_date || "",
        start_time: event.start_time || "",
        end_time: event.end_time || "",
        description: event.description || "",
        event_type: event.event_type || "General",
      });
      setEditingEventId(event.event_id);
    } else {
      setFormData(initialForm);
      setEditingEventId(null);
    }
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.resource_id || !formData.event_name || !formData.event_date ||
        !formData.start_time || !formData.end_time) {
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
        resource_id: Number(formData.resource_id),
        event_name: formData.event_name,
        event_date: formData.event_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        description: formData.description || null,
        event_type: formData.event_type,
      };

      if (editingEventId) {
        await bookingAPI.updateDirectEvent(editingEventId, payload);
        setSuccess("Event updated successfully!");
      } else {
        await bookingAPI.createDirectEvent(payload);
        setSuccess("Event created successfully!");
      }
      
      setIsModalOpen(false);
      setTimeout(() => setSuccess(""), 4000);
      loadData();
    } catch (err) {
      const detail = err.response?.data?.detail || "Failed to save event";
      setFormError(detail);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm("Delete this event? This cannot be undone.")) return;
    try {
      await bookingAPI.deleteDirectEvent(eventId);
      setEvents((prev) => prev.filter((e) => e.event_id !== eventId));
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete event");
    }
  };

  const EVENT_TYPE_COLORS = {
    Academic: "bg-blue-100 text-blue-800",
    Sports: "bg-green-100 text-green-800",
    Cultural: "bg-purple-100 text-purple-800",
    Technical: "bg-orange-100 text-orange-800",
    Official: "bg-gray-100 text-gray-800",
    General: "bg-slate-100 text-slate-800",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Manage Events</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Directly schedule university-wide events. AI conflict check runs before saving.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => handleOpenModal()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus size={16} /> Add Event
          </button>
        </div>
      </div>

      {/* AI notice */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <Sparkles size={16} className="mt-0.5 text-blue-600 shrink-0" />
        <p className="text-sm text-blue-800">
          <strong>AI Conflict Guard:</strong> When you add an event, the system automatically checks for timetable clashes
          and existing bookings. If a conflict is found, the event will not be saved and you'll see a clear explanation.
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

      {/* Events Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-700">Event Name</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Type</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Venue</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Date & Time</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Organizer</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Source</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan="7" className="px-4 py-10 text-center text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw size={16} className="animate-spin" /> Loading events...
                </div>
              </td></tr>
            )}
            {!loading && events.length === 0 && (
              <tr><td colSpan="7" className="px-4 py-10 text-center text-gray-400">
                No events yet. Add the first one!
              </td></tr>
            )}
            {!loading && events.map((ev) => (
              <tr key={ev.event_id} className="border-t border-gray-100 hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900">{ev.event_name}</p>
                  {ev.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{ev.description}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${EVENT_TYPE_COLORS[ev.event_type] || EVENT_TYPE_COLORS.General}`}>
                    {ev.event_type || "General"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-gray-800">
                    <MapPin size={12} className="text-blue-500" />
                    <span className="font-medium">{ev.venue_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 font-medium text-gray-800">
                    <Calendar size={12} className="text-blue-500" />{ev.event_date}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                    <Clock size={11} />{ev.start_time} – {ev.end_time}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">{ev.organizer_name}</td>
                <td className="px-4 py-3">
                  {ev.source_request_id ? (
                    <span className="rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700">
                      Via Request #{ev.source_request_id}
                    </span>
                  ) : (
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                      Direct Add
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenModal(ev)}
                      className="rounded bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(ev.event_id)}
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

      {/* Add Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-5">
              <div>
                <h3 className="text-base font-bold text-gray-900">{editingEventId ? "Edit Event" : "Add New Event"}</h3>
                <p className="mt-0.5 text-xs text-gray-500 flex items-center gap-1">
                  <Sparkles size={11} className="text-blue-500" />
                  AI will check for conflicts before saving
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
                  Event Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" required
                  value={formData.event_name}
                  onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                  placeholder="e.g. Annual Sports Meet 2025"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Event Type</label>
                  <select
                    value={formData.event_type}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Venue <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.resource_id}
                    onChange={(e) => setFormData({ ...formData, resource_id: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">Select venue</option>
                    {resources.map((r) => (
                      <option key={r.resource_id} value={r.resource_id}>
                        {r.name} ({r.type}, Cap: {r.capacity})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Event Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date" required
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
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
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the event..."
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
                  {saving ? <><RefreshCw size={14} className="animate-spin" /> Checking conflicts...</> : <><Sparkles size={14} /> {editingEventId ? "Save Changes" : "Add Event"}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
