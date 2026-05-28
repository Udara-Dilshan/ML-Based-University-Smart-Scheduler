import { useEffect, useState, useMemo } from "react";
import {
  CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Calendar, Users, MapPin, Bus, Truck, Car, Clock
} from "lucide-react";
import { bookingAPI, resourceAPI } from "../../services/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const AI_STATUS_CONFIG = {
  CLEAR: { label: "Clear", icon: <CheckCircle2 size={13} />, cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  CAPACITY_MISMATCH: { label: "Capacity Mismatch", icon: <AlertTriangle size={13} />, cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  NO_VEHICLE_AVAILABLE: { label: "No Vehicle Available", icon: <XCircle size={13} />, cls: "bg-red-50 text-red-700 border border-red-200" },
};

const REQUEST_STATUS_CONFIG = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
};

function AiBadge({ aiStatus }) {
  const config = AI_STATUS_CONFIG[aiStatus] || AI_STATUS_CONFIG.CLEAR;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${config.cls}`}>
      {config.icon} {config.label}
    </span>
  );
}

function VehicleTypeIcon({ type }) {
  const t = (type || "").toLowerCase();
  if (t === "bus") return <Bus size={14} className="text-blue-600" />;
  if (t === "van" || t === "minibus") return <Truck size={14} className="text-orange-500" />;
  return <Car size={14} className="text-gray-500" />;
}

// ─── Action Modal ─────────────────────────────────────────────────────────────
function VehicleActionModal({ request, onClose, onRefresh }) {
  const [mode, setMode] = useState(null); // "approve" | "reject"
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const availableVehicles = request.ai_available_vehicles || [];
  const capableVehicles = availableVehicles.filter((v) => v.capacity_ok);

  const handleApprove = async () => {
    if (!selectedVehicle) { setError("Please select a vehicle"); return; }
    try {
      setSaving(true);
      setError("");
      await bookingAPI.approveVehicleRequest(request.req_id, selectedVehicle);
      onRefresh();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to approve request");
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      await bookingAPI.rejectVehicleRequest(request.req_id, rejectReason);
      onRefresh();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to reject request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-5">
          <div>
            <h3 className="text-base font-bold text-gray-900">Vehicle Request</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              {request.requester_name} · {request.trip_date} · {request.start_time}–{request.end_time}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <XCircle size={20} />
          </button>
        </div>

        {/* AI Status */}
        <div className={`flex items-center gap-2 px-5 py-3 text-sm font-medium ${
          request.ai_status === "CLEAR"
            ? "bg-emerald-50 text-emerald-800"
            : request.ai_status === "CAPACITY_MISMATCH"
            ? "bg-amber-50 text-amber-800"
            : "bg-red-50 text-red-800"
        }`}>
          <AiBadge aiStatus={request.ai_status} />
          {request.ai_clash_detail && (
            <span className="ml-1 text-xs font-normal opacity-80">— {request.ai_clash_detail}</span>
          )}
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3 p-5 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <VehicleTypeIcon type={request.vehicle_type_needed} />
            <span>Needs: <strong>{request.vehicle_type_needed}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Users size={14} className="text-purple-500" />
            <span>{request.passenger_count} passengers</span>
          </div>
          {request.destination && (
            <div className="col-span-2 flex items-center gap-2 text-gray-600">
              <MapPin size={14} className="text-blue-500" />
              <span>Destination: <strong>{request.destination}</strong></span>
            </div>
          )}
          {request.purpose && (
            <div className="col-span-2 text-gray-600">
              <span className="font-medium text-gray-900">Purpose: </span>{request.purpose}
            </div>
          )}
        </div>

        {error && (
          <div className="mx-5 mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
        )}

        {/* Action Buttons */}
        {!mode && (
          <div className="flex gap-3 border-t border-gray-100 p-5">
            {request.ai_status !== "NO_VEHICLE_AVAILABLE" ? (
              <button
                onClick={() => setMode("approve")}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <CheckCircle2 size={15} /> Assign & Approve
              </button>
            ) : (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                No vehicles available. Please reject this request.
              </p>
            )}
            <button
              onClick={() => setMode("reject")}
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              <XCircle size={15} /> Reject
            </button>
          </div>
        )}

        {/* Vehicle assignment */}
        {mode === "approve" && (
          <div className="border-t border-gray-100 p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-800">
              Select a vehicle ({request.passenger_count} seats needed):
            </p>
            {availableVehicles.length === 0 && (
              <p className="text-xs text-gray-500">No available vehicles found at this time.</p>
            )}
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {availableVehicles.map((v) => (
                <label key={v.vehicle_id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition ${
                    selectedVehicle === v.vehicle_id
                      ? "border-emerald-500 bg-emerald-50"
                      : v.capacity_ok
                      ? "border-gray-200 hover:border-emerald-300"
                      : "border-gray-100 bg-gray-50 opacity-70"
                  }`}>
                  <input type="radio" name="vehicle" value={v.vehicle_id}
                    checked={selectedVehicle === v.vehicle_id}
                    onChange={() => setSelectedVehicle(v.vehicle_id)}
                    className="accent-emerald-600"
                    disabled={!v.capacity_ok} />
                  <VehicleTypeIcon type={v.type} />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{v.reg_number}</p>
                    <p className="text-xs text-gray-500">{v.type} · {v.capacity} seats{v.driver_name ? ` · ${v.driver_name}` : ""}</p>
                  </div>
                  {!v.capacity_ok && (
                    <span className="text-xs text-red-500 font-medium">Too small</span>
                  )}
                  {v.capacity_ok && (
                    <span className="text-xs text-emerald-600 font-medium">✓ Fits</span>
                  )}
                </label>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleApprove} disabled={!selectedVehicle || saving}
                className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                {saving ? "Approving..." : "Confirm Assignment"}
              </button>
              <button onClick={() => setMode(null)} className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Back
              </button>
            </div>
          </div>
        )}

        {/* Reject form */}
        {mode === "reject" && (
          <form onSubmit={handleReject} className="border-t border-gray-100 p-5 space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <textarea
                required rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. No bus available on this date"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                {saving ? "Rejecting..." : "Confirm Rejection"}
              </button>
              <button type="button" onClick={() => setMode(null)}
                className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VehicleRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [selectedRequest, setSelectedRequest] = useState(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await bookingAPI.getVehicleRequests(statusFilter || null);
      setRequests(data || []);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load vehicle requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, [statusFilter]);

  const counts = useMemo(() => ({
    pending: requests.filter((r) => r.status === "PENDING").length,
    clear: requests.filter((r) => r.ai_status === "CLEAR").length,
    issues: requests.filter((r) => r.ai_status !== "CLEAR" && r.status === "PENDING").length,
  }), [requests]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Vehicle Requests</h2>
          <p className="mt-0.5 text-sm text-gray-500">Lecturer-submitted transport requests</p>
        </div>
        <button onClick={loadRequests}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Summary Pills */}
      {statusFilter === "PENDING" && (
        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm">
            <span className="font-bold text-yellow-800">{counts.pending}</span>
            <span className="ml-1.5 text-yellow-700">Pending</span>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm">
            <span className="font-bold text-emerald-800">{counts.clear}</span>
            <span className="ml-1.5 text-emerald-700">Clear</span>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm">
            <span className="font-bold text-amber-800">{counts.issues}</span>
            <span className="ml-1.5 text-amber-700">Issues</span>
          </div>
        </div>
      )}

      {/* Status Filter */}
      <div className="flex gap-2">
        {["PENDING", "APPROVED", "REJECTED", ""].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              statusFilter === s
                ? "bg-blue-600 text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}>
            {s || "All"}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-700">Requester</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Purpose / Destination</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Date & Time</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Vehicle Needed</th>
              <th className="px-4 py-3 font-semibold text-gray-700">System Status (AI)</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan="7" className="px-4 py-10 text-center text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw size={16} className="animate-spin" /> Loading requests...
                </div>
              </td></tr>
            )}
            {!loading && requests.length === 0 && (
              <tr><td colSpan="7" className="px-4 py-10 text-center text-gray-400">No vehicle requests found.</td></tr>
            )}
            {!loading && requests.map((req) => (
              <tr key={req.req_id} className="border-t border-gray-100 hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{req.requester_name}</p>
                  <p className="text-xs text-gray-500">{req.requester_email}</p>
                </td>
                <td className="px-4 py-3">
                  {req.destination && <p className="font-medium text-gray-900">{req.destination}</p>}
                  {req.purpose && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{req.purpose}</p>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 font-medium text-gray-800">
                    <Calendar size={12} className="text-blue-500" />{req.trip_date}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                    <Clock size={11} />{req.start_time}–{req.end_time}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <VehicleTypeIcon type={req.vehicle_type_needed} />
                    <span className="font-medium text-gray-800">{req.vehicle_type_needed}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                    <Users size={11} /> {req.passenger_count} seats
                  </div>
                </td>
                <td className="px-4 py-3">
                  {req.status === "PENDING" ? (
                    <div className="space-y-1">
                      <AiBadge aiStatus={req.ai_status} />
                      {req.ai_clash_detail && (
                        <p className="text-xs text-gray-500 leading-tight">{req.ai_clash_detail}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">
                      {req.assigned_vehicle_reg
                        ? <span className="font-medium text-gray-700">Assigned: {req.assigned_vehicle_reg}</span>
                        : "—"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${REQUEST_STATUS_CONFIG[req.status] || ""}`}>
                    {req.status}
                  </span>
                  {req.rejection_reason && (
                    <p className="mt-1 text-xs text-gray-400 line-clamp-2">{req.rejection_reason}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {req.status === "PENDING" && (
                    <button
                      onClick={() => setSelectedRequest(req)}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      Review
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRequest && (
        <VehicleActionModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onRefresh={loadRequests}
        />
      )}
    </div>
  );
}
