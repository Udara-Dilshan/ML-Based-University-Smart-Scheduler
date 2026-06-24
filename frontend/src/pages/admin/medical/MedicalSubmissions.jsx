import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../layout/AdminLayout";
import { academicAPI, medicalAPI } from "../../../services/api";

const statusOptions = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const statusClass = (status) => {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "APPROVED") {
    return "bg-green-100 text-green-700";
  }
  if (normalized === "REJECTED") {
    return "bg-red-100 text-red-700";
  }
  return "bg-yellow-100 text-yellow-700";
};

export default function MedicalSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [degrees, setDegrees] = useState([]);
  const [batches, setBatches] = useState([]);
  const [filters, setFilters] = useState({
    status: "",
    degree_id: "",
    batch_id: "",
    search: "",
  });
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadFilters = async () => {
      try {
        const [degreeData, batchData] = await Promise.all([
          academicAPI.getDegrees(),
          academicAPI.getBatches(),
        ]);
        if (!active) {
          return;
        }
        setDegrees(degreeData || []);
        setBatches(batchData || []);
      } catch (err) {
        if (active) {
          setError(err?.detail || err?.message || "Failed to load filters.");
        }
      }
    };

    loadFilters();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadSubmissions = async () => {
      try {
        setLoading(true);
        setError("");
        const params = {
          status: filters.status || undefined,
          degree_id: filters.degree_id || undefined,
          batch_id: filters.batch_id || undefined,
          search: filters.search || undefined,
        };
        const data = await medicalAPI.getAdminSubmissions(params);
        if (active) {
          setSubmissions(data || []);
        }
      } catch (err) {
        if (active) {
          setError(err?.detail || err?.message || "Failed to load submissions.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadSubmissions();

    return () => {
      active = false;
    };
  }, [filters]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleReviewChange = (submissionId, field, value) => {
    setReviewDrafts((prev) => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        [field]: value,
      },
    }));
  };

  const handleReviewSubmit = async (submissionId) => {
    const draft = reviewDrafts[submissionId] || {};
    if (!draft.status) {
      setError("Select a status before submitting.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await medicalAPI.reviewSubmission(submissionId, {
        status: draft.status,
        admin_comment: draft.admin_comment || "",
      });
      const updated = await medicalAPI.getAdminSubmissions({
        status: filters.status || undefined,
        degree_id: filters.degree_id || undefined,
        batch_id: filters.batch_id || undefined,
        search: filters.search || undefined,
      });
      setSubmissions(updated || []);
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to update submission.");
    } finally {
      setSaving(false);
    }
  };

  const rows = useMemo(() => submissions || [], [submissions]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Medical Submissions</h2>
          <p className="text-sm text-gray-500">Review student medical certificates and approve or reject.</p>
        </div>

        {error ? (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Degree</label>
            <select
              name="degree_id"
              value={filters.degree_id}
              onChange={handleFilterChange}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {degrees.map((degree) => (
                <option key={degree.degree_id} value={degree.degree_id}>
                  {degree.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Batch</label>
            <select
              name="batch_id"
              value={filters.batch_id}
              onChange={handleFilterChange}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {batches.map((batch) => (
                <option key={batch.batch_id} value={batch.batch_id}>
                  {batch.batch_code}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <input
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Name, reg no, email"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[
                  "Student",
                  "Reg No",
                  "Degree",
                  "Batch",
                  "Reason",
                  "Dates",
                  "Status",
                  "Document",
                  "Review",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={9}>
                    Loading submissions...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={9}>
                    No submissions found.
                  </td>
                </tr>
              ) : (
                rows.map((item) => {
                  const draft = reviewDrafts[item.submission_id] || {};
                  return (
                    <tr key={item.submission_id} className="align-top">
                      <td className="px-4 py-3 font-medium text-gray-900">{item.student_name}</td>
                      <td className="px-4 py-3 text-gray-500">{item.reg_no || "-"}</td>
                      <td className="px-4 py-3 text-gray-500">{item.degree_name || "-"}</td>
                      <td className="px-4 py-3 text-gray-500">{item.batch_code || "-"}</td>
                      <td className="px-4 py-3 text-gray-500">{item.reason}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {item.start_date} - {item.end_date}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${statusClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`http://localhost:8000${item.document_path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View file
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          <select
                            value={draft.status !== undefined ? draft.status : (item.status !== "PENDING" ? item.status : "")}
                            onChange={(event) =>
                              handleReviewChange(item.submission_id, "status", event.target.value)
                            }
                            className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs"
                          >
                            <option value="">Select status</option>
                            <option value="APPROVED">Approve</option>
                            <option value="REJECTED">Reject</option>
                          </select>
                          <textarea
                            value={draft.admin_comment !== undefined ? draft.admin_comment : (item.admin_comment || "")}
                            onChange={(event) =>
                              handleReviewChange(item.submission_id, "admin_comment", event.target.value)
                            }
                            rows={2}
                            placeholder="Add comment"
                            className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleReviewSubmit(item.submission_id)}
                            className="w-full rounded-lg bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-60"
                            disabled={saving}
                          >
                            {saving ? "Saving..." : "Update"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
