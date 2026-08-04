import StudentSidebar from "../../../components/StudentSidebar";
import Navbar from "../../../components/Navbar";
import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

const pageTitles = {
  "/student/dashboard": "Student Dashboard",
  "/student/courses":   "My Courses",
  "/student/registration": "Semester Registration",
  "/student/timetable": "Timetable",
  "/student/medical":   "Medical Submission",
  "/student/profile":   "My Profile",

  "/student/events":    "Campus Events",
  "/student/clubs":     "Clubs",
  "/student/support":   "Support Center",
  "/student/settings":  "Settings",
};

export default function StudentLayout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || "Student Portal";

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-[#f5f7fb] overflow-hidden">
      {/* Mobile overlay backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - fixed and full height */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <StudentSidebar />
      </div>

      <div className="flex-1 md:ml-0 flex flex-col min-w-0 h-screen overflow-hidden">
        <div className="sticky top-0 z-30 flex-shrink-0">
          <Navbar title={title} onMenuClick={() => setIsSidebarOpen(true)} />
        </div>
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}