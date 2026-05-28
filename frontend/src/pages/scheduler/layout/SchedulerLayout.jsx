import SchedulerSidebar from "../../../components/SchedulerSidebar";
import Navbar from "../../../components/Navbar";
import { useLocation } from "react-router-dom";

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

  return (
    <div className="flex h-screen bg-[#f5f7fb]">
      <div className="w-64 h-screen fixed left-0 top-0">
        <SchedulerSidebar />
      </div>

      <div className="flex-1 ml-64 flex flex-col">
        <div className="sticky top-0 z-10">
          <Navbar title={title} />
        </div>

        <main className="p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
