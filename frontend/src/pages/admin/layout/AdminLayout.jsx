import Sidebar from "../../../components/Sidebar"
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
"/admin/requests":"Requests",
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

export default function AdminLayout({ children }) {
const location = useLocation()
const title = pageTitles[location.pathname] || "Dashboard"

return (

<div className="flex h-screen bg-[#f5f7fb]">

<div className="w-64 h-screen fixed left-0 top-0">
<Sidebar />
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

)

}
