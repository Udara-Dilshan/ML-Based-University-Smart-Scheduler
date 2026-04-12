import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, BookOpen, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { lecturerAPI } from "../../services/api";

export default function LecturerDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [summary, setSummary] = useState({
    cards: {
      today_classes: 0,
      total_students: 0,
      my_courses: 0,
      hours_this_week: 0,
    },
    today_schedule: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadDashboardSummary = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const data = await lecturerAPI.getDashboardSummary();
        if (!isMounted) {
          return;
        }
        setSummary({
          cards: {
            today_classes: Number(data?.cards?.today_classes || 0),
            total_students: Number(data?.cards?.total_students || 0),
            my_courses: Number(data?.cards?.my_courses || 0),
            hours_this_week: Number(data?.cards?.hours_this_week || 0),
          },
          today_schedule: Array.isArray(data?.today_schedule)
            ? data.today_schedule
            : [],
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setErrorMessage(
          error?.response?.data?.detail ||
            error?.message ||
            "Failed to load dashboard data"
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDashboardSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  const todaySchedule = summary.today_schedule;

  const stats = useMemo(
    () => [
      {
        label: "Today's Classes",
        value: summary.cards.today_classes,
        icon: Calendar,
        bg: "bg-blue-50",
        color: "text-blue-600",
      },
      {
        label: "Total Students",
        value: summary.cards.total_students,
        icon: Users,
        bg: "bg-green-50",
        color: "text-green-600",
      },
      {
        label: "My Courses",
        value: summary.cards.my_courses,
        icon: BookOpen,
        bg: "bg-purple-50",
        color: "text-purple-600",
      },
      {
        label: "Hours This Week",
        value: summary.cards.hours_this_week,
        icon: Clock,
        bg: "bg-orange-50",
        color: "text-orange-600",
      },
    ],
    [summary.cards]
  );

  const quickActions = [
    { label: "My Timetable",    desc: "View class schedule",     icon: Calendar, path: "/lecturer/timetable",    hover: "hover:border-blue-400 hover:bg-blue-50"   },
    { label: "My Availability", desc: "Set available time slots", icon: Clock,   path: "/lecturer/availability", hover: "hover:border-teal-400 hover:bg-teal-50"   },
    { label: "My Courses",      desc: "View assigned courses",    icon: BookOpen, path: "/lecturer/courses",      hover: "hover:border-purple-400 hover:bg-purple-50" },
  ];

  return (
    <div className="space-y-6">

      {/* Welcome */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 
                      rounded-xl p-6 text-white">
        <h2 className="text-xl font-bold">
          Welcome back, {user.first_name || "Lecturer"}! 👋
        </h2>
        <p className="text-teal-100 text-sm mt-1">
          You have {summary.cards.today_classes} classes scheduled for today.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label}
              className="bg-white rounded-xl p-5 border border-gray-200
                         shadow-sm hover:shadow-md transition-shadow">
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
                className={`p-4 border-2 border-gray-200 rounded-xl
                           transition-all text-left ${action.hover}`}>
                <Icon className="mb-2 w-5 h-5 text-gray-600" />
                <h4 className="font-semibold text-gray-800 text-sm">
                  {action.label}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">{action.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Today's Schedule</h3>
          <p className="text-xs text-gray-400 mt-0.5">Your classes for today</p>
        </div>
        <div className="divide-y divide-gray-50">
          {isLoading ? (
            <div className="px-6 py-6 text-sm text-gray-500">Loading schedule...</div>
          ) : todaySchedule.length === 0 ? (
            <div className="px-6 py-6 text-sm text-gray-500">No classes scheduled for today.</div>
          ) : (
            todaySchedule.map((item, i) => (
              <div key={`${item.time}-${item.course}-${i}`}
                className="px-6 py-4 flex items-center justify-between 
                           hover:bg-gray-50 transition">
                <div className="flex items-center gap-4">
                  <p className="text-xs text-gray-400 min-w-[110px]">
                    {item.time}
                  </p>
                  <div className="w-1 h-10 bg-teal-400 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {item.course}
                    </p>
                    <p className="text-xs text-gray-400">
                      {item.room} • {item.batch}
                    </p>
                  </div>
                </div>
                <span className="text-xs bg-teal-50 text-teal-600 
                                 px-3 py-1 rounded-full font-medium">
                  Upcoming
                </span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}