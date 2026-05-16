import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  User,
  Clock,
  BookOpen,
  Calendar,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { studentAPI } from "../../services/api";

const STATUS_CONFIG = {
  Ongoing: { bg: "bg-green-100 text-green-700 border border-green-200", dot: "bg-green-500" },
  Upcoming: { bg: "bg-blue-100 text-blue-700 border border-blue-200", dot: "bg-blue-500" },
  Done: { bg: "bg-gray-100 text-gray-500 border border-gray-200", dot: "bg-gray-400" },
};

// Static notification data (can be replaced by a real endpoint later)
const NOTIFICATIONS = [
  {
    id: 1,
    icon: CheckCircle2,
    color: "text-green-500",
    bg: "bg-green-50",
    title: "Timetable Published",
    desc: "Your semester timetable has been published. Check your schedule.",
    time: "Today",
    unread: true,
  },
  {
    id: 2,
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-50",
    title: "Semester Registration",
    desc: "Complete your semester registration before the deadline.",
    time: "This week",
    unread: true,
  },
  {
    id: 3,
    icon: Info,
    color: "text-blue-500",
    bg: "bg-blue-50",
    title: "System Update",
    desc: "UniSchedule has been updated. Enjoy the new features!",
    time: "Recently",
    unread: false,
  },
];

function TodayClassCard({ session }) {
  const config = STATUS_CONFIG[session.status] || STATUS_CONFIG.Upcoming;
  const isOngoing = session.status === "Ongoing";
  const isDone = session.status === "Done";

  return (
    <div
      className={`px-6 py-4 flex items-start gap-4 transition-colors ${
        isDone ? "opacity-60" : "hover:bg-gray-50"
      }`}
    >
      {/* time column */}
      <div className="flex flex-col items-center gap-1 pt-0.5 min-w-[70px]">
        <span className="text-xs font-semibold text-gray-700">{session.start_time}</span>
        <div className={`w-0.5 flex-1 min-h-[20px] rounded-full ${config.dot}`} />
        <span className="text-xs text-gray-400">{session.end_time}</span>
      </div>

      {/* content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.bg}`}>
            {session.status}
          </span>
          {isOngoing && (
            <span className="flex items-center gap-1 text-xs text-green-600 animate-pulse font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              Live
            </span>
          )}
        </div>
        <p className={`font-semibold text-sm leading-snug ${isDone ? "text-gray-500" : "text-gray-900"}`}>
          {session.module_code} — {session.module_name}
        </p>
        <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500 flex-wrap">
          {session.room_name && (
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {session.room_name}
            </span>
          )}
          {session.lecturer_name && (
            <span className="flex items-center gap-1">
              <User size={11} />
              {session.lecturer_name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationItem({ notif }) {
  const Icon = notif.icon;
  return (
    <div className={`px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${notif.unread ? "" : "opacity-70"}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${notif.bg}`}>
        <Icon size={15} className={notif.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm font-medium text-gray-900 ${notif.unread ? "font-semibold" : ""}`}>
            {notif.title}
          </p>
          {notif.unread && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{notif.desc}</p>
        <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [allRead, setAllRead] = useState(false);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    studentAPI
      .getDashboardSummary()
      .then((data) => {
        if (mounted) setSummary(data);
      })
      .catch(() => {
        if (mounted) setSummary({ today_sessions: [], total_modules: 0 });
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    setAllRead(true);
  };

  const unreadCount = notifications.filter((n) => n.unread).length;
  const todaySessions = summary?.today_sessions ?? [];
  const ongoingCount = todaySessions.filter((s) => s.status === "Ongoing").length;
  const upcomingCount = todaySessions.filter((s) => s.status === "Upcoming").length;

  return (
    <div className="space-y-6">
      {/* Header strip */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Student Dashboard</h2>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
            <Calendar size={13} />
            {today}
          </p>
        </div>
        {!isLoading && ongoingCount > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
            {ongoingCount} class ongoing
          </span>
        )}
      </div>

      {/* Quick-stat pills */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm text-sm">
          <BookOpen size={15} className="text-indigo-500" />
          <span className="text-gray-500">Total Modules</span>
          <span className="font-semibold text-gray-900">
            {isLoading ? "—" : summary?.total_modules ?? 0}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm text-sm">
          <Clock size={15} className="text-blue-500" />
          <span className="text-gray-500">Today's Classes</span>
          <span className="font-semibold text-gray-900">
            {isLoading ? "—" : todaySessions.length}
          </span>
        </div>
        {upcomingCount > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 shadow-sm text-sm">
            <Clock size={15} className="text-blue-500" />
            <span className="text-blue-700 font-medium">{upcomingCount} upcoming</span>
          </div>
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-3 gap-6">

        {/* Today's Classes */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock size={15} className="text-indigo-500" />
              Today's Classes
            </h3>
            <Link
              to="/student/timetable"
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              View full schedule
              <ChevronRight size={13} />
            </Link>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 size={20} className="animate-spin mr-2" />
              Loading schedule…
            </div>
          ) : todaySessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Calendar size={36} className="text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-500">No classes scheduled for today</p>
              <p className="text-xs mt-1 text-gray-400">Enjoy your day off!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {todaySessions.map((session) => (
                <TodayClassCard key={session.session_id} session={session} />
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Bell size={15} className="text-indigo-500" />
              Notifications
              {unreadCount > 0 && !allRead && (
                <span className="text-xs bg-blue-500 text-white rounded-full px-1.5 py-0.5 leading-none font-semibold">
                  {unreadCount}
                </span>
              )}
            </h3>
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-40"
              disabled={allRead}
            >
              Mark all read
            </button>
          </div>

          <div className="divide-y divide-gray-50 flex-1 overflow-y-auto">
            {notifications.map((n) => (
              <NotificationItem key={n.id} notif={n} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}