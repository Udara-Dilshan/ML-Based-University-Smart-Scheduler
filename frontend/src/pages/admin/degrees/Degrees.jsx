import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import AdminLayout from "../layout/AdminLayout";
import Modal from "../../../components/Modal";
import { academicAPI, getUser } from "../../../services/api";

const initialForm = {
  code: "",
  name: "",
  dept_id: "",
  duration_years: "4",
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

export default function Degrees() {
  const currentUser = getUser();
  const [degrees, setDegrees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [degreeSearch, setDegreeSearch] = useState("");
  const [facultyFilter, setFacultyFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
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

  const modalTitle = useMemo(() => (editId ? "Edit Degree" : "Add Degree"), [editId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [degreeData, departmentData, facultyData] = await Promise.all([
        academicAPI.getDegrees(),
        academicAPI.getDepartments(),
        academicAPI.getFaculties(),
      ]);
      setDegrees(degreeData);
      setDepartments(departmentData);
      setFaculties(facultyData);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load degrees");
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentName = (deptId) => {
    const department = departments.find((item) => item.dept_id === deptId);
    return department?.name || "-";
  };

  const departmentsForFilter = useMemo(() => {
    if (!facultyFilter) {
      return departments;
    }

    return departments.filter((department) =>
      String(department.faculty_id) === String(facultyFilter)
    );
  }, [departments, facultyFilter]);

  const filteredDegrees = useMemo(() => {
    const query = normalizeText(degreeSearch);

    return degrees.filter((degree) => {
      if (departmentFilter && String(degree.dept_id) !== String(departmentFilter)) {
        return false;
      }

      if (facultyFilter) {
        const department = departments.find((item) => item.dept_id === degree.dept_id);
        if (!department || String(department.faculty_id) !== String(facultyFilter)) {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      const departmentName = getDepartmentName(degree.dept_id);
      return [degree.name, degree.code, departmentName].some((value) =>
        normalizeText(value).includes(query)
      );
    });
  }, [degrees, departments, facultyFilter, departmentFilter, degreeSearch]);

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
      const existingCodeKeys = new Set(degrees.map((item) => normalizeText(item.code)));
      const existingNameDeptKeys = new Set(
        degrees.map((item) => `${item.dept_id}::${normalizeText(item.name)}`)
      );
      const seenCodeKeys = new Set();
      const seenNameDeptKeys = new Set();

      rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const code = String(getFirstNonEmptyValue(row, ["degree_code", "code"])).trim();
        const name = String(getFirstNonEmptyValue(row, ["degree_name", "name"])).trim();
        const departmentCode = String(getFirstNonEmptyValue(row, ["department_code", "dept_code"])).trim();
        const departmentName = String(
          getFirstNonEmptyValue(row, ["department_name", "department"])
        ).trim();
        const durationValue = getFirstNonEmptyValue(row, ["duration_years"]);

        if (!code || !name) {
          validationErrors.push(`Row ${rowNumber}: degree_code and degree_name are required`);
          return;
        }

        if (!departmentCode && !departmentName) {
          validationErrors.push(`Row ${rowNumber}: department_code or department_name is required`);
          return;
        }

        const durationYears = Number(durationValue);
        if (!Number.isFinite(durationYears) || durationYears <= 0) {
          validationErrors.push(`Row ${rowNumber}: duration_years must be greater than 0`);
          return;
        }

        let departmentMatches = [];
        if (departmentCode) {
          const normalizedDepartmentCode = normalizeText(departmentCode);
          departmentMatches = departments.filter(
            (item) => normalizeText(item.code) === normalizedDepartmentCode
          );
        }

        if (!departmentMatches.length && departmentName) {
          const normalizedDepartmentName = normalizeText(departmentName);
          departmentMatches = departments.filter(
            (item) => normalizeText(item.name) === normalizedDepartmentName
          );
        }

        if (!departmentMatches.length) {
          validationErrors.push(
            `Row ${rowNumber}: department '${departmentCode || departmentName}' was not found`
          );
          return;
        }

        if (departmentMatches.length > 1) {
          validationErrors.push(
            `Row ${rowNumber}: department '${departmentCode || departmentName}' matched multiple records`
          );
          return;
        }

        const department = departmentMatches[0];
        const codeKey = normalizeText(code);
        const nameDeptKey = `${department.dept_id}::${normalizeText(name)}`;

        if (existingCodeKeys.has(codeKey) || existingNameDeptKeys.has(nameDeptKey)) {
          duplicateRows.push(
            `Row ${rowNumber}: degree already exists (code or name in selected department)`
          );
          return;
        }

        if (seenCodeKeys.has(codeKey) || seenNameDeptKeys.has(nameDeptKey)) {
          duplicateRows.push(
            `Row ${rowNumber}: duplicate degree in upload file (code or name in selected department)`
          );
          return;
        }

        seenCodeKeys.add(codeKey);
        seenNameDeptKeys.add(nameDeptKey);

        payloads.push({
          rowNumber,
          payload: {
            code: code.toUpperCase(),
            name,
            dept_id: department.dept_id,
            duration_years: durationYears,
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
            `No new degrees were uploaded | ${duplicateRows.length} row(s) already exist or are repeated in the file`
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
          chunk.map((item) => academicAPI.createDegree(item.payload))
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

      const baseMessage = `Created ${createdCount} degree record(s)`;
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
    if (!filteredDegrees.length) {
      return;
    }

    const exportRows = filteredDegrees.map((degree) => ({
      code: degree.code || "",
      degree_name: degree.name || "",
      department_name: getDepartmentName(degree.dept_id),
      duration_years: degree.duration_years ?? "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Degrees");
    XLSX.writeFile(workbook, "degrees_displayed_results.xlsx");
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Degrees</h1>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/degree_upload_sample.csv"
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
            Add Degree
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

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-[2fr,1fr,1fr,auto]">
        <input
          value={degreeSearch}
          onChange={(event) => setDegreeSearch(event.target.value)}
          placeholder="Search degree name, code"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <select
          value={facultyFilter}
          onChange={(event) => {
            setFacultyFilter(event.target.value);
            setDepartmentFilter("");
          }}
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
        <select
          value={departmentFilter}
          onChange={(event) => setDepartmentFilter(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">All Departments</option>
          {departmentsForFilter.map((department) => (
            <option key={department.dept_id} value={department.dept_id}>
              {department.name}
            </option>
          ))}
        </select>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600">Showing {filteredDegrees.length} result(s)</p>
          <button
            type="button"
            onClick={downloadDisplayedResults}
            disabled={!filteredDegrees.length}
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
            {!loading && filteredDegrees.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={5}>
                  No degrees found.
                </td>
              </tr>
            )}
            {!loading &&
              filteredDegrees.map((degree) => (
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
