import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "../layout/AdminLayout";
import Modal from "../../../components/Modal";
import { academicAPI } from "../../../services/api";
import { createUser, deleteUser, getUsers, updateUser } from "../../../services/userService";
import { Upload, X } from "lucide-react";
import api from "../../../services/api";

const roleOptions = [
  "SuperAdmin",
  "Scheduler",
  "Lecturer",
  "Student",
  "ResourceManager",
];

const sectionOptions = ["Transport", "Events"];

const createInitialForm = (role = "Student") => ({
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  role,
  is_active: true,
  contact_number: "",
  profile_image: "",
  student_profile: {
    reg_no: "",
    registration_number: "",
    batch_id: "",
  },
  lecturer_profile: {
    staff_id: "",
    dept_id: "",
    designation: "",
  },
  resource_manager_profile: {
    assigned_section: "Transport",
  },
});

export default function UserManagement({ forcedRole = null, titleOverride = "User Management" }) {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [form, setForm] = useState(createInitialForm(forcedRole || "Student"));
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef(null);

  const selectedRole = forcedRole || form.role;
  const showRoleColumn = !forcedRole;
  const modalTitle = useMemo(() => (editId ? "Edit User" : "Add User"), [editId]);

  const readApiError = (err, fallback) => {
    const detail = err?.response?.data?.detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail)) {
      return detail
        .map((item) => item?.msg)
        .filter(Boolean)
        .join(", ");
    }
    return err?.response?.data?.message || err?.message || fallback;
  };

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getUsers();
      if (forcedRole) {
        setUsers(data.filter((item) => item.role === forcedRole));
      } else {
        setUsers(data);
      }
    } catch (err) {
      setError(readApiError(err, "Failed to load users"));
    } finally {
      setLoading(false);
    }
  }, [forcedRole]);

  const loadLookups = useCallback(async () => {
    try {
      const [departmentData, batchData] = await Promise.all([
        academicAPI.getDepartments(),
        academicAPI.getBatches(),
      ]);
      setDepartments(departmentData);
      setBatches(batchData);
    } catch (err) {
      setError(readApiError(err, "Failed to load supporting data"));
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadLookups();
  }, [loadUsers, loadLookups]);

  const closeModal = (force = false) => {
    if (saving && !force) {
      return;
    }
    setIsModalOpen(false);
    setModalError("");
    setForm(createInitialForm(forcedRole || "Student"));
    setEditId(null);
    setImagePreview(null);
    setImageError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openCreateModal = () => {
    setEditId(null);
    setForm(createInitialForm(forcedRole || "Student"));
    setModalError("");
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    const role = forcedRole || user.role || "Student";
    setEditId(user.user_id);
    setForm({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      password: "",
      role,
      is_active: user.is_active,
      contact_number: user.contact_number || "",
      profile_image: user.profile_image || "",
      student_profile: {
        reg_no: user.student_profile?.reg_no || "",
        registration_number: user.student_profile?.registration_number || "",
        batch_id: user.student_profile?.batch_id ? String(user.student_profile.batch_id) : "",
      },
      lecturer_profile: {
        staff_id: user.lecturer_profile?.staff_id || "",
        dept_id: user.lecturer_profile?.dept_id ? String(user.lecturer_profile.dept_id) : "",
        designation: user.lecturer_profile?.designation || "",
      },
      resource_manager_profile: {
        assigned_section: user.resource_manager_profile?.assigned_section || "Transport",
      },
    });
    setImagePreview(null);
    setImageError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setModalError("");
    setIsModalOpen(true);
  };

  const handleFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleProfileFieldChange = (profileName, field, value) => {
    setForm((prev) => ({
      ...prev,
      [profileName]: {
        ...prev[profileName],
        [field]: value,
      },
    }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setImageError("Please select a valid image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Image must be less than 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result);
    };
    reader.readAsDataURL(file);
    setImageError("");
  };

  const handleUploadImage = async () => {
    if (!fileInputRef.current?.files?.[0]) return;

    const file = fileInputRef.current.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadingImage(true);
      setImageError("");
      const response = await api.post("/api/users/upload-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Update form with image path
      setForm((prev) => ({
        ...prev,
        profile_image: response.data.profile_image,
      }));

      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setImageError(err.response?.data?.detail || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setForm((prev) => ({
      ...prev,
      profile_image: "",
    }));
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setImageError("");
  };

  const cancelImageUpload = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setImageError("");
  };

  const validateForm = () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      return "First name and last name are required";
    }
    if (!form.email.trim() || !form.email.includes("@")) {
      return "A valid email is required";
    }
    if (!editId && !form.password.trim()) {
      return "Password is required";
    }
    if (form.password.trim() && form.password.trim().length < 6) {
      return "Password must be at least 6 characters";
    }

    if (selectedRole === "Student") {
      if (!form.student_profile.reg_no.trim()) {
        return "Student Reg No is required";
      }
      if (!form.student_profile.batch_id) {
        return "Student Batch is required";
      }
    }

    if (selectedRole === "Lecturer") {
      if (!form.lecturer_profile.staff_id.trim()) {
        return "Lecturer Staff ID is required";
      }
      if (!form.lecturer_profile.dept_id) {
        return "Lecturer Department is required";
      }
    }

    if (selectedRole === "ResourceManager") {
      if (!form.resource_manager_profile.assigned_section.trim()) {
        return "Assigned section is required";
      }
    }

    return "";
  };

  const buildPayload = () => {
    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      role: selectedRole,
      is_active: form.is_active,
      contact_number: form.contact_number.trim() || null,
      profile_image: form.profile_image.trim() || null,
    };

    if (form.password.trim()) {
      payload.password = form.password.trim();
    }

    if (selectedRole === "Student") {
      payload.student_profile = {
        reg_no: form.student_profile.reg_no.trim(),
        registration_number: form.student_profile.registration_number.trim() || null,
        batch_id: Number(form.student_profile.batch_id),
      };
    }

    if (selectedRole === "Lecturer") {
      payload.lecturer_profile = {
        staff_id: form.lecturer_profile.staff_id.trim(),
        dept_id: Number(form.lecturer_profile.dept_id),
        designation: form.lecturer_profile.designation.trim() || null,
      };
    }

    if (selectedRole === "ResourceManager") {
      payload.resource_manager_profile = {
        assigned_section: form.resource_manager_profile.assigned_section.trim(),
      };
    }

    return payload;
  };

  const handleSubmit = async () => {
    const validationMessage = validateForm();
    if (validationMessage) {
      setModalError(validationMessage);
      return;
    }

    try {
      setSaving(true);
      setModalError("");
      const payload = buildPayload();
      if (editId) {
        await updateUser(editId, payload);
      } else {
        await createUser(payload);
      }
      await loadUsers();
      closeModal(true);
    } catch (err) {
      setModalError(readApiError(err, "Failed to save user"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId) => {
    const confirmed = window.confirm("Are you sure you want to delete this user? This action cannot be undone.");
    if (!confirmed) {
      return;
    }

    try {
      setError("");
      await deleteUser(userId);
      await loadUsers();
    } catch (err) {
      setError(readApiError(err, "Failed to delete user"));
    }
  };

  const getDepartmentNameById = (deptId) => {
    if (deptId === undefined || deptId === null || deptId === "") {
      return "-";
    }

    const department = departments.find((item) => String(item.dept_id) === String(deptId));
    return department?.name || String(deptId);
  };

  const getBatchLabelById = (batchId) => {
    if (batchId === undefined || batchId === null || batchId === "") {
      return "-";
    }

    const batch = batches.find((item) => String(item.batch_id) === String(batchId));
    if (!batch) {
      return String(batchId);
    }

    return batch.batch_code || batch.name || String(batchId);
  };

  const roleDetail = (user) => {
    if (user.role === "Student") {
      const reg = user.student_profile?.reg_no || "-";
      const batch = getBatchLabelById(user.student_profile?.batch_id);
      return `Reg: ${reg}, Batch: ${batch}`;
    }
    if (user.role === "Lecturer") {
      const staff = user.lecturer_profile?.staff_id || "-";
      const dept = getDepartmentNameById(user.lecturer_profile?.dept_id);
      return `Staff: ${staff}, Dept: ${dept}`;
    }
    if (user.role === "ResourceManager") {
      return `Section: ${user.resource_manager_profile?.assigned_section || "-"}`;
    }
    return "-";
  };

  const userDetails = (user) => {
    const details = [];
    
    if (user.contact_number) {
      details.push(`📞 ${user.contact_number}`);
    }
    
    if (user.role === "Student") {
      const reg = user.student_profile?.reg_no || "-";
      const batch = getBatchLabelById(user.student_profile?.batch_id);
      details.push(`🎓 Reg: ${reg}, Batch: ${batch}`);
    } else if (user.role === "Lecturer") {
      const staff = user.lecturer_profile?.staff_id || "-";
      const dept = getDepartmentNameById(user.lecturer_profile?.dept_id);
      details.push(`👨‍🏫 Staff: ${staff}, Dept: ${dept}`);
      if (user.lecturer_profile?.designation) {
        details.push(`📋 ${user.lecturer_profile.designation}`);
      }
    } else if (user.role === "ResourceManager") {
      details.push(`🔧 Section: ${user.resource_manager_profile?.assigned_section || "-"}`);
    }
    
    return details.length > 0 ? details : ["-"];
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{titleOverride}</h1>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add User
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[860px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
              {showRoleColumn && (
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Details</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={showRoleColumn ? 6 : 5}>
                  Loading users...
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={showRoleColumn ? 6 : 5}>
                  No users found.
                </td>
              </tr>
            )}
            {!loading &&
              users.map((user) => (
                <tr key={user.user_id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-sm text-gray-800">
                    {user.first_name} {user.last_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{user.email}</td>
                  {showRoleColumn && (
                    <td className="px-4 py-3 text-sm text-gray-700">{user.role}</td>
                  )}
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div className="space-y-1">
                      {userDetails(user).map((detail, idx) => (
                        <div key={idx} className="text-xs text-gray-600">
                          {detail}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        user.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(user)}
                        className="rounded bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-600"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(user.user_id)}
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input
            name="first_name"
            placeholder="First Name"
            value={form.first_name}
            onChange={handleFieldChange}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <input
            name="last_name"
            placeholder="Last Name"
            value={form.last_name}
            onChange={handleFieldChange}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleFieldChange}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <input
            name="password"
            type="password"
            placeholder={editId ? "New Password (optional)" : "Password"}
            value={form.password}
            onChange={handleFieldChange}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          {!forcedRole && (
            <select
              name="role"
              value={form.role}
              onChange={handleFieldChange}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          )}
          <input
            name="contact_number"
            placeholder="Contact Number"
            value={form.contact_number}
            onChange={handleFieldChange}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          
          {/* Profile Image Upload */}
          <div className="md:col-span-2">
            <div className="rounded-lg border border-gray-300 p-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-16 w-16 rounded-lg object-cover border-2 border-blue-400"
                    />
                  ) : form.profile_image ? (
                    <img
                      src={`http://localhost:8000${form.profile_image}`}
                      alt="Profile"
                      className="h-16 w-16 rounded-lg object-cover border-2 border-gray-300"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                      <Upload size={24} className="text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Image (optional)
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  {imagePreview ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleUploadImage}
                        disabled={uploadingImage}
                        className="px-3 py-1 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                      >
                        {uploadingImage ? "Uploading..." : "Save Image"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelImageUpload}
                        disabled={uploadingImage}
                        className="px-3 py-1 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Choose Image
                      </button>
                      {form.profile_image && (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="px-3 py-1 text-xs rounded-lg border border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <X size={14} className="inline mr-1" />
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {imageError && (
                <div className="mt-2 text-xs text-red-600">{imageError}</div>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 md:col-span-2">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleFieldChange}
            />
            Active user
          </label>
        </div>

        {selectedRole === "Student" && (
          <div className="mt-5 space-y-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-800">Student Details</p>
            <input
              placeholder="Reg No (Index Number)"
              value={form.student_profile.reg_no}
              onChange={(e) => handleProfileFieldChange("student_profile", "reg_no", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            
            <select
              value={form.student_profile.batch_id}
              onChange={(e) =>
                handleProfileFieldChange("student_profile", "batch_id", e.target.value)
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Select Batch</option>
              {batches.map((batch) => (
                <option key={batch.batch_id} value={batch.batch_id}>
                  {batch.batch_code || batch.name} - {batch.degree ? `${batch.degree.code} ${batch.degree.name}` : "Degree"}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedRole === "Lecturer" && (
          <div className="mt-5 space-y-3 rounded-lg border border-amber-100 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">Lecturer Details</p>
            <input
              placeholder="Staff ID"
              value={form.lecturer_profile.staff_id}
              onChange={(e) => handleProfileFieldChange("lecturer_profile", "staff_id", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <select
              value={form.lecturer_profile.dept_id}
              onChange={(e) => handleProfileFieldChange("lecturer_profile", "dept_id", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Select Department</option>
              {departments.map((department) => (
                <option key={department.dept_id} value={department.dept_id}>
                  {department.name}
                </option>
              ))}
            </select>
            <input
              placeholder="Designation (optional)"
              value={form.lecturer_profile.designation}
              onChange={(e) =>
                handleProfileFieldChange("lecturer_profile", "designation", e.target.value)
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
        )}

        {selectedRole === "ResourceManager" && (
          <div className="mt-5 space-y-3 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-800">Resource Manager Details</p>
            <select
              value={form.resource_manager_profile.assigned_section}
              onChange={(e) =>
                handleProfileFieldChange(
                  "resource_manager_profile",
                  "assigned_section",
                  e.target.value
                )
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              {sectionOptions.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>
        )}

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
            {saving ? "Saving..." : editId ? "Update User" : "Add User"}
          </button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
