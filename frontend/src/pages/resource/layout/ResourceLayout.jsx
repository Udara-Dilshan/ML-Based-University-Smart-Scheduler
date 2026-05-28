import ResourceSidebar from "../../../components/ResourceSidebar";
import Navbar from "../../../components/Navbar";
import { Outlet, useLocation } from "react-router-dom";

const pageTitles = {
  "/resource/dashboard": "Resource Manager Dashboard",
  "/resource/rooms": "Manage Rooms",
  "/resource/equipment": "Equipment",
  "/resource/vehicles": "Vehicles",
  "/resource/event-requests": "Venue Requests",
  "/resource/vehicle-requests": "Vehicle Requests",
};

export default function ResourceLayout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || "Resource Manager";

  return (
    <div className="flex h-screen bg-[#f5f7fb]">
      <div className="w-64 h-screen fixed left-0 top-0">
        <ResourceSidebar />
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