import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import AdminLayout from "../layout/AdminLayout";
import Modal from "../../../components/Modal";
import { academicAPI } from "../../../services/api";

const initialForm = {
  batch_code: "",
  degree_id: "",
  student_count: "",
  current_semester_name: "",
  academic_year: "",
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

const buildSemesterOptions = (durationYears = 5) => {
  const totalSemesters = Math.max(1, Number(durationYears) || 5) * 2;
  return Array.from({ length: totalSemesters }, (_, index) => {
    const semesterNumber = index + 1;
    const year = Math.ceil(semesterNumber / 2);
    const semester = semesterNumber % 2 === 0 ? 2 : 1;
    return `Year ${year} Semester ${semester}`;
  });
};

const semesterLabelFromNumber = (semesterNumber) => {
  const value = Number(semesterNumber);
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }
  const year = Math.ceil(value / 2);
  const semester = value % 2 === 0 ? 2 : 1;
  return `Year ${year} Semester ${semester}`;
};

const semesterNumberFromLabel = (semesterName) => {
  const value = String(semesterName || "").trim();
  const match = value.match(/^Year\s+(\d+)\s+Semester\s+(1|2)$/i);
  if (!match) {
    return NaN;
  }

  const year = Number(match[1]);
  const semester = Number(match[2]);
  if (!Number.isFinite(year) || year <= 0) {
    return NaN;
  }

  return ((year - 1) * 2) + semester;
};

