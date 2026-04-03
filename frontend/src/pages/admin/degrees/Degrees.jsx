import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../layout/AdminLayout";
import Modal from "../../../components/Modal";
import { academicAPI } from "../../../services/api";

const initialForm = {
  code: "",
  name: "",
  dept_id: "",
  duration_years: "4",
};

export default function Degrees() {
  const [degrees, setDegrees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const modalTitle = useMemo(() => (editId ? "Edit Degree" : "Add Degree"), [editId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [degreeData, departmentData] = await Promise.all([
        academicAPI.getDegrees(),
        academicAPI.getDepartments(),
      ]);
      setDegrees(degreeData);
      setDepartments(departmentData);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load degrees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditId(null);
    setForm(initialForm);
    setModalError("");
    setIsModalOpen(true);
  };

  const openEditModal = (degree) => {
    setEditId(degree.degree_id);
    setForm({
      code: degree.code || "",
      name: degree.name || "",
      dept_id: degree.dept_id ? String(degree.dept_id) : "",
      duration_years: degree.duration_years ? String(degree.duration_years) : "4",
    });
    setModalError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }
    setIsModalOpen(false);
    setEditId(null);
    setForm(initialForm);
    setModalError("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.name.trim() || !form.dept_id || !form.duration_years) {
      setModalError("Degree code, name, department and duration are required");
      return;
    }

    const durationYears = Number(form.duration_years);
    if (!Number.isFinite(durationYears) || durationYears <= 0) {
      setModalError("Duration years must be greater than 0");
      return;
    }

    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      dept_id: Number(form.dept_id),
      duration_years: durationYears,
    };

    try {
      setSaving(true);
      setModalError("");
      if (editId) {
        await academicAPI.updateDegree(editId, payload);
      } else {
        await academicAPI.createDegree(payload);
      }
      await loadData();
      closeModal();
    } catch (err) {
      setModalError(err.response?.data?.detail || "Failed to save degree");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (degreeId) => {
    const confirmed = window.confirm("Are you sure you want to delete this degree? This action cannot be undone.");
    if (!confirmed) {
      return;
    }

    try {
      setError("");
      await academicAPI.deleteDegree(degreeId);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete degree");
    }
  };

  const getDepartmentName = (deptId) => {
    const department = departments.find((item) => item.dept_id === deptId);
    return department?.name || "-";
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Degrees</h1>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add Degree
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Code</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Degree</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Duration (Years)</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={5}>
                  Loading degrees...
                </td>
              </tr>
            )}
            {!loading && degrees.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={5}>
                  No degrees found.
                </td>
              </tr>
            )}
            {!loading &&
              degrees.map((degree) => (
                <tr key={degree.degree_id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-sm text-gray-800">{degree.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{degree.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{getDepartmentName(degree.dept_id)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{degree.duration_years}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(degree)}
                        className="rounded bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-600"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(degree.degree_id)}
                        className="rounded bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Modal open={isModalOpen} title={modalTitle} onClose={closeModal}>
        {modalError && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {modalError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          <input
            name="code"
            value={form.code}
            onChange={handleChange}
            placeholder="Degree Code"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Degree Name"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <select
            name="dept_id"
            value={form.dept_id}
            onChange={handleChange}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Select Department</option>
            {departments.map((department) => (
              <option key={department.dept_id} value={department.dept_id}>
                {department.name}
              </option>
            ))}
          </select>
          <input
            name="duration_years"
            type="number"
            min="1"
            value={form.duration_years}
            onChange={handleChange}
            placeholder="Duration in years"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : editId ? "Update Degree" : "Add Degree"}
          </button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
