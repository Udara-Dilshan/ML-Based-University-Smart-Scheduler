import { Building2, Package, Car, CheckCircle } from "lucide-react";

export default function ResourceDashboard() {
  const stats = [
    { label: "Total Rooms", value: 24, icon: Building2, color: "text-blue-600" },
    { label: "Equipment", value: 42, icon: Package, color: "text-purple-600" },
    { label: "Vehicles", value: 6, icon: Car, color: "text-green-600" },
    { label: "Available Today", value: 18, icon: CheckCircle, color: "text-green-500" },
  ];

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stat.value}
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
        <div className="grid grid-cols-3 gap-4">
          {[
            { title: "Manage Rooms", desc: "Add or update room details" },
            { title: "Equipment", desc: "Manage equipment inventory" },
            { title: "Vehicles", desc: "Manage vehicle fleet" },
          ].map((item) => (
            <div key={item.title}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition cursor-pointer">
              <p className="font-semibold text-gray-800">{item.title}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
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