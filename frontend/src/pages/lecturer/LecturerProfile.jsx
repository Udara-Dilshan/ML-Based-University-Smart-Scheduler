import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, Edit3, Mail, Phone, Save, Shield } from "lucide-react";
import { authAPI, getUser, setUser, getImageUrl } from "../../services/api";

export default function LecturerProfile() {
  const fileInputRef = useRef(null);
  const currentUser = getUser();
  const [profile, setProfile] = useState(null);
  const [departmentName, setDepartmentName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    contact_number: "",
  });

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setMessage({ type: "", text: "" });

        const profileData = await authAPI.getCurrentUser();

        if (!active) {
          return;
        }

        setProfile(profileData);
        setForm({
          first_name: profileData?.first_name || "",
          last_name: profileData?.last_name || "",
          contact_number: profileData?.contact_number || "",
        });

        setDepartmentName(
          profileData?.lecturer_profile?.department_name || ""
        );
      } catch (error) {
        if (!active) {
          return;
        }
        setMessage({
          type: "error",
          text: error?.detail || error?.message || "Failed to load profile",
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const initials = useMemo(() => {
    const firstName = profile?.first_name || currentUser?.first_name || "L";
    const lastName = profile?.last_name || currentUser?.last_name || "";
    return `${firstName?.[0] || "L"}${lastName?.[0] || ""}`.toUpperCase();
  }, [profile, currentUser]);

  const fullName = useMemo(() => {
    const parts = [profile?.first_name, profile?.last_name].filter(Boolean);
    return parts.join(" ").trim() || "Lecturer";
  }, [profile]);

  const roleLabel = profile?.role || currentUser?.role || "Lecturer";
  const profileImage = profile?.profile_image || currentUser?.profile_image || "";
  const staffId = profile?.lecturer_profile?.staff_id || "-";
  const departmentId = profile?.lecturer_profile?.dept_id ?? "-";
  const email = profile?.email || currentUser?.email || "-";
  const contact = profile?.contact_number || "Not provided";
  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString()
    : "-";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setMessage({ type: "error", text: "First name and last name are required." });
      return;
    }

    try {
      setSaving(true);
      setMessage({ type: "", text: "" });
      const updatedProfile = await authAPI.updateCurrentUser({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        contact_number: form.contact_number.trim() || null,
      });

      setProfile(updatedProfile);
      setUser(updatedProfile);
      window.dispatchEvent(new Event("userProfileUpdated"));
      setMessage({ type: "success", text: "Profile updated successfully." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error?.detail || error?.message || "Failed to update profile.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select an image file." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image must be smaller than 5MB." });
      return;
    }

    try {
      setUploading(true);
      setMessage({ type: "", text: "" });
      const result = await authAPI.uploadProfileImage(file);
      const updatedProfile = {
        ...(profile || currentUser || {}),
        profile_image: result.profile_image,
      };

      setProfile(updatedProfile);
      setUser(updatedProfile);
      window.dispatchEvent(new Event("userProfileUpdated"));
      setMessage({ type: "success", text: "Profile image updated successfully." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error?.detail || error?.message || "Failed to upload profile image.",
      });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">My Profile</h2>
        <p className="text-sm text-gray-500 mt-0.5">Manage your personal information and account image</p>
      </div>

      {message.text ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="relative">
              {profileImage ? (
                <img
                  src={getImageUrl(profileImage)}
                  alt={fullName}
                  className="h-28 w-28 rounded-full object-cover border-4 border-teal-100 shadow-sm"
                />
              ) : (
                <div className="h-28 w-28 rounded-full bg-teal-600 text-white text-3xl font-bold flex items-center justify-center shadow-sm">
                  {initials}
                </div>
              )}
              <button
                type="button"
                onClick={handleImageButtonClick}
                className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center text-gray-700 hover:bg-gray-50"
                disabled={uploading}
                title="Change profile image"
              >
                <Camera size={16} />
              </button>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{fullName}</h3>
              <p className="text-sm text-gray-500">{roleLabel}</p>
              <span className="inline-flex mt-2 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <Check size={12} /> Active
              </span>
            </div>
            <button
              type="button"
              onClick={handleImageButtonClick}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={uploading}
            >
              <Edit3 size={14} />
              {uploading ? "Uploading..." : "Change Photo"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          <div className="mt-6 space-y-3 border-t border-gray-100 pt-6 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-500">Staff ID</span>
              <span className="font-medium text-gray-900">{staffId}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-500">Department</span>
              <span className="font-medium text-gray-900 text-right">{departmentName || departmentId}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-500">Joined</span>
              <span className="font-medium text-gray-900">{joinedDate}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-500">Account</span>
              <span className="font-medium text-gray-900">{roleLabel}</span>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
              <input
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
              <input
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-1">
                <Mail size={13} />
                Email
              </label>
              <input
                value={email}
                disabled
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-1">
                <Phone size={13} />
                Phone
              </label>
              <input
                name="contact_number"
                value={form.contact_number}
                onChange={handleChange}
                placeholder="07X XXX XXXX"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-1">
                <Shield size={13} />
                Department
              </label>
              <input
                value={departmentName || departmentId}
                disabled
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-teal-100 bg-teal-50/60 p-4 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">Account details</p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg bg-white border border-teal-100 px-3 py-2">
                <p className="text-xs text-gray-500">Role</p>
                <p className="font-medium text-gray-900">Lecturer</p>
              </div>
              <div className="rounded-lg bg-white border border-teal-100 px-3 py-2">
                <p className="text-xs text-gray-500">Contact</p>
                <p className="font-medium text-gray-900">{contact}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
