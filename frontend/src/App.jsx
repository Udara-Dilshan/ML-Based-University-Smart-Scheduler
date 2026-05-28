import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import StudentSignupPage from "./pages/StudentSignupPage";
import ResourceLayout from "./pages/resource/layout/ResourceLayout";
import ManageRooms from "./pages/resource/ManageRooms";
import ManageEquipment from "./pages/resource/ManageEquipment";
import ManageVehicles from "./pages/resource/ManageVehicles";
import ManageEvents from "./pages/resource/ManageEvents";
import EventRequests from "./pages/resource/EventRequests";
import VehicleRequests from "./pages/resource/VehicleRequests";

// Admin
import Dashboard from "./pages/admin/dashboard/Dashboard";
import UserManagement from "./pages/admin/users/UserManagement";
import Timetable from "./pages/admin/timetable/Timetable";
import ManageTimetables from "./pages/admin/timetable/ManageTimetables";
import AdminEventRequests from "./pages/admin/requests/AdminEventRequests";
import AdminVehicleRequests from "./pages/admin/requests/AdminVehicleRequests";
import AdminManageEvents from "./pages/admin/AdminManageEvents";
import Resources from "./pages/admin/resources/Resources";
import Vehicles from "./pages/admin/vehicles/Vehicles";
import Requests from "./pages/admin/requests/Requests";
import MedicalSubmissions from "./pages/admin/medical/MedicalSubmissions";
import Reports from "./pages/admin/reports/Reports";
import Settings from "./pages/admin/settings/Settings";
import Profile from "./pages/admin/profile/Profile";
import FacultyManagement from "./pages/admin/faculties/FacultyManagement";
import Courses from "./pages/admin/courses/Courses";
import Departments from "./pages/admin/departments/Departments";
import Batches from "./pages/admin/batches/Batches";
import Degrees from "./pages/admin/degrees/Degrees";
import DegreeSemesterModules from "./pages/admin/curriculum/DegreeSemesterModules";
import LecturerAllocations from "./pages/admin/allocations/LecturerAllocations";

// Other portals
import SchedulerDashboard from "./pages/scheduler/SchedulerDashboard";
import SchedulerSettings from "./pages/scheduler/SchedulerSettings";
import ResourceDashboard from "./pages/resource/ResourceDashboard";
import ResourceProfile from "./pages/resource/ResourceProfile";
import ResourceSettings from "./pages/resource/ResourceSettings";

// Lecturer
import LecturerLayout from "./pages/lecturer/layout/LecturerLayout";
import LecturerDashboard from "./pages/lecturer/LecturerDashboard";
import LecturerTimetable from "./pages/lecturer/LecturerTimetable";
import LecturerAvailability from "./pages/lecturer/LecturerAvailability";
import LecturerCourses from "./pages/lecturer/LecturerCourses";
import LecturerProfile from "./pages/lecturer/LecturerProfile";
import LecturerSettings from "./pages/lecturer/LecturerSettings";
import LecturerRequestEvent from "./pages/lecturer/LecturerRequestEvent";
import LecturerRequestVehicle from "./pages/lecturer/LecturerRequestVehicle";
import LecturerMyRequests from "./pages/lecturer/LecturerMyRequests";

