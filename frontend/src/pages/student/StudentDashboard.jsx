import { Link } from "react-router-dom";
import { MapPin, Users, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";

const todayClasses = [
  { time: "09:00 - 10:30", status: "Ongoing",  statusColor: "bg-green-100 text-green-700",  subject: "Advanced Algorithms",          room: "Lab 302",           lecturer: "Dr. Alan Grant"  },
  { time: "11:00 - 12:30", status: "Upcoming", statusColor: "bg-blue-100 text-blue-700",    subject: "Database Management Systems",  room: "Hall B",            lecturer: "Prof. Sarah Lee" },
  { time: "14:00 - 15:30", status: "Upcoming", statusColor: "bg-blue-100 text-blue-700",    subject: "Software Engineering Project", room: "Discussion Room 2", lecturer: "Team Alpha"      },
];

const notifications = [
  { icon: CheckCircle, color: "text-green-500",  title: "Assignment Due", desc: "System Design essay due tomorrow at 11:59 PM", time: "Just now" },
  { icon: AlertCircle, color: "text-orange-500", title: "Library Alert",  desc: "Book 'Intro to AI' is overdue by 2 days.",     time: "5h ago"   },
  { icon: TrendingUp,  color: "text-blue-500",   title: "Grade Posted",   desc: "Midterm results for Web Dev are now available.",time: "1d ago"   },
];

export default function StudentDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">

        {/* Today Classes */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Today's Classes</h3>
            <Link to="/student/timetable" className="text-xs text-blue-600 hover:underline">
              View full schedule
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {todayClasses.map((cls, i) => (
              <div key={i} className="px-6 py-4">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs text-gray-500">{cls.time}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls.statusColor}`}>
                    {cls.status}
                  </span>
                </div>
                <p className="font-medium text-gray-900 text-sm">{cls.subject}</p>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><MapPin size={11} />{cls.room}</span>
                  <span className="flex items-center gap-1"><Users size={11} />{cls.lecturer}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <button className="text-xs text-blue-600">Mark all read</button>
          </div>
          <div className="divide-y divide-gray-50">
            {notifications.map((n, i) => {
              const Icon = n.icon;
              return (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <Icon size={16} className={`mt-0.5 flex-shrink-0 ${n.color}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.desc}</p>
                      <p className="text-xs text-gray-400 mt-1">{n.time}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}