import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar, Car, Plus, RefreshCw, CheckCircle2, XCircle,
  Clock, AlertTriangle, MapPin, Users, Bus
} from "lucide-react";
import { bookingAPI } from "../../services/api";

const STATUS_CONFIG = {
  PENDING: { label: "Pending", cls: "bg-yellow-100 text-yellow-800", icon: <Clock size={12} /> },
  APPROVED: { label: "Approved", cls: "bg-emerald-100 text-emerald-800", icon: <CheckCircle2 size={12} /> },
  REJECTED: { label: "Rejected", cls: "bg-red-100 text-red-800", icon: <XCircle size={12} /> },
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${config.cls}`}>
      {config.icon} {config.label}
    </span>
  );
}

export default function LecturerMyRequests() {
  const [tab, setTab] = useState("events");
  const [eventRequests, setEventRequests] = useState([]);
  const [vehicleRequests, setVehicleRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");
      const [evData, vehData] = await Promise.all([
        bookingAPI.getMyEventRequests(),
        bookingAPI.getMyVehicleRequests(),
      ]);
      setEventRequests(evData || []);
      setVehicleRequests(vehData || []);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load your requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Resource Requests</h2>
          <p className="mt-0.5 text-sm text-gray-500">Track the status of your submitted requests</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadRequests}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
          <Link to="/lecturer/request-event"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus size={15} /><Calendar size={13} /> Request Venue
          </Link>
          <Link to="/lecturer/request-vehicle"
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            <Plus size={15} /><Bus size={13} /> Request Vehicle
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={14} />{error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: "events", label: "Venue Requests", icon: <Calendar size={14} />, count: eventRequests.length },
          { key: "vehicles", label: "Vehicle Requests", icon: <Car size={14} />, count: vehicleRequests.length },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
              tab === t.key
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}>
            {t.icon} {t.label}
            <span className={`rounded-full px-2 py-0.5 text-xs ${tab === t.key ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10 text-gray-500">
          <RefreshCw size={16} className="animate-spin mr-2" /> Loading requests...
        </div>
      )}

      {/* Event Requests Tab */}
      {!loading && tab === "events" && (
        <div>
          {eventRequests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
              <Calendar size={36} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">No venue requests yet</p>
              <Link to="/lecturer/request-event"
                className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Submit First Request
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {eventRequests.map((req) => (
                <div key={req.req_id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{req.event_name}</p>
                        <StatusBadge status={req.status} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-blue-500" />
                          {req.allocated_resource_name ? (
                            <><span className="line-through opacity-60">{req.resource_name}</span> → <span className="text-blue-700 font-medium">{req.allocated_resource_name}</span></>
                          ) : req.resource_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />{req.event_date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} />{req.start_time} – {req.end_time}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={11} />{req.participant_count} people
                        </span>
                      </div>
                      {req.status === "REJECTED" && req.rejection_reason && (
                        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                          <XCircle size={12} className="mt-0.5 shrink-0" />
                          <span><strong>Reason:</strong> {req.rejection_reason}</span>
                        </div>
                      )}
                      {req.status === "APPROVED" && req.allocated_resource_name && req.allocated_resource_name !== req.resource_name && (
                        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                          <CheckCircle2 size={12} className="mt-0.5 shrink-0" />
                          <span>Approved with an alternative venue: <strong>{req.allocated_resource_name}</strong></span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 whitespace-nowrap">#{req.req_id}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Vehicle Requests Tab */}
      {!loading && tab === "vehicles" && (
        <div>
          {vehicleRequests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
              <Car size={36} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">No vehicle requests yet</p>
              <Link to="/lecturer/request-vehicle"
                className="mt-3 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                Submit First Request
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {vehicleRequests.map((req) => (
                <div key={req.req_id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">
                          {req.vehicle_type_needed} Request — {req.destination || "No destination specified"}
                        </p>
                        <StatusBadge status={req.status} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />{req.trip_date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} />{req.start_time} – {req.end_time}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={11} />{req.passenger_count} passengers
                        </span>
                      </div>
                      {req.status === "APPROVED" && req.assigned_vehicle_reg && (
                        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                          <CheckCircle2 size={12} />
                          <span>Vehicle Assigned: <strong>{req.assigned_vehicle_reg}</strong></span>
                        </div>
                      )}
                      {req.status === "REJECTED" && req.rejection_reason && (
                        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                          <XCircle size={12} className="mt-0.5 shrink-0" />
                          <span><strong>Reason:</strong> {req.rejection_reason}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 whitespace-nowrap">#{req.req_id}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
