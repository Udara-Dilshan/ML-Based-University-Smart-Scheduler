import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import AdminLayout from "../layout/AdminLayout";
import Modal from "../../../components/Modal";
import { academicAPI, settingsAPI, getUser } from "../../../services/api";

const initialForm = {
  name: "",
  code: "",
  faculty_id: "",
  dept_id: "",
  degree_id: "",
  credits: "",
  lecture_hours_per_week: "",
  required_resource_type: "",
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

export default function Courses() {
  const currentUser = getUser();
  const [courses, setCourses] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [degrees, setDegrees] = useState([]);
  const [resourceTypes, setResourceTypes] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [facultyFilter, setFacultyFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [degreeFilter, setDegreeFilter] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
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

  const modalTitle = useMemo(() => (editId ? "Edit Course" : "Add Course"), [editId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [moduleData, deptData, facultyData, degreeData, settingsData] = await Promise.all([
        academicAPI.getModules(),
        academicAPI.getDepartments(),
        academicAPI.getFaculties(),
        academicAPI.getDegrees(),
        settingsAPI.getSystemSettings(),
      ]);
      setCourses(moduleData);
      setDepartments(deptData);
      setFaculties(facultyData);
      setDegrees(degreeData);
      const allSettings = settingsData || [];
      setResourceTypes(
        allSettings
          .filter((item) => item.category === "RESOURCE_TYPES")
          .map((item) => item.value)
      );
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load courses");
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

  const openEditModal = (course) => {
    const department = departments.find((item) => item.dept_id === course.dept_id);
    setEditId(course.module_id);
    setForm({
      name: course.name || "",
      code: course.code || "",
      faculty_id: department?.faculty_id ? String(department.faculty_id) : "",
      dept_id: course.dept_id ? String(course.dept_id) : "",
      degree_id: course.degree_id ? String(course.degree_id) : "",
      credits: course.credits ?? "",
      lecture_hours_per_week: course.lecture_hours_per_week ?? "",
      required_resource_type: course.required_resource_type || "",
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
      if (name === "faculty_id") {
        return {
          ...prev,
          faculty_id: value,
          dept_id: "",
          degree_id: "",
        };
      }

      if (name === "dept_id") {
        return {
          ...prev,
          dept_id: value,
          degree_id: "",
        };
      }

      if (name === "degree_id") {
        const selectedDegree = degrees.find((degree) => degree.degree_id === Number(value));
        return {
          ...prev,
          degree_id: value,
          dept_id: selectedDegree ? String(selectedDegree.dept_id) : prev.dept_id,
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const departmentsForSelectedFaculty =
    form.faculty_id
      ? departments.filter((department) => department.faculty_id === Number(form.faculty_id))
      : departments;

  const deptIdsForSelectedFaculty = new Set(
    departmentsForSelectedFaculty.map((department) => department.dept_id)
  );

  const degreesForSelectedContext = degrees.filter((degree) => {
    if (form.dept_id) {
      return degree.dept_id === Number(form.dept_id);
    }
    if (form.faculty_id) {
      return deptIdsForSelectedFaculty.has(degree.dept_id);
    }
    return true;
  });

  const departmentsForFilter =
    facultyFilter
      ? departments.filter((department) => department.faculty_id === Number(facultyFilter))
      : departments;

  const degreesForFilter = degrees.filter((degree) => {
    if (departmentFilter) {
      return degree.dept_id === Number(departmentFilter);
    }

    if (facultyFilter) {
      const degreeDepartment = departments.find((department) => department.dept_id === degree.dept_id);
      return degreeDepartment?.faculty_id === Number(facultyFilter);
    }

    return true;
  });

  const filteredCourses = courses.filter((course) => {
    const byFaculty =
      !facultyFilter ||
      departments.some(
        (department) =>
          department.dept_id === course.dept_id &&
          department.faculty_id === Number(facultyFilter)
      );

    const byDepartment =
      !departmentFilter || course.dept_id === Number(departmentFilter);

    const byDegree = !degreeFilter || course.degree_id === Number(degreeFilter);

    if (!byFaculty || !byDepartment || !byDegree) {
      return false;
    }

    const query = normalizeText(courseSearch);
    if (!query) {
      return true;
    }

    const departmentName = course.department?.name || "";
    const degree = degrees.find((item) => item.degree_id === course.degree_id);
    const degreeLabel = degree ? `${degree.code} ${degree.name}` : "";
    return [course.name, course.code, departmentName, degreeLabel].some((value) =>
      normalizeText(value).includes(query)
    );
  });

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.code.trim() || !form.dept_id || !form.degree_id) {
      setModalError("Course name, code, department and degree are required");
      return;
    }

    if (!form.required_resource_type.trim()) {
      setModalError("Required resource type is required");
      return;
    }

    const credits = Number(form.credits);
    if (!Number.isFinite(credits) || credits <= 0) {
      setModalError("Credits must be a positive number");
      return;
    }

    const lectureHours = Number(form.lecture_hours_per_week);
    if (!Number.isFinite(lectureHours) || lectureHours <= 0) {
      setModalError("Lecture hours per week must be a positive number");
      return;
    }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      dept_id: Number(form.dept_id),
      degree_id: Number(form.degree_id),
      credits,
      lecture_hours_per_week: lectureHours,
      required_resource_type: form.required_resource_type.trim(),
    };

    try {
      setSaving(true);
      setModalError("");
      if (editId) {
        await academicAPI.updateModule(editId, payload);
      } else {
        await academicAPI.createModule(payload);
      }
      await loadData();
      closeModal();
    } catch (err) {
      setModalError(err.response?.data?.detail || "Failed to save course");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (moduleId) => {
    const confirmed = window.confirm("Are you sure you want to delete this course? This action cannot be undone.");
    if (!confirmed) {
      return;
    }

    try {
      setError("");
      await academicAPI.deleteModule(moduleId);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete course");
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
      const existingDegreeCodeKeys = new Set(
        courses.map((course) => `${course.degree_id}::code::${normalizeText(course.code)}`)
      );
      const existingDegreeNameKeys = new Set(
        courses.map((course) => `${course.degree_id}::name::${normalizeText(course.name)}`)
      );
      const seenDegreeCodeKeys = new Set();
      const seenDegreeNameKeys = new Set();

      rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const code = String(getFirstNonEmptyValue(row, ["course_code", "code"])).trim();
        const name = String(getFirstNonEmptyValue(row, ["course_name", "name"])).trim();
        const facultyName = String(
          getFirstNonEmptyValue(row, ["faculty_name", "faculty"])
        ).trim();
        const departmentName = String(
          getFirstNonEmptyValue(row, ["department_name", "department"])
        ).trim();
        const degreeCode = String(
          getFirstNonEmptyValue(row, ["degree_code", "degree"])
        ).trim();
        const creditsValue = getFirstNonEmptyValue(row, ["credits"]);
        const lectureHoursValue = getFirstNonEmptyValue(row, ["lecture_hours_per_week", "lecture_hours"]);
        const requiredResourceType = String(
          getFirstNonEmptyValue(row, ["required_resource_type", "resource_type", "room_type"])
        ).trim();

        if (!code || !name || !departmentName || !degreeCode) {
          validationErrors.push(
            `Row ${rowNumber}: course_code, course_name, department_name and degree_code are required`
          );
          return;
        }

        const credits = Number(creditsValue);
        const lectureHours = Number(lectureHoursValue);
        if (!Number.isFinite(credits) || credits <= 0) {
          validationErrors.push(`Row ${rowNumber}: credits must be a positive number`);
          return;
        }
        if (!Number.isFinite(lectureHours) || lectureHours <= 0) {
          validationErrors.push(`Row ${rowNumber}: lecture_hours_per_week must be a positive number`);
          return;
        }

        let matchedFaculty = null;
        if (facultyName) {
          const normalizedFaculty = normalizeText(facultyName);
          matchedFaculty = faculties.find(
            (faculty) =>
              normalizeText(faculty.name) === normalizedFaculty ||
              normalizeText(faculty.code) === normalizedFaculty
          );
          if (!matchedFaculty) {
            validationErrors.push(`Row ${rowNumber}: faculty '${facultyName}' was not found`);
            return;
          }
        }

        const normalizedDepartment = normalizeText(departmentName);
        let departmentMatches = departments.filter(
          (department) => normalizeText(department.name) === normalizedDepartment
        );
        if (matchedFaculty) {
          departmentMatches = departmentMatches.filter(
            (department) => department.faculty_id === matchedFaculty.faculty_id
          );
        }

        if (!departmentMatches.length) {
          validationErrors.push(`Row ${rowNumber}: department '${departmentName}' was not found`);
          return;
        }
        if (departmentMatches.length > 1) {
          validationErrors.push(
            `Row ${rowNumber}: department '${departmentName}' matched multiple records, add faculty_name`
          );
          return;
        }

        const department = departmentMatches[0];
        const normalizedDegreeCode = normalizeText(degreeCode);
        const degree = degrees.find(
          (item) =>
            item.dept_id === department.dept_id &&
            (normalizeText(item.code) === normalizedDegreeCode ||
              normalizeText(item.name) === normalizedDegreeCode)
        );

        if (!degree) {
          validationErrors.push(
            `Row ${rowNumber}: degree '${degreeCode}' was not found for department '${departmentName}'`
          );
          return;
        }

        const degreeCodeKey = `${degree.degree_id}::code::${normalizeText(code)}`;
        const degreeNameKey = `${degree.degree_id}::name::${normalizeText(name)}`;

        if (existingDegreeCodeKeys.has(degreeCodeKey) || existingDegreeNameKeys.has(degreeNameKey)) {
          duplicateRows.push(
            `Row ${rowNumber}: duplicate course for selected degree (already exists in system)`
          );
          return;
        }

        if (seenDegreeCodeKeys.has(degreeCodeKey) || seenDegreeNameKeys.has(degreeNameKey)) {
          duplicateRows.push(
            `Row ${rowNumber}: duplicate course for selected degree (repeated in upload file)`
          );
          return;
        }

        seenDegreeCodeKeys.add(degreeCodeKey);
        seenDegreeNameKeys.add(degreeNameKey);

        const resolvedResourceType = requiredResourceType || "Lecture Hall";
        if (!resolvedResourceType) {
          validationErrors.push(
            `Row ${rowNumber}: required_resource_type is required (add it or set Resource Types in settings)`
          );
          return;
        }

        payloads.push({
          rowNumber,
          payload: {
            code: code.toUpperCase(),
            name,
            dept_id: department.dept_id,
            degree_id: degree.degree_id,
            credits,
            lecture_hours_per_week: lectureHours,
            required_resource_type: resolvedResourceType,
          },
        });
      });

      if (!payloads.length) {
        const summaryParts = [];
        if (validationErrors.length) {
          summaryParts.push(`${validationErrors.length} row(s) invalid`);
        }
        if (duplicateRows.length) {
          summaryParts.push(`${duplicateRows.length} row(s) already added or duplicated`);
        }

        if (duplicateRows.length && !validationErrors.length) {
          setUploadMessage(
            `No new courses were uploaded | ${duplicateRows.length} row(s) already exist for selected degree or are repeated in the file`
          );
          setUploadError("");
          return;
        }

        const details = [...validationErrors, ...duplicateRows].join(" | ");
        setUploadError(
          details
            ? `No new rows to upload${summaryParts.length ? ` | ${summaryParts.join(" | ")}` : ""} | ${details}`
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

        const chunkResults = await Promise.allSettled(
          chunk.map((item) => academicAPI.createModule(item.payload))
        );

        chunkResults.forEach((result, chunkIndex) => {
          if (result.status === "fulfilled") {
            createdCount += 1;
            return;
          }

          const detail = result.reason?.response?.data?.detail || result.reason?.message || "Failed to create";
          failedRows.push(`Row ${chunk[chunkIndex].rowNumber}: ${detail}`);
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

      const baseMessage = `Created ${createdCount} course(s)`;
      const validationPart = validationErrors.length
        ? ` | ${validationErrors.length} row(s) skipped during validation`
        : "";
      const duplicatePart = duplicateRows.length
        ? ` | ${duplicateRows.length} row(s) skipped as duplicate`
        : "";
      const failPart = failedRows.length ? ` | ${failedRows.length} row(s) failed during save` : "";
      setUploadMessage(`${baseMessage}${validationPart}${duplicatePart}${failPart}`);

      if (validationErrors.length || duplicateRows.length || failedRows.length) {
        setUploadError([...validationErrors, ...duplicateRows, ...failedRows].join(" | "));
      }

      setUploadFile(null);
    } catch (uploadException) {
      setUploadError(uploadException.message || "Failed to process upload file");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const downloadFilteredResults = () => {
    if (!filteredCourses.length) {
      return;
    }

    const exportRows = filteredCourses.map((course) => {
      const department = departments.find((item) => item.dept_id === course.dept_id);
      const degree = degrees.find((item) => item.degree_id === course.degree_id);

      return {
        code: course.code || "",
        course_name: course.name || "",
        department: department?.name || "",
        degree: degree ? `${degree.code} - ${degree.name}` : "",
        credits: course.credits ?? "",
        lecture_hours_per_week: course.lecture_hours_per_week ?? "",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Courses");
    XLSX.writeFile(workbook, "courses_filtered_results.xlsx");
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Courses</h1>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/course_upload_sample.csv"
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
            Add Course
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

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-4">
        <input
          value={courseSearch}
          onChange={(event) => setCourseSearch(event.target.value)}
          placeholder="Search course name, code"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <select
          value={facultyFilter}
          onChange={(event) => {
            setFacultyFilter(event.target.value);
            setDepartmentFilter("");
            setDegreeFilter("");
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          {currentUser?.role !== "Scheduler" && (
            <option value="">Filter by Faculty</option>
          )}
          {faculties.map((faculty) => (
            <option key={faculty.faculty_id} value={faculty.faculty_id}>
              {faculty.name}
            </option>
          ))}
        </select>

        <select
          value={departmentFilter}
          onChange={(event) => {
            setDepartmentFilter(event.target.value);
            setDegreeFilter("");
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Filter by Department</option>
          {departmentsForFilter.map((department) => (
            <option key={department.dept_id} value={department.dept_id}>
              {department.name}
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
        <p className="text-sm text-gray-600">Showing {filteredCourses.length} result(s)</p>
        <button
          type="button"
          onClick={downloadFilteredResults}
          disabled={!filteredCourses.length}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Export Filtered Results
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Code</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Course</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Degree</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Required Resource</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Credits</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={7}>
                  Loading courses...
                </td>
              </tr>
            )}
            {!loading && filteredCourses.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={7}>
                  No courses found.
                </td>
              </tr>
            )}
            {!loading &&
              filteredCourses.map((course) => (
                <tr key={course.module_id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-sm text-gray-700">{course.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{course.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {course.department?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {degrees.find((degree) => degree.degree_id === course.degree_id)
                      ? `${degrees.find((degree) => degree.degree_id === course.degree_id).code} - ${degrees.find((degree) => degree.degree_id === course.degree_id).name}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {course.required_resource_type || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{course.credits}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(course)}
                        className="rounded bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-600"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(course.module_id)}
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

          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Course Name"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <input
            name="code"
            value={form.code}
            onChange={handleChange}
            placeholder="Course Code"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <select
            name="degree_id"
            value={form.degree_id}
            onChange={handleChange}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Select Degree</option>
            {degreesForSelectedContext.map((degree) => (
              <option key={degree.degree_id} value={degree.degree_id}>
                {degree.code} - {degree.name}
              </option>
            ))}
          </select>

          <select
            name="dept_id"
            value={form.dept_id}
            onChange={handleChange}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Select Department</option>
            {departmentsForSelectedFaculty.map((department) => (
              <option key={department.dept_id} value={department.dept_id}>
                {department.name}
              </option>
            ))}
          </select>

          <input
            name="credits"
            value={form.credits}
            onChange={handleChange}
            type="number"
            min="1"
            placeholder="Credits"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />

          <input
            name="lecture_hours_per_week"
            value={form.lecture_hours_per_week}
            onChange={handleChange}
            type="number"
            min="1"
            placeholder="Lecture Hours Per Week"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />

          <select
            name="required_resource_type"
            value={form.required_resource_type}
            onChange={handleChange}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Select Required Resource Type</option>
            {resourceTypes.map((type) => (
              <option key={type} value={type}>
                {type}
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
            {saving ? "Saving..." : editId ? "Update Course" : "Add Course"}
          </button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
