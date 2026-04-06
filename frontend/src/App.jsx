import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import StudentSignupPage from "./pages/StudentSignupPage";

// Admin imports
import Dashboard from "./pages/admin/dashboard/Dashboard";
import UserManagement from "./pages/admin/users/UserManagement";
import Timetable from "./pages/admin/timetable/Timetable";
import Resources from "./pages/admin/resources/Resources";
import Requests from "./pages/admin/requests/Requests";
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
import StudentDashboard from "./pages/student/StudentDashboard";
import ResourceDashboard from "./pages/resource/ResourceDashboard";

// ✅ Lecturer imports - ඔයාගේ නව pages
import LecturerLayout from "./pages/lecturer/layout/LecturerLayout";
import LecturerDashboard from "./pages/lecturer/LecturerDashboard";
import LecturerTimetable from "./pages/lecturer/LecturerTimetable";
import LecturerAvailability from "./pages/lecturer/LecturerAvailability";
import LecturerCourses from "./pages/lecturer/LecturerCourses";
import LecturerProfile from "./pages/lecturer/LecturerProfile";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<StudentSignupPage />} />

        {/* ── Admin Routes ── */}
        <Route element={<ProtectedRoute allowedRoles={["SuperAdmin"]} />}>
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/users/admins"
            element={<UserManagement forcedRole="SuperAdmin" titleOverride="Super Admins" />}
          />
          <Route path="/admin/users/schedulers"
            element={<UserManagement forcedRole="Scheduler" titleOverride="Schedulers" />}
          />
          <Route path="/admin/users/lecturers"
            element={<UserManagement forcedRole="Lecturer" titleOverride="Lecturers" />}
          />
          <Route path="/admin/users/students"
            element={<UserManagement forcedRole="Student" titleOverride="Students" />}
          />
          <Route path="/admin/users/resource-managers"
            element={<UserManagement forcedRole="ResourceManager" titleOverride="Resource Managers" />}
          />
          <Route path="/admin/timetable" element={<Timetable />} />
          <Route path="/admin/resources" element={<Resources />} />
          <Route path="/admin/requests" element={<Requests />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/settings" element={<Settings />} />
          <Route path="/admin/profile" element={<Profile />} />
          <Route path="/admin/faculties" element={<FacultyManagement />} />
          <Route path="/admin/courses" element={<Courses />} />
          <Route path="/admin/departments" element={<Departments />} />
          <Route path="/admin/batches" element={<Batches />} />
          <Route path="/admin/degrees" element={<Degrees />} />
          <Route path="/admin/curriculum/degree-semester-modules" element={<DegreeSemesterModules />} />
          <Route path="/admin/lecturer-allocations" element={<LecturerAllocations />} />
        </Route>

        {/* ── Scheduler Routes ── */}
        <Route element={<ProtectedRoute allowedRoles={["Scheduler"]} />}>
          <Route path="/scheduler/dashboard" element={<SchedulerDashboard />} />
        </Route>

        {/* ── Lecturer Routes ✅ ── */}
        <Route element={<ProtectedRoute allowedRoles={["Lecturer"]} />}>
          <Route element={<LecturerLayout />}>
            <Route path="/lecturer/dashboard"    element={<LecturerDashboard />}    />
            <Route path="/lecturer/timetable"    element={<LecturerTimetable />}    />
            <Route path="/lecturer/availability" element={<LecturerAvailability />} />
            <Route path="/lecturer/courses"      element={<LecturerCourses />}      />
            <Route path="/lecturer/profile"      element={<LecturerProfile />}      />
          </Route>
        </Route>

        {/* ── Student Routes ── */}
        <Route element={<ProtectedRoute allowedRoles={["Student"]} />}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
        </Route>

        {/* ── Resource Manager Routes ── */}
        <Route element={<ProtectedRoute allowedRoles={["ResourceManager"]} />}>
          <Route path="/resource/dashboard" element={<ResourceDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;