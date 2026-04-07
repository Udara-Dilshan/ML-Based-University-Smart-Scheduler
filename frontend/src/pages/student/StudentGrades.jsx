import { Download, Award, BarChart3, BookOpen, TrendingUp } from "lucide-react";

const gradeStats = [
  { label: "Cumulative GPA", value: "3.75", sub: "Out of 4.0",    icon: Award     },
  { label: "Semester GPA",   value: "3.85", sub: "Fall 2024",     icon: BarChart3  },
  { label: "Credits Earned", value: "36",   sub: "Total Credits", icon: BookOpen   },
  { label: "Class Standing", value: "Top 15%", sub: "Year 3, CS", icon: TrendingUp },
];

const grades = [
  { code: "CS301",   name: "Data Structures",   credits: 3, grade: "A",  points: 4.0 },
  { code: "CS401",   name: "Machine Learning",  credits: 4, grade: "A-", points: 3.7 },
  { code: "MATH301", name: "Advanced Stats",    credits: 3, grade: "B+", points: 3.3 },
  { code: "ENG201",  name: "Technical Writing", credits: 2, grade: "A",  points: 4.0 },
];

export default function StudentGrades() {
  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Grades & Results</h2>
          <p className="text-sm text-gray-500">View your academic performance</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          <Download size={16} />Download Transcript
        </button>
      </div>

      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6">
        <div className="grid grid-cols-4 gap-6">
          {gradeStats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="text-white">
                <div className="flex items-center gap-2 mb-1 opacity-80">
                  <Icon size={14} /><p className="text-xs">{s.label}</p>
                </div>
                <p className="text-3xl font-bold">{s.value}</p>
                <p className="text-xs opacity-70 mt-1">{s.sub}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Code","Course","Credits","Grade","Points","Status"].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {grades.map((g) => (
              <tr key={g.code} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{g.code}</td>
                <td className="px-6 py-4 text-gray-700">{g.name}</td>
                <td className="px-6 py-4 text-gray-500">{g.credits}</td>
                <td className="px-6 py-4 font-bold text-green-600">{g.grade}</td>
                <td className="px-6 py-4 text-gray-500">{g.points}</td>
                <td className="px-6 py-4">
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">Completed</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}