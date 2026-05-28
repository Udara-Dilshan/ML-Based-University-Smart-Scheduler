import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../admin/layout/AdminLayout";
import api from "../../services/api";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#6B7280", "#8B5CF6", "#14B8A6"];
const defaultCards = {
  total_students: 0,
  active_courses: 0,
  total_lecturers: 0,
  resource_usage_percent: 0,
};

const emptyWeeklyActivity = [
  { name: "Mon", sessions: 0, resources: 0 },
  { name: "Tue", sessions: 0, resources: 0 },
  { name: "Wed", sessions: 0, resources: 0 },
  { name: "Thu", sessions: 0, resources: 0 },
  { name: "Fri", sessions: 0, resources: 0 },
  { name: "Sat", sessions: 0, resources: 0 },
  { name: "Sun", sessions: 0, resources: 0 },
];

export default function SchedulerDashboard() {
  const [cards, setCards] = useState(defaultCards);
  const [weeklyActivity, setWeeklyActivity] = useState(emptyWeeklyActivity);
  const [resourceUsage, setResourceUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [facultyName, setFacultyName] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/api/dashboard/scheduler-stats");
        const payload = response.data || {};
        setCards(payload.cards || defaultCards);
        setWeeklyActivity(payload.weekly_activity?.length ? payload.weekly_activity : emptyWeeklyActivity);
        setResourceUsage(payload.resource_usage || []);
        if (payload.faculty_name) {
          setFacultyName(payload.faculty_name);
        }
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const hasResourceUsage = useMemo(
    () => resourceUsage.some((item) => Number(item.value) > 0),
    [resourceUsage]
  );

  return (
    <AdminLayout>
      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {facultyName && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{facultyName} Overview</h1>
          <p className="text-sm text-gray-500">Statistics specific to your faculty</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Total Students</p>
          <h2 className="text-3xl font-bold mt-2 text-indigo-700">{cards.total_students}</h2>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Active Courses</p>
          <h2 className="text-3xl font-bold mt-2 text-indigo-700">{cards.active_courses}</h2>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Lecturers</p>
          <h2 className="text-3xl font-bold mt-2 text-indigo-700">{cards.total_lecturers}</h2>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Resource Usage</p>
          <h2 className="text-3xl font-bold mt-2 text-indigo-700">{cards.resource_usage_percent}%</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 xl:col-span-2">
          <h2 className="mb-1 font-semibold">Weekly Activity</h2>
          <p className="text-sm text-gray-500 mb-4">Sessions and resource usage by day</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="sessions" stroke="#4F46E5" strokeWidth={2} />
                <Line type="monotone" dataKey="resources" stroke="#10B981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h2 className="mb-1 font-semibold">Resource Usage</h2>
          <p className="text-sm text-gray-500 mb-4">Distribution by resource type</p>
          <div className="h-56">
            {hasResourceUsage ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={resourceUsage} dataKey="value" outerRadius={90} innerRadius={55}>
                    {resourceUsage.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">
                No resource data yet
              </div>
            )}
          </div>

          <div className="space-y-2 mt-2">
            {resourceUsage.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-gray-700">{item.name}</span>
                </div>
                <span className="text-gray-500">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500 mt-4">Loading dashboard data...</p>}
    </AdminLayout>
  );
}
