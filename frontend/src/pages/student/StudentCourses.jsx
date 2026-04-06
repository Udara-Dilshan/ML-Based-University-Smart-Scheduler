import { BookOpen, Users, MoreHorizontal } from "lucide-react";

const stats = [
  { label: "Total Courses",        value: "248", icon: BookOpen, color: "text-blue-500"   },
  { label: "Active This Semester", value: "156", icon: BookOpen, color: "text-green-500"  },
  { label: "Total Enrollment",     value: "6,847",icon: Users,   color: "text-purple-500" },
  { label: "Avg Class Size",       value: "38",  icon: Users,    color: "text-orange-500" },
];

const courses = [
  { code: "CS301",   name: "Data Structures & Algorithms", dept: "Computer Science", instructor: "Dr. Sarah Johnson", credits: 3, enrollment: "45/50", schedule: "Mon, Wed 10:00 AM", status: "Active" },
  { code: "CS401",   name: "Machine Learning",             dept: "Computer Science", instructor: "Dr. Michael Chen",  credits: 4, enrollment: "38/40", schedule: "Tue, Thu 2:00 PM",  status: "Active" },
  { code: "MATH301", name: "Advanced Statistics",          dept: "Mathematics",      instructor: "Prof. Emily Davis", credits: 3, enrollment: "32/35", schedule: "Wed, Fri 1:00 PM",  status: "Active" },
];

export default function StudentCourses() {
  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
                </div>
                <Icon size={24} className={s.color} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Course Code","Course Name","Department","Instructor","Credits","Enrollment","Schedule","Status","Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {courses.map((c) => (
              <tr key={c.code} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{c.code}</td>
                <td className="px-4 py-3 text-gray-700">{c.name}</td>
                <td className="px-4 py-3 text-gray-500">{c.dept}</td>
                <td className="px-4 py-3 text-gray-500">{c.instructor}</td>
                <td className="px-4 py-3 text-gray-500">{c.credits}</td>
                <td className="px-4 py-3 font-medium text-orange-500">{c.enrollment}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{c.schedule}</td>
                <td className="px-4 py-3">
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">{c.status}</span>
                </td>
                <td className="px-4 py-3">
                  <button className="text-gray-400 hover:text-gray-600"><MoreHorizontal size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}