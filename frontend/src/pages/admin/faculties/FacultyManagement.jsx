import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import AdminLayout from "../layout/AdminLayout";
import Modal from "../../../components/Modal";
import { academicAPI } from "../../../services/api";

const initialForm = {
  name: "",
  code: "",
  dean_name: "",
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

export default function FacultyManagement() {
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
  const [facultySearch, setFacultySearch] = useState("");

  const modalTitle = useMemo(() => (editId ? "Edit Faculty" : "Add Faculty"), [editId]);
  const filteredFaculties = useMemo(() => {
    const query = normalizeText(facultySearch);
    if (!query) {
      return faculties;
    }

    return faculties.filter((faculty) => {
      const deanName = faculty.dean_name || "";
      return [faculty.name, faculty.code, deanName].some((value) =>
        normalizeText(value).includes(query)
      );
    });
  }, [faculties, facultySearch]);

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

  const openEditModal = (faculty) => {
    setEditId(faculty.faculty_id);
    setForm({
      name: faculty.name || "",
      code: faculty.code || "",
      dean_name: faculty.dean_name || "",
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
      dean_name: form.dean_name.trim() || null,
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
    const confirmed = window.confirm("Are you sure you want to delete this faculty? This action cannot be undone.");
    if (!confirmed) {
      return;
    }

    try {
      setError("");
      await academicAPI.deleteFaculty(facultyId);
      await loadFaculties();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete faculty");
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
      const existingCodeKeys = new Set(faculties.map((item) => normalizeText(item.code)));
      const existingNameKeys = new Set(faculties.map((item) => normalizeText(item.name)));
      const seenCodeKeys = new Set();
      const seenNameKeys = new Set();

      rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const code = String(getFirstNonEmptyValue(row, ["code", "faculty_code"])).trim();
        const name = String(getFirstNonEmptyValue(row, ["name", "faculty_name"])).trim();
        const deanName = String(getFirstNonEmptyValue(row, ["dean_name", "dean"])).trim();

        if (!code || !name) {
          validationErrors.push(`Row ${rowNumber}: code and name are required`);
          return;
        }

        const codeKey = normalizeText(code);
        const nameKey = normalizeText(name);

        if (existingCodeKeys.has(codeKey) || existingNameKeys.has(nameKey)) {
          duplicateRows.push(`Row ${rowNumber}: faculty already exists (code or name)`);
          return;
        }

        if (seenCodeKeys.has(codeKey) || seenNameKeys.has(nameKey)) {
          duplicateRows.push(`Row ${rowNumber}: duplicate faculty in upload file (code or name)`);
          return;
        }

        seenCodeKeys.add(codeKey);
        seenNameKeys.add(nameKey);

        payloads.push({
          rowNumber,
          payload: {
            code: code.toUpperCase(),
            name,
            dean_name: deanName || null,
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
            `No new faculties were uploaded | ${duplicateRows.length} row(s) already exist or are repeated in the file`
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
          chunk.map((item) => academicAPI.createFaculty(item.payload))
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

      await loadFaculties();

      const baseMessage = `Created ${createdCount} faculty record(s)`;
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
    if (!filteredFaculties.length) {
      return;
    }

    const exportRows = filteredFaculties.map((faculty) => ({
      code: faculty.code || "",
      faculty_name: faculty.name || "",
      dean_name: faculty.dean_name || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Faculties");
    XLSX.writeFile(workbook, "faculties_displayed_results.xlsx");
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Faculty Management</h1>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/faculty_upload_sample.csv"
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
            Add Faculty
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

      <div className="mb-4 grid grid-cols-1 items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-[2fr,1fr]">
        <input
          value={facultySearch}
          onChange={(event) => setFacultySearch(event.target.value)}
          placeholder="Search faculty name, code, dean"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600">Showing {filteredFaculties.length} result(s)</p>
          <button
            type="button"
            onClick={downloadDisplayedResults}
            disabled={!filteredFaculties.length}
            className="whitespace-nowrap rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export Displayed Results
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[700px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Code</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Faculty</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Dean Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={4}>
                  Loading faculties...
                </td>
              </tr>
            )}
            {!loading && filteredFaculties.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={4}>
                  No faculties found.
                </td>
              </tr>
            )}
            {!loading &&
              filteredFaculties.map((faculty) => (
                <tr key={faculty.faculty_id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-sm text-gray-700">{faculty.code || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{faculty.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{faculty.dean_name || "-"}</td>
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
          <input
            name="dean_name"
            value={form.dean_name}
            onChange={handleChange}
            placeholder="Dean Name (Optional)"
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
