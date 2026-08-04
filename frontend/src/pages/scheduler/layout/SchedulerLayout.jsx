import SchedulerSidebar from "../../../components/SchedulerSidebar";
import Navbar from "../../../components/Navbar";
import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

const pageTitles = {
  "/scheduler/dashboard": "Dashboard",
  "/scheduler/users/lecturers": "Lecturers",
  "/scheduler/users/students": "Students",
  "/scheduler/timetable": "Timetable",
  "/scheduler/timetable/manage": "Manage Timetables",
  "/scheduler/resources": "Resources",
  "/scheduler/requests/events": "Event Requests",
  "/scheduler/requests/vehicles": "Vehicle Requests",
  "/scheduler/reports": "Reports & Analytics",
  "/scheduler/departments": "Departments",
  "/scheduler/courses": "Courses",
  "/scheduler/degrees": "Degrees",
  "/scheduler/batches": "Batches",
  "/scheduler/curriculum/degree-semester-modules": "Degree Semester Modules",
  "/scheduler/lecturer-allocations": "Lecturer Allocations"
};

export default function SchedulerLayout({ children }) {
  const location = useLocation();
  const title = pageTitles[location.pathname] || "Scheduler Portal";

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
        <SchedulerSidebar />
      </div>

      <div className="flex-1 md:ml-0 flex flex-col min-w-0 h-screen overflow-hidden">
        <div className="sticky top-0 z-30 flex-shrink-0">
          <Navbar title={title} onMenuClick={() => setIsSidebarOpen(true)} />
        </div>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
