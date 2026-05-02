import { useEffect, useMemo, useState } from "react";
import { CheckSquare, Filter, Save } from "lucide-react";
import AdminLayout from "../layout/AdminLayout";
import { academicAPI } from "../../../services/api";

const semesterOptions = Array.from({ length: 10 }, (_, index) => {
  const semesterNumber = index + 1;
  const year = Math.ceil(semesterNumber / 2);
  const semester = semesterNumber % 2 === 0 ? 2 : 1;
  return {
    value: semesterNumber,
    label: `Year ${year} Semester ${semester}`,
  };
});

export default function DegreeSemesterModules() {
  const [degrees, setDegrees] = useState([]);
  const [selectedDegreeId, setSelectedDegreeId] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [moduleSearch, setModuleSearch] = useState("");
  const [selectionData, setSelectionData] = useState(null);
  const [checkedModuleIds, setCheckedModuleIds] = useState(new Set());
  const [savedRows, setSavedRows] = useState([]);
  const [loadingDegrees, setLoadingDegrees] = useState(false);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedDegree = useMemo(
    () => degrees.find((degree) => degree.degree_id === Number(selectedDegreeId)) || null,
    [degrees, selectedDegreeId]
  );

  const availableSemesters = useMemo(() => {
    if (!selectedDegree?.duration_years) {
      return semesterOptions;
    }
    const allowedCount = selectedDegree.duration_years * 2;
    return semesterOptions.filter((item) => item.value <= allowedCount);
  }, [selectedDegree]);

  const loadDegrees = async () => {
    try {
      setLoadingDegrees(true);
      setError("");
      const degreeData = await academicAPI.getDegrees();
      setDegrees(degreeData);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load degrees");
    } finally {
      setLoadingDegrees(false);
    }
  };

  const loadSavedRows = async (degreeId) => {
    try {
      setLoadingTable(true);
      const rows = await academicAPI.getDegreeSemesterModules(degreeId);
      setSavedRows(rows);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load saved module assignments");
    } finally {
      setLoadingTable(false);
    }
  };

  const loadModuleSelection = async (degreeId, semesterNumber) => {
    try {
      setLoadingModules(true);
      setError("");
      const data = await academicAPI.getDegreeSemesterModuleSelection(degreeId, semesterNumber);
      setSelectionData(data);
      setCheckedModuleIds(new Set(data.modules.filter((module) => module.assigned).map((module) => module.module_id)));
    } catch (err) {
      setSelectionData(null);
      setCheckedModuleIds(new Set());
      setError(err.response?.data?.detail || "Failed to load modules for selected degree and semester");
    } finally {
      setLoadingModules(false);
    }
  };

  useEffect(() => {
    loadDegrees();
  }, []);

  useEffect(() => {
    if (!selectedDegreeId) {
      setSavedRows([]);
      return;
    }
    loadSavedRows(Number(selectedDegreeId));
  }, [selectedDegreeId]);

  useEffect(() => {
    if (!selectedDegreeId || !selectedSemester) {
      setSelectionData(null);
      setCheckedModuleIds(new Set());
      return;
    }
    loadModuleSelection(Number(selectedDegreeId), Number(selectedSemester));
  }, [selectedDegreeId, selectedSemester]);

  const handleDegreeChange = (event) => {
    const degreeId = event.target.value;
    setSelectedDegreeId(degreeId);
    setMessage("");

    if (!degreeId) {
      setSelectedSemester("");
      return;
    }

    const degree = degrees.find((item) => item.degree_id === Number(degreeId));
    if (!degree) {
      setSelectedSemester("");
      return;
    }

    const maxSemester = degree.duration_years * 2;
    if (selectedSemester && Number(selectedSemester) > maxSemester) {
      setSelectedSemester("");
    }
  };

  const handleSemesterChange = (event) => {
    setSelectedSemester(event.target.value);
    setMessage("");
  };

  const toggleModule = (moduleId) => {
    setCheckedModuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedDegreeId || !selectedSemester) {
      setError("Select a degree and semester before saving");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const payload = {
        degree_id: Number(selectedDegreeId),
        semester_number: Number(selectedSemester),
        module_ids: Array.from(checkedModuleIds),
      };

      const result = await academicAPI.saveDegreeSemesterModules(payload);
      setMessage(`Saved ${result.saved_count} module(s) for ${selectionData?.semester_label || "selected semester"}`);

      await Promise.all([
        loadModuleSelection(Number(selectedDegreeId), Number(selectedSemester)),
        loadSavedRows(Number(selectedDegreeId)),
      ]);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save module assignments");
    } finally {
      setSaving(false);
    }
  };

  const groupedRows = useMemo(() => {
    const groups = {};
    savedRows.forEach((row) => {
      const key = `${row.degree_id}-${row.semester_number}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          degree_name: row.degree_name,
          degree_code: row.degree_code,
          semester_label: row.semester_label,
          modules: [],
        };
      }
      groups[key].modules.push(row);
    });
    return Object.values(groups);
  }, [savedRows]);

  const filteredModules = useMemo(() => {
    const modules = selectionData?.modules || [];
    const query = moduleSearch.trim().toLowerCase();

    if (!query) {
      return modules;
    }

    return modules.filter((module) => {
      const code = (module.code || "").toLowerCase();
      const name = (module.name || "").toLowerCase();
      return code.includes(query) || name.includes(query);
    });
  }, [selectionData, moduleSearch]);

  return (
    <AdminLayout>
      <div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-r from-sky-50 via-white to-cyan-50 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Curriculum Builder</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Assign Modules by Degree Semester</h1>
        <p className="mt-2 text-sm text-slate-600">
          Select a degree and semester, then map modules using the checklist. Saved results appear below as a semester-wise table.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-slate-700">
            <Filter size={16} />
            <h2 className="text-lg font-semibold">Select Degree and Semester</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Degree</label>
              <select
                value={selectedDegreeId}
                onChange={handleDegreeChange}
                disabled={loadingDegrees}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              >
                <option value="">Select degree</option>
                {degrees.map((degree) => (
                  <option key={degree.degree_id} value={degree.degree_id}>
                    {degree.code} - {degree.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Semester</label>
              <select
                value={selectedSemester}
                onChange={handleSemesterChange}
                disabled={!selectedDegreeId}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              >
                <option value="">Select semester</option>
                {availableSemesters.map((semester) => (
                  <option key={semester.value} value={semester.value}>
                    {semester.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Available Modules</h3>
            <button
              type="button"
              onClick={handleSave}
              disabled={!selectedDegreeId || !selectedSemester || saving || loadingModules}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={14} />
              {saving ? "Saving..." : "Save Assignment"}
            </button>
          </div>

          <div className="mt-3">
            <input
              type="text"
              value={moduleSearch}
              onChange={(event) => setModuleSearch(event.target.value)}
              placeholder="Search modules by code or name..."
              disabled={loadingModules || !selectedDegreeId || !selectedSemester}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>

          {loadingModules ? (
            <p className="mt-4 text-sm text-slate-500">Loading modules...</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {filteredModules.length ? (
                filteredModules.map((module) => {
                  const isChecked = checkedModuleIds.has(module.module_id);
                  return (
                    <label
                      key={module.module_id}
                      className={`cursor-pointer rounded-xl border px-4 py-3 transition ${
                        isChecked
                          ? "border-sky-300 bg-sky-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          checked={isChecked}
                          onChange={() => toggleModule(module.module_id)}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{module.code}</p>
                          <p className="text-sm text-slate-700">{module.name}</p>
                          <p className="text-xs text-slate-500">
                            {module.credits} credits • {module.lecture_hours_per_week} hrs/week
                          </p>
                        </div>
                      </div>
                    </label>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                  {moduleSearch.trim()
                    ? "No modules match your search."
                    : "No modules found for this degree."}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-slate-700">
            <CheckSquare size={16} />
            <h2 className="text-lg font-semibold">Quick Summary</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-slate-500">Selected Degree</p>
              <p className="font-medium text-slate-900">
                {selectedDegree ? `${selectedDegree.code} - ${selectedDegree.name}` : "Not selected"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-slate-500">Selected Semester</p>
              <p className="font-medium text-slate-900">
                {selectedSemester ? semesterOptions.find((item) => item.value === Number(selectedSemester))?.label : "Not selected"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-slate-500">Checked Modules</p>
              <p className="font-medium text-slate-900">{checkedModuleIds.size}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Saved Degree Semester Modules</h2>
        <p className="mt-1 text-sm text-slate-500">Modules currently assigned to semesters for the selected degree.</p>

        {loadingTable ? (
          <p className="mt-4 text-sm text-slate-500">Loading assignment table...</p>
        ) : groupedRows.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Degree</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Semester</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Assigned Modules</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {groupedRows.map((group) => (
                  <tr key={group.key}>
                    <td className="px-4 py-3 text-slate-700">
                      {group.degree_code} - {group.degree_name}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{group.semester_label}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {group.modules.map((module) => (
                          <span
                            key={module.id}
                            className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
                          >
                            {module.module_code} ({module.credits} cr)
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
            No saved assignments yet for this degree.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
