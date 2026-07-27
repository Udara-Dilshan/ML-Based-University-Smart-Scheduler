import { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "../layout/AdminLayout";
import Modal from "../../../components/Modal";
import { Mail, Phone, Calendar, Shield, Edit2, Key, AlertCircle, Upload, X } from "lucide-react";
import { getUser, getImageUrl } from "../../../services/api";
import api from "../../../services/api";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const navigate = useNavigate();
  const currentUser = getUser();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef(null);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    contact_number: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [editError, setEditError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/api/auth/me");
      setProfileData(response.data);
      setEditForm({
        first_name: response.data.first_name || "",
        last_name: response.data.last_name || "",
        contact_number: response.data.contact_number || "",
      });
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const initials = useMemo(() => {
    if (!profileData) return "SA";
    const parts = `${profileData.first_name || ""} ${profileData.last_name || ""}`
      .split(" ")
      .filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return "SA";
  }, [profileData]);

  const fullName = useMemo(() => {
    if (!profileData) return "Admin";
    return [profileData.first_name, profileData.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || "Admin User";
  }, [profileData]);

  const openEditModal = () => {
    setEditError("");
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
    setEditError("");
    if (profileData) {
      setEditForm({
        first_name: profileData.first_name || "",
        last_name: profileData.last_name || "",
        contact_number: profileData.contact_number || "",
      });
    }
  };

  const openPasswordModal = () => {
    setPasswordError("");
    setPasswordForm({
      current_password: "",
      new_password: "",
      confirm_password: "",
    });
    setIsPasswordOpen(true);
  };

  const closePasswordModal = () => {
    setIsPasswordOpen(false);
    setPasswordError("");
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditSubmit = async () => {
    if (!editForm.first_name.trim()) {
      setEditError("First name is required");
      return;
    }
    if (!editForm.last_name.trim()) {
      setEditError("Last name is required");
      return;
    }

    try {
      setSaving(true);
      setEditError("");
      const response = await api.put(`/api/users/${profileData.user_id}`, {
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        contact_number: editForm.contact_number.trim() || null,
      });
      setProfileData(response.data);
      closeEditModal();
    } catch (err) {
      setEditError(err.response?.data?.detail || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!passwordForm.current_password) {
      setPasswordError("Current password is required");
      return;
    }
    if (!passwordForm.new_password) {
      setPasswordError("New password is required");
      return;
    }
    if (passwordForm.new_password.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("Passwords do not match");
      return;
    }

    try {
      setSaving(true);
      setPasswordError("");
      await api.post("/api/auth/change-password", {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      closePasswordModal();
      setProfileData((prev) => ({
        ...prev,
        updated_at: new Date().toISOString(),
      }));
    } catch (err) {
      setPasswordError(err.response?.data?.detail || "Failed to change password");
    } finally {
      setSaving(false);
    }
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
    reader.onload = (e) => {
      setImagePreview(e.target?.result);
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
      const response = await api.post("/api/auth/upload-profile-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Update profile data with new image
      setProfileData((prev) => ({
        ...prev,
        profile_image: response.data.profile_image,
      }));

      // Update localStorage with new user data
      const updatedUser = {
        ...currentUser,
        profile_image: response.data.profile_image,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));

      // Trigger custom event to notify other components
      window.dispatchEvent(new Event("userProfileUpdated"));

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

  const cancelImageUpload = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setImageError("");
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!profileData) {
    return (
      <AdminLayout>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error || "Unable to load profile"}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account information</p>
      </div>

      {error && (
        <div className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {/* Profile Header Card */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            <div className="relative">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-20 w-20 rounded-full object-cover border-2 border-blue-400"
                />
              ) : profileData?.profile_image ? (
                <img
                  src={getImageUrl(profileData.profile_image)}
                  alt="Profile"
                  className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-blue-500 text-white text-2xl font-semibold flex items-center justify-center">
                  {initials}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 rounded-full bg-blue-600 p-2 text-white hover:bg-blue-700 shadow-lg"
                title="Change profile picture"
              >
                <Upload size={14} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            {imagePreview && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleUploadImage}
                  disabled={uploadingImage}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {uploadingImage ? "Uploading..." : "Save Image"}
                </button>
                <button
                  type="button"
                  onClick={cancelImageUpload}
                  disabled={uploadingImage}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            )}

            <div>
              <h2 className="text-2xl font-semibold text-gray-900">{fullName}</h2>
              <div className="mt-2 flex items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                  <Shield size={12} className="mr-1" />
                  {profileData.role}
                </span>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  profileData.is_active
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}>
                  {profileData.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={openEditModal}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Edit2 size={16} />
              Edit Profile
            </button>
            <button
              type="button"
              onClick={openPasswordModal}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Key size={16} />
              Change Password
            </button>
          </div>
        </div>
      </div>

      {imageError && (
        <div className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {imageError}
        </div>
      )}

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Contact Information */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Email Address</p>
                <p className="text-sm font-medium text-gray-900 break-all">{profileData.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Contact Number</p>
                <p className="text-sm font-medium text-gray-900">
                  {profileData.contact_number || "Not provided"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Account Information</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Shield size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Role</p>
                <p className="text-sm font-medium text-gray-900">{profileData.role}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Member Since</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(profileData.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Details */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Personal Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-700">First Name</label>
            <p className="mt-1 text-sm text-gray-900">{profileData.first_name || "—"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Last Name</label>
            <p className="mt-1 text-sm text-gray-900">{profileData.last_name || "—"}</p>
          </div>
        </div>
      </div>

      {/* Security Info Box */}
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6 flex items-start gap-3">
        <AlertCircle size={20} className="text-yellow-700 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-yellow-900 mb-1">Security Reminder</h4>
          <p className="text-sm text-yellow-800">
            Keep your password secure and never share it with anyone. Change your password regularly to maintain account security.
          </p>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        open={isEditOpen}
        title="Edit Profile"
        onClose={closeEditModal}
      >
        {editError && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {editError}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name
            </label>
            <input
              type="text"
              name="first_name"
              value={editForm.first_name}
              onChange={handleEditChange}
              placeholder="First Name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name
            </label>
            <input
              type="text"
              name="last_name"
              value={editForm.last_name}
              onChange={handleEditChange}
              placeholder="Last Name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Number (Optional)
            </label>
            <input
              type="tel"
              name="contact_number"
              value={editForm.contact_number}
              onChange={handleEditChange}
              placeholder="+1 (555) 000-0000"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={closeEditModal}
            disabled={saving}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleEditSubmit}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        open={isPasswordOpen}
        title="Change Password"
        onClose={closePasswordModal}
      >
        {passwordError && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {passwordError}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <input
              type="password"
              name="current_password"
              value={passwordForm.current_password}
              onChange={handlePasswordChange}
              placeholder="Current Password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              name="new_password"
              value={passwordForm.new_password}
              onChange={handlePasswordChange}
              placeholder="New Password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              name="confirm_password"
              value={passwordForm.confirm_password}
              onChange={handlePasswordChange}
              placeholder="Confirm New Password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={closePasswordModal}
            disabled={saving}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePasswordSubmit}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Updating..." : "Update Password"}
          </button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
