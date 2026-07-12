import { useState, useEffect } from "react";
import { Search, Download, Clock, RefreshCw, Shield, MapPin, CheckCircle } from "lucide-react";
import { auditAPI } from "../../../services/api";
import AdminLayout from "../layout/AdminLayout";

const ACTION_COLORS = {
  "USER_LOGIN": "bg-blue-100 text-blue-700",
  "USER_SIGNUP": "bg-green-100 text-green-700",
  "SUBMIT_EVENT_REQUEST": "bg-purple-100 text-purple-700",
  "APPROVE_EVENT_REQUEST": "bg-emerald-100 text-emerald-700",
  "REJECT_EVENT_REQUEST": "bg-red-100 text-red-700",
  "SUBMIT_VEHICLE_REQUEST": "bg-purple-100 text-purple-700",
  "APPROVE_VEHICLE_REQUEST": "bg-emerald-100 text-emerald-700",
  "REJECT_VEHICLE_REQUEST": "bg-red-100 text-red-700",
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await auditAPI.getAuditLogs(actionFilter ? { action: actionFilter } : {});
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  const filteredLogs = logs.filter(log => 
    log.user_email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.entity_type || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportCSV = () => {
    const headers = ["Timestamp,User Email,Role,Action,Entity Type,Entity ID,IP Address"];
    const rows = filteredLogs.map(log => 
      `"${log.timestamp}","${log.user_email}","${log.user_role}","${log.action}","${log.entity_type}","${log.entity_id}","${log.ip_address}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "audit_logs.csv");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor and trace all meaningful business actions across the system</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 shadow-sm font-medium transition-colors">
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search user, action, or entity..." 
              className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            className="border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
          >
            <option value="">All Actions</option>
            <option value="USER_LOGIN">User Login</option>
            <option value="SUBMIT_EVENT_REQUEST">Event Submission</option>
            <option value="APPROVE_EVENT_REQUEST">Event Approval</option>
            <option value="SUBMIT_VEHICLE_REQUEST">Vehicle Submission</option>
            <option value="APPROVE_VEHICLE_REQUEST">Vehicle Approval</option>
          </select>
          <button onClick={loadLogs} className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm">
                <th className="py-3 px-6 font-semibold text-gray-600">Timestamp</th>
                <th className="py-3 px-6 font-semibold text-gray-600">User</th>
                <th className="py-3 px-6 font-semibold text-gray-600">Action</th>
                <th className="py-3 px-6 font-semibold text-gray-600">Entity Affected</th>
                <th className="py-3 px-6 font-semibold text-gray-600">IP Address</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-500">
                    <RefreshCw className="animate-spin mx-auto mb-2 text-blue-500" size={24} />
                    Loading logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-500">
                    No logs found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.log_id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-2 text-gray-600 whitespace-nowrap">
                        <Clock size={14} className="text-gray-400" />
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3 px-6">
                      <div className="font-medium text-gray-900">{log.user_email}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Shield size={10} /> {log.user_role}
                      </div>
                    </td>
                    <td className="py-3 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      {log.entity_type ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">
                            {log.entity_type.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="text-xs text-gray-500 mt-0.5">Record ID: {log.entity_id}</span>
                        </div>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-3 px-6">
                      {log.ip_address ? (
                        <div className="flex items-center gap-1 text-gray-600 font-mono text-xs">
                          <MapPin size={12} className="text-gray-400" />
                          {log.ip_address}
                        </div>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}
