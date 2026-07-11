import { useState, useEffect } from "react";
import AdminLayout from "../layout/AdminLayout";
import { lecturerAPI, academicAPI, getUser } from "../../../services/api";
import { CheckCircle, XCircle, Clock } from "lucide-react";

export default function AvailabilityRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [facultyFilter, setFacultyFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const user = getUser();
  const isScheduler = user?.role === "SCHEDULER";

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      const data = await lecturerAPI.getAllAvailabilityRequests(params);
      setRequests(data);
    } catch (err) {
      setError(err?.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [facs, depts] = await Promise.all([
          academicAPI.getFaculties(),
          academicAPI.getDepartments()
        ]);
        setFaculties(facs || []);
        setDepartments(depts || []);
      } catch (err) {
        console.error("Failed to fetch filter data", err);
      }
    };
    fetchFilters();
  }, []);

  const filteredRequests = requests.filter(req => {
    if (facultyFilter !== "all" && String(req.faculty_id) !== String(facultyFilter)) return false;
    if (departmentFilter !== "all" && String(req.department_id) !== String(departmentFilter)) return false;
    return true;
  });

  const handleStatusUpdate = async (availId, newStatus) => {
    try {
      await lecturerAPI.updateAvailabilityRequestStatus(availId, newStatus);
      loadRequests();
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800"><CheckCircle size={12} /> Approved</span>;
      case "rejected":
        return <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800"><XCircle size={12} /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800"><Clock size={12} /> Pending</span>;
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-r from-teal-50 via-white to-cyan-50 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Lecturer Availability Requests</h1>
        <p className="mt-2 text-sm text-slate-500">
          Review and approve unavailable time slots requested by lecturers. Only approved slots will be considered by the scheduling engine.
        </p>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-2 text-sm font-medium rounded-lg border ${statusFilter === "all" ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-4 py-2 text-sm font-medium rounded-lg border ${statusFilter === "pending" ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter("approved")}
            className={`px-4 py-2 text-sm font-medium rounded-lg border ${statusFilter === "approved" ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
          >
            Approved
          </button>
          <button
            onClick={() => setStatusFilter("rejected")}
            className={`px-4 py-2 text-sm font-medium rounded-lg border ${statusFilter === "rejected" ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
          >
            Rejected
          </button>
        </div>
        
        <div className="flex gap-3">
          {!isScheduler && (
            <select
              value={facultyFilter}
              onChange={(e) => {
                setFacultyFilter(e.target.value);
                setDepartmentFilter("all");
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              <option value="all">All Faculties</option>
              {faculties.map((f) => (
                <option key={f.faculty_id} value={f.faculty_id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          >
            <option value="all">All Departments</option>
            {departments
              .filter((d) => facultyFilter === "all" || String(d.faculty_id) === String(facultyFilter))
              .map((d) => (
                <option key={d.dept_id} value={d.dept_id}>
                  {d.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-medium">Lecturer</th>
                <th className="px-6 py-4 font-medium">Day</th>
                <th className="px-6 py-4 font-medium">Time Slot</th>
                <th className="px-6 py-4 font-medium">Reason</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No requests found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.avail_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {req.lecturer_name}
                      {req.department_code && (
                        <span className="text-gray-500 font-normal ml-1">
                          ({req.department_code})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{req.day_of_week}</td>
                    <td className="px-6 py-4 text-gray-600">{req.start_time} - {req.end_time}</td>
                    <td className="px-6 py-4 text-gray-600">{req.reason}</td>
                    <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                    <td className="px-6 py-4 text-right">
                      {req.status === "pending" && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleStatusUpdate(req.avail_id, "approved")}
                            className="rounded bg-teal-50 text-teal-700 px-3 py-1.5 text-xs font-semibold hover:bg-teal-100 border border-teal-200 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(req.avail_id, "rejected")}
                            className="rounded bg-gray-50 text-gray-700 px-3 py-1.5 text-xs font-semibold hover:bg-gray-100 border border-gray-200 transition"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {req.status !== "pending" && (
                        <button
                          onClick={() => handleStatusUpdate(req.avail_id, "pending")}
                          className="rounded text-gray-400 hover:text-gray-600 text-xs font-medium underline"
                        >
                          Mark Pending
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
