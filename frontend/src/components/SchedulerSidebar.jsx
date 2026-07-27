import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Boxes,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  Car,
  Users,
  CalendarPlus,
  Building2,
  User,
  Activity,
} from "lucide-react";
import { getUser, getImageUrl } from "../services/api";
import uwuLogo from "../assets/uwu-logo.jpg";

const navItemClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${isActive
    ? "bg-indigo-50 text-indigo-700 font-medium"
    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
  }`;

const subItemClass = ({ isActive }) =>
  `block rounded-lg px-3 py-1.5 text-sm transition-colors ${isActive
    ? "bg-indigo-50 text-indigo-700 font-medium"
    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
  }`;

export default function SchedulerSidebar() {
  const location = useLocation();
  const [, setUserRefresh] = useState(0);
  const currentUser = getUser();

  const isTimetableRoute = location.pathname.startsWith("/scheduler/timetable");
  const isUsersRoute = location.pathname.startsWith("/scheduler/users");
  const isAcademicRoute = [
    "/scheduler/departments",
    "/scheduler/degrees",
    "/scheduler/courses",
    "/scheduler/batches",
    "/scheduler/curriculum/degree-semester-modules",
    "/scheduler/lecturer-allocations",
  ].includes(location.pathname);
  const isRequestsRoute = [
    "/scheduler/requests/events",
    "/scheduler/requests/vehicles",
    "/scheduler/requests/availability",
  ].includes(location.pathname);

  const [isTimetableOpen, setIsTimetableOpen] = useState(isTimetableRoute);
  const [isUsersOpen, setIsUsersOpen] = useState(isUsersRoute);
  const [isAcademicOpen, setIsAcademicOpen] = useState(isAcademicRoute);
  const [isRequestsOpen, setIsRequestsOpen] = useState(isRequestsRoute);

  useEffect(() => {
    const handleProfileUpdate = () => setUserRefresh((prev) => prev + 1);
    window.addEventListener("userProfileUpdated", handleProfileUpdate);
    return () => window.removeEventListener("userProfileUpdated", handleProfileUpdate);
  }, []);

  useEffect(() => {
    if (isTimetableRoute) setIsTimetableOpen(true);
    if (isUsersRoute) setIsUsersOpen(true);
    if (isAcademicRoute) setIsAcademicOpen(true);
    if (isRequestsRoute) setIsRequestsOpen(true);
  }, [isTimetableRoute, isUsersRoute, isAcademicRoute, isRequestsRoute]);

  const facultyName = currentUser?.scheduler_profile?.faculty_name || "My Faculty";

  const profileImageSrc = getImageUrl(currentUser?.profile_image);

  return (
    <aside className="h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-20 px-4 border-b border-gray-200 flex items-center gap-3">
        <img
          src={uwuLogo}
          alt="Uva Wellassa University"
          className="h-10 w-10 rounded-lg object-cover border border-gray-200"
        />
        <div className="min-w-0">
          <p className="text-lg leading-5 font-semibold text-gray-900">UniSchedule</p>
          <p className="text-xs text-indigo-600 mt-1 font-medium">Scheduler Portal</p>
        </div>
      </div>

      {/* Faculty Badge */}
      <div className="mx-3 mt-3 mb-1 px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-100 flex items-center gap-2">
        <Building2 size={14} className="text-indigo-500 shrink-0" />
        <p className="text-xs text-indigo-700 font-medium truncate">{facultyName}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
        <NavLink to="/scheduler/dashboard" className={navItemClass}>
          <LayoutDashboard size={16} />
          Dashboard
        </NavLink>

        {/* Timetables */}
        <div>
          <button
            type="button"
            onClick={() => setIsTimetableOpen((prev) => !prev)}
            className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
          >
            <div className="flex items-center gap-3">
              <CalendarDays size={16} />
              <span>Timetables</span>
            </div>
            <ChevronDown
              size={14}
              className={`transition-transform ${isTimetableOpen ? "rotate-180" : "rotate-0"}`}
            />
          </button>
          {isTimetableOpen && (
            <div className="space-y-1 px-6 pt-1">
              <NavLink to="/scheduler/timetable" end className={subItemClass}>
                Generation
              </NavLink>
              <NavLink to="/scheduler/timetable/manage" className={subItemClass}>
                Manage Timetables
              </NavLink>
            </div>
          )}
        </div>

        {/* Users */}
        <div>
          <button
            type="button"
            onClick={() => setIsUsersOpen((prev) => !prev)}
            className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
          >
            <div className="flex items-center gap-3">
              <Users size={16} />
              <span>Users</span>
            </div>
            <ChevronDown
              size={14}
              className={`transition-transform ${isUsersOpen ? "rotate-180" : "rotate-0"}`}
            />
          </button>
          {isUsersOpen && (
            <div className="space-y-1 px-6 pt-1">
              <NavLink to="/scheduler/users/lecturers" className={subItemClass}>
                Lecturers
              </NavLink>
              <NavLink to="/scheduler/users/students" className={subItemClass}>
                Students
              </NavLink>
            </div>
          )}
        </div>

        {/* Academic Data */}
        <div>
          <button
            type="button"
            onClick={() => setIsAcademicOpen((prev) => !prev)}
            className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
          >
            <div className="flex items-center gap-3">
              <BookOpen size={16} />
              <span>Academic Data</span>
            </div>
            <ChevronDown
              size={14}
              className={`transition-transform ${isAcademicOpen ? "rotate-180" : "rotate-0"}`}
            />
          </button>
          {isAcademicOpen && (
            <div className="space-y-1 px-6 pt-1">
              <NavLink to="/scheduler/departments" className={subItemClass}>
                Departments
              </NavLink>
              <NavLink to="/scheduler/degrees" className={subItemClass}>
                Degrees
              </NavLink>
              <NavLink to="/scheduler/batches" className={subItemClass}>
                Batches
              </NavLink>
              <NavLink to="/scheduler/courses" className={subItemClass}>
                Courses
              </NavLink>
              <NavLink to="/scheduler/curriculum/degree-semester-modules" className={subItemClass}>
                Degree Semester Modules
              </NavLink>
              <NavLink to="/scheduler/lecturer-allocations" className={subItemClass}>
                Lecturer Allocations
              </NavLink>
            </div>
          )}
        </div>

        {/* Resources */}
        <NavLink to="/scheduler/resources" className={navItemClass}>
          <Boxes size={16} />
          Resources
        </NavLink>

        {/* Requests */}
        <div>
          <button
            type="button"
            onClick={() => setIsRequestsOpen((prev) => !prev)}
            className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
          >
            <div className="flex items-center gap-3">
              <ClipboardList size={16} />
              <span>Requests</span>
            </div>
            <ChevronDown
              size={14}
              className={`transition-transform ${isRequestsOpen ? "rotate-180" : "rotate-0"}`}
            />
          </button>
          {isRequestsOpen && (
            <div className="space-y-1 px-6 pt-1">
              <NavLink to="/scheduler/requests/events" className={subItemClass}>
                Event Requests
              </NavLink>
              <NavLink to="/scheduler/requests/vehicles" className={subItemClass}>
                Vehicle Requests
              </NavLink>
              <NavLink to="/scheduler/requests/availability" className={subItemClass}>
                Availability Requests
              </NavLink>
            </div>
          )}
        </div>

        {/* Medical Submissions */}
        <NavLink to="/scheduler/medical-submissions" className={navItemClass}>
          <Activity size={16} />
          Medical Submissions
        </NavLink>

        {/* Reports */}
        <NavLink to="/scheduler/reports" className={navItemClass}>
          <BarChart3 size={16} />
          Reports &amp; Analytics
        </NavLink>
      </nav>

      {/* User Info */}
      <div className="px-3 py-4 border-t border-gray-200">
        <NavLink to="/scheduler/profile" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
          {profileImageSrc ? (
            <img
              src={profileImageSrc}
              alt="Profile"
              className="h-8 w-8 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <User size={14} className="text-indigo-600" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-gray-900 text-sm truncate">
              {currentUser?.first_name} {currentUser?.last_name}
            </p>
            <p className="text-xs text-gray-500">Scheduler</p>
          </div>
        </NavLink>
      </div>
    </aside>
  );
}
