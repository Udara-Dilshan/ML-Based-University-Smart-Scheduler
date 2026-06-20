import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../layout/AdminLayout";
import { timetableAPI, academicAPI, getUser } from "../../../services/api";
import {
  Loader2,
  Settings2,
  Play,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Info,
  Clock,
  Save,
  Users,
  MapPin
} from "lucide-react";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

// Helper to generate time slots from constraints
const generateTimeSlots = (startMin, endMin) => {
  const slots = [];
  for (let t = startMin; t < endMin; t += 60) {
    const sHour = Math.floor(t / 60).toString().padStart(2, '0');
    const eHour = Math.floor((t + 60) / 60).toString().padStart(2, '0');
    slots.push(`${sHour}:00 - ${eHour}:00`);
  }
  return slots;
};

const formatTimeFromSlot = (slotStr) => slotStr.split(" - ")[0];

export default function Timetable() {
  const currentUser = getUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [contextPreview, setContextPreview] = useState(null);
  const [showConflictsModal, setShowConflictsModal] = useState(false);

  // Filters
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [degrees, setDegrees] = useState([]);

  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedDegree, setSelectedDegree] = useState("");

  // GA Params
  const [populationSize, setPopulationSize] = useState(200);
  const [generations, setGenerations] = useState(300);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [facData, deptData, degData] = await Promise.all([
        academicAPI.getFaculties(),
        academicAPI.getDepartments(),
        academicAPI.getDegrees(),
      ]);
      setFaculties(facData);
      setDepartments(deptData);
      setDegrees(degData);

      // Auto-select faculty if Scheduler or if there's only one
      if (currentUser?.role === "Scheduler" && facData.length > 0) {
        setSelectedFaculty(facData[0].faculty_id.toString());
      }
    } catch (err) {
      console.error("Failed to load filter data", err);
      setError("Failed to load filter data");
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    try {
      setError(null);
      const payload = {};
      if (selectedDegree) payload.degree_id = parseInt(selectedDegree);
      else if (selectedDept) payload.dept_id = parseInt(selectedDept);
      else if (selectedFaculty) payload.faculty_id = parseInt(selectedFaculty);

      const data = await timetableAPI.getContext(payload);
      setContextPreview(data);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to load context preview");
      setContextPreview(null);
    }
  };

  const handleGenerate = async () => {
    try {
      setError(null);
      setGenerating(true);
      setResult(null);

      const payload = {
        population_size: populationSize,
        generations: generations,
      };

      if (selectedDegree) payload.degree_id = parseInt(selectedDegree);
      else if (selectedDept) payload.dept_id = parseInt(selectedDept);
      else if (selectedFaculty) payload.faculty_id = parseInt(selectedFaculty);

      const data = await timetableAPI.generate(payload);
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to generate timetable");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!result || !result.timetable) return;
    try {
      setSaving(true);
      setError(null);

      const payload = {
        sessions: result.timetable,
        status: "DRAFT"
      };

      await timetableAPI.save(payload);
      navigate("/admin/timetable/manage");
    } catch (err) {
      setError(err?.message || "Failed to save timetable draft");
    } finally {
      setSaving(false);
    }
  };

  const filteredDepartments = selectedFaculty
    ? departments.filter((d) => d.faculty_id === parseInt(selectedFaculty))
    : departments;

  const filteredDegrees = selectedDept
    ? degrees.filter((d) => d.dept_id === parseInt(selectedDept))
    : degrees;


  // Group results by batch
  const timetablesByBatch = useMemo(() => {
    if (!result || !result.timetable) return {};
    const grouped = {};
    result.timetable.forEach(session => {
      if (!grouped[session.batch_code]) {
        grouped[session.batch_code] = [];
      }
      grouped[session.batch_code].push(session);
    });
    return grouped;
  }, [result]);

  // Helper for module colors
  const COLOR_THEMES = [
    { border: 'border-blue-300', bg: 'bg-blue-50/60', dot: 'bg-blue-500', title: 'text-blue-900', text: 'text-gray-600', icon: 'text-gray-400' },
    { border: 'border-orange-300', bg: 'bg-orange-50/60', dot: 'bg-orange-500', title: 'text-orange-900', text: 'text-gray-600', icon: 'text-gray-400' },
    { border: 'border-red-300', bg: 'bg-red-50/60', dot: 'bg-red-500', title: 'text-red-900', text: 'text-gray-600', icon: 'text-gray-400' },
    { border: 'border-green-300', bg: 'bg-green-50/60', dot: 'bg-green-500', title: 'text-green-900', text: 'text-gray-600', icon: 'text-gray-400' },
    { border: 'border-purple-300', bg: 'bg-purple-50/60', dot: 'bg-purple-500', title: 'text-purple-900', text: 'text-gray-600', icon: 'text-gray-400' },
  ];

  const getThemeForModule = (moduleCode) => {
    if (!moduleCode) return COLOR_THEMES[0];
    let hash = 0;
    for (let i = 0; i < moduleCode.length; i++) {
      hash = moduleCode.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLOR_THEMES[Math.abs(hash) % COLOR_THEMES.length];
  };

  const renderBatchTimetable = (batchCode, sessions) => {
    // Generate default time slots for standard working day (8 AM to 5 PM)
    const timeSlots = generateTimeSlots(480, 1020);

    // Look for lunch break from context to render it in the UI (fallback 12:00-13:00)
    let lunchStart = "12:00";
    if (contextPreview && contextPreview.global_constraints) {
      lunchStart = contextPreview.global_constraints.lunch_break.split(" - ")[0];
    }

    // Check if THIS specific batch has a custom lunch break
    if (contextPreview && contextPreview.batches) {
      const batchInfo = contextPreview.batches.find(b => b.batch_code === batchCode);
      if (batchInfo && batchInfo.specific_constraints && batchInfo.specific_constraints.lunch_break) {
        lunchStart = batchInfo.specific_constraints.lunch_break.split(" - ")[0];
      }
    }

    // Keep track of how many rows to skip per day due to rowspan
    const skipRows = { MONDAY: 0, TUESDAY: 0, WEDNESDAY: 0, THURSDAY: 0, FRIDAY: 0 };

    return (
      <div key={batchCode} className="mt-8 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 bg-white border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Batch: {batchCode}</h3>
          <span className="text-sm text-gray-500 font-medium">{sessions.length} Sessions</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 table-fixed border-collapse">
            <thead>
              <tr className="bg-white">
                <th className="w-24 px-4 py-4 text-left text-xs font-semibold text-gray-800 border-r border-gray-100">
                  Time
                </th>
                {DAYS.map(day => (
                  <th key={day} className="px-4 py-4 text-left text-xs font-semibold text-gray-800 capitalize border-r border-gray-100 last:border-r-0">
                    {day.toLowerCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {timeSlots.map(slot => {
                const isLunch = slot.startsWith(lunchStart);

                if (isLunch) {
                  return (
                    <tr key={slot} className="bg-gray-50">
                      <td className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap border-r border-gray-100">
                        {slot}
                      </td>
                      <td colSpan={5} className="px-4 py-3 text-center text-xs font-bold text-gray-400 tracking-widest uppercase">
                        Lunch Break
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={slot} className="h-28 group/row">
                    <td className="px-4 py-3 text-left align-top text-xs font-medium text-gray-500 whitespace-nowrap border-r border-gray-100 bg-white">
                      {slot.split(' - ')[0]}
                    </td>
                    {DAYS.map(day => {
                      if (skipRows[day] > 0) {
                        skipRows[day]--;
                        return null;
                      }

                      const sessionStart = formatTimeFromSlot(slot);
                      const daySession = sessions.find(s => s.day === day && s.start_time === sessionStart);

                      if (daySession) {
                        const rowSpan = daySession.duration_hours || 1;
                        if (rowSpan > 1) {
                          skipRows[day] = rowSpan - 1;
                        }

                        const theme = getThemeForModule(daySession.module_code);

                        return (
                          <td key={`${day}-${slot}`} rowSpan={rowSpan} className="border-r border-gray-100 last:border-r-0 relative group p-0">
                            <div className={`absolute inset-1.5 ${theme.bg} border ${theme.border} rounded-xl p-3 flex flex-col shadow-sm hover:shadow-md transition-shadow z-10`}>
                              {/* Dot indicator */}
                              <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${theme.dot}`}></div>

                              <div className="flex-1">
                                <p className={`text-sm font-bold ${theme.title} truncate w-[90%]`} title={daySession.module_code}>
                                  {daySession.module_code}
                                </p>
                                <p className={`text-xs ${theme.text} mt-0.5 line-clamp-2 leading-tight`} title={daySession.module_name}>
                                  {daySession.module_name}
                                </p>
                              </div>

                              <div className="mt-3 space-y-1.5">
                                <div className={`flex items-center text-[11px] ${theme.text} truncate`}>
                                  <Users className={`w-3.5 h-3.5 mr-1.5 shrink-0 ${theme.icon}`} />
                                  <span className="truncate">{daySession.lecturer_name}</span>
                                </div>
                                <div className={`flex items-center text-[11px] ${theme.text} truncate`}>
                                  <MapPin className={`w-3.5 h-3.5 mr-1.5 shrink-0 ${theme.icon}`} />
                                  <span className="truncate">{daySession.room_name}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={`${day}-${slot}`} className="px-2 py-2 border-r border-gray-100 last:border-r-0 relative group">
                          <div className="h-full w-full opacity-0 group-hover/row:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="text-gray-200 text-xs">-</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Timetable Generator</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure parameters and generate conflict-free schedules using Genetic Algorithms.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Generation Error</h3>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Controls Panel */}
        <div className="xl:col-span-1 space-y-6">

          {/* Target Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-gray-500" />
              <h2 className="font-semibold text-gray-800">Target Selection</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Faculty</label>
                <select
                  value={selectedFaculty}
                  onChange={(e) => {
                    setSelectedFaculty(e.target.value);
                    setSelectedDept("");
                    setSelectedDegree("");
                  }}
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                >
                  {currentUser?.role !== "Scheduler" && (
                    <option value="">All Faculties (Global)</option>
                  )}
                  {faculties.map((f) => (
                    <option key={f.faculty_id} value={f.faculty_id}>{f.code} - {f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select
                  value={selectedDept}
                  onChange={(e) => {
                    setSelectedDept(e.target.value);
                    setSelectedDegree("");
                  }}
                  disabled={!selectedFaculty && faculties.length > 0}
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 text-sm"
                >
                  <option value="">All Departments</option>
                  {filteredDepartments.map((d) => (
                    <option key={d.dept_id} value={d.dept_id}>{d.code} - {d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Degree Program</label>
                <select
                  value={selectedDegree}
                  onChange={(e) => setSelectedDegree(e.target.value)}
                  disabled={!selectedDept && departments.length > 0}
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 text-sm"
                >
                  <option value="">All Degrees</option>
                  {filteredDegrees.map((d) => (
                    <option key={d.degree_id} value={d.degree_id}>{d.code} - {d.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handlePreview}
                className="w-full mt-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex justify-center items-center gap-2 text-sm"
              >
                <Info className="w-4 h-4" />
                Analyze Data Context
              </button>
            </div>
          </div>

          {/* GA Parameters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-800">Algorithm Parameters</h2>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Population Size</label>
                  <span className="text-sm font-bold text-blue-600">{populationSize}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="50"
                  value={populationSize}
                  onChange={(e) => setPopulationSize(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-[10px] text-gray-500 mt-1">Number of candidate schedules per generation.</p>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Generations</label>
                  <span className="text-sm font-bold text-blue-600">{generations}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1000"
                  step="100"
                  value={generations}
                  onChange={(e) => setGenerations(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-[10px] text-gray-500 mt-1">Higher values improve accuracy but take longer to process.</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 flex justify-center items-center gap-2 shadow-sm transition-colors"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Running Engine...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Generate Timetable
              </>
            )}
          </button>

        </div>

        {/* Results / Preview Panel */}
        <div className="xl:col-span-3 space-y-6">

          {generating && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center min-h-[500px]">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-blue-100 rounded-full"></div>
                <div className="w-24 h-24 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                <CalendarDays className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mt-6">Optimizing Schedule</h3>
              <p className="text-gray-500 mt-2 text-center max-w-sm">
                The Genetic Algorithm is evolving the population to find a conflict-free timetable. Processing generations...
              </p>
            </div>
          )}

          {!generating && result && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex flex-wrap justify-between items-center gap-4">
                <h2 className="text-lg font-bold text-gray-900">Generation Results</h2>
                <div className="flex gap-3">
                  {result.conflict_free ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      <CheckCircle2 className="w-4 h-4" />
                      Conflict Free
                    </span>
                  ) : (
                    <button
                      onClick={() => setShowConflictsModal(true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      Has Conflicts
                    </button>
                  )}
                  <button
                    onClick={handleSaveDraft}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? "Saving..." : "Save as Draft"}
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-500 font-medium mb-1">Final Penalty</p>
                    <p className="text-2xl font-bold text-gray-900">{result.best_penalty}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-500 font-medium mb-1">Sessions Scheduled</p>
                    <p className="text-2xl font-bold text-gray-900">{result.total_sessions}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-500 font-medium mb-1">Batches Processed</p>
                    <p className="text-2xl font-bold text-gray-900">{result.metadata.batches_scheduled}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-500 font-medium mb-1">Generations Run</p>
                    <p className="text-2xl font-bold text-gray-900">{result.metadata.generations}</p>
                  </div>
                </div>

                {/* Render Timetables Grouped by Batch */}
                <div className="space-y-10">
                  {Object.entries(timetablesByBatch).map(([batchCode, sessions]) =>
                    renderBatchTimetable(batchCode, sessions)
                  )}
                </div>
              </div>
            </div>
          )}

          {!generating && !result && contextPreview && (
            <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-blue-100 bg-blue-50/50 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-blue-900">Data Context Ready for Generation</h2>
              </div>
              <div className="p-6">
                {/* Top Overview Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md">
                    <p className="text-blue-100 text-sm font-medium mb-1">Active Semester</p>
                    <p className="text-xl font-bold truncate">{contextPreview.active_semester}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm flex flex-col justify-center">
                    <p className="text-gray-500 text-sm font-medium mb-1">Total Batches</p>
                    <p className="text-2xl font-bold text-gray-900">{contextPreview.batches_count}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm flex flex-col justify-center">
                    <p className="text-gray-500 text-sm font-medium mb-1">Lecturers Involved</p>
                    <p className="text-2xl font-bold text-gray-900">{contextPreview.lecturers_count}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm flex flex-col justify-center">
                    <p className="text-gray-500 text-sm font-medium mb-1">Resources Available</p>
                    <p className="text-2xl font-bold text-gray-900">{contextPreview.resources_count}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Constraints Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-4 border-b pb-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Global Constraints</h3>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Working Hours</span>
                        <span className="text-sm font-semibold text-gray-900 bg-white px-2 py-1 rounded border border-gray-200">{contextPreview.global_constraints.working_hours}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Lunch Break</span>
                        <span className="text-sm font-semibold text-gray-900 bg-white px-2 py-1 rounded border border-gray-200">{contextPreview.global_constraints.lunch_break}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Max Student Consecutive Hrs</span>
                        <span className="text-sm font-semibold text-gray-900 bg-white px-2 py-1 rounded border border-gray-200">{contextPreview.global_constraints.max_consecutive_students}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Max Lecturer Consecutive Hrs</span>
                        <span className="text-sm font-semibold text-gray-900 bg-white px-2 py-1 rounded border border-gray-200">{contextPreview.global_constraints.max_consecutive_lecturers}</span>
                      </div>
                    </div>
                  </div>

                  {/* Engine summary */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-4 border-b pb-2">
                      <CalendarDays className="w-4 h-4 text-gray-500" />
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Processing Workload</h3>
                    </div>
                    <div className="bg-blue-50 flex-1 rounded-lg p-6 border border-blue-100 flex flex-col items-center justify-center text-center">
                      <p className="text-blue-800 text-lg mb-2">The engine will map</p>
                      <div className="text-3xl font-black text-blue-900 mb-2">
                        {contextPreview.task_slots_count} <span className="text-lg font-medium text-blue-800">sessions</span>
                      </div>
                      <p className="text-blue-800 text-lg mb-2">into</p>
                      <div className="text-3xl font-black text-blue-900">
                        {contextPreview.timeslots_count} <span className="text-lg font-medium text-blue-800">timeslots</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Batch specifics if any differ from global */}
                <div className="mt-8">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 border-b pb-2">Batches Selected ({contextPreview.batches.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {contextPreview.batches.map(b => (
                      <div key={b.batch_code} className="border border-gray-200 rounded-lg p-4 bg-white relative hover:border-blue-300 transition-colors">
                        {b.specific_constraints && (
                          <span className="absolute top-2 right-2 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" title="Has Specific Custom Constraints"></span>
                          </span>
                        )}
                        <p className="font-bold text-gray-900 mb-1">{b.batch_code}</p>
                        <p className="text-xs text-gray-500 mb-2">Semester {b.current_semester} • {b.student_count} Students</p>
                        {b.specific_constraints && (() => {
                          const diff = [];
                          const global = contextPreview.global_constraints;
                          const specific = b.specific_constraints;

                          if (specific.working_hours !== global.working_hours) {
                            diff.push(<p key="working" className="text-[10px] text-gray-500">Working: <span className="font-semibold text-gray-800">{specific.working_hours}</span></p>);
                          }
                          if (specific.lunch_break !== global.lunch_break) {
                            diff.push(<p key="lunch" className="text-[10px] text-gray-500">Lunch Break: <span className="font-semibold text-gray-800">{specific.lunch_break}</span></p>);
                          }
                          if (specific.max_consecutive_students !== global.max_consecutive_students) {
                            diff.push(<p key="students" className="text-[10px] text-gray-500">Max Student Hrs: <span className="font-semibold text-gray-800">{specific.max_consecutive_students}</span></p>);
                          }
                          if (specific.max_consecutive_lecturers !== global.max_consecutive_lecturers) {
                            diff.push(<p key="lecturers" className="text-[10px] text-gray-500">Max Lecturer Hrs: <span className="font-semibold text-gray-800">{specific.max_consecutive_lecturers}</span></p>);
                          }

                          return diff.length > 0 ? (
                            <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
                              <p className="text-xs font-semibold text-blue-600 mb-1.5">Custom Batch Constraints</p>
                              <div className="grid grid-cols-1 gap-1">
                                {diff}
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {!generating && !result && !contextPreview && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center min-h-[500px] text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <CalendarDays className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Generate</h3>
              <p className="text-gray-500 max-w-md">
                Select your target scopes and configure the algorithm parameters on the left. Click "Analyze Data Context" to review the workload before running the generation.
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Conflicts Modal */}
      {showConflictsModal && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <XCircle className="w-6 h-6 text-red-500" />
                Unresolved Conflicts
              </h2>
              <button
                onClick={() => setShowConflictsModal(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {result.metadata?.conflicts?.length > 0 ? (
                <ul className="space-y-3">
                  {result.metadata.conflicts.map((conflict, idx) => (
                    <li key={idx} className="bg-red-50 text-red-800 px-4 py-3 rounded-lg text-sm border border-red-100 flex items-start gap-3">
                      <span className="font-bold text-red-400 mt-0.5">•</span>
                      <span>{conflict}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600 text-sm">No specific conflict details found, but the overall penalty score was not zero.</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <h3 className="font-semibold text-gray-800 mb-2 text-sm">How to resolve this?</h3>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Check your <strong>Timetable Constraints</strong> (e.g. increase Lecturer max hours).</li>
                <li>Ensure there are enough rooms with sufficient capacity for the student batches.</li>
                <li>Increase the <strong>Population Size</strong> and <strong>Generations</strong> to give the algorithm more time to find a solution.</li>
              </ul>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowConflictsModal(false)}
                  className="bg-gray-900 text-white px-5 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}