import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import Modal from "../../components/Modal";
import { resourceAPI } from "../../services/api";

const initialForm = {
  name: "",
  type: "Lecture Hall",
  capacity: "",
  faculty_id: "",
  dept_id: "",
  location: "",
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

export default function ManageRooms() {
  const [resources, setResources] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [resourceTypes, setResourceTypes] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [facilityOptions, setFacilityOptions] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);
  const [selectedFacilities, setSelectedFacilities] = useState([]);
  const [otherFacility, setOtherFacility] = useState("");
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceFacultyFilter, setResourceFacultyFilter] = useState("");
  const [resourceDepartmentFilter, setResourceDepartmentFilter] = useState("");
  const [resourceTypeFilter, setResourceTypeFilter] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(null);

  const modalTitle = useMemo(
    () => (editId ? "Edit Resource" : "Add Resource"),
    [editId]
  );

  const hasOtherFacilityOption = useMemo(
    () => facilityOptions.some((item) => normalizeText(item) === "other"),
    [facilityOptions]
  );

  const otherFacilityLabel = useMemo(
    () => facilityOptions.find((item) => normalizeText(item) === "other") || "Other",
    [facilityOptions]
  );

  const renderedFacilities = useMemo(() => {
    if (hasOtherFacilityOption) {
      return facilityOptions;
    }
    if (selectedFacilities.some((item) => normalizeText(item) === "other") || otherFacility.trim()) {
      return [...facilityOptions, otherFacilityLabel];
    }
    return facilityOptions;
  }, [facilityOptions, hasOtherFacilityOption, selectedFacilities, otherFacility, otherFacilityLabel]);

  const renderedResourceTypes = useMemo(() => {
    const allowedTypes = ["Lecture Hall", "Computer Lab", "Auditorium"];
    const normalizedAllowed = allowedTypes.map((item) => normalizeText(item));
    const typedSettings = resourceTypes.filter((item) => normalizedAllowed.includes(normalizeText(item)));
    const base = typedSettings.length ? typedSettings : allowedTypes;

    if (!form.type || base.includes(form.type)) {
      return base;
    }
    return [...base, form.type];
  }, [resourceTypes, form.type]);

  const renderedLocations = useMemo(() => {
    if (!form.location || locationOptions.includes(form.location)) {
      return locationOptions;
    }
    return [...locationOptions, form.location];
  }, [locationOptions, form.location]);

  const filteredResourceTypes = useMemo(() => {
    if (!resourceTypeFilter) {
      return renderedResourceTypes;
    }
    return renderedResourceTypes.includes(resourceTypeFilter)
      ? [resourceTypeFilter, ...renderedResourceTypes.filter((item) => item !== resourceTypeFilter)]
      : [resourceTypeFilter, ...renderedResourceTypes];
  }, [renderedResourceTypes, resourceTypeFilter]);

  const filteredResourceDepartments = useMemo(() => {
    const scopedDepartments = resourceFacultyFilter
      ? departments.filter((department) => String(department.faculty_id) === String(resourceFacultyFilter))
      : departments;

    if (!resourceDepartmentFilter) {
      return scopedDepartments;
    }

    const hasCurrent = scopedDepartments.some((department) => String(department.dept_id) === String(resourceDepartmentFilter));
    if (hasCurrent) {
      return scopedDepartments;
    }

    const currentDepartment = departments.find((department) => String(department.dept_id) === String(resourceDepartmentFilter));
    return currentDepartment ? [...scopedDepartments, currentDepartment] : scopedDepartments;
  }, [departments, resourceFacultyFilter, resourceDepartmentFilter]);

  const filteredDepartments = useMemo(() => {
    if (!form.faculty_id) {
      return [];
    }
    return departments.filter(
      (department) => String(department.faculty_id) === String(form.faculty_id)
    );
  }, [departments, form.faculty_id]);

  const renderedDepartments = useMemo(() => {
    if (!form.dept_id) {
      return filteredDepartments;
    }
    const hasCurrent = filteredDepartments.some(
      (department) => String(department.dept_id) === String(form.dept_id)
    );
    if (hasCurrent) {
      return filteredDepartments;
    }
    const currentDepartment = departments.find(
      (department) => String(department.dept_id) === String(form.dept_id)
    );
    return currentDepartment ? [...filteredDepartments, currentDepartment] : filteredDepartments;
  }, [filteredDepartments, departments, form.dept_id]);

  const filteredResources = useMemo(() => {
    const query = normalizeText(resourceSearch);
    const allowedTypes = new Set(["lecture hall", "computer lab", "auditorium"]);

    return resources.filter((resource) => {
      if (!allowedTypes.has(normalizeText(resource.type))) {
        return false;
      }

      if (resourceFacultyFilter && String(resource.faculty_id || "") !== String(resourceFacultyFilter)) {
        return false;
      }

      if (resourceDepartmentFilter) {
        const resourceDeptIds = (resource.dept_ids || [resource.dept_id])
          .map((id) => String(id))
          .filter(Boolean);
        if (!resourceDeptIds.includes(String(resourceDepartmentFilter))) {
          return false;
        }
      }

      if (resourceTypeFilter && resource.type !== resourceTypeFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchableValues = [
        resource.name,
        resource.type,
        resource.faculty_name,
        resource.department_name,
        ...(resource.department_names || []),
        resource.facilities,
        resource.location,
      ];

      return searchableValues.some((value) => normalizeText(value).includes(query));
    });
  }, [resources, resourceSearch, resourceFacultyFilter, resourceDepartmentFilter, resourceTypeFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [resourceData, facultyData, departmentData, settingsData] = await Promise.all([
        resourceAPI.getResources(),
        resourceAPI.getFaculties(),
        resourceAPI.getDepartments(),
        resourceAPI.getSystemSettings(),
      ]);
      setResources(resourceData);
      setFaculties(facultyData);
      setDepartments(departmentData);

      const allSettings = settingsData || [];
      setResourceTypes(
        allSettings
          .filter((item) => item.category === "RESOURCE_TYPES")
          .map((item) => item.value)
      );
      setLocationOptions(
        allSettings
          .filter((item) => item.category === "LOCATIONS")
          .map((item) => item.value)
      );
      setFacilityOptions(
        allSettings
          .filter((item) => item.category === "FACILITIES")
          .map((item) => item.value)
      );
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load resources");
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
    setSelectedDepartmentIds([]);
    setSelectedFacilities([]);
    setOtherFacility("");
    setModalError("");
    setIsModalOpen(true);
  };

  const openEditModal = (resource) => {
    const facilitiesList = String(resource.facilities || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const commonMap = new Map(facilityOptions.map((item) => [item.toLowerCase(), item]));
    const matchedCommon = [];
    const customFacilities = [];

    facilitiesList.forEach((item) => {
      const normalized = item.toLowerCase();
      const matched = commonMap.get(normalized);
      if (matched && normalizeText(matched) !== "other") {
        matchedCommon.push(matched);
      } else {
        customFacilities.push(item);
      }
    });

    if (customFacilities.length) {
      matchedCommon.push(otherFacilityLabel);
    }

    setEditId(resource.resource_id);
    setForm({
      name: resource.name || "",
      type: resource.type || "Lecture Hall",
      capacity: resource.capacity ? String(resource.capacity) : "",
      faculty_id: resource.faculty_id ? String(resource.faculty_id) : "",
      dept_id: resource.dept_id ? String(resource.dept_id) : "",
      location: resource.location || "",
    });
    const existingDeptIds = (resource.dept_ids || [])
      .map((id) => String(id))
      .filter(Boolean);
    if (!existingDeptIds.length && resource.dept_id) {
      existingDeptIds.push(String(resource.dept_id));
    }
    setSelectedDepartmentIds([...new Set(existingDeptIds)]);
    setSelectedFacilities([...new Set(matchedCommon)]);
    setOtherFacility(customFacilities.join(", "));
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
    setSelectedDepartmentIds([]);
    setSelectedFacilities([]);
    setOtherFacility("");
    setModalError("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "faculty_id" ? { dept_id: "" } : {}),
    }));

    if (name === "faculty_id") {
      setSelectedDepartmentIds([]);
    }
  };

  const handleDepartmentToggle = (deptId) => {
    const value = String(deptId);
    setSelectedDepartmentIds((prev) => {
      if (prev.includes(value)) {
        const next = prev.filter((item) => item !== value);
        setForm((current) => ({
          ...current,
          dept_id: next[0] || "",
        }));
        return next;
      }

      const next = [...prev, value];
      setForm((current) => ({
        ...current,
        dept_id: current.dept_id || value,
      }));
      return next;
    });
  };

  const handleFacilityChange = (facility) => {
    setSelectedFacilities((prev) => {
      if (prev.includes(facility)) {
        return prev.filter((item) => item !== facility);
      }
      return [...prev, facility];
    });

    if (normalizeText(facility) === "other" && selectedFacilities.some((item) => normalizeText(item) === "other")) {
      setOtherFacility("");
    }
  };

  const handleSubmit = async () => {
    const capacity = Number(form.capacity);
    if (
      !form.name.trim() ||
      !form.type.trim() ||
      !form.faculty_id ||
      selectedDepartmentIds.length === 0 ||
      !Number.isFinite(capacity) ||
      capacity <= 0
    ) {
      setModalError("Resource name, type, faculty, at least one department and a valid capacity are required");
      return;
    }

    const payload = {
      name: form.name.trim(),
      type: form.type.trim(),
      capacity,
      faculty_id: Number(form.faculty_id),
      dept_id: Number(selectedDepartmentIds[0]),
      dept_ids: selectedDepartmentIds.map((id) => Number(id)),
      facilities: [
        ...selectedFacilities.filter((item) => normalizeText(item) !== "other"),
        ...(selectedFacilities.some((item) => normalizeText(item) === "other") && otherFacility.trim()
          ? [otherFacility.trim()]
          : []),
      ].join(", ") || null,
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
      await loadData();
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
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete resource");
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

      const allowedTypes = new Set(["lecture hall", "computer lab", "auditorium"]);
      const payloads = [];
      const validationErrors = [];
      const duplicateRows = [];
      const existingKeys = new Set(
        resources
          .filter((item) => allowedTypes.has(normalizeText(item.type)))
          .map((item) => {
            const deptIds = (item.dept_ids || [])
              .map((id) => Number(id))
              .filter((id) => Number.isFinite(id))
              .sort((a, b) => a - b)
              .join(",");
            return [
              normalizeText(item.name),
              normalizeText(item.type),
              String(item.faculty_id || ""),
              deptIds,
            ].join("::");
          })
      );
      const seenKeys = new Set();

      rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const name = String(getFirstNonEmptyValue(row, ["resource_name", "name"])).trim();
        const type = String(getFirstNonEmptyValue(row, ["resource_type", "type"])).trim();
        const capacityValue = getFirstNonEmptyValue(row, ["capacity"]);
        const location = String(getFirstNonEmptyValue(row, ["location", "building"])).trim();
        const facilities = String(getFirstNonEmptyValue(row, ["facilities"])).trim();
        const facultyIdValue = getFirstNonEmptyValue(row, ["faculty_id"]);
        const facultyCode = String(getFirstNonEmptyValue(row, ["faculty_code"])).trim();
        const facultyName = String(getFirstNonEmptyValue(row, ["faculty_name"])).trim();
        const departmentIdValue = getFirstNonEmptyValue(row, ["dept_id", "department_id"]);
        const departmentIdsValue = String(getFirstNonEmptyValue(row, ["dept_ids", "department_ids"])).trim();
        const departmentCode = String(getFirstNonEmptyValue(row, ["dept_code", "department_code"])).trim();
        const departmentCodesValue = String(getFirstNonEmptyValue(row, ["dept_codes", "department_codes"])).trim();
        const departmentName = String(getFirstNonEmptyValue(row, ["dept_name", "department_name"])).trim();
        const departmentNamesValue = String(getFirstNonEmptyValue(row, ["dept_names", "department_names"])).trim();

        if (!name || !type) {
          validationErrors.push(`Row ${rowNumber}: resource_name and resource_type are required`);
          return;
        }

        if (!allowedTypes.has(normalizeText(type))) {
          validationErrors.push(`Row ${rowNumber}: resource_type must be Lecture Hall, Computer Lab or Auditorium`);
          return;
        }

        const capacity = Number(capacityValue);
        if (!Number.isFinite(capacity) || capacity <= 0) {
          validationErrors.push(`Row ${rowNumber}: capacity must be a positive number`);
          return;
        }

        let faculty = null;
        const parsedFacultyId = Number(facultyIdValue);
        if (Number.isFinite(parsedFacultyId) && parsedFacultyId > 0) {
          faculty = faculties.find((item) => item.faculty_id === parsedFacultyId) || null;
        }

        if (!faculty && facultyCode) {
          const normalizedCode = normalizeText(facultyCode);
          faculty = faculties.find((item) => normalizeText(item.code) === normalizedCode) || null;
        }

        if (!faculty && facultyName) {
          const normalizedName = normalizeText(facultyName);
          faculty = faculties.find((item) => normalizeText(item.name) === normalizedName) || null;
        }

        if (!faculty) {
          validationErrors.push(`Row ${rowNumber}: faculty_id, faculty_code or faculty_name is required and must match`);
          return;
        }

        const facultyDepartments = departments.filter(
          (item) => String(item.faculty_id) === String(faculty.faculty_id)
        );

        let department = null;
        const parsedDepartmentId = Number(departmentIdValue);
        if (Number.isFinite(parsedDepartmentId) && parsedDepartmentId > 0) {
          department = facultyDepartments.find((item) => item.dept_id === parsedDepartmentId) || null;
        }

        if (!department && departmentCode) {
          const normalizedDeptCode = normalizeText(departmentCode);
          department = facultyDepartments.find((item) => normalizeText(item.code || item.name) === normalizedDeptCode) || null;
        }

        if (!department && departmentName) {
          const normalizedDeptName = normalizeText(departmentName);
          department = facultyDepartments.find((item) => normalizeText(item.name || item.code) === normalizedDeptName) || null;
        }

        const resolvedDepartments = [];
        if (department) {
          resolvedDepartments.push(department);
        }

        const addDepartmentByMatch = (rawValue, matchBy) => {
          const tokens = String(rawValue || "")
            .split(/[|;,]/)
            .map((token) => token.trim())
            .filter(Boolean);

          tokens.forEach((token) => {
            const match = facultyDepartments.find((item) => matchBy(item, token));
            if (match && !resolvedDepartments.some((item) => item.dept_id === match.dept_id)) {
              resolvedDepartments.push(match);
            }
          });
        };

        addDepartmentByMatch(departmentIdsValue, (item, token) => item.dept_id === Number(token));
        addDepartmentByMatch(departmentCodesValue, (item, token) => normalizeText(item.code) === normalizeText(token));
        addDepartmentByMatch(departmentNamesValue, (item, token) => normalizeText(item.name) === normalizeText(token));

        if (!resolvedDepartments.length) {
          validationErrors.push(`Row ${rowNumber}: department values are required and must match selected faculty`);
          return;
        }

        const deptIds = resolvedDepartments
          .map((item) => Number(item.dept_id))
          .filter((value) => Number.isFinite(value))
          .sort((a, b) => a - b);
        const resourceKey = [
          normalizeText(name),
          normalizeText(type),
          String(faculty.faculty_id),
          deptIds.join(","),
        ].join("::");

        if (existingKeys.has(resourceKey)) {
          duplicateRows.push(`Row ${rowNumber}: resource already exists for selected faculty/department(s)`);
          return;
        }

        if (seenKeys.has(resourceKey)) {
          duplicateRows.push(`Row ${rowNumber}: duplicate resource in upload file`);
          return;
        }

        seenKeys.add(resourceKey);

        payloads.push({
          rowNumber,
          payload: {
            name,
            type,
            capacity,
            faculty_id: faculty.faculty_id,
            dept_id: resolvedDepartments[0].dept_id,
            dept_ids: resolvedDepartments.map((item) => item.dept_id),
            facilities: facilities || null,
            location: location || null,
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
          setUploadMessage(`No new resources were uploaded | ${duplicateRows.length} row(s) already exist or are repeated in the file`);
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
          chunk.map((item) => resourceAPI.createResource(item.payload))
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

      const baseMessage = `Created ${createdCount} resource record(s)`;
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Manage Rooms</h1>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/resource_upload_sample.csv"
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
            Add Resource
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
          value={resourceSearch}
          onChange={(event) => setResourceSearch(event.target.value)}
          placeholder="Search name, type, faculty, department, facility or location"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <select
          value={resourceFacultyFilter}
          onChange={(event) => {
            setResourceFacultyFilter(event.target.value);
            setResourceDepartmentFilter("");
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">All Faculties</option>
          {faculties.map((faculty) => (
            <option key={faculty.faculty_id} value={faculty.faculty_id}>
              {faculty.name}
            </option>
          ))}
        </select>
        <select
          value={resourceDepartmentFilter}
          onChange={(event) => setResourceDepartmentFilter(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">All Departments</option>
          {filteredResourceDepartments.map((department) => (
            <option key={department.dept_id} value={department.dept_id}>
              {department.name}
            </option>
          ))}
        </select>
        <select
          value={resourceTypeFilter}
          onChange={(event) => setResourceTypeFilter(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">All Types</option>
          {filteredResourceTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Faculty</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Facilities</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Capacity</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={8}>
                  Loading resources...
                </td>
              </tr>
            )}
            {!loading && filteredResources.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={8}>
                  No resources found for the current filters.
                </td>
              </tr>
            )}
            {!loading &&
              filteredResources.map((resource) => (
                <tr key={resource.resource_id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-sm text-gray-800">{resource.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{resource.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{resource.faculty_name || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {(resource.department_names || []).length
                      ? resource.department_names.join(", ")
                      : resource.department_name || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{resource.facilities || "-"}</td>
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
            {renderedResourceTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
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
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="mb-2 text-sm font-medium text-gray-700">Departments</p>
            {!form.faculty_id ? (
              <p className="text-sm text-gray-500">Select faculty first</p>
            ) : renderedDepartments.length === 0 ? (
              <p className="text-sm text-gray-500">No departments available for selected faculty</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {renderedDepartments.map((department) => (
                  <label key={department.dept_id} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedDepartmentIds.includes(String(department.dept_id))}
                      onChange={() => handleDepartmentToggle(department.dept_id)}
                    />
                    {department.name}
                  </label>
                ))}
              </div>
            )}
          </div>
          <input
            name="capacity"
            value={form.capacity}
            onChange={handleChange}
            type="number"
            min="1"
            placeholder="Capacity"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />

          <div className="rounded-lg border border-gray-200 p-3">
            <p className="mb-2 text-sm font-medium text-gray-700">Facilities</p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {renderedFacilities.map((facility) => (
                <label key={facility} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedFacilities.includes(facility)}
                    onChange={() => handleFacilityChange(facility)}
                  />
                  {facility}
                </label>
              ))}
            </div>

            {selectedFacilities.some((item) => normalizeText(item) === "other") && (
              <input
                value={otherFacility}
                onChange={(event) => setOtherFacility(event.target.value)}
                placeholder="Other facilities"
                className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            )}
          </div>

          <select
            name="location"
            value={form.location}
            onChange={handleChange}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Select Location</option>
            {renderedLocations.map((location) => (
              <option key={location} value={location}>
                {location}
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
            {saving ? "Saving..." : editId ? "Update Resource" : "Add Resource"}
          </button>
        </div>
      </Modal>
    </div>
  );
}