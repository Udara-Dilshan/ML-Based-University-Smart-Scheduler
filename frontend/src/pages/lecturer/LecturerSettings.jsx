import { useState } from "react";
import { KeyRound, Bell, ShieldCheck } from "lucide-react";
import { authAPI } from "../../services/api";

export default function LecturerSettings() {
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.current_password || !form.new_password) {
      setMessage({ type: "error", text: "Current password and new password are required." });
      return;
    }

    if (form.new_password.length < 6) {
      setMessage({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }

    if (form.new_password !== form.confirm_password) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    try {
      setSaving(true);
      setMessage({ type: "", text: "" });
      await authAPI.changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      });

      setForm({ current_password: "", new_password: "", confirm_password: "" });
      setMessage({ type: "success", text: "Password updated successfully." });
    } catch (error) {
      setMessage({ type: "error", text: error?.message || "Failed to update password." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-0.5">Manage account security and preferences</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <KeyRound size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Change Password</h3>
              <p className="text-sm text-gray-500">Update your login password</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                name="current_password"
                value={form.current_password}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                name="new_password"
                value={form.new_password}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                name="confirm_password"
                value={form.confirm_password}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
              >
                <ShieldCheck size={16} />
                {saving ? "Saving..." : "Update Password"}
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Bell size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <p className="text-sm text-gray-500">Portal alerts and reminders</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Notification preferences can be added here later. For now, profile image and account security are fully supported.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900">Quick Links</h3>
            <div className="mt-3 space-y-2 text-sm text-gray-600">
              <p>Use My Profile to update your name, phone number, and profile image.</p>
              <p>Use Lecturer Dashboard to review today&apos;s classes and workload.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
