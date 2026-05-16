import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, BookOpen, Users, MapPin, User, ChevronRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { lecturerAPI } from "../../services/api";

const STATUS_CONFIG = {
  Ongoing:  { pill: "bg-green-100 text-green-700 border border-green-200", dot: "bg-green-500",  live: true  },
  Upcoming: { pill: "bg-blue-100 text-blue-700 border border-blue-200",   dot: "bg-blue-500",   live: false },
  Done:     { pill: "bg-gray-100 text-gray-500 border border-gray-200",   dot: "bg-gray-400",   live: false },
};

function ScheduleCard({ item }) {
  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.Upcoming;
  const isDone = item.status === "Done";
  return (
    <div className={`px-6 py-4 flex items-start gap-4 transition-colors ${isDone ? "opacity-60" : "hover:bg-gray-50"}`}>
      {/* time column */}
      <div className="flex flex-col items-center gap-1 pt-0.5 min-w-[64px]">
        <span className="text-xs font-semibold text-gray-700">{item.start_time_str}</span>
        <div className={`w-0.5 min-h-[20px] rounded-full flex-1 ${cfg.dot}`} />
        <span className="text-xs text-gray-400">{item.end_time_str}</span>
      </div>

      {/* content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.pill}`}>
            {item.status}
          </span>
          {cfg.live && (
            <span className="flex items-center gap-1 text-xs text-green-600 animate-pulse font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              Live
            </span>
          )}
        </div>
        <p className={`font-semibold text-sm leading-snug ${isDone ? "text-gray-500" : "text-gray-900"}`}>
          {item.module_code} — {item.course}
        </p>
        <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500 flex-wrap">
          {item.room && (
            <span className="flex items-center gap-1"><MapPin size={11} />{item.room}</span>
          )}
          {item.batch && (
            <span className="flex items-center gap-1"><User size={11} />Batch {item.batch}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LecturerDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [summary, setSummary] = useState({
    cards: { today_classes: 0, total_students: 0, my_courses: 0, hours_this_week: 0 },
    today_schedule: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const data = await lecturerAPI.getDashboardSummary();
        if (!isMounted) return;
        setSummary({
          cards: {
            today_classes:   Number(data?.cards?.today_classes   || 0),
            total_students:  Number(data?.cards?.total_students  || 0),
            my_courses:      Number(data?.cards?.my_courses      || 0),
            hours_this_week: Number(data?.cards?.hours_this_week || 0),
          },
          today_schedule: Array.isArray(data?.today_schedule) ? data.today_schedule : [],
        });
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error?.response?.data?.detail || error?.message || "Failed to load dashboard data");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  const todaySchedule = summary.today_schedule;
  const ongoingCount = todaySchedule.filter((s) => s.status === "Ongoing").length;

  const stats = useMemo(() => [
    { label: "Today's Classes",  value: summary.cards.today_classes,   icon: Calendar, bg: "bg-blue-50",   color: "text-blue-600"   },
    { label: "Total Students",   value: summary.cards.total_students,  icon: Users,    bg: "bg-green-50",  color: "text-green-600"  },
    { label: "My Courses",       value: summary.cards.my_courses,      icon: BookOpen, bg: "bg-purple-50", color: "text-purple-600" },
    { label: "Hours This Week",  value: summary.cards.hours_this_week, icon: Clock,    bg: "bg-orange-50", color: "text-orange-600" },
  ], [summary.cards]);

  const quickActions = [
    { label: "My Timetable",    desc: "View class schedule",      icon: Calendar, path: "/lecturer/timetable",    hover: "hover:border-blue-400 hover:bg-blue-50"    },
    { label: "My Availability", desc: "Set available time slots", icon: Clock,    path: "/lecturer/availability", hover: "hover:border-teal-400 hover:bg-teal-50"    },
    { label: "My Courses",      desc: "View assigned courses",    icon: BookOpen, path: "/lecturer/courses",      hover: "hover:border-purple-400 hover:bg-purple-50" },
  ];

  return (
    <div className="space-y-6">

      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-xl p-6 text-white flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Welcome back, {user.first_name || "Lecturer"}! 👋</h2>
          <p className="text-teal-100 text-sm mt-1">
            {summary.cards.today_classes === 0
              ? "No classes scheduled for today."
              : `You have ${summary.cards.today_classes} class${summary.cards.today_classes > 1 ? "es" : ""} today.`}
          </p>
        </div>
        {!isLoading && ongoingCount > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-medium bg-white/20 border border-white/30 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse inline-block" />
            {ongoingCount} class ongoing
          </span>
        )}
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {isLoading ? "..." : stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.path} to={action.path}
                className={`p-4 border-2 border-gray-200 rounded-xl transition-all text-left ${action.hover}`}>
                <Icon className="mb-2 w-5 h-5 text-gray-600" />
                <h4 className="font-semibold text-gray-800 text-sm">{action.label}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{action.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock size={15} className="text-teal-500" />
              Today's Schedule
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Your classes for today</p>
          </div>
          <Link to="/lecturer/timetable"
            className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium">
            View full schedule
            <ChevronRight size={13} />
          </Link>
        </div>

        <div className="divide-y divide-gray-50">
          {isLoading ? (
            <div className="flex items-center justify-center py-14 text-gray-400">
              <Loader2 size={20} className="animate-spin mr-2" />
              Loading schedule…
            </div>
          ) : todaySchedule.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
              <Calendar size={36} className="text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-500">No classes scheduled for today</p>
              <p className="text-xs mt-1 text-gray-400">Enjoy your free day!</p>
            </div>
          ) : (
            todaySchedule.map((item, i) => (
              <ScheduleCard key={`${item.time}-${i}`} item={item} />
            ))
          )}
        </div>
      </div>

    </div>
  );
}