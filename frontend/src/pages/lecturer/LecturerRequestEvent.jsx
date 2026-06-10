import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Clock, Users, MapPin, FileText, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import { bookingAPI, resourceAPI } from "../../services/api";
import Modal from "../../components/Modal";

export default function LecturerRequestEvent() {
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [formData, setFormData] = useState({
    resource_id: "",
    event_name: "",
    event_date: "",
    start_time: "",
    end_time: "",
    participant_count: "",
    purpose: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  // Conflict Check States
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [selectedAlternativeId, setSelectedAlternativeId] = useState("");

  useEffect(() => {
    resourceAPI.getResources()
      .then((data) => setResources(data || []))
      .catch(() => setResources([]))
      .finally(() => setLoadingResources(false));
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.resource_id || !formData.event_name || !formData.event_date ||
        !formData.start_time || !formData.end_time || !formData.participant_count) {
      setError("Please fill in all required fields.");
      return;
    }
    if (formData.start_time >= formData.end_time) {
      setError("Start time must be before end time.");
      return;
    }

    try {
      setSaving(true);
      
      const payload = {
        resource_id: Number(formData.resource_id),
        event_name: formData.event_name,
        event_date: formData.event_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        participant_count: Number(formData.participant_count),
        purpose: formData.purpose || null,
      };

      // 1. Pre-check for conflicts
      const conflictCheck = await bookingAPI.checkEventConflict(payload);

      if (conflictCheck.ai_status !== "CLEAR") {
        setConflictData(conflictCheck);
        setSelectedAlternativeId(""); 
        setIsConflictModalOpen(true);
        setSaving(false);
        return;
      }

      // 2. No conflict -> Submit directly
      await executeSubmit(payload.resource_id);

    } catch (err) {
      setError(err.response?.data?.detail || "Failed to check request. Please try again.");
      setSaving(false);
    }
  };

  const executeSubmit = async (resourceIdToSubmit) => {
    try {
      setSaving(true);
      await bookingAPI.submitEventRequest({
        resource_id: Number(resourceIdToSubmit),
        event_name: formData.event_name,
        event_date: formData.event_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        participant_count: Number(formData.participant_count),
        purpose: formData.purpose || null,
      });
      setSuccess(true);
      setIsConflictModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to submit request. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-md space-y-6 pt-8">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-emerald-900">Request Submitted!</h3>
          <p className="mt-2 text-sm text-emerald-700">
            Your venue request has been sent to the Resource Manager for review.
            You can track its status in <strong>My Requests</strong>.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <button
              onClick={() => navigate("/lecturer/my-requests")}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              View My Requests
            </button>
            <button
              onClick={() => { setSuccess(false); setFormData({ resource_id: "", event_name: "", event_date: "", start_time: "", end_time: "", participant_count: "", purpose: "" }); }}
              className="rounded-lg border border-emerald-300 px-5 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
            >
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto space-y-6 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
      >  <ArrowLeft size={15} /> Back
      </button>

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Request a Venue / Hall</h2>
        <p className="mt-1 text-sm text-gray-500">
          Submit a venue booking request for a Guest Lecture, Workshop, or other event.
          The Resource Manager will review and confirm availability.
        </p>
      </div>

      {/* Info notice */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <AlertTriangle size={15} className="text-blue-600 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-800">
          The system will automatically check for timetable conflicts after you submit.
          You do not need to worry about clashes — the Resource Manager's AI assistant will flag them.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        {/* Event Name */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            Event / Lecture Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text" name="event_name" required
            value={formData.event_name}
            onChange={handleChange}
            placeholder="e.g. Guest Lecture: AI in Healthcare"
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Venue */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            <span className="flex items-center gap-1.5"><MapPin size={14} className="text-blue-500" />Preferred Venue <span className="text-red-500">*</span></span>
          </label>
          <select
            name="resource_id" required
            value={formData.resource_id}
            onChange={handleChange}
            disabled={loadingResources}
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">{loadingResources ? "Loading venues..." : "Select a venue"}</option>
            {resources.map((r) => (
              <option key={r.resource_id} value={r.resource_id}>
                {r.name} — {r.type} (Capacity: {r.capacity})
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            <span className="flex items-center gap-1.5"><CalendarDays size={14} className="text-blue-500" />Event Date <span className="text-red-500">*</span></span>
          </label>
          <input
            type="date" name="event_date" required
            value={formData.event_date}
            onChange={handleChange}
            min={new Date().toISOString().split("T")[0]}
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              <span className="flex items-center gap-1.5"><Clock size={14} className="text-blue-500" />Start Time <span className="text-red-500">*</span></span>
            </label>
            <input
              type="time" name="start_time" required
              value={formData.start_time}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              <span className="flex items-center gap-1.5"><Clock size={14} className="text-blue-500" />End Time <span className="text-red-500">*</span></span>
            </label>
            <input
              type="time" name="end_time" required
              value={formData.end_time}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Participant Count */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            <span className="flex items-center gap-1.5"><Users size={14} className="text-purple-500" />Expected Participants <span className="text-red-500">*</span></span>
          </label>
          <input
            type="number" name="participant_count" required min="1"
            value={formData.participant_count}
            onChange={handleChange}
            placeholder="e.g. 80"
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Purpose */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            <span className="flex items-center gap-1.5"><FileText size={14} className="text-gray-500" />Purpose / Description</span>
          </label>
          <textarea
            name="purpose" rows={3}
            value={formData.purpose}
            onChange={handleChange}
            placeholder="Briefly describe the nature of the event..."
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)}
            className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </form>

      {/* AI Conflict Modal */}
      <Modal open={isConflictModalOpen} title="AI Conflict Detected" onClose={() => setIsConflictModalOpen(false)}>
        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 shrink-0 text-red-600" size={18} />
              <div>
                <h4 className="font-semibold text-red-900">
                  {conflictData?.ai_status === "CAPACITY_MISMATCH" ? "Capacity Mismatch" : "Schedule Clash"}
                </h4>
                <p className="mt-1 text-sm text-red-800">{conflictData?.clash_detail}</p>
              </div>
            </div>
          </div>

          {(conflictData?.alternatives?.length > 0) && (
            <div>
              <p className="mb-2 text-sm font-semibold text-gray-800">AI Suggested Alternative Venues:</p>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                {conflictData.alternatives.map((alt) => (
                  <label key={alt.resource_id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${selectedAlternativeId === alt.resource_id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="alternative_venue"
                      value={alt.resource_id}
                      checked={selectedAlternativeId === alt.resource_id}
                      onChange={() => setSelectedAlternativeId(alt.resource_id)}
                      className="mt-1 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{alt.name} ({alt.type})</p>
                      <p className="text-xs text-gray-500">Capacity: {alt.capacity}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
            <button
              onClick={() => setIsConflictModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => executeSubmit(formData.resource_id)}
              disabled={saving}
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {saving ? "Submitting..." : "Submit Anyway"}
            </button>
            {conflictData?.alternatives?.length > 0 && (
              <button
                disabled={!selectedAlternativeId || saving}
                onClick={() => {
                  if (selectedAlternativeId) executeSubmit(selectedAlternativeId);
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Submitting..." : "Accept Alternative & Submit"}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
