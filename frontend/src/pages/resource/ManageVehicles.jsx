import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Plus, Edit, Trash2, X, Bus, Car, Truck, CheckCircle2, XCircle } from "lucide-react";

const initialForm = {
  reg_number: "",
  type: "Bus",
  capacity: "",
  driver_name: "",
  is_available: "true",
};

const VEHICLE_TYPES = ["Bus", "Van", "Car", "Minibus", "Truck", "Other"];
const BULK_UPLOAD_CHUNK_SIZE = 4;
const BULK_UPLOAD_CHUNK_DELAY_MS = 150;

const wait = (ms) => new Promise((resolve) => {
  window.setTimeout(resolve, ms);
});

const normalizeText = (value) => String(value ?? "").trim().toLowerCase();

const toBoolean = (value) => {
  const normalized = normalizeText(value);
  return ["true", "1", "yes", "y", "available", "active"].includes(normalized);
};

const getVehicleTypeIcon = (type) => {
  switch (normalizeText(type)) {
    case "bus":
      return <Bus size={18} className="text-blue-600" />;
    case "van":
    case "minibus":
      return <Truck size={18} className="text-orange-600" />;
    case "car":
      return <Car size={18} className="text-purple-600" />;
    default:
      return <Car size={18} className="text-gray-600" />;
  }
};

