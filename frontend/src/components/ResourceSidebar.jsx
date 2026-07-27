import { NavLink } from "react-router-dom";
import { getImageUrl } from "../services/api";
import {
  LayoutDashboard,
  Building2,
  Car,
  ChevronDown,
  Calendar,
  FileText,
  CalendarPlus,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import uwuLogo from "../assets/uwu-logo.jpg";

const navItemClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
    isActive
      ? "bg-green-50 text-green-700 font-medium"
      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
  }`;

export default function ResourceSidebar() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const initials = `${user.first_name?.[0] || "R"}${user.last_name?.[0] || "M"}`.toUpperCase();

  return (
    <aside className="h-screen w-64 bg-white border-r border-gray-200 flex flex-col">

      {/* Logo */}
      <div className="h-20 px-4 border-b border-gray-200 flex items-center gap-3">
        <img src={uwuLogo} alt="UWU"
          className="h-10 w-10 rounded-lg object-cover border border-gray-200" />
        <div>
          <p className="text-sm font-bold text-gray-900">UniSchedule</p>
          <p className="text-xs text-gray-500">Resource Manager</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">

        <NavLink to="/resource/dashboard" className={navItemClass}>
          <LayoutDashboard size={16} />Dashboard
        </NavLink>

        <NavLink to="/resource/rooms" className={navItemClass}>
          <Building2 size={16} />Manage Rooms
        </NavLink>

        {/* <NavLink to="/resource/equipment" className={navItemClass}>
          <Package size={16} />Equipment
        </NavLink> */}

        <NavLink to="/resource/vehicles" className={navItemClass}>
          <Car size={16} />Vehicles
        </NavLink>

        <NavLink to="/resource/event-requests" className={navItemClass}>
          <Calendar size={16} />Event Requests
        </NavLink>

        <NavLink to="/resource/vehicle-requests" className={navItemClass}>
          <FileText size={16} />Vehicle Requests
        </NavLink>

        <NavLink to="/resource/events" className={navItemClass}>
          <CalendarPlus size={16} />Manage Events
        </NavLink>

        <NavLink to="/resource/direct-vehicles" className={navItemClass}>
          <Car size={16} />Manage Vehicle Bookings
        </NavLink>

        <NavLink to="/resource/reports" className={navItemClass}>
          <BarChart3 size={16} />Reports & Analytics
        </NavLink>

        <NavLink to="/resource/forecast" className={navItemClass}>
          <TrendingUp size={16} />Demand Forecast
        </NavLink>

      </nav>

      {/* User */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3">
          {user.profile_image ? (
            <img
              src={getImageUrl(user.profile_image)}
              alt="Profile"
              className="h-8 w-8 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-green-600 text-white text-sm
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