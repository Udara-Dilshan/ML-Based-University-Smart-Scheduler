import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, Edit3, Mail, Phone, Save } from "lucide-react";
import { authAPI, getUser, setUser, getImageUrl } from "../../services/api";

export default function StudentProfile() {
  const fileInputRef = useRef(null);
  const currentUser = getUser();
  const [profile, setProfile] = useState(null);
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

  useEffect(() => {
    if (!message.text) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [message.text]);

  const initials = useMemo(() => {
    const firstName = profile?.first_name || currentUser?.first_name || "S";
    const lastName = profile?.last_name || currentUser?.last_name || "";
    return `${firstName?.[0] || "S"}${lastName?.[0] || ""}`.toUpperCase();
  }, [profile, currentUser]);

  const fullName = useMemo(() => {
    const parts = [profile?.first_name, profile?.last_name].filter(Boolean);
    return parts.join(" ").trim() || "Student";
  }, [profile]);

  const roleLabel = profile?.role || currentUser?.role || "Student";
  const profileImage = profile?.profile_image || currentUser?.profile_image || "";
  const regNo = profile?.student_profile?.reg_no || "-";
  const registrationNumber = profile?.student_profile?.registration_number || regNo || "-";
  const batchCode = profile?.student_profile?.batch_code || "-";
  const degreeName = profile?.student_profile?.degree_name || "-";
  const departmentName = profile?.student_profile?.department_name || "-";
  const semesterName = profile?.student_profile?.semester_name || "-";
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
                  className="h-28 w-28 rounded-full object-cover border-4 border-blue-100 shadow-sm"
                />
              ) : (
                <div className="h-28 w-28 rounded-full bg-blue-600 text-white text-3xl font-bold flex items-center justify-center shadow-sm">
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
              <span className="text-gray-500">Registration No</span>
              <span className="font-medium text-gray-900 text-right">{regNo}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-500">Batch</span>
              <span className="font-medium text-gray-900 text-right">{batchCode}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-500">Semester</span>
              <span className="font-medium text-gray-900 text-right">{semesterName}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-500">Account</span>
              <span className="font-medium text-gray-900">{roleLabel}</span>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
              <input
                name="first_name"
                value={form.first_name}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 bg-gray-50"
                disabled
                readOnly
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
              <input
                name="last_name"
                value={form.last_name}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 bg-gray-50"
                disabled
                readOnly
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 bg-gray-50">
                <Mail size={14} />
                <span className="truncate">{email}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact Number</label>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600">
                <Phone size={14} />
                <input
                  name="contact_number"
                  value={form.contact_number}
                  onChange={handleChange}
                  className="flex-1 outline-none"
                  placeholder="Add contact number"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg border border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-500">Degree</p>
              <p className="font-medium text-gray-900 mt-1">{degreeName}</p>
            </div>
            <div className="rounded-lg border border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-500">Department</p>
              <p className="font-medium text-gray-900 mt-1">{departmentName}</p>
            </div>
            <div className="rounded-lg border border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-500">Registration Number</p>
              <p className="font-medium text-gray-900 mt-1">{registrationNumber}</p>
            </div>
            <div className="rounded-lg border border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-500">Batch Code</p>
              <p className="font-medium text-gray-900 mt-1">{batchCode}</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={saving}
            >
              <Save size={14} />
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
