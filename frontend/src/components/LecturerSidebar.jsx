import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  BookOpen,
  User,
  Settings,
  ChevronDown,
  Calendar,
  Car,
  FileText,
} from "lucide-react";
import uwuLogo from "../assets/uwu-logo.jpg";

const navItemClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
    isActive
      ? "bg-gray-100 text-gray-900 font-medium"
      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
  }`;

export default function LecturerSidebar() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const initials = `${user.first_name?.[0] || "L"}${
    user.last_name?.[0] || "K"
  }`.toUpperCase();

  return (
    <aside className="h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
      
      {/* ── Logo ── */}
      <div className="h-20 px-4 border-b border-gray-200 flex items-center gap-3">
        <img
          src={uwuLogo}
          alt="Uva Wellassa University"
          className="h-10 w-10 rounded-lg object-cover border border-gray-200"
        />
        <div className="min-w-0">
          <p className="text-lg leading-5 font-semibold text-gray-900">
            UniSchedule
          </p>
          <p className="text-xs text-gray-500 mt-1">Lecturer Portal</p>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        
        <NavLink to="/lecturer/dashboard" className={navItemClass}>
          <LayoutDashboard size={16} />
          Dashboard
        </NavLink>

        <NavLink to="/lecturer/timetable" className={navItemClass}>
          <CalendarDays size={16} />
          My Timetable
        </NavLink>

        <NavLink to="/lecturer/availability" className={navItemClass}>
          <Clock size={16} />
          My Availability
        </NavLink>

        <NavLink to="/lecturer/courses" className={navItemClass}>
          <BookOpen size={16} />
          My Courses
        </NavLink>

        <div className="pt-2 pb-1">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Resource Requests</p>
        </div>

        <NavLink to="/lecturer/request-event" className={navItemClass}>
          <Calendar size={16} />
          Request Venue
        </NavLink>

        <NavLink to="/lecturer/request-vehicle" className={navItemClass}>
          <Car size={16} />
          Request Vehicle
        </NavLink>

        <NavLink to="/lecturer/my-requests" className={navItemClass}>
          <FileText size={16} />
          My Requests
        </NavLink>

        <div className="pt-2 pb-1">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Account</p>
        </div>

        <NavLink to="/lecturer/profile" className={navItemClass}>
          <User size={16} />
          My Profile
        </NavLink>

        <NavLink to="/lecturer/settings" className={navItemClass}>
          <Settings size={16} />
          Settings
        </NavLink>

      </nav>

      {/* ── User Info ── */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3">
          {user.profile_image ? (
            <img
              src={`http://localhost:8000${user.profile_image}`}
              alt="Profile"
              className="h-8 w-8 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-teal-600 text-white text-sm 
                            font-medium flex items-center justify-center">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
          <ChevronDown size={14} className="text-gray-400" />
        </div>
      </div>

    </aside>
  );
}