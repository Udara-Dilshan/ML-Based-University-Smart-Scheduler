import { useEffect, useMemo, useState } from "react";
import { BookOpen, Users, Clock } from "lucide-react";
import { lecturerAPI } from "../../services/api";

export default function LecturerCourses() {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadCourses = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const data = await lecturerAPI.getCourses();
        if (!isMounted) {
          return;
        }
        setCourses(Array.isArray(data?.courses) ? data.courses : []);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setErrorMessage(
          error?.response?.data?.detail ||
            error?.message ||
            "Failed to load courses"
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(
    () => [
      { label: "Total Courses", value: courses.length },
      { label: "Total Students", value: courses.reduce((a, c) => a + Number(c.students || 0), 0) },
      { label: "Weekly Hours", value: `${courses.reduce((a, c) => a + Number(c.hours_per_week || 0), 0)}h` },
    ],
    [courses]
  );

  const palette = [
    { color: "bg-teal-50 border-teal-200", dot: "bg-teal-500", text: "text-teal-700" },
    { color: "bg-blue-50 border-blue-200", dot: "bg-blue-500", text: "text-blue-700" },
    { color: "bg-purple-50 border-purple-200", dot: "bg-purple-500", text: "text-purple-700" },
    { color: "bg-orange-50 border-orange-200", dot: "bg-orange-500", text: "text-orange-700" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">My Courses</h2>
        <p className="text-sm text-gray-500 mt-0.5">Courses assigned to you this semester</p>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{isLoading ? "..." : s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
            Loading courses...
          </div>
        ) : courses.length === 0 ? (
          <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
            No assigned courses found.
          </div>
        ) : (
          courses.map((course, index) => {
            const style = palette[index % palette.length];
            return (
              <div key={`${course.assignment_id}-${course.module_id}-${course.batch_id}`}
                className={`rounded-xl border p-5 ${style.color} hover:shadow-md transition-shadow`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${style.dot}`}></div>
                    <span className={`text-xs font-semibold ${style.text}`}>{course.module_code}</span>
                  </div>
                  <span className="text-xs bg-white bg-opacity-70 px-2 py-0.5 rounded-full text-gray-600">
                    {course.batch_code}
                  </span>
                </div>
                <h3 className="mt-3 font-semibold text-gray-900 text-sm">{course.module_name}</h3>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-1"><Users size={13} />{course.students} Students</div>
                  <div className="flex items-center gap-1"><Clock size={13} />{course.hours_per_week}h / week</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}