// Student
import StudentLayout from "./pages/student/layout/StudentLayout";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentCourses from "./pages/student/StudentCourses";
import StudentProfile from "./pages/student/StudentProfile";
import StudentSemesterRegistration from "./pages/student/StudentSemesterRegistration";
import StudentTimetable from "./pages/student/StudentTimetable";
import StudentMedical from "./pages/student/StudentMedical";
import StudentEvents from "./pages/student/StudentEvents";
import StudentClubs from "./pages/student/StudentClubs";
import StudentSupport from "./pages/student/StudentSupport";
import StudentSettings from "./pages/student/StudentSettings";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<StudentSignupPage />} />

        {/* Admin */}
        <Route element={<ProtectedRoute allowedRoles={["SuperAdmin"]} />}>
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/users/admins"
            element={<UserManagement forcedRole="SuperAdmin" titleOverride="Super Admins" />} />
          <Route path="/admin/users/schedulers"
            element={<UserManagement forcedRole="Scheduler" titleOverride="Schedulers" />} />
          <Route path="/admin/users/lecturers"
            element={<UserManagement forcedRole="Lecturer" titleOverride="Lecturers" />} />
          <Route path="/admin/users/students"
            element={<UserManagement forcedRole="Student" titleOverride="Students" />} />
          <Route path="/admin/users/resource-managers"
            element={<UserManagement forcedRole="ResourceManager" titleOverride="Resource Managers" />} />
          <Route path="/admin/timetable"   element={<Timetable />} />
          <Route path="/admin/timetable/manage" element={<ManageTimetables />} />
          <Route path="/admin/resources"   element={<Resources />} />
          <Route path="/admin/vehicles"    element={<Vehicles />} />
          <Route path="/admin/events"           element={<AdminManageEvents />} />
          <Route path="/admin/requests/events"  element={<AdminEventRequests />} />
          <Route path="/admin/requests/vehicles" element={<AdminVehicleRequests />} />
          <Route path="/admin/medical-submissions" element={<MedicalSubmissions />} />
          <Route path="/admin/reports"     element={<Reports />} />
          <Route path="/admin/settings"    element={<Settings />} />
          <Route path="/admin/profile"     element={<Profile />} />
          <Route path="/admin/faculties"   element={<FacultyManagement />} />
          <Route path="/admin/courses"     element={<Courses />} />
          <Route path="/admin/departments" element={<Departments />} />
          <Route path="/admin/batches"     element={<Batches />} />
          <Route path="/admin/degrees"     element={<Degrees />} />
          <Route path="/admin/curriculum/degree-semester-modules" element={<DegreeSemesterModules />} />
          <Route path="/admin/lecturer-allocations" element={<LecturerAllocations />} />
        </Route>

        {/* Scheduler */}
        <Route element={<ProtectedRoute allowedRoles={["Scheduler"]} />}>
          <Route path="/scheduler/dashboard" element={<SchedulerDashboard />} />
          <Route path="/scheduler/profile" element={<Profile />} />
          <Route path="/scheduler/settings" element={<SchedulerSettings />} />
          <Route path="/scheduler/users/lecturers" element={<UserManagement forcedRole="Lecturer" titleOverride="Lecturers" />} />
          <Route path="/scheduler/users/students" element={<UserManagement forcedRole="Student" titleOverride="Students" />} />
          <Route path="/scheduler/timetable" element={<Timetable />} />
          <Route path="/scheduler/timetable/manage" element={<ManageTimetables />} />
          <Route path="/scheduler/resources" element={<Resources />} />
          <Route path="/scheduler/requests/events" element={<AdminEventRequests />} />
          <Route path="/scheduler/requests/vehicles" element={<AdminVehicleRequests />} />
          <Route path="/scheduler/medical-submissions" element={<MedicalSubmissions />} />
          <Route path="/scheduler/reports" element={<Reports />} />
          <Route path="/scheduler/departments" element={<Departments />} />
          <Route path="/scheduler/courses" element={<Courses />} />
          <Route path="/scheduler/degrees" element={<Degrees />} />
          <Route path="/scheduler/batches" element={<Batches />} />
          <Route path="/scheduler/curriculum/degree-semester-modules" element={<DegreeSemesterModules />} />
          <Route path="/scheduler/lecturer-allocations" element={<LecturerAllocations />} />
        </Route>

        {/* Lecturer */}
        <Route element={<ProtectedRoute allowedRoles={["Lecturer"]} />}>
          <Route element={<LecturerLayout />}>
            <Route path="/lecturer/dashboard"    element={<LecturerDashboard />}    />
            <Route path="/lecturer/timetable"    element={<LecturerTimetable />}    />
            <Route path="/lecturer/availability" element={<LecturerAvailability />} />
            <Route path="/lecturer/courses"      element={<LecturerCourses />}      />
            <Route path="/lecturer/profile"      element={<LecturerProfile />}      />
            <Route path="/lecturer/settings"     element={<LecturerSettings />}     />
            <Route path="/lecturer/request-event"   element={<LecturerRequestEvent />}   />
            <Route path="/lecturer/request-vehicle" element={<LecturerRequestVehicle />} />
            <Route path="/lecturer/my-requests"     element={<LecturerMyRequests />}     />
          </Route>
        </Route>

        {/* Student */}
        <Route element={<ProtectedRoute allowedRoles={["Student"]} />}>
          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<StudentDashboard />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="courses"   element={<StudentCourses />}   />
            <Route path="profile"   element={<StudentProfile />}   />
            <Route path="registration" element={<StudentSemesterRegistration />} />
            <Route path="timetable" element={<StudentTimetable />} />
            <Route path="medical"   element={<StudentMedical />} />
            <Route path="events"    element={<StudentEvents />}    />
            <Route path="clubs"     element={<StudentClubs />}     />
            <Route path="support"   element={<StudentSupport />}   />
            <Route path="settings"  element={<StudentSettings />}  />
          </Route>
        </Route>

        {/* Resource Manager */}
        <Route element={<ProtectedRoute allowedRoles={["ResourceManager"]} />}>
          <Route element={<ResourceLayout />}>
            <Route path="/resource/dashboard" element={<ResourceDashboard />} />
            <Route path="/resource/rooms" element={<ManageRooms />} />
            <Route path="/resource/equipment" element={<ManageEquipment />} />
            <Route path="/resource/vehicles" element={<ManageVehicles />} />
            <Route path="/resource/events" element={<ManageEvents />} />
            <Route path="/resource/event-requests" element={<EventRequests />} />
            <Route path="/resource/vehicle-requests" element={<VehicleRequests />} />
            <Route path="/resource/profile" element={<ResourceProfile />} />
            <Route path="/resource/settings" element={<ResourceSettings />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;