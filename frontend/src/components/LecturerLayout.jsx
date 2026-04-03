import LecturerSidebar from "../../../components/LecturerSidebar";
import Navbar from "../../../components/Navbar";
import { useLocation } from "react-router-dom";

const pageTitles = {
  "/lecturer/dashboard":    "Dashboard",
  "/lecturer/timetable":    "My Timetable",
  "/lecturer/availability": "My Availability",
  "/lecturer/courses":      "My Courses",
  "/lecturer/profile":      "My Profile",
};

export default function LecturerLayout({ children }) {
  const location = useLocation();
  const title = pageTitles[location.pathname] || "Lecturer Portal";

  return (
    <div className="flex h-screen bg-[#f5f7fb]">

      {/* Sidebar */}
      <div className="w-64 h-screen fixed left-0 top-0">
        <LecturerSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 flex flex-col">

        {/* Navbar - same component admin use කරන්නේ */}
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