export default function Batches() {
  const [batches, setBatches] = useState([]);
  const [degrees, setDegrees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [facultyFilter, setFacultyFilter] = useState("");
  const [degreeFilter, setDegreeFilter] = useState("");
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
  const [activeTermFormByBatch, setActiveTermFormByBatch] = useState({});
  const [assigningBatchIds, setAssigningBatchIds] = useState({});
  const [termMessage, setTermMessage] = useState("");

  const modalTitle = useMemo(() => (editId ? "Edit Batch" : "Add Batch"), [editId]);
  const selectedModalDegree = useMemo(
    () => degrees.find((degree) => degree.degree_id === Number(form.degree_id)) || null,
    [degrees, form.degree_id]
  );
  const modalSemesterOptions = useMemo(
    () => buildSemesterOptions(selectedModalDegree?.duration_years || 5),
    [selectedModalDegree]
  );

  const degreesForFilter = useMemo(() => {
    if (!facultyFilter) {
      return degrees;
    }

    const departmentIds = new Set(
      departments
        .filter((department) => department.faculty_id === Number(facultyFilter))
        .map((department) => department.dept_id)
    );

    return degrees.filter((degree) => departmentIds.has(degree.dept_id));
  }, [degrees, departments, facultyFilter]);

  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      const degree = degrees.find((item) => item.degree_id === batch.degree_id);
      const byFaculty =
        !facultyFilter ||
        departments.some(
          (department) =>
            department.dept_id === degree?.dept_id &&
            department.faculty_id === Number(facultyFilter)
        );
      const byDegree = !degreeFilter || batch.degree_id === Number(degreeFilter);
      return byFaculty && byDegree;
    });
  }, [batches, degrees, departments, facultyFilter, degreeFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [batchData, degreeData, departmentData, facultyData] = await Promise.all([
        academicAPI.getBatches(),
        academicAPI.getDegrees(),
        academicAPI.getDepartments(),
        academicAPI.getFaculties(),
      ]);
      setBatches(batchData);
      setDegrees(degreeData);
      setDepartments(departmentData);
      setFaculties(facultyData);

      const termFormDefaults = {};
      batchData.forEach((batch) => {
        termFormDefaults[batch.batch_id] = {
          semester_name:
            batch.active_term?.semester_name || semesterLabelFromNumber(batch.current_semester),
          academic_year: batch.active_term?.academic_year || "",
        };
      });
      setActiveTermFormByBatch(termFormDefaults);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load batches");
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

  useEffect(() => {
    if (!termMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTermMessage("");
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [termMessage]);

  useEffect(() => {
    if (!degreeFilter) {
      return;
    }
    const stillValid = degreesForFilter.some(
      (degree) => degree.degree_id === Number(degreeFilter)
    );
    if (!stillValid) {
      setDegreeFilter("");
    }
  }, [degreeFilter, degreesForFilter]);

  const openCreateModal = () => {
    setEditId(null);
    setForm(initialForm);
    setModalError("");
    setIsModalOpen(true);
  };

  const openEditModal = (batch) => {
    setEditId(batch.batch_id);
    setForm({
      batch_code: batch.batch_code || batch.name || "",
      degree_id: batch.degree_id ? String(batch.degree_id) : "",
      student_count: batch.student_count ?? "",
      current_semester_name:
        batch.active_term?.semester_name || semesterLabelFromNumber(batch.current_semester),
      academic_year: batch.active_term?.academic_year || "",
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
    setForm((prev) => {
      if (name === "degree_id") {
        const nextDegree = degrees.find((degree) => degree.degree_id === Number(value));
        const nextOptions = buildSemesterOptions(nextDegree?.duration_years || 5);
        const nextSemester = nextOptions.includes(prev.current_semester_name)
          ? prev.current_semester_name
          : "";

        return {
          ...prev,
          degree_id: value,
          current_semester_name: nextSemester,
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const handleSubmit = async () => {
    if (
      !form.batch_code.trim() ||
      !form.degree_id ||
      !form.current_semester_name ||
      !form.academic_year.trim() ||
      form.student_count === ""
    ) {
      setModalError("Batch code, degree, student count, current semester and academic year are required");
      return;
    }

    const studentCount = Number(form.student_count);
    const currentSemester = semesterNumberFromLabel(form.current_semester_name);
    if (!Number.isFinite(studentCount) || studentCount < 0) {
      setModalError("Student count must be 0 or more");
      return;
    }
    if (!Number.isFinite(currentSemester) || currentSemester <= 0) {
      setModalError("Select a valid current semester");
      return;
    }

    const payload = {
      batch_code: form.batch_code.trim(),
      degree_id: Number(form.degree_id),
      student_count: studentCount,
      current_semester: currentSemester,
    };

    try {
      setSaving(true);
      setModalError("");
      let savedBatch;
      if (editId) {
        savedBatch = await academicAPI.updateBatch(editId, payload);
      } else {
        savedBatch = await academicAPI.createBatch(payload);
      }

      await academicAPI.assignBatchActiveTerm(savedBatch.batch_id, {
        semester_name: form.current_semester_name,
        academic_year: form.academic_year.trim(),
      });

      setTermMessage(`Batch and active term saved for ${savedBatch.batch_code || savedBatch.name}`);
      await loadData();
      closeModal();
    } catch (err) {
      setModalError(err.response?.data?.detail || "Failed to save batch and active term");
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

  const handleActiveTermChange = (batchId, field, value) => {
    setActiveTermFormByBatch((prev) => ({
      ...prev,
      [batchId]: {
        ...(prev[batchId] || { semester_name: "", academic_year: "" }),
        [field]: value,
      },
    }));
  };

  const handleAssignOrUpdateTerm = async (batch) => {
    const values = activeTermFormByBatch[batch.batch_id] || {};
    const semesterName = String(values.semester_name || "").trim();
    const academicYear = String(values.academic_year || "").trim();

    if (!semesterName || !academicYear) {
      setError("Current semester and academic year are required to assign active term");
      return;
    }

    try {
      setError("");
      setAssigningBatchIds((prev) => ({ ...prev, [batch.batch_id]: true }));
      await academicAPI.assignBatchActiveTerm(batch.batch_id, {
        semester_name: semesterName,
        academic_year: academicYear,
      });
      setTermMessage(`Active term saved for ${batch.batch_code || batch.name}`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to assign active term");
    } finally {
      setAssigningBatchIds((prev) => ({ ...prev, [batch.batch_id]: false }));
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
        const batchCode = String(getFirstNonEmptyValue(row, ["batch_code", "name"])).trim();
        const degreeCode = String(getFirstNonEmptyValue(row, ["degree_code"])).trim();
        const degreeName = String(getFirstNonEmptyValue(row, ["degree_name", "degree"])).trim();
        const studentCountValue = getFirstNonEmptyValue(row, ["student_count"]);
        const semesterValue = String(
          getFirstNonEmptyValue(row, ["current_semester", "semester", "semester_name"])
        ).trim();
        const academicYear = String(
          getFirstNonEmptyValue(row, ["academic_year", "year"])
        ).trim();

        if (!batchCode) {
          validationErrors.push(`Row ${rowNumber}: batch_code is required`);
          return;
        }

        if (!degreeCode && !degreeName) {
          validationErrors.push(`Row ${rowNumber}: degree_code or degree_name is required`);
          return;
        }

        const studentCount = Number(studentCountValue);
        if (!Number.isFinite(studentCount) || studentCount < 0) {
          validationErrors.push(`Row ${rowNumber}: student_count must be 0 or more`);
          return;
        }
        if (!semesterValue) {
          validationErrors.push(
            `Row ${rowNumber}: current_semester is required (e.g. 'Year 1 Semester 1' or 1)`
          );
          return;
        }
        if (!academicYear) {
          validationErrors.push(`Row ${rowNumber}: academic_year is required (e.g. 2025/2026)`);
          return;
        }

        let degreeMatches = [];
        if (degreeCode) {
          const normalizedDegreeCode = normalizeText(degreeCode);
          degreeMatches = degrees.filter((item) => normalizeText(item.code) === normalizedDegreeCode);
        }

        if (!degreeMatches.length && degreeName) {
          const normalizedDegreeName = normalizeText(degreeName);
          degreeMatches = degrees.filter((item) => normalizeText(item.name) === normalizedDegreeName);
        }

        if (!degreeMatches.length) {
          validationErrors.push(`Row ${rowNumber}: degree '${degreeCode || degreeName}' was not found`);
          return;
        }

        if (degreeMatches.length > 1) {
          validationErrors.push(
            `Row ${rowNumber}: degree '${degreeCode || degreeName}' matched multiple records`
          );
          return;
        }

        const degree = degreeMatches[0];

        let currentSemester = NaN;
        let semesterName = "";
        const parsedFromLabel = semesterNumberFromLabel(semesterValue);

        if (Number.isFinite(parsedFromLabel)) {
          currentSemester = parsedFromLabel;
          semesterName = semesterLabelFromNumber(parsedFromLabel);
        } else {
          const parsedFromNumber = Number(semesterValue);
          if (Number.isFinite(parsedFromNumber) && parsedFromNumber > 0) {
            currentSemester = parsedFromNumber;
            semesterName = semesterLabelFromNumber(parsedFromNumber);
          }
        }

        if (!Number.isFinite(currentSemester) || currentSemester <= 0 || !semesterName) {
          validationErrors.push(
            `Row ${rowNumber}: current_semester must be a valid label like 'Year 1 Semester 1' or a positive semester number`
          );
          return;
        }

        const allowedSemesterNames = buildSemesterOptions(degree.duration_years || 5);
        if (!allowedSemesterNames.includes(semesterName)) {
          validationErrors.push(
            `Row ${rowNumber}: semester '${semesterName}' is out of range for degree '${degree.code}'`
          );
          return;
        }

        payloads.push({
          rowNumber,
          createPayload: {
            batch_code: batchCode,
            degree_id: degree.degree_id,
            student_count: studentCount,
            current_semester: currentSemester,
          },
          termPayload: {
            semester_name: semesterName,
            academic_year: academicYear,
          },
        });
      });

      if (!payloads.length) {
        setUploadError(validationErrors.join(" | ") || "No valid rows were found in file");
        return;
      }

      const createResults = await Promise.allSettled(
        payloads.map(async (item) => {
          const created = await academicAPI.createBatch(item.createPayload);
          await academicAPI.assignBatchActiveTerm(created.batch_id, item.termPayload);
          return created;
        })
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

      const baseMessage = `Created ${createdCount} batch record(s)`;
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
    if (!filteredBatches.length) {
      return;
    }

    const exportRows = filteredBatches.map((batch) => ({
      batch_code: batch.batch_code || batch.name || "",
      degree: batch.degree ? `${batch.degree.code} - ${batch.degree.name}` : "",
      student_count: batch.student_count ?? "",
      current_semester: batch.active_term?.semester_name || semesterLabelFromNumber(batch.current_semester),
      academic_year: batch.active_term?.academic_year || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Batches");
    XLSX.writeFile(workbook, "batches_displayed_results.xlsx");
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Batches</h1>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/batch_upload_sample.csv"
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
            Add Batch
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

      {termMessage && (
        <div className="mb-4 rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {termMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-2">
        <select
          value={facultyFilter}
          onChange={(event) => {
            setFacultyFilter(event.target.value);
            setDegreeFilter("");
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Filter by Faculty</option>
          {faculties.map((faculty) => (
            <option key={faculty.faculty_id} value={faculty.faculty_id}>
              {faculty.name}
            </option>
          ))}
        </select>

        <select
          value={degreeFilter}
          onChange={(event) => setDegreeFilter(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Filter by Degree</option>
          {degreesForFilter.map((degree) => (
            <option key={degree.degree_id} value={degree.degree_id}>
              {degree.code} - {degree.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
        <p className="text-sm text-gray-600">Showing {filteredBatches.length} result(s)</p>
        <button
          type="button"
          onClick={downloadDisplayedResults}
          disabled={!filteredBatches.length}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Export Displayed Results
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Batch Code</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Degree</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Students</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Current Semester</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Academic Year</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Term Setup</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={7}>
                  Loading batches...
                </td>
              </tr>
            )}
            {!loading && filteredBatches.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={7}>
                  No batches found.
                </td>
              </tr>
            )}
            {!loading &&
              filteredBatches.map((batch) => {
                const semesterOptions = buildSemesterOptions(batch.degree?.duration_years || 5);
                const formState = activeTermFormByBatch[batch.batch_id] || {
                  semester_name: "",
                  academic_year: "",
                };

                return (
                <tr key={batch.batch_id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-sm text-gray-800">{batch.batch_code || batch.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {batch.degree ? `${batch.degree.code} - ${batch.degree.name}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{batch.student_count ?? "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <select
                      value={formState.semester_name || ""}
                      onChange={(event) =>
                        handleActiveTermChange(batch.batch_id, "semester_name", event.target.value)
                      }
                      className="w-full min-w-[190px] rounded-md border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                    >
                      <option value="">Select semester</option>
                      {semesterOptions.map((semesterName) => (
                        <option key={semesterName} value={semesterName}>
                          {semesterName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <input
                      value={formState.academic_year || ""}
                      onChange={(event) =>
                        handleActiveTermChange(batch.batch_id, "academic_year", event.target.value)
                      }
                      placeholder="2025/2026"
                      className="w-full min-w-[130px] rounded-md border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleAssignOrUpdateTerm(batch)}
                      disabled={Boolean(assigningBatchIds[batch.batch_id])}
                      className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {assigningBatchIds[batch.batch_id]
                        ? "Saving..."
                        : batch.active_term
                          ? "Update"
                          : "Assign"}
                    </button>
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
                );
              })}
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
            name="batch_code"
            value={form.batch_code}
            onChange={handleChange}
            placeholder="Batch Code"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <input
            name="student_count"
            type="number"
            min="0"
            value={form.student_count}
            onChange={handleChange}
            placeholder="Student Count"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <select
            name="current_semester_name"
            value={form.current_semester_name}
            onChange={handleChange}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Select Current Semester</option>
            {modalSemesterOptions.map((semesterName) => (
              <option key={semesterName} value={semesterName}>
                {semesterName}
              </option>
            ))}
          </select>
          <input
            name="academic_year"
            value={form.academic_year}
            onChange={handleChange}
            placeholder="Academic Year (e.g. 2025/2026)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <select
            name="degree_id"
            value={form.degree_id}
            onChange={handleChange}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Select Degree</option>
            {degrees.map((degree) => (
              <option key={degree.degree_id} value={degree.degree_id}>
                {degree.code} - {degree.name}
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
