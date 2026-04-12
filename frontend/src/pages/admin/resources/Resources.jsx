import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import AdminLayout from "../layout/AdminLayout";
import Modal from "../../../components/Modal";
import { academicAPI, resourceAPI, settingsAPI } from "../../../services/api";

const initialForm = {
  name: "",
  type: "Lecture Hall",
  capacity: "",
  faculty_id: "",
  dept_id: "",
  location: "",
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

export default function Resources() {
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
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

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
    if (!form.type || resourceTypes.includes(form.type)) {
      return resourceTypes;
    }
    return [...resourceTypes, form.type];
  }, [resourceTypes, form.type]);

  const renderedLocations = useMemo(() => {
    if (!form.location || locationOptions.includes(form.location)) {
      return locationOptions;
    }
    return [...locationOptions, form.location];
  }, [locationOptions, form.location]);

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

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [resourceData, facultyData, departmentData, settingsData] = await Promise.all([
        resourceAPI.getResources(),
        academicAPI.getFaculties(),
        academicAPI.getDepartments(),
        settingsAPI.getSystemSettings(),
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

    const facilitiesPayload = [
      ...selectedFacilities.filter((item) => normalizeText(item) !== "other"),
      ...(selectedFacilities.some((item) => normalizeText(item) === "other") && otherFacility.trim()
        ? [otherFacility.trim()]
        : []),
    ].join(", ");

    const payload = {
      name: form.name.trim(),
      type: form.type.trim(),
      capacity,
      faculty_id: Number(form.faculty_id),
      dept_id: Number(selectedDepartmentIds[0]),
      dept_ids: selectedDepartmentIds.map((id) => Number(id)),
      facilities: facilitiesPayload || null,
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
        const name = String(getFirstNonEmptyValue(row, ["resource_name", "name"])).trim();
        const type = String(getFirstNonEmptyValue(row, ["resource_type", "type"])).trim();
        const capacityValue = getFirstNonEmptyValue(row, ["capacity"]);
        const location = String(getFirstNonEmptyValue(row, ["location", "building"])).trim();
        const facilities = String(getFirstNonEmptyValue(row, ["facilities"])).trim();
        const facultyIdValue = getFirstNonEmptyValue(row, ["faculty_id"]);
        const facultyCode = String(getFirstNonEmptyValue(row, ["faculty_code"])).trim();
        const facultyName = String(getFirstNonEmptyValue(row, ["faculty_name"])).trim();
        const departmentIdValue = getFirstNonEmptyValue(row, ["dept_id", "department_id"]);
        const departmentIdsValue = String(
          getFirstNonEmptyValue(row, ["dept_ids", "department_ids"])
        ).trim();
        const departmentCode = String(
          getFirstNonEmptyValue(row, ["dept_code", "department_code"])
        ).trim();
        const departmentCodesValue = String(
          getFirstNonEmptyValue(row, ["dept_codes", "department_codes"])
        ).trim();
        const departmentName = String(
          getFirstNonEmptyValue(row, ["dept_name", "department_name"])
        ).trim();
        const departmentNamesValue = String(
          getFirstNonEmptyValue(row, ["dept_names", "department_names"])
        ).trim();

        if (!name || !type) {
          validationErrors.push(`Row ${rowNumber}: resource_name and resource_type are required`);
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
          validationErrors.push(
            `Row ${rowNumber}: faculty_id, faculty_code or faculty_name is required and must match`
          );
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
          department =
            facultyDepartments.find((item) => normalizeText(item.code || item.name) === normalizedDeptCode) || null;
        }

        if (!department && departmentName) {
          const normalizedDeptName = normalizeText(departmentName);
          department =
            facultyDepartments.find((item) => normalizeText(item.name || item.code) === normalizedDeptName) || null;
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
          validationErrors.push(
            `Row ${rowNumber}: department values are required and must match selected faculty`
          );
          return;
        }

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
        setUploadError(validationErrors.join(" | ") || "No valid rows were found in file");
        return;
      }

      const createResults = await Promise.allSettled(
        payloads.map((item) => resourceAPI.createResource(item.payload))
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

      const baseMessage = `Created ${createdCount} resource record(s)`;
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

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Resources</h1>
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
            {!loading && resources.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={8}>
                  No resources found.
                </td>
              </tr>
            )}
            {!loading &&
              resources.map((resource) => (
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
    </AdminLayout>
  );
}
