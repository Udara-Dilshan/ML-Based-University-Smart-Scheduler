import { useState } from "react";
import { Upload, FileText, Check, User, Hash, GraduationCap, Building } from "lucide-react";

export default function StudentMedical() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [submitted, setSubmitted] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({
    reason: "",
    startDate: "",
    endDate: "",
    description: "",
  });

  // File select කරනකොට
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      // Image preview
      if (selected.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => setPreview(ev.target.result);
        reader.readAsDataURL(selected);
      } else {
        setPreview(null);
      }
    }
  };

  // Submit කරනකොට
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please attach a medical document!");
      return;
    }
    setSubmitted(true);
  };

  // Success Page
  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center shadow-sm max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center 
                          justify-center mx-auto mb-4">
            <Check size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Submitted Successfully!</h2>
          <p className="text-gray-500 text-sm mt-2">
            Your medical certificate has been submitted. 
            Admin will review and update your status.
          </p>
          <button
            onClick={() => { setSubmitted(false); setFile(null); setPreview(null); }}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg 
                       text-sm hover:bg-blue-700 transition"
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Medical Certificate Submission
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Submit your medical documents for leave approval
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Student Details - Auto filled */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User size={18} className="text-blue-600" />
            Student Details
          </h3>
          <div className="grid grid-cols-2 gap-4">

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Full Name
              </label>
              <div className="flex items-center gap-2 border border-gray-200 
                              rounded-lg px-3 py-2 bg-gray-50">
                <User size={14} className="text-gray-400" />
                <span className="text-sm text-gray-700">
                  {user.first_name} {user.last_name}
                </span>
              </div>
            </div>

            {/* Enrollment Number */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Enrollment Number
              </label>
              <div className="flex items-center gap-2 border border-gray-200 
                              rounded-lg px-3 py-2 bg-gray-50">
                <Hash size={14} className="text-gray-400" />
                <span className="text-sm text-gray-700">
                  {user.registration_number || "UWU/ICT/21/XXX"}
                </span>
              </div>
            </div>

            {/* Degree */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Degree
              </label>
              <div className="flex items-center gap-2 border border-gray-200 
                              rounded-lg px-3 py-2 bg-gray-50">
                <GraduationCap size={14} className="text-gray-400" />
                <span className="text-sm text-gray-700">
                  {user.degree || "BSc in ICT"}
                </span>
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Department
              </label>
              <div className="flex items-center gap-2 border border-gray-200 
                              rounded-lg px-3 py-2 bg-gray-50">
                <Building size={14} className="text-gray-400" />
                <span className="text-sm text-gray-700">
                  {user.department || "Dept of ICT"}
                </span>
              </div>
            </div>

            {/* Email */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                University Email
              </label>
              <div className="flex items-center gap-2 border border-gray-200 
                              rounded-lg px-3 py-2 bg-gray-50">
                <span className="text-sm text-gray-700">{user.email}</span>
              </div>
            </div>

          </div>
        </div>

        {/* Medical Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            Medical Details
          </h3>
          <div className="space-y-4">

            {/* Reason */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Reason for Leave <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2
                           text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select reason...</option>
                <option value="illness">Illness / Sickness</option>
                <option value="injury">Injury / Accident</option>
                <option value="surgery">Surgery / Medical Procedure</option>
                <option value="family">Family Medical Emergency</option>
                <option value="other">Other Medical Reason</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Additional Description
              </label>
              <textarea
                rows={3}
                placeholder="Describe your medical condition briefly..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2
                           text-sm focus:outline-none focus:ring-2 focus:ring-blue-400
                           resize-none"
              />
            </div>

          </div>
        </div>

        {/* File Upload */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Upload size={18} className="text-blue-600" />
            Attach Medical Document
          </h3>

          {/* Upload Area */}
          <label
            className="flex flex-col items-center justify-center w-full h-40
                       border-2 border-dashed border-gray-300 rounded-xl
                       cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
          >
            <input
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              onChange={handleFileChange}
            />
            {file ? (
              <div className="text-center">
                {preview ? (
                  <img src={preview} alt="preview"
                    className="h-20 w-20 object-cover rounded-lg mx-auto mb-2" />
                ) : (
                  <FileText size={40} className="text-blue-500 mx-auto mb-2" />
                )}
                <p className="text-sm font-medium text-blue-700">{file.name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div className="text-center">
                <Upload size={32} className="text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">
                  Click to upload medical certificate
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  JPG, PNG or PDF (max 5MB)
                </p>
              </div>
            )}
          </label>

          {/* Info */}
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              ⚠️ Please attach a valid medical certificate from a registered doctor.
              Submissions without proper documentation will not be accepted.
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-3 bg-blue-600 text-white rounded-xl
                     font-medium text-sm hover:bg-blue-700 transition"
        >
          Submit Medical Certificate
        </button>

      </form>
    </div>
  );
}