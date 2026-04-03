import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../layout/AdminLayout";
import Modal from "../../../components/Modal";
import { resourceAPI } from "../../../services/api";

const initialForm = {
  name: "",
  type: "Lecture Hall",
  capacity: "",
  location: "",
};

const resourceTypes = ["Lecture Hall", "Lab", "Auditorium", "Ground"];

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const modalTitle = useMemo(
    () => (editId ? "Edit Resource" : "Add Resource"),
    [editId]
  );

  const loadResources = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await resourceAPI.getResources();
      setResources(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load resources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  const openCreateModal = () => {
    setEditId(null);
    setForm(initialForm);
    setModalError("");
    setIsModalOpen(true);
  };

  const openEditModal = (resource) => {
    setEditId(resource.resource_id);
    setForm({
      name: resource.name || "",
      type: resource.type || "Lecture Hall",
      capacity: resource.capacity ? String(resource.capacity) : "",
      location: resource.location || "",
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
    const capacity = Number(form.capacity);
    if (!form.name.trim() || !form.type.trim() || !Number.isFinite(capacity) || capacity <= 0) {
      setModalError("Resource name, type and a valid capacity are required");
      return;
    }

    const payload = {
      name: form.name.trim(),
      type: form.type.trim(),
      capacity,
      location: form.location.trim() || null,
    };

    try {
      setSaving(true);
      setModalError("");
      if (editId) {
        await resourceAPI.updateResource(editId, payload);
      } else {
        await resourceAPI.createResource(payload);
      }
      await loadResources();
      closeModal();
    } catch (err) {
      setModalError(err.response?.data?.detail || "Failed to save resource");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (resourceId) => {
    const confirmed = window.confirm("Are you sure you want to delete this resource? This action cannot be undone.");
    if (!confirmed) {
      return;
    }

    try {
      setError("");
      await resourceAPI.deleteResource(resourceId);
      await loadResources();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete resource");
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Resources</h1>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add Resource
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
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Capacity</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={5}>
                  Loading resources...
                </td>
              </tr>
            )}
            {!loading && resources.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={5}>
                  No resources found.
                </td>
              </tr>
            )}
            {!loading &&
              resources.map((resource) => (
                <tr key={resource.resource_id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-sm text-gray-800">{resource.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{resource.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{resource.capacity}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{resource.location || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(resource)}
                        className="rounded bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-600"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(resource.resource_id)}
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
            placeholder="Resource Name"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            {resourceTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            name="capacity"
            value={form.capacity}
            onChange={handleChange}
            type="number"
            min="1"
            placeholder="Capacity"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <input
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="Location"
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
            {saving ? "Saving..." : editId ? "Update Resource" : "Add Resource"}
          </button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
