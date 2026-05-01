import { useEffect, useMemo, useState } from "react";
import { Download, FileText, ListChecks } from "lucide-react";
import { semesterRegistrationAPI } from "../../services/api";

const emptyForm = {
  enrollment_no: "",
  faculty_name: "",
  course_of_study: "",
  academic_year: "",
  full_name: "",
  name_with_initials: "",
  postal_address: "",
  phone: "",
  mobile: "",
  email: "",
  scholarship_name: "",
  scholarship_amount: "",
  form_date: "",
};

export default function StudentSemesterRegistration() {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [modules, setModules] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    let active = true;

    const loadFormData = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await semesterRegistrationAPI.getFormData();
        if (!active) {
          return;
        }

        const defaults = {
          enrollment_no: data?.student?.registration_number || data?.student?.reg_no || "",
          faculty_name: data?.faculty?.name || "",
          course_of_study: data?.degree?.degree_name || "",
          academic_year: data?.semester?.academic_year || "",
          full_name: data?.student?.full_name || "",
          name_with_initials: data?.student?.name_with_initials || "",
          postal_address: "",
          phone: data?.student?.phone || "",
          mobile: data?.student?.mobile || "",
          email: data?.student?.email || "",
          scholarship_name: "",
          scholarship_amount: "",
          form_date: "",
        };

        setForm((prev) => ({ ...prev, ...defaults }));
        setModules(data?.modules || []);
        setSelectedIds(new Set((data?.modules || []).map((item) => item.module_id)));
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err?.detail || err?.message || "Failed to load form data.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadFormData();

    return () => {
      active = false;
    };
  }, []);

  const moduleList = useMemo(() => modules || [], [modules]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const requiredFields = {
      enrollment_no: "Enrollment No",
      faculty_name: "Faculty",
      course_of_study: "Course of Study",
      academic_year: "Academic Year",
      full_name: "Full Name",
      name_with_initials: "Name with Initials",
      postal_address: "Postal Address",
      mobile: "Mobile",
      email: "Email",
    };

    const nextErrors = {};
    Object.entries(requiredFields).forEach(([key, label]) => {
      if (!String(form[key] || "").trim()) {
        nextErrors[key] = `${label} is required.`;
      }
    });

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const missing = Object.values(requiredFields)
        .filter((label, index) => {
          const fieldKey = Object.keys(requiredFields)[index];
          return nextErrors[fieldKey];
        })
        .join(", ");
      setError(`Please fill: ${missing}.`);
      return false;
    }

    return true;
  };

  const parseServerError = async (err) => {
    const responseData = err?.response?.data;
    if (responseData instanceof Blob) {
      try {
        const text = await responseData.text();
        const parsed = JSON.parse(text);
        return parsed?.detail || parsed?.message || text;
      } catch {
        return "Request failed. Please check required fields.";
      }
    }
    return err?.detail || err?.message || "Request failed. Please check required fields.";
  };

  const toggleModule = (moduleId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(moduleList.map((item) => item.module_id)));
  };

  const handleClearAll = () => {
    setSelectedIds(new Set());
  };

  const buildPayload = () => {
    return {
      ...form,
      selected_module_ids: Array.from(selectedIds),
    };
  };

  const downloadForm = async (format) => {
    if (selectedIds.size === 0) {
      setError("Please select at least one module.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setDownloading(true);
      setError("");
      const blobData = await semesterRegistrationAPI.generateForm(buildPayload(), format);
      const blob = new Blob([blobData], {
        type:
          format === "docx"
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/pdf",
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `semester-registration.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message = await parseServerError(err);
      setError(message || "Failed to generate form.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Semester Registration</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Fill your details, select modules, and download the official form.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <FileText size={16} className="text-blue-600" />
            Form Details
          </div>

          <div className="space-y-4 text-sm">
            {[
              { label: "Enrollment No", name: "enrollment_no" },
              { label: "Faculty", name: "faculty_name" },
              { label: "Course of Study", name: "course_of_study" },
              { label: "Academic Year", name: "academic_year" },
              { label: "Full Name", name: "full_name" },
              { label: "Name with Initials", name: "name_with_initials" },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                <input
                  name={field.name}
                  value={form[field.name]}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    fieldErrors[field.name] ? "border-red-300" : "border-gray-200"
                  }`}
                  disabled={loading}
                />
                {fieldErrors[field.name] ? (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors[field.name]}</p>
                ) : null}
              </div>
            ))}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Postal Address</label>
              <textarea
                name="postal_address"
                value={form.postal_address}
                onChange={handleInputChange}
                rows={3}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  fieldErrors.postal_address ? "border-red-300" : "border-gray-200"
                }`}
                disabled={loading}
              />
              {fieldErrors.postal_address ? (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.postal_address}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    fieldErrors.phone ? "border-red-300" : "border-gray-200"
                  }`}
                  disabled={loading}
                />
                {fieldErrors.phone ? (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>
                ) : null}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mobile</label>
                <input
                  name="mobile"
                  value={form.mobile}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    fieldErrors.mobile ? "border-red-300" : "border-gray-200"
                  }`}
                  disabled={loading}
                />
                {fieldErrors.mobile ? (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.mobile}</p>
                ) : null}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                name="email"
                value={form.email}
                onChange={handleInputChange}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  fieldErrors.email ? "border-red-300" : "border-gray-200"
                }`}
                disabled={loading}
              />
              {fieldErrors.email ? (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Scholarship Name/Source</label>
                <input
                  name="scholarship_name"
                  value={form.scholarship_name}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Annual Payment</label>
                <input
                  name="scholarship_amount"
                  value={form.scholarship_amount}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Form Date</label>
              <input
                type="date"
                name="form_date"
                value={form.form_date}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                disabled={loading}
              />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <ListChecks size={16} className="text-blue-600" />
              Select Modules
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleSelectAll}
                className="rounded-md border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-50"
                disabled={loading}
              >
                Select all
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="rounded-md border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-50"
                disabled={loading}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Select</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td className="px-4 py-4 text-gray-500" colSpan={3}>Loading modules...</td>
                  </tr>
                ) : moduleList.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-gray-500" colSpan={3}>No modules found for this semester.</td>
                  </tr>
                ) : (
                  moduleList.map((module) => (
                    <tr key={module.module_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(module.module_id)}
                          onChange={() => toggleModule(module.module_id)}
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-800">{module.name}</td>
                      <td className="px-4 py-3 text-gray-500">{module.code}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Selected: {selectedIds.size} of {moduleList.length}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => downloadForm("pdf")}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={downloading || loading}
              >
                <Download size={14} />
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => downloadForm("docx")}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                disabled={downloading || loading}
              >
                <Download size={14} />
                Download Word
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
