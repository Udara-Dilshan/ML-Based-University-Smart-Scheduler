import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../layout/AdminLayout";
import { academicAPI, getUser } from "../../../services/api";

const LecturerSearchInput = ({ lecturers, departmentById, value, onChange }) => {
  const getLabel = (l) => {
    const deptCode = departmentById[l.dept_id]?.code;
    return deptCode ? `${l.full_name} (${deptCode})` : l.full_name;
  };
  
  const selectedLecturer = lecturers.find(l => String(l.user_id) === String(value));
  const [searchText, setSearchText] = useState(selectedLecturer ? getLabel(selectedLecturer) : "");

  useEffect(() => {
    if (value) {
      const l = lecturers.find(l => String(l.user_id) === String(value));
      if (l) setSearchText(getLabel(l));
    } else {
      setSearchText("");
    }
  }, [value, lecturers, departmentById]);

  return (
    <input
      type="text"
      list="lecturer-options"
      value={searchText}
      placeholder="Type to search lecturer..."
      onChange={(e) => {
        setSearchText(e.target.value);
        const matched = lecturers.find(l => getLabel(l) === e.target.value);
        onChange(matched ? String(matched.user_id) : "");
      }}
      className="w-full min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
    />
  );
};

export default function LecturerAllocations() {
  const currentUser = getUser();
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [degrees, setDegrees] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [batches, setBatches] = useState([]);

  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedDegreeId, setSelectedDegreeId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");

  const [activeModulesPayload, setActiveModulesPayload] = useState(null);
  const [rowLecturerByModule, setRowLecturerByModule] = useState({});
  const [savingByModule, setSavingByModule] = useState({});
  const [savingAll, setSavingAll] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingModules, setLoadingModules] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ── derived data ──────────────────────────────────────────────────────────

  const departmentById = useMemo(() =>
    departments.reduce((acc, d) => { acc[d.dept_id] = d; return acc; }, {}),
    [departments]
  );

  const filteredDepartments = useMemo(() => {
    if (!selectedFacultyId) return departments;
    return departments.filter(d => Number(d.faculty_id) === Number(selectedFacultyId));
  }, [departments, selectedFacultyId]);

  const filteredDegrees = useMemo(() => {
    return degrees.filter(deg => {
      if (selectedDepartmentId && Number(deg.dept_id) !== Number(selectedDepartmentId)) return false;
      if (selectedFacultyId) {
        const dept = departmentById[deg.dept_id];
        if (!dept || Number(dept.faculty_id) !== Number(selectedFacultyId)) return false;
      }
      return true;
    });
  }, [degrees, selectedDepartmentId, selectedFacultyId, departmentById]);

  const filteredBatches = useMemo(() => {
    return batches.filter(batch => {
      const deg = batch.degree;
      if (!deg) return false;
      if (selectedDegreeId && Number(deg.degree_id) !== Number(selectedDegreeId)) return false;
      if (selectedDepartmentId && Number(deg.dept_id) !== Number(selectedDepartmentId)) return false;
      if (selectedFacultyId) {
        const dept = departmentById[deg.dept_id];
        if (!dept || Number(dept.faculty_id) !== Number(selectedFacultyId)) return false;
      }
      return true;
    });
  }, [batches, selectedDegreeId, selectedDepartmentId, selectedFacultyId, departmentById]);

  const selectedBatch = useMemo(
    () => filteredBatches.find(b => b.batch_id === Number(selectedBatchId)) || null,
    [filteredBatches, selectedBatchId]
  );

  const departmentLecturers = useMemo(() => {
    return lecturers;
  }, [lecturers]);

  // rows that have a lecturer selected
  const assignableRows = useMemo(() =>
    (activeModulesPayload?.modules || []).filter(m => rowLecturerByModule[m.module_id]),
    [activeModulesPayload, rowLecturerByModule]
  );

  // ── loaders ───────────────────────────────────────────────────────────────

  const loadInitial = async () => {
    try {
      setLoading(true);
      setError("");
      const [facultyData, deptData, degreeData, lecturerData, batchData] = await Promise.all([
        academicAPI.getFaculties(),
        academicAPI.getDepartments(),
        academicAPI.getDegrees(),
        academicAPI.getLecturerAllocationLecturers(),
        academicAPI.getBatches(),
      ]);
      setFaculties(facultyData);
      setDepartments(deptData);
      setDegrees(degreeData);
      setLecturers(lecturerData);
      setBatches(batchData);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadActiveModules = async (batchId) => {
    if (!batchId) {
      setActiveModulesPayload(null);
      setRowLecturerByModule({});
      return;
    }
    try {
      setLoadingModules(true);
      setError("");
      const payload = await academicAPI.getLecturerAllocationActiveModules(batchId);
      setActiveModulesPayload(payload);
      const defaults = {};
      payload.modules.forEach(m => {
        defaults[m.module_id] = m.assigned_lecturer_user_id ? String(m.assigned_lecturer_user_id) : "";
      });
      setRowLecturerByModule(defaults);
    } catch (err) {
      setActiveModulesPayload(null);
      setRowLecturerByModule({});
      setError(err.response?.data?.detail || "Failed to load active modules");
    } finally {
      setLoadingModules(false);
    }
  };

  useEffect(() => { loadInitial(); }, []);
  useEffect(() => {
    loadActiveModules(selectedBatchId ? Number(selectedBatchId) : null);
  }, [selectedBatchId]);

  // reset downstream when batch no longer in filtered list
  useEffect(() => {
    if (selectedBatchId && !filteredBatches.some(b => b.batch_id === Number(selectedBatchId))) {
      setSelectedBatchId("");
    }
  }, [filteredBatches]);

  useEffect(() => {
    if (selectedDepartmentId && !filteredDepartments.some(d => d.dept_id === Number(selectedDepartmentId))) {
      setSelectedDepartmentId("");
    }
  }, [filteredDepartments]);

  useEffect(() => {
    if (selectedDegreeId && !filteredDegrees.some(d => d.degree_id === Number(selectedDegreeId))) {
      setSelectedDegreeId("");
    }
  }, [filteredDegrees]);

  // auto-clear message
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(""), 4000);
    return () => window.clearTimeout(t);
  }, [message]);

  // ── save actions ──────────────────────────────────────────────────────────

  const saveAssignment = async (moduleId, lecturerUserId) => {
    if (!selectedBatchId || !lecturerUserId) return;
    try {
      setSavingByModule(prev => ({ ...prev, [moduleId]: true }));
      setError("");
      await academicAPI.assignLecturerToModule({
        batch_id: Number(selectedBatchId),
        module_id: Number(moduleId),
        lecturer_user_id: Number(lecturerUserId),
      });
      setMessage("Lecturer assignment saved");
      await loadActiveModules(Number(selectedBatchId));
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save assignment");
    } finally {
      setSavingByModule(prev => ({ ...prev, [moduleId]: false }));
    }
  };

  const handleSaveAll = async () => {
    if (!selectedBatchId || assignableRows.length === 0) return;
    try {
      setSavingAll(true);
      setError("");
      await Promise.all(
        assignableRows.map(m =>
          academicAPI.assignLecturerToModule({
            batch_id: Number(selectedBatchId),
            module_id: Number(m.module_id),
            lecturer_user_id: Number(rowLecturerByModule[m.module_id]),
          })
        )
      );
      setMessage(`All ${assignableRows.length} assignments saved successfully!`);
      await loadActiveModules(Number(selectedBatchId));
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save all assignments");
    } finally {
      setSavingAll(false);
    }
  };

  // ── helpers ───────────────────────────────────────────────────────────────

  const clearFilters = () => {
    setSelectedFacultyId("");
    setSelectedDepartmentId("");
    setSelectedDegreeId("");
    setSelectedBatchId("");
  };

  const hasActiveFilters = selectedFacultyId || selectedDepartmentId || selectedDegreeId || selectedBatchId;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-r from-cyan-50 via-white to-blue-50 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Lecturer Allocations</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Assign Lecturers to Active Modules</h1>
        <p className="mt-2 text-sm text-slate-500">
          Use the filters below to narrow down batches, then assign lecturers to each module.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="mt-0.5 text-base">⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span className="mt-0.5 text-base">✅</span>
          <span>{message}</span>
        </div>
      )}

      {/* ── Filter Panel ── */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* panel header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filter Batches
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              ✕ Clear all
            </button>
          )}
        </div>

        {/* filter dropdowns */}
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Faculty */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Faculty</label>
            <select
              value={selectedFacultyId}
              onChange={e => {
                setSelectedFacultyId(e.target.value);
                setSelectedDepartmentId("");
                setSelectedDegreeId("");
                setSelectedBatchId("");
              }}
              disabled={loading}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
            >
              {currentUser?.role !== "Scheduler" && (
                <option value="">All Faculties</option>
              )}
              {faculties.map(f => (
                <option key={f.faculty_id} value={f.faculty_id}>
                  {f.code ? `${f.code} – ${f.name}` : f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Department</label>
            <select
              value={selectedDepartmentId}
              onChange={e => {
                setSelectedDepartmentId(e.target.value);
                setSelectedDegreeId("");
                setSelectedBatchId("");
              }}
              disabled={loading}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
            >
              <option value="">All Departments</option>
              {filteredDepartments.map(d => (
                <option key={d.dept_id} value={d.dept_id}>
                  {d.code ? `${d.code} – ${d.name}` : d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Degree */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Degree</label>
            <select
              value={selectedDegreeId}
              onChange={e => {
                setSelectedDegreeId(e.target.value);
                setSelectedBatchId("");
              }}
              disabled={loading}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
            >
              <option value="">All Degrees</option>
              {filteredDegrees.map(deg => (
                <option key={deg.degree_id} value={deg.degree_id}>
                  {deg.code ? `${deg.code} – ${deg.name}` : deg.name}
                </option>
              ))}
            </select>
          </div>

          {/* Batch */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Batch</label>
            <select
              value={selectedBatchId}
              onChange={e => setSelectedBatchId(e.target.value)}
              disabled={loading}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
            >
              <option value="">Select Batch</option>
              {filteredBatches.map(b => (
                <option key={b.batch_id} value={b.batch_id}>
                  {b.batch_code || b.name}
                  {b.degree ? ` – ${b.degree.code}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3">
            <span className="text-xs text-slate-400">Active filters:</span>
            {selectedFacultyId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                {faculties.find(f => f.faculty_id === Number(selectedFacultyId))?.code || "Faculty"}
                <button onClick={() => { setSelectedFacultyId(""); setSelectedDepartmentId(""); setSelectedDegreeId(""); setSelectedBatchId(""); }} className="hover:text-blue-900">✕</button>
              </span>
            )}
            {selectedDepartmentId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                {departments.find(d => d.dept_id === Number(selectedDepartmentId))?.code || "Dept"}
                <button onClick={() => { setSelectedDepartmentId(""); setSelectedDegreeId(""); setSelectedBatchId(""); }} className="hover:text-violet-900">✕</button>
              </span>
            )}
            {selectedDegreeId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                {degrees.find(d => d.degree_id === Number(selectedDegreeId))?.code || "Degree"}
                <button onClick={() => { setSelectedDegreeId(""); setSelectedBatchId(""); }} className="hover:text-emerald-900">✕</button>
              </span>
            )}
            {selectedBatchId && selectedBatch && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                {selectedBatch.batch_code || selectedBatch.name}
                <button onClick={() => setSelectedBatchId("")} className="hover:text-amber-900">✕</button>
              </span>
            )}
          </div>
        )}

        {/* Batch info strip */}
        {selectedBatch && activeModulesPayload && (
          <div className="flex items-center gap-4 border-t border-slate-100 bg-slate-50 px-5 py-2.5 rounded-b-xl">
            <span className="text-xs text-slate-500">
              Batch: <strong className="text-slate-700">{selectedBatch.batch_code || selectedBatch.name}</strong>
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500">
              Semester: <strong className="text-slate-700">{activeModulesPayload.semester_name}</strong>
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500">
              Modules: <strong className="text-slate-700">{activeModulesPayload.modules?.length ?? 0}</strong>
            </span>
          </div>
        )}

        {selectedBatchId && !loadingModules && filteredBatches.length === 0 && (
          <p className="px-5 pb-4 text-sm text-amber-600">No batches match the selected filters.</p>
        )}
      </div>

      {/* ── Module Table ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* table toolbar */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <p className="text-sm font-semibold text-slate-700">
            {activeModulesPayload
              ? `Active Modules (${activeModulesPayload.modules?.length ?? 0})`
              : "Active Modules"}
          </p>
          {activeModulesPayload && activeModulesPayload.modules?.length > 0 && (
            <button
              type="button"
              id="save-all-btn"
              onClick={handleSaveAll}
              disabled={savingAll || assignableRows.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors shadow-sm"
            >
              {savingAll ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving All…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 3H7a2 2 0 00-2 2v16l7-3 7 3V5a2 2 0 00-2-2z" />
                  </svg>
                  Save All ({assignableRows.length})
                </>
              )}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Code</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Module Name</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Credits</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Assigned Lecturer</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Save</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Loading */}
              {loadingModules && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                      <span className="text-sm">Loading modules…</span>
                    </div>
                  </td>
                </tr>
              )}

              {/* No batch selected */}
              {!loadingModules && !selectedBatchId && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <svg className="h-10 w-10 text-slate-200" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="text-sm">Select a batch to view active modules</span>
                    </div>
                  </td>
                </tr>
              )}

              {/* No modules */}
              {!loadingModules && selectedBatchId && (activeModulesPayload?.modules || []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">
                    No active modules found for the current semester in this batch.
                  </td>
                </tr>
              )}

              {/* Module rows */}
              {!loadingModules &&
                (activeModulesPayload?.modules || []).map(module => {
                  const currentVal = rowLecturerByModule[module.module_id] || "";
                  const isSaving = Boolean(savingByModule[module.module_id]);
                  const hasLecturer = Boolean(currentVal);

                  return (
                    <tr key={module.module_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          {module.code}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-800 font-medium">{module.name}</td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-slate-500">{module.credits} cr</span>
                      </td>
                      <td className="px-5 py-3">
                        <LecturerSearchInput
                          lecturers={departmentLecturers}
                          departmentById={departmentById}
                          value={currentVal}
                          onChange={(newVal) =>
                            setRowLecturerByModule(prev => ({
                              ...prev,
                              [module.module_id]: newVal,
                            }))
                          }
                        />
                      </td>
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          id={`save-module-${module.module_id}`}
                          onClick={() => saveAssignment(module.module_id, currentVal)}
                          disabled={isSaving || !hasLecturer}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                        >
                          {isSaving ? (
                            <>
                              <span className="inline-block h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                              Saving…
                            </>
                          ) : "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Bottom Save All bar */}
        {activeModulesPayload && activeModulesPayload.modules?.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3">
            <p className="text-xs text-slate-500">
              {assignableRows.length} of {activeModulesPayload.modules.length} module(s) ready to save
            </p>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={savingAll || assignableRows.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors shadow-sm"
            >
              {savingAll ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving All…
                </>
              ) : (
                <>💾 Save All ({assignableRows.length})</>
              )}
            </button>
          </div>
        )}
      </div>
        {/* Global Datalist for Searchable Lecturers */}
      <datalist id="lecturer-options">
        {departmentLecturers.map(l => {
          const deptCode = departmentById[l.dept_id]?.code;
          const label = deptCode ? `${l.full_name} (${deptCode})` : l.full_name;
          return (
            <option key={l.user_id} value={label} />
          );
        })}
      </datalist>
    </AdminLayout>
  );
}
