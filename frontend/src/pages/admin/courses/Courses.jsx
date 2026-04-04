import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../layout/AdminLayout";
import Modal from "../../../components/Modal";
import { academicAPI } from "../../../services/api";

const initialForm = {
  name: "",
  code: "",
  faculty_id: "",
  dept_id: "",
  degree_id: "",
  batch_id: "",
  credits: "",
  lecture_hours_per_week: "",
};

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [degrees, setDegrees] = useState([]);
  const [batches, setBatches] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [facultyFilter, setFacultyFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const modalTitle = useMemo(() => (editId ? "Edit Course" : "Add Course"), [editId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [moduleData, deptData, facultyData, degreeData, batchData] = await Promise.all([
        academicAPI.getModules(),
        academicAPI.getDepartments(),
        academicAPI.getFaculties(),
        academicAPI.getDegrees(),
        academicAPI.getBatches(),
      ]);
      setCourses(moduleData);
      setDepartments(deptData);
      setFaculties(facultyData);
      setDegrees(degreeData);
      setBatches(batchData);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditId(null);
    setForm(initialForm);
    setModalError("");
    setIsModalOpen(true);
  };

  const openEditModal = (course) => {
    const department = departments.find((item) => item.dept_id === course.dept_id);
    setEditId(course.module_id);
    setForm({
      name: course.name || "",
      code: course.code || "",
      faculty_id: department?.faculty_id ? String(department.faculty_id) : "",
      dept_id: course.dept_id ? String(course.dept_id) : "",
      degree_id: course.degree_id ? String(course.degree_id) : "",
      batch_id: course.batch_id ? String(course.batch_id) : "",
      credits: course.credits ?? "",
      lecture_hours_per_week: course.lecture_hours_per_week ?? "",
    });
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
    setModalError("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => {
      if (name === "faculty_id") {
        return {
          ...prev,
          faculty_id: value,
          dept_id: "",
          degree_id: "",
          batch_id: "",
        };
      }

      if (name === "dept_id") {
        return {
          ...prev,
          dept_id: value,
          degree_id: "",
          batch_id: "",
        };
      }

      if (name === "degree_id") {
        const selectedDegree = degrees.find((degree) => degree.degree_id === Number(value));
        return {
          ...prev,
          degree_id: value,
          dept_id: selectedDegree ? String(selectedDegree.dept_id) : prev.dept_id,
          batch_id: "",
        };
      }

      if (name === "batch_id") {
        const selectedBatch = batches.find((batch) => batch.batch_id === Number(value));
        const selectedDegree = selectedBatch
          ? degrees.find((degree) => degree.degree_id === selectedBatch.degree_id)
          : null;

        return {
          ...prev,
          batch_id: value,
          degree_id: selectedBatch ? String(selectedBatch.degree_id) : prev.degree_id,
          dept_id: selectedDegree ? String(selectedDegree.dept_id) : prev.dept_id,
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const departmentsForSelectedFaculty =
    form.faculty_id
      ? departments.filter((department) => department.faculty_id === Number(form.faculty_id))
      : departments;

  const deptIdsForSelectedFaculty = new Set(
    departmentsForSelectedFaculty.map((department) => department.dept_id)
  );

  const degreesForSelectedContext = degrees.filter((degree) => {
    if (form.dept_id) {
      return degree.dept_id === Number(form.dept_id);
    }
    if (form.faculty_id) {
      return deptIdsForSelectedFaculty.has(degree.dept_id);
    }
    return true;
  });

  const batchesForSelectedDegree =
    form.degree_id
      ? batches.filter((batch) => batch.degree_id === Number(form.degree_id))
      : batches;

  const departmentsForFilter =
    facultyFilter
      ? departments.filter((department) => department.faculty_id === Number(facultyFilter))
      : departments;

  const batchesForFilter = batches.filter((batch) => {
    const batchDegree = degrees.find((degree) => degree.degree_id === batch.degree_id);

    if (departmentFilter) {
      return batchDegree?.dept_id === Number(departmentFilter);
    }

    if (facultyFilter) {
      const batchDepartment = batchDegree
        ? departments.find((department) => department.dept_id === batchDegree.dept_id)
        : null;
      return batchDepartment?.faculty_id === Number(facultyFilter);
    }

    return true;
  });

  const filteredCourses = courses.filter((course) => {
    const byFaculty =
      !facultyFilter ||
      departments.some(
        (department) =>
          department.dept_id === course.dept_id &&
          department.faculty_id === Number(facultyFilter)
      );

    const byDepartment =
      !departmentFilter || course.dept_id === Number(departmentFilter);

    const byBatch = !batchFilter || course.batch_id === Number(batchFilter);

    return byFaculty && byDepartment && byBatch;
  });

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.code.trim() || !form.dept_id || !form.degree_id || !form.batch_id) {
      setModalError("Course name, code, department, degree and batch are required");
      return;
    }

    const credits = Number(form.credits);
    if (!Number.isFinite(credits) || credits <= 0) {
      setModalError("Credits must be a positive number");
      return;
    }

    const lectureHours = Number(form.lecture_hours_per_week);
    if (!Number.isFinite(lectureHours) || lectureHours <= 0) {
      setModalError("Lecture hours per week must be a positive number");
      return;
    }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      dept_id: Number(form.dept_id),
      degree_id: Number(form.degree_id),
      batch_id: Number(form.batch_id),
      credits,
      lecture_hours_per_week: lectureHours,
    };

    try {
      setSaving(true);
      setModalError("");
      if (editId) {
        await academicAPI.updateModule(editId, payload);
      } else {
        await academicAPI.createModule(payload);
      }
      await loadData();
      closeModal();
    } catch (err) {
      setModalError(err.response?.data?.detail || "Failed to save course");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (moduleId) => {
    const confirmed = window.confirm("Are you sure you want to delete this course? This action cannot be undone.");
    if (!confirmed) {
      return;
    }

    try {
      setError("");
      await academicAPI.deleteModule(moduleId);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete course");
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Courses</h1>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add Course
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-3">
        <select
          value={facultyFilter}
          onChange={(event) => {
            setFacultyFilter(event.target.value);
            setDepartmentFilter("");
            setBatchFilter("");
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Filter by Faculty</option>
          {faculties.map((faculty) => (
            <option key={faculty.faculty_id} value={faculty.faculty_id}>
              {faculty.name}
            </option>
          ))}
        </select>

        <select
          value={departmentFilter}
          onChange={(event) => {
            setDepartmentFilter(event.target.value);
            setBatchFilter("");
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Filter by Department</option>
          {departmentsForFilter.map((department) => (
            <option key={department.dept_id} value={department.dept_id}>
              {department.name}
            </option>
          ))}
        </select>

        <select
          value={batchFilter}
          onChange={(event) => setBatchFilter(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Filter by Batch</option>
          {batchesForFilter.map((batch) => (
            <option key={batch.batch_id} value={batch.batch_id}>
              {batch.batch_code || batch.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Code</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Course</th>
              {/* <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Faculty</th> */}
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Batch</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Credits</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={6}>
                  Loading courses...
                </td>
              </tr>
            )}
            {!loading && filteredCourses.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={6}>
                  No courses found.
                </td>
              </tr>
            )}
            {!loading &&
              filteredCourses.map((course) => (
                <tr key={course.module_id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-sm text-gray-700">{course.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{course.name}</td>
                  {/* <td className="px-4 py-3 text-sm text-gray-700">
                    {course.department?.faculty?.name || "-"}
                  </td> */}
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {course.department?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {batches.find((batch) => batch.batch_id === course.batch_id)?.batch_code || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{course.credits}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(course)}
                        className="rounded bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-600"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(course.module_id)}
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

          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Course Name"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <input
            name="code"
            value={form.code}
            onChange={handleChange}
            placeholder="Course Code"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <select
            name="degree_id"
            value={form.degree_id}
            onChange={handleChange}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Select Degree</option>
            {degreesForSelectedContext.map((degree) => (
              <option key={degree.degree_id} value={degree.degree_id}>
                {degree.code} - {degree.name}
              </option>
            ))}
          </select>

          <select
            name="dept_id"
            value={form.dept_id}
            onChange={handleChange}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Select Department</option>
            {departmentsForSelectedFaculty.map((department) => (
              <option key={department.dept_id} value={department.dept_id}>
                {department.name}
              </option>
            ))}
          </select>

          <select
            name="batch_id"
            value={form.batch_id}
            onChange={handleChange}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Select Batch</option>
            {batchesForSelectedDegree.map((batch) => (
              <option key={batch.batch_id} value={batch.batch_id}>
                {batch.batch_code || batch.name}
              </option>
            ))}
          </select>

          <input
            name="credits"
            value={form.credits}
            onChange={handleChange}
            type="number"
            min="1"
            placeholder="Credits"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />

          <input
            name="lecture_hours_per_week"
            value={form.lecture_hours_per_week}
            onChange={handleChange}
            type="number"
            min="1"
            placeholder="Lecture Hours Per Week"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
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
            {saving ? "Saving..." : editId ? "Update Course" : "Add Course"}
          </button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
