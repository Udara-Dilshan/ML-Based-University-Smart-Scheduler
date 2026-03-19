import { NavLink } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  Users,
} from "lucide-react";
import uwuLogo from "../assets/uwu-logo.jpg";

const navItemClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
    isActive
      ? "bg-gray-100 text-gray-900 font-medium"
      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
  }`;

const subItemClass = ({ isActive }) =>
  `block rounded-lg px-3 py-1.5 text-sm transition-colors ${
    isActive
      ? "bg-blue-50 text-blue-700 font-medium"
      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
  }`;

export default function Sidebar() {
  return (
    <aside className="h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="h-20 px-4 border-b border-gray-200 flex items-center gap-3">
        <img
          src={uwuLogo}
          alt="Uva Wellassa University"
          className="h-10 w-10 rounded-lg object-cover border border-gray-200"
        />
        <div className="min-w-0">
          <p className="text-lg leading-5 font-semibold text-gray-900">UniSchedule</p>
          <p className="text-xs text-gray-500 mt-1">Academic Portal</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        <NavLink to="/admin/dashboard" className={navItemClass}>
          <LayoutDashboard size={16} />
          Dashboard
        </NavLink>
        <NavLink to="/admin/timetable" className={navItemClass}>
          <CalendarDays size={16} />
          Timetable
        </NavLink>

        <div className="pt-2">
          <div className="flex items-center justify-between px-3 py-2 text-sm text-gray-500">
            <div className="flex items-center gap-3">
              <Users size={16} />
              <span>Users</span>
            </div>
            <ChevronDown size={14} />
          </div>
          <div className="space-y-1 px-6">
            <NavLink to="/admin/users" end className={subItemClass}>
              All Users
            </NavLink>
            <NavLink to="/admin/users/admins" className={subItemClass}>
              Admins
            </NavLink>
            <NavLink to="/admin/users/schedulers" className={subItemClass}>
              Schedulers
            </NavLink>
            <NavLink to="/admin/users/lecturers" className={subItemClass}>
              Lecturers
            </NavLink>
            <NavLink to="/admin/users/students" className={subItemClass}>
              Students
            </NavLink>
            <NavLink to="/admin/users/resource-managers" className={subItemClass}>
              Resource Managers
            </NavLink>
          </div>
        </div>

        <div className="pt-2">
          <div className="flex items-center justify-between px-3 py-2 text-sm text-gray-500">
            <span>Academic Data</span>
            <ChevronDown size={14} />
          </div>
          <div className="space-y-1 px-6">
            <NavLink to="/admin/faculties" className={subItemClass}>
              Faculties
            </NavLink>
            <NavLink to="/admin/departments" className={subItemClass}>
              Departments
            </NavLink>
            <NavLink to="/admin/courses" className={subItemClass}>
              Courses
            </NavLink>
            <NavLink to="/admin/batches" className={subItemClass}>
              Batches
            </NavLink>
          </div>
        </div>

        <NavLink to="/admin/resources" className={navItemClass}>
          <Boxes size={16} />
          Resources
        </NavLink>
        <NavLink to="/admin/requests" className={navItemClass}>
          <ClipboardList size={16} />
          Requests
        </NavLink>
        <NavLink to="/admin/reports" className={navItemClass}>
          <BarChart3 size={16} />
          Reports & Analytics
        </NavLink>
      </nav>

      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-blue-500 text-white text-sm font-medium flex items-center justify-center">
            SA
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">Super Admin</p>
            <p className="text-xs text-gray-500 truncate">admin@university.edu</p>
          </div>
          <ChevronDown size={14} className="text-gray-400" />
        </div>
      </div>
    </aside>
  );
}
