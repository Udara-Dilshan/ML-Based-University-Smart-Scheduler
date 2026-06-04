import { useEffect, useState, useMemo } from "react";
import {
  CheckCircle2, XCircle, AlertTriangle, Clock, ChevronDown,
  ChevronUp, RefreshCw, Calendar, Users, MapPin, Sparkles, Download, Search
} from "lucide-react";
import { bookingAPI, resourceAPI } from "../../services/api";

// ─── Status badge helpers ────────────────────────────────────────────────────
const AI_STATUS_CONFIG = {
  CLEAR: {
    label: "Clear",
    icon: <CheckCircle2 size={13} />,
    cls: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  CLASH: {
    label: "Clash Detected",
    icon: <XCircle size={13} />,
    cls: "bg-red-50 text-red-700 border border-red-200",
  },
  CAPACITY_MISMATCH: {
    label: "Capacity Mismatch",
    icon: <AlertTriangle size={13} />,
    cls: "bg-amber-50 text-amber-700 border border-amber-200",
  },
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

// ─── Action Modal ─────────────────────────────────────────────────────────────
function ActionModal({ request, onClose, onRefresh }) {
  const [mode, setMode] = useState(null); // "approve" | "reject" | "alt"
  const [selectedAlt, setSelectedAlt] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleApprove = async () => {
    try {
      setSaving(true);
      setError("");
      const payload = selectedAlt ? { allocated_resource_id: selectedAlt } : {};
      await bookingAPI.approveEventRequest(request.req_id, payload);
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
      await bookingAPI.rejectEventRequest(request.req_id, rejectReason);
      onRefresh();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to reject request");
    } finally {
      setSaving(false);
    }
  };

  const canDirectApprove = request.ai_status === "CLEAR";
  const hasAlternatives = (request.ai_alternatives || []).length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-5">
          <div>
            <h3 className="text-base font-bold text-gray-900">{request.event_name}</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              {request.requester_name} · {request.event_date} · {request.start_time}–{request.end_time}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <XCircle size={20} />
          </button>
        </div>

        {/* AI Status Banner */}
        <div className={`px-5 py-3 text-sm font-medium flex items-center gap-2 ${
          request.ai_status === "CLEAR"
            ? "bg-emerald-50 text-emerald-800"
            : request.ai_status === "CLASH"
            ? "bg-red-50 text-red-800"
            : "bg-amber-50 text-amber-800"
        }`}>
          <Sparkles size={14} />
          AI Check: <AiBadge aiStatus={request.ai_status} />
          {request.ai_clash_detail && (
            <span className="ml-1 text-xs font-normal opacity-80">— {request.ai_clash_detail}</span>
          )}
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3 p-5 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin size={14} className="text-blue-500" />
            <span><span className="font-medium text-gray-900">{request.resource_name}</span> (Cap: {request.resource_capacity})</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Users size={14} className="text-purple-500" />
            <span>{request.participant_count} participants</span>
          </div>
          {request.purpose && (
            <div className="col-span-2 text-gray-600">
              <span className="font-medium text-gray-900">Purpose: </span>{request.purpose}
            </div>
          )}
        </div>

        {error && (
          <div className="mx-5 mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Action area */}
        {!mode && (
          <div className="flex flex-wrap gap-3 border-t border-gray-100 p-5">
            {canDirectApprove && (
              <button
                onClick={() => { setMode("approve"); }}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <CheckCircle2 size={15} /> Direct Approve
              </button>
            )}
            {hasAlternatives && (
              <button
                onClick={() => setMode("alt")}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Sparkles size={15} /> Approve with Alt Venue
              </button>
            )}
            {request.ai_status === "CLASH" && !hasAlternatives && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                No alternative venues available. Please reject this request.
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

        {/* Direct Approve confirm */}
        {mode === "approve" && (
          <div className="border-t border-gray-100 p-5 space-y-3">
            <p className="text-sm text-gray-700">Confirm approval for <strong>{request.event_name}</strong> at <strong>{request.resource_name}</strong>?</p>
            <div className="flex gap-3">
              <button onClick={handleApprove} disabled={saving}
                className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                {saving ? "Approving..." : "Confirm Approve"}
              </button>
              <button onClick={() => setMode(null)} className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Back
              </button>
            </div>
          </div>
        )}

        {/* Alt Venue selection */}
        {mode === "alt" && (
          <div className="border-t border-gray-100 p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-800">AI Suggested Alternative Venues:</p>
            <div className="space-y-2">
              {(request.ai_alternatives || []).map((alt) => (
                <label key={alt.resource_id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition ${
                    selectedAlt === alt.resource_id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}>
                  <input type="radio" name="alt_venue" value={alt.resource_id}
                    checked={selectedAlt === alt.resource_id}
                    onChange={() => setSelectedAlt(alt.resource_id)}
                    className="accent-blue-600" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{alt.name}</p>
                    <p className="text-xs text-gray-500">{alt.type} · Cap: {alt.capacity} · {alt.location || "—"}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleApprove} disabled={!selectedAlt || saving}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {saving ? "Approving..." : "Approve with Selected Venue"}
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
                required
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Venue is under maintenance on this date"
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
export default function EventRequests({ isCardView = false }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await bookingAPI.getEventRequests(statusFilter || null);
      setRequests(data || []);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load event requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, [statusFilter]);

  const counts = useMemo(() => ({
    pending: requests.filter((r) => r.status === "PENDING").length,
    clashes: requests.filter((r) => r.ai_status === "CLASH").length,
    clear: requests.filter((r) => r.ai_status === "CLEAR").length,
  }), [requests]);

  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests;
    const lowerQ = searchQuery.toLowerCase();
    return requests.filter(req => 
      (req.requester_name || "").toLowerCase().includes(lowerQ) ||
      (req.event_name || "").toLowerCase().includes(lowerQ) ||
      (req.resource_name || "").toLowerCase().includes(lowerQ) ||
      (req.allocated_resource_name || "").toLowerCase().includes(lowerQ)
    );
  }, [requests, searchQuery]);

  const exportToCSV = () => {
    if (filteredRequests.length === 0) return;
    
    const headers = [
      "Request ID", "Requester Name", "Email", "Event Name", "Purpose",
      "Venue", "Date", "Start Time", "End Time", "Participants", 
      "Status", "AI Status"
    ];
    
    const csvRows = [];
    csvRows.push(headers.join(","));
    
    filteredRequests.forEach(req => {
      const row = [
        req.req_id,
        `"${(req.requester_name || "").replace(/"/g, '""')}"`,
        `"${(req.requester_email || "").replace(/"/g, '""')}"`,
        `"${(req.event_name || "").replace(/"/g, '""')}"`,
        `"${(req.purpose || "").replace(/"/g, '""')}"`,
        `"${(req.allocated_resource_name || req.resource_name || "").replace(/"/g, '""')}"`,
        req.event_date,
        req.start_time,
        req.end_time,
        req.participant_count,
        req.status,
        req.ai_status
      ];
      csvRows.push(row.join(","));
    });
    
    const csvString = csvRows.join("\\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `event_requests_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {!isCardView && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Event / Venue Requests</h2>
            <p className="mt-0.5 text-sm text-gray-500">Lecturer-submitted event and hall booking requests</p>
          </div>
          <button onClick={loadRequests}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      )}

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
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm">
            <span className="font-bold text-red-800">{counts.clashes}</span>
            <span className="ml-1.5 text-red-700">Clashes</span>
          </div>
        </div>
      )}

      {/* Status Filter Tabs & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {["PENDING", "APPROVED", "REJECTED", ""].map((s) => (
            <button key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                statusFilter === s
                  ? "bg-blue-600 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}>
              {s || "All"}
            </button>
          ))}
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events, names..."
              className="w-full sm:w-64 rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <button onClick={exportToCSV}
            className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            <Download size={14} /> Export CSV
          </button>
          {isCardView && (
            <button onClick={loadRequests}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
              <RefreshCw size={14} /> Refresh
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className={`overflow-x-auto ${isCardView ? "" : "rounded-xl border border-gray-200 bg-white shadow-sm"}`}>
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-700">Requester</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Event</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Venue & Time</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Participants</th>
              <th className="px-4 py-3 font-semibold text-gray-700">System Status (AI Check)</th>
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
            {!loading && filteredRequests.length === 0 && (
              <tr><td colSpan="7" className="px-4 py-10 text-center text-gray-400">
                No event requests found matching your criteria.
              </td></tr>
            )}
            {!loading && filteredRequests.map((req) => (
              <tr key={req.req_id} className="border-t border-gray-100 hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{req.requester_name}</p>
                  <p className="text-xs text-gray-500">{req.requester_email}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{req.event_name}</p>
                  {req.purpose && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{req.purpose}</p>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 font-medium text-gray-800">
                    <MapPin size={12} className="text-blue-500" />
                    {req.allocated_resource_name
                      ? <><span className="line-through text-gray-400 text-xs">{req.resource_name}</span> → <span className="text-blue-700">{req.allocated_resource_name}</span></>
                      : req.resource_name}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                    <Calendar size={11} />{req.event_date}
                    <Clock size={11} className="ml-1" />{req.start_time}–{req.end_time}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700">
                    <Users size={11} /> {req.participant_count}
                  </span>
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
                    <span className="text-xs text-gray-400">—</span>
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
        <ActionModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onRefresh={loadRequests}
        />
      )}
    </div>
  );
}
