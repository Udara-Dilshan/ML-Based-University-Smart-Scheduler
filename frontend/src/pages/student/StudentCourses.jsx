import { useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarDays, GraduationCap, Layers } from "lucide-react";
import { studentAPI } from "../../services/api";

export default function StudentCourses() {
  const [courseData, setCourseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadCourses = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await studentAPI.getCourses();
        if (isMounted) {
          setCourseData(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.detail || err?.message || "Failed to load courses.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    return [
      {
        label: "Total Courses",
        value: courseData ? courseData.total_courses : "-",
        icon: BookOpen,
        color: "text-blue-500",
      },
      {
        label: "Total Credits",
        value: courseData ? courseData.total_credits : "-",
        icon: GraduationCap,
        color: "text-green-500",
      },
      {
        label: "Active Semester",
        value: courseData ? courseData.semester_name : "-",
        icon: CalendarDays,
        color: "text-purple-500",
      },
      {
        label: "Degree",
        value: courseData ? courseData.degree_name : "-",
        icon: Layers,
        color: "text-orange-500",
      },
    ];
  }, [courseData]);

  const courses = useMemo(() => courseData?.modules || [], [courseData]);

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
                  <p className="text-[11px] text-gray-500">{s.label}</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1 leading-tight">
                    {s.value}
                  </p>
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
              {["Course Code","Course Name","Instructor","Credits","Status"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-gray-500" colSpan={5}>
                  Loading courses...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td className="px-4 py-6 text-red-600" colSpan={5}>
                  {error}
                </td>
              </tr>
            ) : courses.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-gray-500" colSpan={5}>
                  No courses assigned for this semester.
                </td>
              </tr>
            ) : (
              courses.map((c) => {
                const isAssigned = Boolean(c.assigned_lecturer_name);
                const statusLabel = isAssigned ? "Assigned" : "Pending";
                const statusClass = isAssigned
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700";

                return (
                  <tr key={c.module_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.code}</td>
                    <td className="px-4 py-3 text-gray-700">{c.name}</td>
                    <td className="px-4 py-3 text-gray-500">{c.assigned_lecturer_name || "TBA"}</td>
                    <td className="px-4 py-3 text-gray-500">{c.credits}</td>
                    <td className="px-4 py-3">
                      <span className={`${statusClass} text-xs px-2 py-1 rounded-full`}>{statusLabel}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}