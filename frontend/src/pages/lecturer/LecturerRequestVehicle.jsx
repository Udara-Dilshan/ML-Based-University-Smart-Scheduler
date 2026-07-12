import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Clock, Users, MapPin, FileText, CheckCircle2, AlertTriangle, ArrowLeft, Bus, Truck, Car } from "lucide-react";
import { bookingAPI } from "../../services/api";
import Modal from "../../components/Modal";

const VEHICLE_TYPES = ["Bus", "Van", "Car", "Minibus", "Truck", "Other"];

export default function LecturerRequestVehicle() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    vehicle_type_needed: "Bus",
    passenger_count: "",
    trip_date: "",
    start_time: "",
    end_time: "",
    destination: "",
    purpose: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [documentFile, setDocumentFile] = useState(null);

  // Conflict Check States
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [conflictData, setConflictData] = useState(null);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.passenger_count || !formData.trip_date || !formData.start_time || !formData.end_time) {
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
        vehicle_type_needed: formData.vehicle_type_needed,
        passenger_count: Number(formData.passenger_count),
        trip_date: formData.trip_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        destination: formData.destination || null,
        purpose: formData.purpose || null,
        document: documentFile,
      };

      // 1. Pre-check for conflicts
      const conflictCheck = await bookingAPI.checkVehicleConflict(payload);

      if (conflictCheck.ai_status !== "CLEAR") {
        setConflictData(conflictCheck);
        setIsConflictModalOpen(true);
        setSaving(false);
        return;
      }

      // 2. No conflict -> Submit directly
      await executeSubmit();

    } catch (err) {
      setError(err.response?.data?.detail || "Failed to check request. Please try again.");
      setSaving(false);
    }
  };

  const executeSubmit = async () => {
    try {
      setSaving(true);
      await bookingAPI.submitVehicleRequest({
        vehicle_type_needed: formData.vehicle_type_needed,
        passenger_count: Number(formData.passenger_count),
        trip_date: formData.trip_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        destination: formData.destination || null,
        purpose: formData.purpose || null,
        document: documentFile,
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
            Your vehicle request has been sent to the Resource Manager for review.
            A specific vehicle will be assigned and you'll see the status update in <strong>My Requests</strong>.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <button
              onClick={() => navigate("/lecturer/my-requests")}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              View My Requests
            </button>
            <button
              onClick={() => { setSuccess(false); setFormData({ vehicle_type_needed: "Bus", passenger_count: "", trip_date: "", start_time: "", end_time: "", destination: "", purpose: "" }); setDocumentFile(null); }}
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
        <h2 className="text-xl font-bold text-gray-900">Request a Vehicle</h2>
        <p className="mt-1 text-sm text-gray-500">
          Request a Bus or Van for a Field Trip, Research Visit, or other official purpose.
          The Resource Manager will assign a suitable vehicle.
        </p>
      </div>

      {/* Info notice */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <AlertTriangle size={15} className="text-blue-600 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-800">
          You only need to specify the <strong>type</strong> (Bus/Van) and <strong>passenger count</strong>.
          The Resource Manager will assign the best available vehicle for your trip.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">

        {/* Vehicle Type - visual selector */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Vehicle Type Required <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {VEHICLE_TYPES.map((type) => (
              <label key={type}
                className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 p-3 transition ${
                  formData.vehicle_type_needed === type
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}>
                <input
                  type="radio" name="vehicle_type_needed" value={type}
                  checked={formData.vehicle_type_needed === type}
                  onChange={handleChange}
                  className="sr-only"
                />
                {type === "Bus" ? <Bus size={24} className="text-blue-600" /> : type === "Car" ? <Car size={24} className="text-gray-500" /> : <Truck size={24} className="text-orange-500" />}
                <span className="text-xs font-semibold text-gray-800">{type}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Passenger Count */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            <span className="flex items-center gap-1.5"><Users size={14} className="text-purple-500" />Number of Passengers <span className="text-red-500">*</span></span>
          </label>
          <input
            type="number" name="passenger_count" required min="1"
            value={formData.passenger_count}
            onChange={handleChange}
            placeholder="e.g. 35"
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Destination */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            <span className="flex items-center gap-1.5"><MapPin size={14} className="text-blue-500" />Destination</span>
          </label>
          <input
            type="text" name="destination"
            value={formData.destination}
            onChange={handleChange}
            placeholder="e.g. Pinnawala Elephant Orphanage"
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Trip Date */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            <span className="flex items-center gap-1.5"><CalendarDays size={14} className="text-blue-500" />Trip Date <span className="text-red-500">*</span></span>
          </label>
          <input
            type="date" name="trip_date" required
            value={formData.trip_date}
            onChange={handleChange}
            min={new Date().toISOString().split("T")[0]}
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              <span className="flex items-center gap-1.5"><Clock size={14} className="text-blue-500" />Departure Time <span className="text-red-500">*</span></span>
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
              <span className="flex items-center gap-1.5"><Clock size={14} className="text-blue-500" />Return Time <span className="text-red-500">*</span></span>
            </label>
            <input
              type="time" name="end_time" required
              value={formData.end_time}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Supporting Document */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            <span className="flex items-center gap-1.5"><FileText size={14} className="text-orange-500" />Supporting Document (Optional)</span>
          </label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setDocumentFile(e.target.files[0])}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
          />
        </div>

        {/* Purpose */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            <span className="flex items-center gap-1.5"><FileText size={14} className="text-gray-500" />Purpose / Notes</span>
          </label>
          <textarea
            name="purpose" rows={3}
            value={formData.purpose}
            onChange={handleChange}
            placeholder="Briefly describe the purpose of the trip..."
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
      <Modal open={isConflictModalOpen} title="AI Warning: Vehicle Availability" onClose={() => setIsConflictModalOpen(false)}>
        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 shrink-0 text-red-600" size={18} />
              <div>
                <h4 className="font-semibold text-red-900">
                  {conflictData?.ai_status === "CAPACITY_MISMATCH" ? "Capacity Mismatch" : "No Vehicles Available"}
                </h4>
                <p className="mt-1 text-sm text-red-800">{conflictData?.clash_detail}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
            <button
              onClick={() => setIsConflictModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel Request
            </button>
            <button
              onClick={executeSubmit}
              disabled={saving}
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {saving ? "Submitting..." : "Submit Anyway"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
