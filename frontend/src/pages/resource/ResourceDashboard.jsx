import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Car, CheckCircle, Calendar, FileText, AlertTriangle } from "lucide-react";
import { resourceAPI, bookingAPI } from "../../services/api";

export default function ResourceDashboard() {
  const [resources, setResources] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [summary, setSummary] = useState({ pending_event_requests: 0, pending_vehicle_requests: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError("");
        const [resourceData, vehicleData, summaryData] = await Promise.all([
          resourceAPI.getResources(),
          resourceAPI.getVehicles(),
          bookingAPI.getBookingSummary().catch(() => ({ pending_event_requests: 0, pending_vehicle_requests: 0 })),
        ]);

        if (!isMounted) return;

        setResources(Array.isArray(resourceData) ? resourceData : []);
        setVehicles(Array.isArray(vehicleData) ? vehicleData : []);
        setSummary(summaryData || { pending_event_requests: 0, pending_vehicle_requests: 0 });
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.detail || "Failed to load dashboard data");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDashboardData();
    return () => { isMounted = false; };
  }, []);

  const stats = useMemo(() => {
    const availableVehicles = vehicles.filter((item) => Boolean(item?.is_available)).length;
    return [
      { label: "Total Rooms / Halls", value: resources.length, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
      { label: "Vehicles", value: vehicles.length, icon: Car, color: "text-green-600", bg: "bg-green-50" },
      { label: "Available Vehicles", value: availableVehicles, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
      { label: "Pending Event Requests", value: summary.pending_event_requests, icon: Calendar, color: "text-purple-600", bg: "bg-purple-50", to: "/resource/event-requests" },
      { label: "Pending Vehicle Requests", value: summary.pending_vehicle_requests, icon: FileText, color: "text-orange-600", bg: "bg-orange-50", to: "/resource/vehicle-requests" },
    ];
  }, [resources, vehicles, summary]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Resource Manager Dashboard</h2>
        <p className="mt-0.5 text-sm text-gray-500">Overview of all managed resources and pending requests</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={15} />{error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const card = (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {loading ? <span className="text-gray-300">...</span> : stat.value}
                  </p>
                </div>
                <div className={`rounded-xl p-3 ${stat.bg}`}>
                  <Icon size={22} className={stat.color} />
                </div>
              </div>
              {stat.to && stat.value > 0 && (
                <p className="mt-2 text-xs text-blue-600 font-medium">Click to review →</p>
              )}
            </div>
          );
          return stat.to ? (
            <Link key={stat.label} to={stat.to}>{card}</Link>
          ) : (
            <div key={stat.label}>{card}</div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {[
            { title: "Manage Rooms", desc: "Add or update hall / room details", to: "/resource/rooms", color: "border-blue-200 hover:bg-blue-50" },
            { title: "Manage Vehicles", desc: "Update fleet availability & status", to: "/resource/vehicles", color: "border-green-200 hover:bg-green-50" },
            { title: "Event Requests", desc: "Review & approve venue bookings", to: "/resource/event-requests", color: "border-purple-200 hover:bg-purple-50" },
            { title: "Vehicle Requests", desc: "Assign vehicles to trip requests", to: "/resource/vehicle-requests", color: "border-orange-200 hover:bg-orange-50" },
            { title: "Manage Events", desc: "Directly schedule campus events", to: "/resource/events", color: "border-cyan-200 hover:bg-cyan-50" },
          ].map((item) => (
            <Link key={item.title} to={item.to}
              className={`rounded-xl border ${item.color} p-4 transition cursor-pointer`}>
              <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Pending alerts */}
      {(summary.pending_event_requests > 0 || summary.pending_vehicle_requests > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900 text-sm">Pending requests require your attention</p>
              <div className="mt-1 space-y-0.5 text-xs text-amber-800">
                {summary.pending_event_requests > 0 && (
                  <p>• <Link to="/resource/event-requests" className="underline font-medium">{summary.pending_event_requests} event request(s)</Link> awaiting review</p>
                )}
                {summary.pending_vehicle_requests > 0 && (
                  <p>• <Link to="/resource/vehicle-requests" className="underline font-medium">{summary.pending_vehicle_requests} vehicle request(s)</Link> awaiting review</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}