import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, Calendar,
  GraduationCap, Sparkles, Users,
  HelpCircle, Settings, ChevronDown,
  FileHeart, FileText,
} from "lucide-react";
import uwuLogo from "../assets/uwu-logo.jpg";
import { getUser } from "../services/api";

const navItemClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${isActive
    ? "bg-blue-50 text-blue-700 font-medium"
    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
  }`;

export default function StudentSidebar() {
  const [, setUserRefresh] = useState(0);
  const user = getUser() || {};

  useEffect(() => {
    const handleProfileUpdate = () => {
      setUserRefresh((prev) => prev + 1);
    };

    window.addEventListener("userProfileUpdated", handleProfileUpdate);
    return () => window.removeEventListener("userProfileUpdated", handleProfileUpdate);
  }, []);

  const initials = useMemo(() => {
    return `${user.first_name?.[0] || "S"}${user.last_name?.[0] || "T"}`.toUpperCase();
  }, [user, userRefresh]);

  return (
    <aside className="h-screen w-64 bg-white border-r border-gray-200 flex flex-col">

      {/* Logo */}
      <div className="h-20 px-4 border-b border-gray-200 flex items-center gap-3">
        <img src={uwuLogo} alt="UWU"
          className="h-10 w-10 rounded-lg object-cover border border-gray-200" />
        <div>
          <p className="text-sm font-bold text-gray-900">Student</p>
          <p className="text-xs text-gray-500">Academic Portal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase">
          Academic
        </p>
        <NavLink to="/student/dashboard" className={navItemClass}>
          <LayoutDashboard size={16} />Dashboard
        </NavLink>
        <NavLink to="/student/courses" className={navItemClass}>
          <BookOpen size={16} />My Courses
        </NavLink>
        <NavLink to="/student/registration" className={navItemClass}>
          <FileText size={16} />Semester Registration
        </NavLink>
        <NavLink to="/student/timetable" className={navItemClass}>
          <Calendar size={16} />Timetable
        </NavLink>
        {/* <NavLink to="/student/grades" className={navItemClass}>
          <GraduationCap size={16} />Grades & Results
        </NavLink> */}

        <p className="px-3 py-1 mt-3 text-xs font-semibold text-gray-400 uppercase">
          Campus Life
        </p>
        <NavLink to="/student/events" className={navItemClass}>
          <Sparkles size={16} />Events
        </NavLink>
        {/* <NavLink to="/student/clubs" className={navItemClass}>
          <Users size={16} />Clubs
        </NavLink> */}

        {/* ✅ Medical Submission - New */}
        <NavLink to="/student/medical" className={navItemClass}>
          <FileHeart size={16} />Medical Submission
        </NavLink>

        <NavLink to="/student/support" className={navItemClass}>
          <HelpCircle size={16} />Support
        </NavLink>
        <NavLink to="/student/settings" className={navItemClass}>
          <Settings size={16} />Settings
        </NavLink>
      </nav>

      {/* User */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3">
          {user.profile_image ? (
            <img
              src={`http://localhost:8000${user.profile_image}`}
              alt="Profile"
              className="h-8 w-8 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-blue-500 text-white text-sm
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