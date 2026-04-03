import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../layout/AdminLayout";
import Modal from "../../../components/Modal";
import { academicAPI } from "../../../services/api";

const initialForm = {
  name: "",
  academic_year: "",
  dept_id: "",
};

export default function Batches() {
  const [batches, setBatches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const modalTitle = useMemo(() => (editId ? "Edit Batch" : "Add Batch"), [editId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [batchData, deptData] = await Promise.all([
        academicAPI.getBatches(),
        academicAPI.getDepartments(),
      ]);
      setBatches(batchData);
      setDepartments(deptData);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load batches");
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

  const openEditModal = (batch) => {
    setEditId(batch.batch_id);
    setForm({
      name: batch.name || "",
      academic_year: batch.academic_year || "",
      dept_id: batch.dept_id ? String(batch.dept_id) : "",
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
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.academic_year.trim()) {
      setModalError("Batch name and academic year are required");
      return;
    }

    const payload = {
      name: form.name.trim(),
      academic_year: form.academic_year.trim(),
      dept_id: form.dept_id ? Number(form.dept_id) : null,
    };

    try {
      setSaving(true);
      setModalError("");
      if (editId) {
        await academicAPI.updateBatch(editId, payload);
      } else {
        await academicAPI.createBatch(payload);
      }
      await loadData();
      closeModal();
    } catch (err) {
      setModalError(err.response?.data?.detail || "Failed to save batch");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (batchId) => {
    const confirmed = window.confirm("Are you sure you want to delete this batch? This action cannot be undone.");
    if (!confirmed) {
      return;
    }

    try {
      setError("");
      await academicAPI.deleteBatch(batchId);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete batch");
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Batches</h1>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add Batch
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
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Batch</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Academic Year</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={4}>
                  Loading batches...
                </td>
              </tr>
            )}
            {!loading && batches.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={4}>
                  No batches found.
                </td>
              </tr>
            )}
            {!loading &&
              batches.map((batch) => (
                <tr key={batch.batch_id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-sm text-gray-800">{batch.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{batch.academic_year}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {batch.department?.name || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(batch)}
                        className="rounded bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-600"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(batch.batch_id)}
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
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Batch Name"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <input
            name="academic_year"
            value={form.academic_year}
            onChange={handleChange}
            placeholder="Academic Year (e.g. 2025/2029)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <select
            name="dept_id"
            value={form.dept_id}
            onChange={handleChange}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Select Department (Optional)</option>
            {departments.map((department) => (
              <option key={department.dept_id} value={department.dept_id}>
                {department.name}
              </option>
            ))}
          </select>
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
            {saving ? "Saving..." : editId ? "Update Batch" : "Add Batch"}
          </button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
