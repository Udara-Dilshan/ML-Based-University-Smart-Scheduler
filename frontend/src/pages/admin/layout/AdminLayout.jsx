import Sidebar from "../../../components/Sidebar"
import SchedulerSidebar from "../../../components/SchedulerSidebar"
import Navbar from "../../../components/Navbar"
import { useLocation } from "react-router-dom"

const pageTitles = {
"/admin/dashboard":"Dashboard",
"/admin/users":"User Management",
"/admin/users/admins":"Super Admins",
"/admin/users/schedulers":"Schedulers",
"/admin/users/lecturers":"Lecturers",
"/admin/users/students":"Students",
"/admin/users/resource-managers":"Resource Managers",
"/admin/timetable":"Timetable",
"/admin/resources":"Resources",

"/admin/vehicles":"Vehicles",
"/admin/events":"Manage Events",
"/admin/direct-vehicles":"Manage Vehicle Bookings",
"/admin/requests/events":"Event Requests",
"/admin/requests/vehicles":"Vehicle Requests",
"/admin/medical-submissions":"Medical Submissions",
"/admin/reports":"Reports & Analytics",
"/admin/settings":"Settings",
"/admin/faculties":"Faculties",
"/admin/departments":"Departments",
"/admin/courses":"Courses",
"/admin/degrees":"Degrees",
"/admin/batches":"Batches",
"/admin/curriculum/degree-semester-modules":"Degree Semester Modules",
"/admin/lecturer-allocations":"Lecturer Allocations"
}

const schedulerPageTitles = {
  "/scheduler/dashboard": "Dashboard",
  "/scheduler/profile": "Profile",
  "/scheduler/settings": "Settings",
  "/scheduler/users/lecturers": "Lecturers",
  "/scheduler/users/students": "Students",
  "/scheduler/timetable": "Timetable",
  "/scheduler/timetable/manage": "Manage Timetables",
  "/scheduler/resources": "Resources",
  "/scheduler/requests/events": "Event Requests",
  "/scheduler/requests/vehicles": "Vehicle Requests",
  "/scheduler/medical-submissions": "Medical Submissions",
  "/scheduler/reports": "Reports & Analytics",
  "/scheduler/departments": "Departments",
  "/scheduler/courses": "Courses",
  "/scheduler/degrees": "Degrees",
  "/scheduler/batches": "Batches",
  "/scheduler/curriculum/degree-semester-modules": "Degree Semester Modules",
  "/scheduler/lecturer-allocations": "Lecturer Allocations"
}

export default function AdminLayout({ children }) {
const location = useLocation()
const isScheduler = location.pathname.startsWith("/scheduler")
const title = isScheduler 
  ? (schedulerPageTitles[location.pathname] || "Scheduler Portal")
  : (pageTitles[location.pathname] || "Dashboard")

return (

<div className="flex h-screen bg-[#f5f7fb]">

<div className="w-64 h-screen fixed left-0 top-0">
{isScheduler ? <SchedulerSidebar /> : <Sidebar />}
</div>

<div className="flex-1 ml-64 flex flex-col min-w-0">

<div className="sticky top-0 z-10">
<Navbar title={title} />
</div>

<main className="p-6 overflow-y-auto">

{children}

</main>

</div>

</div>

)

}
