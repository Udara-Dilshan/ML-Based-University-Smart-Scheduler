import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../layout/AdminLayout";
import Modal from "../../../components/Modal";
import { academicAPI } from "../../../services/api";

const initialForm = {
  name: "",
  code: "",
};

export default function FacultyManagement() {
  const [faculties, setFaculties] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const modalTitle = useMemo(() => (editId ? "Edit Faculty" : "Add Faculty"), [editId]);

  const loadFaculties = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await academicAPI.getFaculties();
      setFaculties(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load faculties");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaculties();
  }, []);

  const openCreateModal = () => {
    setEditId(null);
    setForm(initialForm);
    setModalError("");
    setIsModalOpen(true);
  };

  const openEditModal = (faculty) => {
    setEditId(faculty.faculty_id);
    setForm({
      name: faculty.name || "",
      code: faculty.code || "",
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
    if (!form.name.trim() || !form.code.trim()) {
      setModalError("Faculty name and code are required");
      return;
    }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
    };

    try {
      setSaving(true);
      setModalError("");
      if (editId) {
        await academicAPI.updateFaculty(editId, payload);
      } else {
        await academicAPI.createFaculty(payload);
      }
      await loadFaculties();
      closeModal();
    } catch (err) {
      setModalError(err.response?.data?.detail || "Failed to save faculty");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (facultyId) => {
    try {
      setError("");
      await academicAPI.deleteFaculty(facultyId);
      await loadFaculties();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete faculty");
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Faculty Management</h1>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add Faculty
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[700px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Code</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Faculty</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={3}>
                  Loading faculties...
                </td>
              </tr>
            )}
            {!loading && faculties.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={3}>
                  No faculties found.
                </td>
              </tr>
            )}
            {!loading &&
              faculties.map((faculty) => (
                <tr key={faculty.faculty_id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-sm text-gray-700">{faculty.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{faculty.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(faculty)}
                        className="rounded bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-600"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(faculty.faculty_id)}
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
            placeholder="Faculty Name"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <input
            name="code"
            value={form.code}
            onChange={handleChange}
            placeholder="Faculty Code"
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
            {saving ? "Saving..." : editId ? "Update Faculty" : "Add Faculty"}
          </button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