const getAvailabilityBadge = (isAvailable) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
      isAvailable ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
    }`}
  >
    {isAvailable ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
    {isAvailable ? "Available" : "Unavailable"}
  </span>
);

const ManageVehicles = () => {
  const [vehicles, setVehicles] = useState([
    {
      id: 1,
      reg_number: "WP-1234",
      type: "Bus",
      capacity: 45,
      driver_name: "Kamal Perera",
      is_available: true,
    },
    {
      id: 2,
      reg_number: "CP-5678",
      type: "Van",
      capacity: 15,
      driver_name: "Sunil Silva",
      is_available: false,
    },
    {
      id: 3,
      reg_number: "SP-9012",
      type: "Car",
      capacity: 4,
      driver_name: "Nimal Fernando",
      is_available: true,
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(null);

  const filteredVehicles = useMemo(() => {
    const query = normalizeText(search);

    return vehicles.filter((vehicle) => {
      if (typeFilter && vehicle.type !== typeFilter) {
        return false;
      }

      if (availabilityFilter === "available" && !vehicle.is_available) {
        return false;
      }

      if (availabilityFilter === "unavailable" && vehicle.is_available) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [vehicle.reg_number, vehicle.type, vehicle.driver_name]
        .some((value) => normalizeText(value).includes(query));
    });
  }, [vehicles, search, typeFilter, availabilityFilter]);

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

  const handleOpenModal = (vehicle = null) => {
    if (vehicle) {
      setEditingVehicle(vehicle.id);
      setFormData({
        reg_number: vehicle.reg_number,
        type: vehicle.type,
        capacity: String(vehicle.capacity),
        driver_name: vehicle.driver_name,
        is_available: String(vehicle.is_available),
      });
    } else {
      setEditingVehicle(null);
      setFormData(initialForm);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
  };

  const handleSave = (e) => {
    e.preventDefault();

    const payload = {
      reg_number: formData.reg_number.trim(),
      type: formData.type.trim(),
      capacity: Number(formData.capacity),
      driver_name: formData.driver_name.trim(),
      is_available: formData.is_available === "true",
    };

    if (!payload.reg_number || !payload.type || !Number.isFinite(payload.capacity) || payload.capacity <= 0 || !payload.driver_name) {
      alert("Please fill reg number, type, capacity and driver name.");
      return;
    }

    if (editingVehicle) {
      setVehicles(
        vehicles.map((vehicle) => (
          vehicle.id === editingVehicle ? { ...payload, id: editingVehicle } : vehicle
        ))
      );
    } else {
      const duplicate = vehicles.some((vehicle) => normalizeText(vehicle.reg_number) === normalizeText(payload.reg_number));
      if (duplicate) {
        alert("Registration number already exists.");
        return;
      }
      setVehicles([...vehicles, { ...payload, id: Date.now() }]);
    }

    handleCloseModal();
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this vehicle?")) {
      setVehicles(vehicles.filter((vehicle) => vehicle.id !== id));
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

      const existingNumbers = new Set(vehicles.map((vehicle) => normalizeText(vehicle.reg_number)));
      const seenNumbers = new Set();
      const payloads = [];
      const validationErrors = [];
      const duplicateRows = [];

      rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const regNumber = String(row.reg_number || row.registration_no || row.reg_no || "").trim();
        const type = String(row.type || row.vehicle_type || "").trim() || "Bus";
        const capacity = Number(row.capacity);
        const driverName = String(row.driver_name || row.driver || "").trim();
        const availabilityValue = row.is_available ?? row.available ?? row.status ?? "true";

        if (!regNumber || !driverName) {
          validationErrors.push(`Row ${rowNumber}: reg_number and driver_name are required`);
          return;
        }

        if (!Number.isFinite(capacity) || capacity <= 0) {
          validationErrors.push(`Row ${rowNumber}: capacity must be a positive number`);
          return;
        }

        const normalizedRegNumber = normalizeText(regNumber);
        if (existingNumbers.has(normalizedRegNumber)) {
          duplicateRows.push(`Row ${rowNumber}: vehicle already exists`);
          return;
        }

        if (seenNumbers.has(normalizedRegNumber)) {
          duplicateRows.push(`Row ${rowNumber}: duplicate in upload file`);
          return;
        }

        seenNumbers.add(normalizedRegNumber);
        payloads.push({
          rowNumber,
          payload: {
            reg_number: regNumber,
            type,
            capacity,
            driver_name: driverName,
            is_available: toBoolean(availabilityValue),
          },
        });
      });

      if (!payloads.length) {
        const summaryParts = [];
        if (validationErrors.length) summaryParts.push(`${validationErrors.length} row(s) invalid`);
        if (duplicateRows.length) summaryParts.push(`${duplicateRows.length} row(s) duplicate`);
        setUploadError(summaryParts.length ? `No new rows to upload | ${summaryParts.join(" | ")}` : "No valid rows were found in file");
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
        chunk.forEach((item) => {
          const duplicate = vehicles.some((vehicle) => normalizeText(vehicle.reg_number) === normalizeText(item.payload.reg_number));
          if (duplicate) {
            failedRows.push(`Row ${item.rowNumber}: reg number already exists`);
          } else {
            createdCount += 1;
            setVehicles((current) => [...current, { ...item.payload, id: Date.now() + Math.random() }]);
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

      const baseMessage = `Created ${createdCount} vehicle record(s)`;
      const validationPart = validationErrors.length ? ` | ${validationErrors.length} row(s) skipped during validation` : "";
      const duplicatePart = duplicateRows.length ? ` | ${duplicateRows.length} row(s) skipped as duplicate` : "";
      const failPart = failedRows.length ? ` | ${failedRows.length} row(s) failed during save` : "";
      setUploadMessage(`${baseMessage}${validationPart}${duplicatePart}${failPart}`);

      if (validationErrors.length || duplicateRows.length || failedRows.length) {
        const issueSummary = [];
        if (validationErrors.length) issueSummary.push(`${validationErrors.length} invalid`);
        if (duplicateRows.length) issueSummary.push(`${duplicateRows.length} duplicate`);
        if (failedRows.length) issueSummary.push(`${failedRows.length} failed`);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Manage Vehicles</h2>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/vehicle_upload_sample.csv"
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
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} /> Add Vehicle
          </button>
        </div>
      </div>

      {uploadMessage && (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {uploadMessage}
        </div>
      )}

      {uploadError && (
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {uploadError}
        </div>
      )}

      {uploading && uploadProgress && (
        <div className="rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Uploading rows {uploadProgress.processed} / {uploadProgress.total} | Created: {uploadProgress.created} | Failed: {uploadProgress.failed}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search reg number, type or driver"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">All Types</option>
          {VEHICLE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select
          value={availabilityFilter}
          onChange={(event) => setAvailabilityFilter(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">All Availability</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[780px] text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Reg Number</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Capacity</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Driver Name</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Availability</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVehicles.map((vehicle) => (
              <tr key={vehicle.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-900">{vehicle.reg_number}</td>
                <td className="px-4 py-3 text-gray-600">
                  <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700">
                    {getVehicleTypeIcon(vehicle.type)}
                    {vehicle.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{vehicle.capacity}</td>
                <td className="px-4 py-3 text-gray-600">{vehicle.driver_name}</td>
                <td className="px-4 py-3">{getAvailabilityBadge(vehicle.is_available)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleOpenModal(vehicle)} className="rounded bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-600">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(vehicle.id)} className="rounded bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredVehicles.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                  No vehicles found. Add a vehicle to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <h3 className="text-lg font-semibold text-gray-900">{editingVehicle ? "Edit Vehicle" : "Add Vehicle"}</h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Reg Number <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={formData.reg_number}
                  onChange={(e) => setFormData({ ...formData, reg_number: e.target.value })}
                  placeholder="e.g. WP-1234"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Vehicle Type <span className="text-red-500">*</span></label>
                <select
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  {VEHICLE_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Capacity <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  required
                  min="1"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="e.g. 45"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Driver Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={formData.driver_name}
                  onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                  placeholder="e.g. Kamal Perera"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Availability <span className="text-red-500">*</span></label>
                <select
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={formData.is_available}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.value })}
                >
                  <option value="true">Available</option>
                  <option value="false">Unavailable</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-lg bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  {editingVehicle ? "Save Changes" : "Add Vehicle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageVehicles;