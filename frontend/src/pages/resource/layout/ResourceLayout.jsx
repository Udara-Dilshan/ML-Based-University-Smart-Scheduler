import ResourceSidebar from "../../../components/ResourceSidebar";
import Navbar from "../../../components/Navbar";
import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

const pageTitles = {
  "/resource/dashboard": "Resource Manager Dashboard",
  "/resource/rooms": "Manage Rooms",
  "/resource/equipment": "Equipment",
  "/resource/vehicles": "Vehicles",
  "/resource/event-requests": "Venue Requests",
  "/resource/vehicle-requests": "Vehicle Requests",
  "/resource/profile": "Profile",
  "/resource/settings": "Settings",
  "/resource/events": "Manage Events",
  "/resource/direct-vehicles": "Manage Vehicle Bookings",
};

export default function ResourceLayout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || "Resource Manager";

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
        <ResourceSidebar />
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