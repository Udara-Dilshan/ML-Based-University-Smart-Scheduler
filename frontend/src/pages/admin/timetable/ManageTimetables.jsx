import { useState, useEffect, useMemo } from "react";
import AdminLayout from "../layout/AdminLayout";
import { timetableAPI, academicAPI, resourceAPI, getUser } from "../../../services/api";
import {
  Loader2,
  CalendarDays,
  Users,
  MapPin,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Wand2,
  Download,
  FileText
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

export default function ManageTimetables() {
  const currentUser = getUser();
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Filters
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [degrees, setDegrees] = useState([]);
  const [batches, setBatches] = useState([]);
  const [resources, setResources] = useState([]);
  
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedDegree, setSelectedDegree] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("DRAFT");

  // Editing Modal State
  const [editSession, setEditSession] = useState(null);
  const [editForm, setEditForm] = useState({ day: "", start_time: "", end_time: "", resource_id: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  const [exportingBatch, setExportingBatch] = useState(null);

  useEffect(() => {
    fetchFilters();
  }, []);

  const handleExport = async (params, format, exportId) => {
    try {
      setExportingBatch(`${exportId}-${format}`);
      await timetableAPI.exportTimetable(params, selectedStatus, format);
      setSuccess(`Timetable exported as ${format.toUpperCase()} successfully.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Failed to export timetable. Please try again.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setExportingBatch(null);
    }
  };

  const handleExportAll = (format) => {
    const params = {};
    if (selectedBatch) params.batch_id = selectedBatch;
    else if (selectedDegree) params.degree_id = selectedDegree;
    else if (selectedDept) params.dept_id = selectedDept;
    else if (selectedFaculty) params.faculty_id = selectedFaculty;
    
    if (Object.keys(params).length === 0) {
      setError("Please select a Faculty, Department, Degree, or Batch to export.");
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    handleExport(params, format, 'all');
  };

  const fetchFilters = async () => {
    try {
      const [facRes, deptRes, degRes, batchRes, resRes] = await Promise.all([
        academicAPI.getFaculties(),
        academicAPI.getDepartments(),
        academicAPI.getDegrees(),
        academicAPI.getBatches(),
        resourceAPI.getResources()
      ]);
      setFaculties(facRes);
      setDepartments(deptRes);
      setDegrees(degRes);
      setBatches(batchRes);
      setResources(resRes);
      
      if (currentUser?.role === "Scheduler" && facRes.length > 0) {
        setSelectedFaculty(facRes[0].faculty_id.toString());
      }
    } catch (err) {
      console.error("Failed to load filters", err);
    }
  };

  const fetchTimetables = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const payload = { status: selectedStatus };
      if (selectedBatch) payload.batch_id = parseInt(selectedBatch);
      else if (selectedDegree) payload.degree_id = parseInt(selectedDegree);
      else if (selectedDept) payload.dept_id = parseInt(selectedDept);
      else if (selectedFaculty) payload.faculty_id = parseInt(selectedFaculty);

      const data = await timetableAPI.getManaged(payload);
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to fetch timetables");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      setPublishing(true);
      setError(null);
      setSuccess(null);
      
      const payload = {};
      if (selectedBatch) payload.batch_id = parseInt(selectedBatch);
      else if (selectedDegree) payload.degree_id = parseInt(selectedDegree);
      else if (selectedDept) payload.dept_id = parseInt(selectedDept);
      else if (selectedFaculty) payload.faculty_id = parseInt(selectedFaculty);
      
      const data = await timetableAPI.publish(payload);
      setSuccess(data.message);
      setSelectedStatus("PUBLISHED"); // Switch view to published
      fetchTimetables(); // Re-fetch
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to publish timetables.");
    } finally {
      setPublishing(false);
    }
  };

  const openEditModal = (session) => {
    setEditSession(session);
    setEditForm({
      day: session.day,
      start_time: session.start_time,
      end_time: session.end_time,
      resource_id: session.resource_id
    });
    setEditError(null);
    setSuggestions([]);
    setSelectedSuggestion(null);
  };

  const closeEditModal = () => {
    setEditSession(null);
    setSuggestions([]);
  };

  const handleSaveEdit = async () => {
    try {
      setSavingEdit(true);
      setEditError(null);
      await timetableAPI.editSession(editSession.session_id, editForm);
      // Success
      setSuccess("Session updated successfully.");
      closeEditModal();
      fetchTimetables();
    } catch (err) {
      const errMsg = err.response?.data?.detail || "Failed to update session.";
      setEditError(errMsg);
      // If conflict, auto-fetch alternatives
      if (err.response?.status === 409) {
        fetchAlternatives();
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const fetchAlternatives = async () => {
    try {
      setLoadingSuggestions(true);
      const data = await timetableAPI.suggestAlternatives(editSession.session_id);
      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error("Failed to fetch suggestions", err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const applySuggestion = (suggestion) => {
    setEditForm({
      day: suggestion.day,
      start_time: suggestion.start_time,
      end_time: suggestion.end_time,
      resource_id: suggestion.resource_id
    });
    setSelectedSuggestion(suggestion);
  };

  const filteredDepartments = selectedFaculty
    ? departments.filter((d) => d.faculty_id === parseInt(selectedFaculty))
    : departments;
    
  const filteredDegrees = selectedDept
    ? degrees.filter((d) => d.dept_id === parseInt(selectedDept))
    : degrees;

  const filteredBatches = selectedDegree
    ? batches.filter((b) => b.degree_id === parseInt(selectedDegree))
    : batches;

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter((session) => {
      if (selectedFaculty && session.faculty_id !== parseInt(selectedFaculty)) return false;
      if (selectedDept && session.dept_id !== parseInt(selectedDept)) return false;
      
      if (selectedDegree) {
        const batch = batches.find(b => b.batch_id === session.batch_id);
        if (batch && batch.degree_id !== parseInt(selectedDegree)) return false;
      }
      
      if (selectedBatch && session.batch_id !== parseInt(selectedBatch)) return false;
      return true;
    });
  }, [sessions, selectedFaculty, selectedDept, selectedDegree, selectedBatch, batches]);

  // Group by batch
  const timetablesByBatch = useMemo(() => {
    const grouped = {};
    if (!filteredSessions) return grouped;
    
    filteredSessions.forEach(session => {
      const bCode = session.batch_code || `Batch ${session.batch_id}`;
      if (!grouped[bCode]) grouped[bCode] = [];
      grouped[bCode].push(session);
    });
    return grouped;
  }, [filteredSessions]);

  const renderBatchTimetable = (batchCode, batchSessions) => {
    // Generate default time slots for standard working day (8 AM to 5 PM)
    const timeSlots = generateTimeSlots(480, 1020); 

    // Determine lunch start from the batch sessions, fallback to 12:00
    const lunchStart = batchSessions.length > 0 && batchSessions[0].lunch_start ? batchSessions[0].lunch_start : "12:00";

    const skipRows = { MONDAY: 0, TUESDAY: 0, WEDNESDAY: 0, THURSDAY: 0, FRIDAY: 0 };

    return (
      <div key={batchCode} className="mt-8 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 bg-white border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-gray-900">Batch: {batchCode}</h3>
            <span className="text-sm text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full">{batchSessions.length} Sessions</span>
          </div>
          {selectedStatus === "PUBLISHED" && batchSessions.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport({ batch_id: batchSessions[0].batch_id }, 'docx', batchSessions[0].batch_id)}
                disabled={exportingBatch === `${batchSessions[0].batch_id}-docx`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
              >
                {exportingBatch === `${batchSessions[0].batch_id}-docx` ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                DOCX
              </button>
              <button
                onClick={() => handleExport({ batch_id: batchSessions[0].batch_id }, 'pdf', batchSessions[0].batch_id)}
                disabled={exportingBatch === `${batchSessions[0].batch_id}-pdf`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
              >
                {exportingBatch === `${batchSessions[0].batch_id}-pdf` ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                PDF
              </button>
            </div>
          )}
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
                      const daySession = batchSessions.find(s => s.day === day && s.start_time === sessionStart);
                      
                      if (daySession) {
                        const rowSpan = daySession.duration_hours || 1;
                        if (rowSpan > 1) {
                            skipRows[day] = rowSpan - 1;
                        }
                        
                        const theme = getThemeForModule(daySession.module_code);
                        
                        return (
                          <td key={`${day}-${slot}`} rowSpan={rowSpan} className="border-r border-gray-100 last:border-r-0 relative group p-0 hover:bg-gray-50 transition-colors cursor-pointer"
                              onClick={() => selectedStatus === "DRAFT" && openEditModal(daySession)}>
                            <div className={`absolute inset-1.5 ${theme.bg} border ${theme.border} rounded-xl p-3 flex flex-col shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all z-10`}>
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
                               
                               {selectedStatus === "DRAFT" && (
                                 <div className="absolute hidden group-hover:flex right-2 bottom-2 bg-white rounded-full px-2 py-1 shadow-sm text-[10px] font-bold text-gray-700 border border-gray-200">
                                   Edit
                                 </div>
                               )}
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={`${day}-${slot}`} className="px-2 py-2 border-r border-gray-100 last:border-r-0 relative group">
                          <div className="h-full w-full opacity-0 group-hover/row:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="text-gray-200 text-xs">+</span>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Timetables</h1>
          <p className="text-sm text-gray-500 mt-1">
            View, edit, and publish draft schedules.
          </p>
        </div>
        {filteredSessions.length > 0 && selectedStatus === "DRAFT" && (
          <button 
            onClick={handlePublish}
            disabled={publishing}
            className="mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Publish Timetables
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm border border-red-100 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg mb-6 text-sm border border-green-100 flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600">×</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-800">Filter Timetables</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Faculty</label>
            <select
              value={selectedFaculty}
              onChange={(e) => {
                setSelectedFaculty(e.target.value);
                setSelectedDept("");
                setSelectedDegree("");
                setSelectedBatch("");
              }}
              className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              {currentUser?.role !== "Scheduler" && (
                <option value="">All Faculties</option>
              )}
              {faculties.map((f) => (
                <option key={f.faculty_id} value={f.faculty_id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setSelectedDegree("");
                setSelectedBatch("");
              }}
              disabled={!selectedFaculty && faculties.length > 0} 
              className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 text-sm"
            >
              <option value="">All Departments</option>
              {filteredDepartments.map((d) => (
                <option key={d.dept_id} value={d.dept_id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Degree</label>
            <select
              value={selectedDegree}
              onChange={(e) => {
                setSelectedDegree(e.target.value);
                setSelectedBatch("");
              }}
              disabled={!selectedDept && departments.length > 0}
              className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 text-sm"
            >
              <option value="">All Degrees</option>
              {filteredDegrees.map((d) => (
                <option key={d.degree_id} value={d.degree_id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Batch</label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              disabled={!selectedDegree && degrees.length > 0}
              className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 text-sm"
            >
              <option value="">All Batches</option>
              {filteredBatches.map((b) => (
                <option key={b.batch_id} value={b.batch_id}>{b.batch_code}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <div>
            {selectedStatus === "PUBLISHED" && filteredSessions.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 mr-2">Export All:</span>
                <button
                  onClick={() => handleExportAll('docx')}
                  disabled={exportingBatch === 'all-docx'}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  {exportingBatch === 'all-docx' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  DOCX
                </button>
                <button
                  onClick={() => handleExportAll('pdf')}
                  disabled={exportingBatch === 'all-pdf'}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  {exportingBatch === 'all-pdf' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  PDF
                </button>
              </div>
            )}
          </div>
          <button
            onClick={fetchTimetables}
            disabled={loading}
            className="bg-gray-900 text-white px-5 py-2 rounded-lg font-medium hover:bg-gray-800 focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-70 flex items-center gap-2 text-sm shadow-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Find Timetables
          </button>
        </div>
      </div>

      {/* Results View */}
      {filteredSessions.length > 0 ? (
        <div className="space-y-8 pb-12">
          {Object.entries(timetablesByBatch).map(([batchCode, batchSessions]) => 
            renderBatchTimetable(batchCode, batchSessions)
          )}
        </div>
      ) : (
        !loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center min-h-[300px] text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <CalendarDays className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No Timetables Found</h3>
            <p className="text-gray-500 max-w-sm text-sm">
              Try adjusting your filters or generate a new timetable from the generation menu.
            </p>
          </div>
        )
      )}

      {/* Edit Modal with AI suggestions */}
      {editSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-gray-900">Edit Class Session</h3>
                <p className="text-xs text-gray-500">{editSession.module_code} - {editSession.module_name}</p>
              </div>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Day</label>
                    <select
                      value={editForm.day}
                      onChange={(e) => setEditForm({...editForm, day: e.target.value})}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    >
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Room</label>
                    <select
                      value={editForm.resource_id}
                      onChange={(e) => setEditForm({...editForm, resource_id: e.target.value})}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    >
                      {resources
                        .filter(r => r.faculty_id === editSession?.faculty_id)
                        .map(r => <option key={r.resource_id} value={r.resource_id}>{r.name} ({r.type})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
                    <select
                      value={editForm.start_time}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        if (!newStart) return;
                        
                        const [hours, mins] = newStart.split(":").map(Number);
                        const duration = editSession?.duration_hours || 1;
                        const endHours = Math.min(23, hours + duration).toString().padStart(2, "0");
                        const endMins = mins.toString().padStart(2, "0");
                        
                        setEditForm({ 
                          ...editForm, 
                          start_time: newStart, 
                          end_time: `${endHours}:${endMins}` 
                        });
                      }}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    >
                      {generateTimeSlots(480, 1020).map(slot => {
                        const startOnly = slot.split(" - ")[0];
                        return <option key={startOnly} value={startOnly}>{startOnly}</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">End Time (Auto-calculated)</label>
                    <input
                      type="time"
                      value={editForm.end_time}
                      disabled
                      className="w-full border-gray-300 rounded-lg shadow-sm bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Validation Error & Suggestions */}
                {editError && (
                  <div className="mt-6 border border-red-200 rounded-xl overflow-hidden">
                    <div className="bg-red-50 px-4 py-3 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-800">Conflict Detected</p>
                        <p className="text-xs text-red-600 mt-1">{editError}</p>
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 border-t border-red-100">
                      <div className="flex items-center gap-2 mb-3">
                        <Wand2 className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-800">AI Suggested Alternatives</span>
                      </div>
                      
                      {loadingSuggestions ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                        </div>
                      ) : suggestions.length > 0 ? (
                        <div className="space-y-2">
                          {suggestions.map((sg, idx) => (
                            <label key={idx} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${selectedSuggestion === sg ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                              <input 
                                type="radio" 
                                name="suggestion" 
                                className="text-purple-600 focus:ring-purple-500"
                                onChange={() => applySuggestion(sg)}
                                checked={selectedSuggestion === sg}
                              />
                              <div className="ml-3 flex-1 flex justify-between items-center text-sm">
                                <span className="font-medium text-gray-900">{sg.day}</span>
                                <span className="text-gray-600">{sg.start_time} - {sg.end_time}</span>
                                <span className="text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3"/> {sg.room_name}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 py-2">No viable alternatives found. You may need to adjust constraints manually.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={closeEditModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              >
                {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
