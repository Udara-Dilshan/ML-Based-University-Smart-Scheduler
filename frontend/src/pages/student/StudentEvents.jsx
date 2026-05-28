import { useEffect, useState } from "react";
import { Calendar, Star, MapPin, Clock, Tag, RefreshCw } from "lucide-react";
import { bookingAPI } from "../../services/api";

const FILTERS = ["All", "Academic", "Technical", "Cultural", "Sports", "Official", "General"];

const TYPE_COLORS = {
  Academic:  { bg: "bg-blue-500",   badge: "bg-blue-100 text-blue-800" },
  Technical: { bg: "bg-orange-500", badge: "bg-orange-100 text-orange-800" },
  Cultural:  { bg: "bg-purple-500", badge: "bg-purple-100 text-purple-800" },
  Sports:    { bg: "bg-green-500",  badge: "bg-green-100 text-green-800" },
  Official:  { bg: "bg-gray-500",   badge: "bg-gray-100 text-gray-800" },
  General:   { bg: "bg-slate-500",  badge: "bg-slate-100 text-slate-800" },
};

function getTypeColor(type) {
  return TYPE_COLORS[type] || { bg: "bg-indigo-500", badge: "bg-indigo-100 text-indigo-800" };
}

function getInitials(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();
}

export default function StudentEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  useEffect(() => {
    bookingAPI.getApprovedEvents()
      .then((data) => setEvents(data || []))
      .catch(() => setError("Failed to load campus events"))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().split("T")[0];

  // Split into upcoming and past
  const filtered = events.filter(
    (e) => activeFilter === "All" || e.event_type === activeFilter
  );
  const upcoming = filtered.filter((e) => e.event_date >= today);
  const past = filtered.filter((e) => e.event_date < today);

  // Featured = next 3 upcoming events
  const featured = upcoming.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Campus Events</h2>
        <p className="text-sm text-gray-500">Discover upcoming approved university events</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-500 gap-2">
          <RefreshCw size={18} className="animate-spin" /> Loading campus events...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && (
        <>
          {/* Featured Events Banner */}
          {featured.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Star size={16} className="text-yellow-400 fill-yellow-400" />
                <p className="text-white font-semibold text-sm">Upcoming Events</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {featured.map((e) => (
                  <div key={e.event_id}
                    className="rounded-xl bg-white bg-opacity-20 p-4 hover:bg-opacity-30 transition cursor-pointer backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getTypeColor(e.event_type).badge}`}>
                        {e.event_type}
                      </span>
                    </div>
                    <p className="text-white font-semibold text-sm">{e.event_name}</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-1.5 text-white text-opacity-80 text-xs">
                        <Calendar size={11} /> {e.event_date}
                      </div>
                      <div className="flex items-center gap-1.5 text-white text-opacity-80 text-xs">
                        <MapPin size={11} /> {e.venue_name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setActiveFilter(f)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  activeFilter === f
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}>
                {f}
              </button>
            ))}
          </div>

          {/* No events state */}
          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
              <Calendar size={36} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No {activeFilter !== "All" ? activeFilter : ""} events scheduled yet</p>
            </div>
          )}

          {/* Upcoming Events Grid */}
          {upcoming.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-gray-800 mb-3">Upcoming Events ({upcoming.length})</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((e) => {
                  const colors = getTypeColor(e.event_type);
                  return (
                    <div key={e.event_id}
                      className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition overflow-hidden">
                      {/* Color bar top */}
                      <div className={`${colors.bg} h-28 flex items-center justify-center`}>
                        <span className="text-white text-3xl font-black opacity-80">{getInitials(e.event_name)}</span>
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors.badge}`}>
                            {e.event_type}
                          </span>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm leading-tight">{e.event_name}</p>
                        {e.description && (
                          <p className="text-xs text-gray-500 line-clamp-2">{e.description}</p>
                        )}
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Calendar size={11} className="text-blue-500" /> {e.event_date}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Clock size={11} className="text-blue-500" /> {e.start_time} – {e.end_time}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <MapPin size={11} className="text-blue-500" /> {e.venue_name}
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 pt-1">Organized by: {e.organizer_name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past Events */}
          {past.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-gray-400 mb-3">Past Events ({past.length})</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {past.map((e) => (
                  <div key={e.event_id}
                    className="rounded-xl border border-gray-100 bg-gray-50 p-4 opacity-70">
                    <p className="font-medium text-gray-700 text-sm">{e.event_name}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                      <Calendar size={11} />{e.event_date} · <MapPin size={11} />{e.venue_name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}