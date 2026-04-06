import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../layout/AdminLayout";
import { academicAPI } from "../../../services/api";

export default function LecturerAllocations() {
  const [lecturers, setLecturers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedLecturerId, setSelectedLecturerId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [activeModulesPayload, setActiveModulesPayload] = useState(null);
  const [rowLecturerByModule, setRowLecturerByModule] = useState({});
  const [savingByModule, setSavingByModule] = useState({});
  const [assigningQuick, setAssigningQuick] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingModules, setLoadingModules] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedLecturer = useMemo(
    () => lecturers.find((lecturer) => lecturer.user_id === Number(selectedLecturerId)) || null,
    [lecturers, selectedLecturerId]
  );

  const filteredBatches = useMemo(() => {
    if (!selectedLecturerId) {
      return [];
    }
    if (!selectedLecturer?.dept_id) {
      return [];
    }
    return batches.filter((batch) => batch.degree?.dept_id === Number(selectedLecturer.dept_id));
  }, [batches, selectedLecturer, selectedLecturerId]);

  const selectedBatch = useMemo(
    () => filteredBatches.find((batch) => batch.batch_id === Number(selectedBatchId)) || null,
    [filteredBatches, selectedBatchId]
  );

  const loadInitial = async () => {
    try {
      setLoading(true);
      setError("");
      const [lecturerData, batchData] = await Promise.all([
        academicAPI.getLecturerAllocationLecturers(),
        academicAPI.getBatches(),
      ]);
      setLecturers(lecturerData);
      setBatches(batchData);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load lecturers and batches");
    } finally {
      setLoading(false);
    }
  };

  const loadActiveModules = async (batchId) => {
    if (!batchId) {
      setActiveModulesPayload(null);
      setSelectedModuleId("");
      setRowLecturerByModule({});
      return;
    }

    try {
      setLoadingModules(true);
      setError("");
      const payload = await academicAPI.getLecturerAllocationActiveModules(batchId);
      setActiveModulesPayload(payload);

      const rowDefaults = {};
      payload.modules.forEach((module) => {
        rowDefaults[module.module_id] = module.assigned_lecturer_user_id
          ? String(module.assigned_lecturer_user_id)
          : "";
      });
      setRowLecturerByModule(rowDefaults);

      const moduleExists = payload.modules.some((module) => module.module_id === Number(selectedModuleId));
      if (!moduleExists) {
        setSelectedModuleId("");
      }
    } catch (err) {
      setActiveModulesPayload(null);
      setSelectedModuleId("");
      setRowLecturerByModule({});
      setError(err.response?.data?.detail || "Failed to load active modules for selected batch");
    } finally {
      setLoadingModules(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    loadActiveModules(selectedBatchId ? Number(selectedBatchId) : null);
  }, [selectedBatchId]);

  useEffect(() => {
    if (!selectedLecturerId) {
      if (selectedBatchId) {
        setSelectedBatchId("");
      }
      if (selectedModuleId) {
        setSelectedModuleId("");
      }
      setActiveModulesPayload(null);
      setRowLecturerByModule({});
      return;
    }

    if (selectedBatchId) {
      const stillAllowed = filteredBatches.some(
        (batch) => batch.batch_id === Number(selectedBatchId)
      );
      if (!stillAllowed) {
        setSelectedBatchId("");
      }
    }
  }, [selectedLecturerId, filteredBatches, selectedBatchId, selectedModuleId]);

  useEffect(() => {
    if (!message) {
      return;
    }
    const timer = window.setTimeout(() => setMessage(""), 4000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const saveAssignment = async (moduleId, lecturerUserId) => {
    if (!selectedBatchId) {
      setError("Select a batch first");
      return;
    }
    if (!lecturerUserId) {
      setError("Select a lecturer before saving");
      return;
    }

    try {
      setSavingByModule((prev) => ({ ...prev, [moduleId]: true }));
      setError("");
      await academicAPI.assignLecturerToModule({
        batch_id: Number(selectedBatchId),
        module_id: Number(moduleId),
        lecturer_user_id: Number(lecturerUserId),
      });
      setMessage("Lecturer assignment saved");
      await loadActiveModules(Number(selectedBatchId));
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save lecturer assignment");
    } finally {
      setSavingByModule((prev) => ({ ...prev, [moduleId]: false }));
    }
  };

  const handleQuickAssign = async () => {
    if (!selectedLecturerId || !selectedBatchId || !selectedModuleId) {
      setError("Select lecturer, batch and module before assigning");
      return;
    }

    try {
      setAssigningQuick(true);
      setError("");
      await academicAPI.assignLecturerToModule({
        batch_id: Number(selectedBatchId),
        module_id: Number(selectedModuleId),
        lecturer_user_id: Number(selectedLecturerId),
      });
      setMessage("Lecturer assigned successfully");
      await loadActiveModules(Number(selectedBatchId));
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to assign lecturer");
    } finally {
      setAssigningQuick(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-r from-cyan-50 via-white to-blue-50 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Lecturer Allocations</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Assign Lecturers to Active Modules</h1>
        <p className="mt-2 text-sm text-slate-600">
          Select a lecturer first, then batch and module. Only current-semester active modules for the selected batch are shown.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <select
            value={selectedLecturerId}
            onChange={(event) => setSelectedLecturerId(event.target.value)}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Select Lecturer</option>
            {lecturers.map((lecturer) => (
              <option key={lecturer.user_id} value={lecturer.user_id}>
                {lecturer.full_name} ({lecturer.email})
              </option>
            ))}
          </select>

          <select
            value={selectedBatchId}
            onChange={(event) => setSelectedBatchId(event.target.value)}
            disabled={!selectedLecturerId || loading}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Select Batch</option>
            {filteredBatches.map((batch) => (
              <option key={batch.batch_id} value={batch.batch_id}>
                {(batch.batch_code || batch.name)} - {batch.degree ? `${batch.degree.code}` : "No Degree"}
              </option>
            ))}
          </select>

          <select
            value={selectedModuleId}
            onChange={(event) => setSelectedModuleId(event.target.value)}
            disabled={!selectedBatchId || loadingModules}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Select Active Module</option>
            {(activeModulesPayload?.modules || []).map((module) => (
              <option key={module.module_id} value={module.module_id}>
                {module.code} - {module.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleQuickAssign}
            disabled={assigningQuick || !selectedLecturerId || !selectedBatchId || !selectedModuleId}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {assigningQuick ? "Assigning..." : "Assign Lecturer"}
          </button>
        </div>

        {selectedBatch && activeModulesPayload && (
          <p className="mt-3 text-sm text-slate-600">
            Batch: <span className="font-medium text-slate-800">{selectedBatch.batch_code || selectedBatch.name}</span>
            {" | "}
            Semester: <span className="font-medium text-slate-800">{activeModulesPayload.semester_name}</span>
          </p>
        )}

        {selectedLecturerId && !filteredBatches.length && (
          <p className="mt-3 text-sm text-amber-700">
            No batches found for the selected lecturer's department.
          </p>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[860px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Code</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Module</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Credits</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Assigned Lecturer</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Save</th>
            </tr>
          </thead>
          <tbody>
            {loadingModules && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={5}>
                  Loading active modules...
                </td>
              </tr>
            )}

            {!loadingModules && !selectedBatchId && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={5}>
                  Select a batch to load current semester active modules.
                </td>
              </tr>
            )}

            {!loadingModules && selectedBatchId && (activeModulesPayload?.modules || []).length === 0 && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={5}>
                  No active modules found for current semester in this batch.
                </td>
              </tr>
            )}

            {!loadingModules &&
              (activeModulesPayload?.modules || []).map((module) => (
                <tr key={module.module_id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-sm font-medium text-gray-700">{module.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{module.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{module.credits}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <select
                      value={rowLecturerByModule[module.module_id] || ""}
                      onChange={(event) =>
                        setRowLecturerByModule((prev) => ({
                          ...prev,
                          [module.module_id]: event.target.value,
                        }))
                      }
                      className="w-full min-w-[260px] rounded-md border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                    >
                      <option value="">Select lecturer</option>
                      {lecturers.map((lecturer) => (
                        <option key={lecturer.user_id} value={lecturer.user_id}>
                          {lecturer.full_name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => saveAssignment(module.module_id, rowLecturerByModule[module.module_id])}
                      disabled={Boolean(savingByModule[module.module_id]) || !rowLecturerByModule[module.module_id]}
                      className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingByModule[module.module_id] ? "Saving..." : "Save"}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
