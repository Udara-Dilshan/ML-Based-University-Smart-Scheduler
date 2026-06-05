import { useState, useEffect, useRef, useMemo } from "react";
import AdminLayout from "../layout/AdminLayout";
import { reportAPI } from "../../../services/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import {
  BarChart3, Users, BookOpen, Boxes, ClipboardList, FileHeart, CalendarDays, Download, ChevronDown, FileText, FileSpreadsheet, Printer
} from "lucide-react";
import { useReactToPrint } from "react-to-print";

// ─── Color palette ────────────────────────────────────────────────────────────
const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#14B8A6", "#6B7280"];
const STATUS_COLORS = { Pending: "#F59E0B", Approved: "#10B981", Rejected: "#EF4444" };
const EVENT_TYPE_COLORS = ["#A855F7", "#14B8A6", "#EC4899", "#8B5CF6", "#06B6D4"];

// ─── Utility Components ───────────────────────────────────────────────────────
const fmt = (n) => (n ?? 0).toLocaleString();

function KpiCard({ title, value, subtitle }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <p className="text-gray-500 text-sm">{title}</p>
      <h2 className="text-3xl font-bold mt-2 text-gray-900">{fmt(value)}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function SectionHeader({ title, description }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {description && <p className="text-sm text-gray-500">{description}</p>}
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`bg-white p-6 rounded-lg shadow-sm border border-gray-100 ${className}`}>
      {children}
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = String(status || "").toUpperCase();
  let colorClass = "bg-yellow-100 text-yellow-700";
  let label = "Pending";
  
  if (normalized === "APPROVED") {
    colorClass = "bg-green-100 text-green-700";
    label = "Approved";
  } else if (normalized === "REJECTED") {
    colorClass = "bg-red-100 text-red-700";
    label = "Rejected";
  }

  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${colorClass}`}>
      {label}
    </span>
  );
}

// ─── Export helpers ────────────────────────────────────────────────────────────
function toCSV(rows, headers) {
  const lines = [headers.join(",")];
  rows.forEach(row => lines.push(headers.map(h => `"${row[h] ?? ""}"`).join(",")));
  return lines.join("\n");
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Reports() {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const contentRef = useRef(null);

  const TABS = [
    { id: "overview",   label: "Overview",         icon: <BarChart3 size={16} /> },
    { id: "users",      label: "Users",             icon: <Users size={16} /> },
    { id: "academic",   label: "Academic Data",     icon: <BookOpen size={16} /> },
    { id: "resources",  label: "Resources",         icon: <Boxes size={16} /> },
    { id: "requests",   label: "Requests",          icon: <ClipboardList size={16} /> },
    { id: "medical",    label: "Medical",           icon: <FileHeart size={16} /> },
    { id: "timetable",  label: "Timetables",        icon: <CalendarDays size={16} /> },
  ];

  const fetchTab = async (tab) => {
    if (data[tab] || loading[tab]) return;
    setLoading(l => ({ ...l, [tab]: true }));
    try {
      let result;
      if (tab === "overview")  result = await reportAPI.getOverview();
      if (tab === "users")     result = await reportAPI.getUsers();
      if (tab === "academic")  result = await reportAPI.getAcademic();
      if (tab === "resources") result = await reportAPI.getResources();
      if (tab === "requests")  result = await reportAPI.getRequests();
      if (tab === "medical")   result = await reportAPI.getMedical();
      if (tab === "timetable") result = await reportAPI.getTimetable();
      setData(d => ({ ...d, [tab]: result }));
    } catch (e) {
      setErrors(err => ({ ...err, [tab]: e?.message || "Failed to load" }));
    } finally {
      setLoading(l => ({ ...l, [tab]: false }));
    }
  };

  useEffect(() => { fetchTab(activeTab); }, [activeTab]);

  const isLoading = loading[activeTab];
  const tabData   = data[activeTab];
  const tabError  = errors[activeTab];

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Comprehensive institutional data insights and statistics</p>
        </div>
        <ExportDropdown tab={activeTab} tabData={tabData} contentRef={contentRef} />
      </div>

      <div className="flex overflow-x-auto space-x-1 border-b border-gray-200 mb-6 pb-px">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === t.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center text-gray-500 text-sm">Loading analytics data...</div>
      ) : tabError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-6">
          {tabError}
        </div>
      ) : tabData ? (
        <div ref={contentRef} className="space-y-6 print:p-8 print:bg-white bg-transparent">
          {activeTab === "overview"  && <OverviewTab  d={tabData} />}
          {activeTab === "users"     && <UsersTab     d={tabData} />}
          {activeTab === "academic"  && <AcademicTab  d={tabData} />}
          {activeTab === "resources" && <ResourcesTab d={tabData} />}
          {activeTab === "requests"  && <RequestsTab  d={tabData} />}
          {activeTab === "medical"   && <MedicalTab   d={tabData} />}
          {activeTab === "timetable" && <TimetableTab d={tabData} />}
        </div>
      ) : null}
    </AdminLayout>
  );
}

// ─── Export Dropdown ──────────────────────────────────────────────────────────
function ExportDropdown({ tab, tabData, contentRef }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: contentRef,
    documentTitle: `UniSchedule_${tab}_Report`,
    onAfterPrint: () => setOpen(false),
  });

  const handleExportWord = () => {
    if (!contentRef.current) return;
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + contentRef.current.innerHTML + footer;
    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `UniSchedule_${tab}_Report.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setOpen(false);
  };

  const handleExportCSV = () => {
    if (!tabData) return;
    let csv = "";
    if (tab === "requests") {
      const rows = tabData.recent_event_requests || [];
      csv = toCSV(rows, ["req_id", "event_name", "requester", "event_date", "status"]);
    } else if (tab === "medical") {
      const rows = tabData.recent_submissions || [];
      csv = toCSV(rows, ["submission_id", "student_name", "reason", "start_date", "end_date", "status"]);
    } else if (tab === "academic") {
      const rows = tabData.by_faculty || [];
      csv = toCSV(rows, ["faculty_name", "departments", "degrees", "batches", "students", "modules"]);
    } else if (tab === "resources") {
      const rows = tabData.by_type || [];
      csv = toCSV(rows, ["name", "count", "percentage", "sessions"]);
    } else if (tab === "timetable") {
      const rows = tabData.lecturer_load || [];
      csv = toCSV(rows, ["lecturer", "sessions"]);
    } else if (tab === "users") {
      const rows = tabData.by_role || [];
      csv = toCSV(rows, ["role", "name", "count", "percentage"]);
    } else {
      alert("CSV export is not available for this specific view. Please use PDF or Word.");
      setOpen(false);
      return;
    }
    if (csv) downloadFile(csv, `UniSchedule_${tab}_Report.csv`, "text/csv");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative z-50">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <Download size={16} />
        Export
        <ChevronDown size={14} className="text-gray-400" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <button
              onClick={handlePrint}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              <Printer size={16} className="text-gray-400" />
              Save as PDF
            </button>
            <button
              onClick={handleExportWord}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              <FileText size={16} className="text-gray-400" />
              Export as Word
            </button>
            <button
              onClick={handleExportCSV}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              <FileSpreadsheet size={16} className="text-gray-400" />
              Export as CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────
function OverviewTab({ d }) {
  const userRolesChart = [
    { name: "Students",         value: d.users?.students || 0 },
    { name: "Lecturers",        value: d.users?.lecturers || 0 },
    { name: "Schedulers",       value: d.users?.schedulers || 0 },
    { name: "Res. Managers",    value: d.users?.resource_managers || 0 },
    { name: "Admins",           value: d.users?.admins || 0 },
  ].filter(i => i.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Total Users" value={d.users?.total} />
        <KpiCard title="Faculties" value={d.academic?.faculties} />
        <KpiCard title="Total Modules" value={d.academic?.modules} />
        <KpiCard title="Total Resources" value={d.resources?.total} />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Pending Events" value={d.requests?.pending_events} />
        <KpiCard title="Pending Vehicles" value={d.requests?.pending_vehicles} />
        <KpiCard title="Pending Medical" value={d.medical?.pending} />
        <KpiCard title="Published Sessions" value={d.timetable?.published_sessions} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <SectionHeader title="User Roles Distribution" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={userRolesChart} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80}>
                  {userRolesChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Academic Structure" />
          <div className="space-y-4 mt-4">
            {[
              { label: "Faculties",   val: d.academic?.faculties },
              { label: "Departments", val: d.academic?.departments },
              { label: "Degrees",     val: d.academic?.degrees },
              { label: "Batches",     val: d.academic?.batches },
              { label: "Modules",     val: d.academic?.modules },
            ].map((item, index) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-semibold text-gray-900">{fmt(item.val)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="h-1.5 rounded-full" 
                    style={{ 
                      width: `${Math.min(100, (item.val / (d.academic?.modules || 1)) * 100)}%`,
                      backgroundColor: COLORS[index % COLORS.length]
                    }} 
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── USERS TAB ────────────────────────────────────────────────────────────────
function UsersTab({ d }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Total Users" value={d.total} />
        <KpiCard title="Active Users" value={d.active} />
        <KpiCard title="Inactive Users" value={d.inactive} />
        <KpiCard title="Students" value={d.by_role?.find(r => r.role === "STUDENT")?.count || 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <SectionHeader title="Users by Role" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.by_role} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#F3F4F6" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {(d.by_role || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Active vs Inactive" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={[{ name: "Active", value: d.active }, { name: "Inactive", value: d.inactive }]}
                  dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80}
                >
                  <Cell fill="#10B981" />
                  <Cell fill="#E5E7EB" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <h3 className="text-lg font-medium text-gray-900">Role Breakdown Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {(d.by_role || []).map((r, i) => (
                <tr key={r.role}>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                      {r.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{fmt(r.count)}</td>
                  <td className="px-6 py-4 text-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-gray-200 rounded-full h-1.5 max-w-[100px]">
                        <div className="h-1.5 rounded-full" style={{ width: `${r.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }}></div>
                      </div>
                      <span className="text-xs text-gray-500">{r.percentage}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── ACADEMIC TAB ─────────────────────────────────────────────────────────────
function AcademicTab({ d }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <KpiCard title="Total Modules" value={d.total_modules} />
        <KpiCard title="Active Modules" value={d.total_active_modules} />
        <KpiCard title="Faculties" value={(d.by_faculty || []).length} />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <h3 className="text-lg font-medium text-gray-900">Faculty Overview</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Faculty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departments</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Degrees</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batches</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modules</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {(d.by_faculty || []).map((f, i) => (
                <tr key={f.faculty_id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                      <div>
                        <div className="font-medium text-gray-900">{f.faculty_name}</div>
                        <div className="text-xs text-gray-500">{f.faculty_code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{f.departments}</td>
                  <td className="px-6 py-4 text-gray-700">{f.degrees}</td>
                  <td className="px-6 py-4 text-gray-700">{f.batches}</td>
                  <td className="px-6 py-4 text-gray-700">{fmt(f.students)}</td>
                  <td className="px-6 py-4 text-gray-700">{f.modules}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <SectionHeader title="Students per Faculty" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.by_faculty || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="faculty_code" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#F3F4F6" }} />
                <Bar dataKey="students" name="Students" radius={[4, 4, 0, 0]}>
                  {(d.by_faculty || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {(d.credits_distribution || []).length > 0 && (
          <Card>
            <SectionHeader title="Module Credits Distribution" />
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.credits_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="credits" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "#F3F4F6" }} />
                  <Bar dataKey="count" name="Modules" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── RESOURCES TAB ────────────────────────────────────────────────────────────
function ResourcesTab({ d }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <KpiCard title="Total Resources" value={d.total} />
        <KpiCard title="Active Resources" value={(d.by_faculty || []).reduce((s, f) => s + f.active, 0)} />
        <KpiCard title="Resource Types" value={(d.by_type || []).length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <SectionHeader title="Resources by Type" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={d.by_type || []} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                  {(d.by_type || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Timetable Sessions by Resource Type" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.by_type || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#F3F4F6" }} />
                <Bar dataKey="sessions" name="Sessions" radius={[4, 4, 0, 0]}>
                  {(d.by_type || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeader title="Resources by Faculty" />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.by_faculty || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="faculty_name" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#F3F4F6" }} />
              <Legend />
              <Bar dataKey="active"   name="Active"   fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="inactive" name="Inactive" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

// ─── REQUESTS TAB ─────────────────────────────────────────────────────────────
function RequestsTab({ d }) {
  const [view, setView] = useState("events");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Total Event Reqs" value={d.event_requests?.total} />
        <KpiCard title="Pending Events" value={d.event_requests?.pending} />
        <KpiCard title="Total Vehicle Reqs" value={d.vehicle_requests?.total} />
        <KpiCard title="Pending Vehicles" value={d.vehicle_requests?.pending} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <SectionHeader title="Request Status Comparison" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.status_chart || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="status" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#F3F4F6" }} />
                <Legend />
                <Bar dataKey="events"   name="Event Reqs"   fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="vehicles" name="Vehicle Reqs" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Event Types" />
          {(d.event_types || []).length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={d.event_types} dataKey="count" nameKey="type" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                    {(d.event_types || []).map((_, i) => <Cell key={i} fill={EVENT_TYPE_COLORS[i % EVENT_TYPE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 text-sm">No event type data</div>
          )}
        </Card>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Recent Requests</h3>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setView("events")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === "events" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              Events
            </button>
            <button
              onClick={() => setView("vehicles")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === "vehicles" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              Vehicles
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {view === "events" ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["#", "Event Name", "Requester", "Date", "Status"].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {(d.recent_event_requests || []).map(r => (
                  <tr key={r.req_id}>
                    <td className="px-6 py-4 text-gray-500">#{r.req_id}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{r.event_name}</td>
                    <td className="px-6 py-4 text-gray-700">{r.requester}</td>
                    <td className="px-6 py-4 text-gray-700">{r.event_date}</td>
                    <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["#", "Destination", "Requester", "Trip Date", "Type", "Status"].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {(d.recent_vehicle_requests || []).map(r => (
                  <tr key={r.req_id}>
                    <td className="px-6 py-4 text-gray-500">#{r.req_id}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{r.destination}</td>
                    <td className="px-6 py-4 text-gray-700">{r.requester}</td>
                    <td className="px-6 py-4 text-gray-700">{r.trip_date}</td>
                    <td className="px-6 py-4 text-gray-700">{r.vehicle_type}</td>
                    <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MEDICAL TAB ──────────────────────────────────────────────────────────────
function MedicalTab({ d }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <KpiCard title="Total Submissions" value={d.total} />
        <KpiCard title="Pending" value={d.pending} />
        <KpiCard title="Approved" value={d.approved} />
        <KpiCard title="Rejected" value={d.rejected} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <SectionHeader title="Status Distribution" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={d.status_chart || []} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                  {(d.status_chart || []).map((s, i) => (
                    <Cell key={i} fill={STATUS_COLORS[s.status] || COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionHeader title="By Reason" />
          {(d.by_reason || []).length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.by_reason} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="reason" tick={{ fontSize: 12, fill: "#6B7280" }} width={80} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "#F3F4F6" }} />
                  <Bar dataKey="count" name="Submissions" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 text-sm">No reason data</div>
          )}
        </Card>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <h3 className="text-lg font-medium text-gray-900">Recent Medical Submissions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["#", "Student", "Reason", "From", "To", "Status"].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {(d.recent_submissions || []).map(s => (
                <tr key={s.submission_id}>
                  <td className="px-6 py-4 text-gray-500">#{s.submission_id}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{s.student_name}</td>
                  <td className="px-6 py-4 text-gray-700">{s.reason}</td>
                  <td className="px-6 py-4 text-gray-700">{s.start_date}</td>
                  <td className="px-6 py-4 text-gray-700">{s.end_date}</td>
                  <td className="px-6 py-4"><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── TIMETABLE TAB ────────────────────────────────────────────────────────────
function TimetableTab({ d }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <KpiCard title="Total Sessions" value={d.total} />
        <KpiCard title="Published Sessions" value={d.published} />
        <KpiCard title="Draft Sessions" value={d.draft} />
      </div>

      <Card>
        <SectionHeader title="Sessions per Day of Week" />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.weekly_chart || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="sessions" name="Sessions" fill="#DBEAFE" stroke="#3B82F6" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <SectionHeader title="Sessions by Resource Type" />
          {(d.by_resource_type || []).length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={d.by_resource_type} dataKey="count" nameKey="type" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                    {(d.by_resource_type || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 text-sm">No data</div>
          )}
        </Card>

        <Card>
          <SectionHeader title="Published vs Draft" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[{ name: "Published", value: d.published }, { name: "Draft", value: d.draft }]}
                  dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                >
                  <Cell fill="#10B981" />
                  <Cell fill="#F59E0B" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {(d.lecturer_load || []).length > 0 && (
        <Card>
          <SectionHeader title="Top Lecturers by Session Count" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.lecturer_load} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis type="number" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="lecturer" width={100} tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#F3F4F6" }} />
                <Bar dataKey="sessions" name="Sessions" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}