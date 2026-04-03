import { Calendar, Clock, BookOpen, Users } from "lucide-react";
import { Link } from "react-router-dom";

export default function LecturerDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const stats = [
    { label: "Today's Classes",  value: "3",  icon: Calendar, bg: "bg-blue-50",   color: "text-blue-600"   },
    { label: "Total Students",   value: "84", icon: Users,    bg: "bg-green-50",  color: "text-green-600"  },
    { label: "My Courses",       value: "4",  icon: BookOpen, bg: "bg-purple-50", color: "text-purple-600" },
    { label: "Hours This Week",  value: "11", icon: Clock,    bg: "bg-orange-50", color: "text-orange-600" },
  ];

  const todaySchedule = [
    { time: "08:00 - 10:00", course: "Database Management",  room: "Lab 01", batch: "ICT/21" },
    { time: "10:30 - 12:30", course: "Software Engineering", room: "Hall A", batch: "ICT/22" },
    { time: "13:30 - 15:30", course: "Web Technologies",     room: "Lab 02", batch: "ICT/21" },
  ];

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
          You have {todaySchedule.length} classes scheduled for today.
        </p>
      </div>

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
                    {stat.value}
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
          {todaySchedule.map((item, i) => (
            <div key={i}
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
          ))}
        </div>
      </div>

    </div>
  );
}