import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Car, CheckCircle } from "lucide-react";
import { resourceAPI } from "../../services/api";

export default function ResourceDashboard() {
  const [resources, setResources] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError("");
        const [resourceData, vehicleData] = await Promise.all([
          resourceAPI.getResources(),
          resourceAPI.getVehicles(),
        ]);

        if (!isMounted) {
          return;
        }

        setResources(Array.isArray(resourceData) ? resourceData : []);
        setVehicles(Array.isArray(vehicleData) ? vehicleData : []);
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.detail || "Failed to load dashboard data");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const roomCount = resources.filter((item) => {
      const type = String(item?.type || "").trim().toLowerCase();
      return type.includes("room") || type.includes("hall") || type.includes("lab");
    }).length;

    const availableVehicles = vehicles.filter((item) => Boolean(item?.is_available)).length;

    return [
      { label: "Total Rooms", value: roomCount, icon: Building2, color: "text-blue-600" },
      { label: "Vehicles", value: vehicles.length, icon: Car, color: "text-green-600" },
      { label: "Available Vehicles", value: availableVehicles, icon: CheckCircle, color: "text-emerald-500" },
    ];
  }, [resources, vehicles]);

  return (
    <div className="space-y-6">

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {loading ? "..." : stat.value}
                  </p>
                </div>
                <Icon size={26} className={stat.color} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { title: "Manage Rooms", desc: "Add or update room details", to: "/resource/manage-rooms" },
            { title: "Vehicles", desc: "Manage vehicle fleet", to: "/resource/vehicles" },
            { title: "Vehicle Requests", desc: "Review transport requests", to: "/resource/vehicle-requests" },
          ].map((item) => (
            <Link
              key={item.title}
              to={item.to}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition cursor-pointer">
              <p className="font-semibold text-gray-800">{item.title}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>
            {/* Availability */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-2">
          Resource Availability
        </h3>
        <p className="text-sm text-gray-500">
          No resource bookings for today.
        </p>
      </div>

    </div>
  );
}