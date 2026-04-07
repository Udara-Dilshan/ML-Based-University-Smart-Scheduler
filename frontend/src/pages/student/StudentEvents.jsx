import { useState } from "react";
import { Calendar, Star } from "lucide-react";

const featured = [
  { name: "Tech Fest 2025",               date: "Feb 25, 2025" },
  { name: "AI & Machine Learning Workshop",date: "Feb 28, 2025" },
  { name: "Cultural Night 2025",          date: "Mar 5, 2025"  },
];

const events = [
  { code: "TF", name: "Tech Fest",   type: "Technical", color: "bg-orange-500", registered: false, starred: true  },
  { code: "AI", name: "AI Workshop", type: "Academic",  color: "bg-blue-500",   registered: true,  starred: true  },
  { code: "SD", name: "Sports Day",  type: "Sports",    color: "bg-green-500",  registered: true,  starred: false },
];

const filters = ["All","Academic","Technical","Cultural","Sports"];

export default function StudentEvents() {
  const [active, setActive] = useState("All");

  const filtered = events.filter((e) => active === "All" || e.type === active);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Campus Events</h2>
        <p className="text-sm text-gray-500">Discover and register for upcoming campus activities</p>
      </div>

      {/* Featured */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Star size={16} className="text-yellow-400 fill-yellow-400" />
          <p className="text-white font-semibold text-sm">Featured Events</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {featured.map((f) => (
            <div key={f.name} className="bg-white bg-opacity-20 rounded-xl p-4 hover:bg-opacity-30 transition cursor-pointer">
              <p className="text-white font-semibold text-sm">{f.name}</p>
              <div className="flex items-center gap-1 mt-2 text-white opacity-80">
                <Calendar size={12} /><p className="text-xs">{f.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <button key={f} onClick={() => setActive(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              active === f ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map((e) => (
          <div key={e.code} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className={`${e.color} h-32 flex items-center justify-center relative`}>
              {e.starred && <Star size={16} className="absolute top-3 right-3 text-yellow-400 fill-yellow-400" />}
              <span className="text-white text-3xl font-bold">{e.code}</span>
            </div>
            <div className="p-4">
              <div className="flex gap-2 mb-2">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{e.type}</span>
                {e.registered && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Registered</span>}
              </div>
              <p className="font-semibold text-gray-900 text-sm">{e.name}</p>
              <button className={`mt-3 w-full py-1.5 rounded-lg text-xs font-medium transition ${
                e.registered ? "bg-gray-100 text-gray-500" : "bg-blue-600 text-white hover:bg-blue-700"
              }`}>
                {e.registered ? "Registered ✓" : "Register Now"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}