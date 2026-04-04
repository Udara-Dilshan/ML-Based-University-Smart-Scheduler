import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import AdminLayout from "../layout/AdminLayout";
import Modal from "../../../components/Modal";
import { academicAPI } from "../../../services/api";

const initialForm = {
  name: "",
  code: "",
  faculty_id: "",
};

const normalizeText = (value) => String(value ?? "").trim().toLowerCase();

const getFirstNonEmptyValue = (row, keys) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
};

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  const modalTitle = useMemo(
    () => (editId ? "Edit Department" : "Add Department"),
    [editId]
  );

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [deptData, facultyData] = await Promise.all([
        academicAPI.getDepartments(),
        academicAPI.getFaculties(),
      ]);
      setDepartments(deptData);
      setFaculties(facultyData);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!uploadMessage && !uploadError) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setUploadMessage("");
      setUploadError("");
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [uploadMessage, uploadError]);

  const openCreateModal = () => {
    setEditId(null);
    setForm(initialForm);
    setModalError("");
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditId(item.dept_id);
    setForm({
      name: item.name || "",
      code: item.code || "",
      faculty_id: item.faculty_id ? String(item.faculty_id) : "",
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
    if (!form.name.trim() || !form.code.trim() || !form.faculty_id) {
      setModalError("Department name, code and faculty are required");
      return;
    }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      faculty_id: Number(form.faculty_id),
    };

    try {
      setSaving(true);
      setModalError("");
      if (editId) {
        await academicAPI.updateDepartment(editId, payload);
      } else {
        await academicAPI.createDepartment(payload);
      }
      await loadData();
      closeModal();
    } catch (err) {
      setModalError(err.response?.data?.detail || "Failed to save department");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (deptId) => {
    const confirmed = window.confirm("Are you sure you want to delete this department? This action cannot be undone.");
    if (!confirmed) {
      return;
    }

    try {
      setError("");
      await academicAPI.deleteDepartment(deptId);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete department");
    }
  };

  const handleBulkUpload = async () => {
    if (!uploadFile) {
      setUploadError("Select an Excel or CSV file before uploading");
      return;
    }

    try {
      setUploading(true);
      setUploadError("");
      setUploadMessage("");

      const fileBuffer = await uploadFile.arrayBuffer();
      const workbook = XLSX.read(fileBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!rows.length) {
        setUploadError("The uploaded file is empty");
        return;
      }

      const payloads = [];
      const validationErrors = [];

      rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const code = String(getFirstNonEmptyValue(row, ["department_code", "code"])).trim();
        const name = String(getFirstNonEmptyValue(row, ["department_name", "name"])).trim();
        const facultyCode = String(getFirstNonEmptyValue(row, ["faculty_code"])).trim();
        const facultyName = String(getFirstNonEmptyValue(row, ["faculty_name", "faculty"])).trim();

        if (!code || !name) {
          validationErrors.push(`Row ${rowNumber}: code and name are required`);
          return;
        }

        if (!facultyCode && !facultyName) {
          validationErrors.push(`Row ${rowNumber}: faculty_code or faculty_name is required`);
          return;
        }

        let faculty = null;
        if (facultyCode) {
          const normalizedFacultyCode = normalizeText(facultyCode);
          faculty = faculties.find((item) => normalizeText(item.code) === normalizedFacultyCode);
        }

        if (!faculty && facultyName) {
          const normalizedFacultyName = normalizeText(facultyName);
          faculty = faculties.find((item) => normalizeText(item.name) === normalizedFacultyName);
        }

        if (!faculty) {
          validationErrors.push(
            `Row ${rowNumber}: faculty '${facultyCode || facultyName}' was not found`
          );
          return;
        }

        payloads.push({
          rowNumber,
          payload: {
            code: code.toUpperCase(),
            name,
            faculty_id: faculty.faculty_id,
          },
        });
      });

      if (!payloads.length) {
        setUploadError(validationErrors.join(" | ") || "No valid rows were found in file");
        return;
      }

      const createResults = await Promise.allSettled(
        payloads.map((item) => academicAPI.createDepartment(item.payload))
      );

      const failedRows = [];
      let createdCount = 0;

      createResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          createdCount += 1;
        } else {
          const detail = result.reason?.response?.data?.detail || result.reason?.message || "Failed to create";
          failedRows.push(`Row ${payloads[index].rowNumber}: ${detail}`);
        }
      });

      await loadData();

      const baseMessage = `Created ${createdCount} department record(s)`;
      const validationPart = validationErrors.length
        ? ` | ${validationErrors.length} row(s) skipped during validation`
        : "";
      const failPart = failedRows.length ? ` | ${failedRows.length} row(s) failed during save` : "";
      setUploadMessage(`${baseMessage}${validationPart}${failPart}`);

      if (validationErrors.length || failedRows.length) {
        setUploadError([...validationErrors, ...failedRows].join(" | "));
      }

      setUploadFile(null);
    } catch (uploadException) {
      setUploadError(uploadException.message || "Failed to process upload file");
    } finally {
      setUploading(false);
    }
  };

  const downloadDisplayedResults = () => {
    if (!departments.length) {
      return;
    }

    const exportRows = departments.map((department) => ({
      code: department.code || "",
      department_name: department.name || "",
      faculty_name: department.faculty?.name || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Departments");
    XLSX.writeFile(workbook, "departments_displayed_results.xlsx");
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Departments</h1>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/department_upload_sample.csv"
            download
            className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            Download CSV Template
          </a>

          <label className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {uploadFile ? uploadFile.name : "Choose Excel File"}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(event) => {
                setUploadFile(event.target.files?.[0] || null);
                setUploadError("");
                setUploadMessage("");
              }}
            />
          </label>

          <button
            type="button"
            onClick={handleBulkUpload}
            disabled={!uploadFile || uploading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? "Uploading..." : "Upload Excel"}
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add Department
          </button>
        </div>
      </div>

      {uploadMessage && (
        <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {uploadMessage}
        </div>
      )}

      {uploadError && (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {uploadError}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
        <p className="text-sm text-gray-600">Showing {departments.length} result(s)</p>
        <button
          type="button"
          onClick={downloadDisplayedResults}
          disabled={!departments.length}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Export Displayed Results
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Code</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Faculty</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={4}>
                  Loading departments...
                </td>
              </tr>
            )}
            {!loading && departments.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={4}>
                  No departments found.
                </td>
              </tr>
            )}
            {!loading &&
              departments.map((department) => (
                <tr key={department.dept_id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-sm text-gray-700">{department.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{department.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {department.faculty?.name || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(department)}
                        className="rounded bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-600"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(department.dept_id)}
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
            placeholder="Department Name"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <input
            name="code"
            value={form.code}
            onChange={handleChange}
            placeholder="Department Code"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <select
            name="faculty_id"
            value={form.faculty_id}
            onChange={handleChange}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Select Faculty</option>
            {faculties.map((faculty) => (
              <option key={faculty.faculty_id} value={faculty.faculty_id}>
                {faculty.name}
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
            {saving ? "Saving..." : editId ? "Update Department" : "Add Department"}
          </button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
