import StudentSidebar from "../../../components/StudentSidebar";
import Navbar from "../../../components/Navbar";
import { Outlet, useLocation } from "react-router-dom";

const pageTitles = {
  "/student/dashboard": "Student Dashboard",
  "/student/courses":   "My Courses",
  "/student/timetable": "Timetable",
  "/student/grades":    "Grades & Results",
  "/student/events":    "Campus Events",
  "/student/clubs":     "Clubs",
  "/student/support":   "Support Center",
  "/student/settings":  "Settings",
};

export default function StudentLayout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || "Student Portal";

  return (
    <div className="flex h-screen bg-[#f5f7fb]">
      <div className="w-64 h-screen fixed left-0 top-0">
        <StudentSidebar />
      </div>
      <div className="flex-1 ml-64 flex flex-col">
        <div className="sticky top-0 z-10">
          <Navbar title={title} />
        </div>
        <main className="p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}