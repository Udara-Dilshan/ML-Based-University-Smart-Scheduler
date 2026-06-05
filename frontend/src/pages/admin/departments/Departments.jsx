import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import AdminLayout from "../layout/AdminLayout";
import Modal from "../../../components/Modal";
import { academicAPI, getUser } from "../../../services/api";

const initialForm = {
  name: "",
  code: "",
  faculty_id: "",
};

const BULK_UPLOAD_CHUNK_SIZE = 4;
const BULK_UPLOAD_CHUNK_DELAY_MS = 150;

const wait = (ms) => new Promise((resolve) => {
  window.setTimeout(resolve, ms);
});

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
  const currentUser = getUser();
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
  const [uploadProgress, setUploadProgress] = useState(null);
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [facultyFilter, setFacultyFilter] = useState("");

  const modalTitle = useMemo(
    () => (editId ? "Edit Department" : "Add Department"),
    [editId]
  );
  const filteredDepartments = useMemo(() => {
    const query = normalizeText(departmentSearch);
    return departments.filter((department) => {
      if (facultyFilter && String(department.faculty_id) !== String(facultyFilter)) {
        return false;
      }

      if (!query) {
        return true;
      }

      const facultyName = faculties.find((faculty) => faculty.faculty_id === department.faculty_id)?.name || "";
      return [department.name, department.code, facultyName].some((value) =>
        normalizeText(value).includes(query)
      );
    });
  }, [departments, faculties, departmentSearch, facultyFilter]);

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
      setUploadProgress(null);

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
      const duplicateRows = [];
      const existingCodeKeys = new Set(departments.map((item) => normalizeText(item.code)));
      const existingNameKeys = new Set(departments.map((item) => normalizeText(item.name)));
      const seenCodeKeys = new Set();
      const seenNameKeys = new Set();

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

        const codeKey = normalizeText(code);
        const nameKey = normalizeText(name);

        if (existingCodeKeys.has(codeKey) || existingNameKeys.has(nameKey)) {
          duplicateRows.push(`Row ${rowNumber}: department already exists (code or name)`);
          return;
        }

        if (seenCodeKeys.has(codeKey) || seenNameKeys.has(nameKey)) {
          duplicateRows.push(`Row ${rowNumber}: duplicate department in upload file (code or name)`);
          return;
        }

        seenCodeKeys.add(codeKey);
        seenNameKeys.add(nameKey);

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
        const summaryParts = [];
        if (validationErrors.length) {
          summaryParts.push(`${validationErrors.length} row(s) invalid`);
        }
        if (duplicateRows.length) {
          summaryParts.push(`${duplicateRows.length} row(s) already exist or duplicated`);
        }

        if (duplicateRows.length && !validationErrors.length) {
          setUploadMessage(
            `No new departments were uploaded | ${duplicateRows.length} row(s) already exist or are repeated in the file`
          );
          setUploadError("");
          return;
        }

        setUploadError(
          summaryParts.length
            ? `No new rows to upload | ${summaryParts.join(" | ")}`
            : "No valid rows were found in file"
        );
        return;
      }

      const failedRows = [];
      let createdCount = 0;
      let processedCount = 0;

      setUploadProgress({
        processed: 0,
        total: payloads.length,
        created: 0,
        failed: 0,
      });

      for (let index = 0; index < payloads.length; index += BULK_UPLOAD_CHUNK_SIZE) {
        const chunk = payloads.slice(index, index + BULK_UPLOAD_CHUNK_SIZE);
        const createResults = await Promise.allSettled(
          chunk.map((item) => academicAPI.createDepartment(item.payload))
        );

        createResults.forEach((result, chunkIndex) => {
          if (result.status === "fulfilled") {
            createdCount += 1;
          } else {
            const detail = result.reason?.response?.data?.detail || result.reason?.message || "Failed to create";
            failedRows.push(`Row ${chunk[chunkIndex].rowNumber}: ${detail}`);
          }
        });

        processedCount += chunk.length;
        setUploadProgress({
          processed: processedCount,
          total: payloads.length,
          created: createdCount,
          failed: failedRows.length,
        });

        if (processedCount < payloads.length) {
          await wait(BULK_UPLOAD_CHUNK_DELAY_MS);
        }
      }

      await loadData();

      const baseMessage = `Created ${createdCount} department record(s)`;
      const validationPart = validationErrors.length
        ? ` | ${validationErrors.length} row(s) skipped during validation`
        : "";
      const duplicatePart = duplicateRows.length
        ? ` | ${duplicateRows.length} row(s) skipped as duplicate`
        : "";
      const failPart = failedRows.length ? ` | ${failedRows.length} row(s) failed during save` : "";
      setUploadMessage(`${baseMessage}${validationPart}${duplicatePart}${failPart}`);

      if (validationErrors.length || duplicateRows.length || failedRows.length) {
        const issueSummary = [];
        if (validationErrors.length) {
          issueSummary.push(`${validationErrors.length} invalid`);
        }
        if (duplicateRows.length) {
          issueSummary.push(`${duplicateRows.length} duplicate`);
        }
        if (failedRows.length) {
          issueSummary.push(`${failedRows.length} failed`);
        }
        setUploadError(`Upload completed with issues | ${issueSummary.join(" | ")}`);
      }

      setUploadFile(null);
    } catch (uploadException) {
      setUploadError(uploadException.message || "Failed to process upload file");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const downloadDisplayedResults = () => {
    if (!filteredDepartments.length) {
      return;
    }

    const exportRows = filteredDepartments.map((department) => ({
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
                setUploadProgress(null);
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

      {uploading && uploadProgress && (
        <div className="mb-4 rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Uploading rows {uploadProgress.processed} / {uploadProgress.total} | Created: {uploadProgress.created} | Failed: {uploadProgress.failed}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-[2fr,1fr,auto]">
        <input
          value={departmentSearch}
          onChange={(event) => setDepartmentSearch(event.target.value)}
          placeholder="Search department name, code"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <select
          value={facultyFilter}
          onChange={(event) => setFacultyFilter(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          {currentUser?.role !== "Scheduler" && (
            <option value="">All Faculties</option>
          )}
          {faculties.map((faculty) => (
            <option key={faculty.faculty_id} value={faculty.faculty_id}>
              {faculty.name}
            </option>
          ))}
        </select>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600">Showing {filteredDepartments.length} result(s)</p>
          <button
            type="button"
            onClick={downloadDisplayedResults}
            disabled={!filteredDepartments.length}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export Displayed Results
          </button>
        </div>
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
            {!loading && filteredDepartments.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={4}>
                  No departments found.
                </td>
              </tr>
            )}
            {!loading &&
              filteredDepartments.map((department) => (
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
