import { BookOpen, Users, Clock } from "lucide-react";

const courses = [
  { code: "ICT 301", name: "Database Management Systems", batch: "ICT/21", students: 42, hours: 3, color: "bg-teal-50 border-teal-200", dot: "bg-teal-500", text: "text-teal-700" },
  { code: "ICT 302", name: "Software Engineering",        batch: "ICT/22", students: 38, hours: 3, color: "bg-blue-50 border-blue-200", dot: "bg-blue-500", text: "text-blue-700" },
  { code: "ICT 201", name: "Web Technologies",            batch: "ICT/21", students: 45, hours: 2, color: "bg-purple-50 border-purple-200", dot: "bg-purple-500", text: "text-purple-700" },
  { code: "ICT 401", name: "Machine Learning",            batch: "ICT/21", students: 35, hours: 3, color: "bg-orange-50 border-orange-200", dot: "bg-orange-500", text: "text-orange-700" },
];

export default function LecturerCourses() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">My Courses</h2>
        <p className="text-sm text-gray-500 mt-0.5">Courses assigned to you this semester</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Courses",  value: courses.length },
          { label: "Total Students", value: courses.reduce((a, c) => a + c.students, 0) },
          { label: "Weekly Hours",   value: `${courses.reduce((a, c) => a + c.hours, 0)}h` },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses.map((course) => (
          <div key={course.code}
            className={`rounded-xl border p-5 ${course.color} hover:shadow-md transition-shadow`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${course.dot}`}></div>
                <span className={`text-xs font-semibold ${course.text}`}>{course.code}</span>
              </div>
              <span className="text-xs bg-white bg-opacity-70 px-2 py-0.5 rounded-full text-gray-600">
                {course.batch}
              </span>
            </div>
            <h3 className="mt-3 font-semibold text-gray-900 text-sm">{course.name}</h3>
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1"><Users size={13} />{course.students} Students</div>
              <div className="flex items-center gap-1"><Clock size={13} />{course.hours}h / week</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}