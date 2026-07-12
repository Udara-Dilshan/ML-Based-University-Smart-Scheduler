import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Prevent redirecting if already on the login page to avoid infinite loops
      if (window.location.pathname !== "/") {
        window.dispatchEvent(new Event("userProfileUpdated")); // Clear UI user state
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email, password) => {
    try {
      const response = await api.post("/api/auth/login", { email, password });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Login failed" };
    }
  },
  signup: async (payload) => {
    try {
      const response = await api.post("/api/auth/signup", payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Signup failed" };
    }
  },
  forgotPassword: async (email) => {
    try {
      const response = await api.post("/api/auth/forgot-password", { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to request password reset" };
    }
  },
  resetPassword: async (token, new_password) => {
    try {
      const response = await api.post("/api/auth/reset-password", { token, new_password });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to reset password" };
    }
  },
  getCurrentUser: async () => {
    try {
      const response = await api.get("/api/auth/me");
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to fetch user data" };
    }
  },
  logout: async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        await api.post("/api/auth/logout");
      }
    } catch (error) {
      // Ignore errors on logout
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("userProfileUpdated"));
    }
  },
  updateCurrentUser: async (payload) => {
    try {
      const response = await api.put("/api/auth/me", payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to update profile" };
    }
  },
  uploadProfileImage: async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post("/api/auth/upload-profile-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to upload profile image" };
    }
  },
  changePassword: async (payload) => {
    try {
      const response = await api.post("/api/auth/change-password", payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to change password" };
    }
  },
};

export const userAPI = {
  getAll: async () => {
    const response = await api.get("/api/users/");
    return (response.data || []).map((user) => ({
      ...user,
      role: normalizeRole(user?.role),
    }));
  },
  create: async (payload) => {
    const response = await api.post("/api/users/", payload);
    return {
      ...response.data,
      role: normalizeRole(response.data?.role),
    };
  },
  update: async (id, payload) => {
    const response = await api.put(`/api/users/${id}`, payload);
    return {
      ...response.data,
      role: normalizeRole(response.data?.role),
    };
  },
  remove: async (id) => {
    await api.delete(`/api/users/${id}`);
  },
};

export const academicAPI = {
  getFaculties: async () => {
    const response = await api.get("/academic/faculties");
    return response.data;
  },
  createFaculty: async (payload) => {
    const response = await api.post("/academic/faculties", payload);
    return response.data;
  },
  updateFaculty: async (id, payload) => {
    const response = await api.put(`/academic/faculties/${id}`, payload);
    return response.data;
  },
  deleteFaculty: async (id) => {
    await api.delete(`/academic/faculties/${id}`);
  },
  getDepartments: async () => {
    const response = await api.get("/academic/departments");
    return response.data;
  },
  createDepartment: async (payload) => {
    const response = await api.post("/academic/departments", payload);
    return response.data;
  },
  updateDepartment: async (id, payload) => {
    const response = await api.put(`/academic/departments/${id}`, payload);
    return response.data;
  },
  deleteDepartment: async (id) => {
    await api.delete(`/academic/departments/${id}`);
  },
  getModules: async () => {
    const response = await api.get("/academic/modules");
    return response.data;
  },
  createModule: async (payload) => {
    const response = await api.post("/academic/modules", payload);
    return response.data;
  },
  getBatches: async () => {
    const response = await api.get("/academic/batches");
    return response.data;
  },
  updateModule: async (id, payload) => {
    const response = await api.put(`/academic/modules/${id}`, payload);
    return response.data;
  },
  deleteModule: async (id) => {
    await api.delete(`/academic/modules/${id}`);
  },
  createBatch: async (payload) => {
    const response = await api.post("/academic/batches", payload);
    return response.data;
  },
  updateBatch: async (id, payload) => {
    const response = await api.put(`/academic/batches/${id}`, payload);
    return response.data;
  },
  assignBatchActiveTerm: async (batchId, payload) => {
    const response = await api.put(`/academic/batches/${batchId}/active-term`, payload);
    return response.data;
  },
  deleteBatch: async (id) => {
    await api.delete(`/academic/batches/${id}`);
  },
  getDegrees: async () => {
    const response = await api.get("/academic/degrees");
    return response.data;
  },
  createDegree: async (payload) => {
    const response = await api.post("/academic/degrees", payload);
    return response.data;
  },
  updateDegree: async (id, payload) => {
    const response = await api.put(`/academic/degrees/${id}`, payload);
    return response.data;
  },
  deleteDegree: async (id) => {
    await api.delete(`/academic/degrees/${id}`);
  },
  getDegreeSemesterModuleSelection: async (degreeId, semesterNumber) => {
    const response = await api.get("/academic/degree-semester-modules/selection", {
      params: { degree_id: degreeId, semester_number: semesterNumber },
    });
    return response.data;
  },
  saveDegreeSemesterModules: async (payload) => {
    const response = await api.put("/academic/degree-semester-modules", payload);
    return response.data;
  },
  getDegreeSemesterModules: async (degreeId) => {
    const params = degreeId ? { degree_id: degreeId } : undefined;
    const response = await api.get("/academic/degree-semester-modules", { params });
    return response.data;
  },
  getLecturerAllocationLecturers: async () => {
    const response = await api.get("/academic/lecturer-allocations/lecturers");
    return response.data;
  },
  getLecturerAllocationActiveModules: async (batchId) => {
    const response = await api.get("/academic/lecturer-allocations/active-modules", {
      params: { batch_id: batchId },
    });
    return response.data;
  },
  assignLecturerToModule: async (payload) => {
    const response = await api.put("/academic/lecturer-allocations/assign", payload);
    return response.data;
  },
};

export const resourceAPI = {
  getResources: async () => {
    const response = await api.get("/resources/");
    return response.data;
  },
  getVehicles: async () => {
    const response = await api.get("/resources/vehicles");
    return response.data;
  },
  createVehicle: async (payload) => {
    const response = await api.post("/resources/vehicles", payload);
    return response.data;
  },
  updateVehicle: async (id, payload) => {
    const response = await api.put(`/resources/vehicles/${id}`, payload);
    return response.data;
  },
  deleteVehicle: async (id) => {
    await api.delete(`/resources/vehicles/${id}`);
  },
  getFaculties: async () => {
    const response = await api.get("/resources/faculties");
    return response.data;
  },
  getDepartments: async () => {
    const response = await api.get("/resources/departments");
    return response.data;
  },
  getSystemSettings: async (category) => {
    const params = category ? { category } : undefined;
    const response = await api.get("/resources/system-settings", { params });
    return response.data;
  },
  createResource: async (payload) => {
    const response = await api.post("/resources/", payload);
    return response.data;
  },
  updateResource: async (id, payload) => {
    const response = await api.put(`/resources/${id}`, payload);
    return response.data;
  },
  deleteResource: async (id) => {
    await api.delete(`/resources/${id}`);
  },
};

export const bookingAPI = {
  // ── Resource Manager: Event Requests ──────────────────────────────────
  getEventRequests: async (statusFilter) => {
    const params = statusFilter ? { status: statusFilter } : undefined;
    const response = await api.get("/booking-requests/events", { params });
    return response.data;
  },
  getEventRequest: async (id) => {
    const response = await api.get(`/booking-requests/events/${id}`);
    return response.data;
  },
  approveEventRequest: async (id, payload = {}) => {
    const response = await api.put(`/booking-requests/events/${id}/approve`, payload);
    return response.data;
  },
  rejectEventRequest: async (id, rejection_reason) => {
    const response = await api.put(`/booking-requests/events/${id}/reject`, { rejection_reason });
    return response.data;
  },

  // ── Resource Manager: Vehicle Requests ────────────────────────────────
  getVehicleRequests: async (statusFilter) => {
    const params = statusFilter ? { status: statusFilter } : undefined;
    const response = await api.get("/booking-requests/vehicles", { params });
    return response.data;
  },
  approveVehicleRequest: async (id, assigned_vehicle_ids) => {
    const response = await api.put(`/booking-requests/vehicles/${id}/approve`, { assigned_vehicle_ids });
    return response.data;
  },
  rejectVehicleRequest: async (id, rejection_reason) => {
    const response = await api.put(`/booking-requests/vehicles/${id}/reject`, { rejection_reason });
    return response.data;
  },

  // ── Resource Manager: Direct Event CRUD ──────────────────────────────
  getDirectEvents: async () => {
    const response = await api.get("/booking-requests/direct-events");
    return response.data;
  },
  createDirectEvent: async (payload) => {
    const formData = new FormData();
    Object.keys(payload).forEach((key) => {
      if (payload[key] !== undefined && payload[key] !== null) {
        formData.append(key, payload[key]);
      }
    });
    const response = await api.post("/booking-requests/direct-events", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  updateDirectEvent: async (id, payload) => {
    const response = await api.put(`/booking-requests/direct-events/${id}`, payload);
    return response.data;
  },
  deleteDirectEvent: async (id) => {
    await api.delete(`/booking-requests/direct-events/${id}`);
  },

  // ── Resource Manager: Direct Vehicle CRUD ────────────────────────────
  getDirectVehicles: async () => {
    const response = await api.get("/booking-requests/direct-vehicles");
    return response.data;
  },
  createDirectVehicle: async (payload) => {
    const response = await api.post("/booking-requests/direct-vehicles", payload);
    return response.data;
  },
  updateDirectVehicle: async (id, payload) => {
    const response = await api.put(`/booking-requests/direct-vehicles/${id}`, payload);
    return response.data;
  },
  deleteDirectVehicle: async (id) => {
    await api.delete(`/booking-requests/direct-vehicles/${id}`);
  },

  // ── Dashboard summary badges ───────────────────────────────────────────
  getBookingSummary: async () => {
    const response = await api.get("/booking-requests/summary");
    return response.data;
  },

  // ── Lecturer: Submit Requests ─────────────────────────────────────────
  checkEventConflict: async (payload) => {
    const response = await api.post("/booking-requests/events/check-conflict", payload);
    return response.data;
  },
  submitEventRequest: async (payload) => {
    const formData = new FormData();
    Object.keys(payload).forEach((key) => {
      if (payload[key] !== undefined && payload[key] !== null) {
        formData.append(key, payload[key]);
      }
    });
    const response = await api.post("/booking-requests/events", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  checkVehicleConflict: async (payload) => {
    const response = await api.post("/booking-requests/vehicles/check-conflict", payload);
    return response.data;
  },
  submitVehicleRequest: async (payload) => {
    const formData = new FormData();
    Object.keys(payload).forEach((key) => {
      if (payload[key] !== undefined && payload[key] !== null) {
        formData.append(key, payload[key]);
      }
    });
    const response = await api.post("/booking-requests/vehicles", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  getMyEventRequests: async () => {
    const response = await api.get("/booking-requests/events/my");
    return response.data;
  },
  getMyVehicleRequests: async () => {
    const response = await api.get("/booking-requests/vehicles/my");
    return response.data;
  },

  // ── Student: Approved events (campus events page) ─────────────────────
  getApprovedEvents: async () => {
    const response = await api.get("/booking-requests/events-list");
    return response.data;
  },
};

export const settingsAPI = {
  getSystemConstraints: async ({ scope = "all", batchId } = {}) => {
    const params = { scope };
    if (batchId !== undefined && batchId !== null && batchId !== "") {
      params.batch_id = batchId;
    }
    const response = await api.get("/settings/system-constraints", { params });
    return response.data;
  },
  createSystemConstraint: async (payload) => {
    const response = await api.post("/settings/system-constraints", payload);
    return response.data;
  },
  updateSystemConstraint: async (id, payload) => {
    const response = await api.put(`/settings/system-constraints/${id}`, payload);
    return response.data;
  },
  deleteSystemConstraint: async (id) => {
    await api.delete(`/settings/system-constraints/${id}`);
  },
  getSystemSettings: async (category) => {
    const params = category ? { category } : undefined;
    const response = await api.get("/settings/system-settings", { params });
    return response.data;
  },
  createSystemSetting: async (payload) => {
    const response = await api.post("/settings/system-settings", payload);
    return response.data;
  },
  updateSystemSetting: async (id, payload) => {
    const response = await api.put(`/settings/system-settings/${id}`, payload);
    return response.data;
  },
  deleteSystemSetting: async (id) => {
    await api.delete(`/settings/system-settings/${id}`);
  },
};

export const lecturerAPI = {
  getDashboardSummary: async () => {
    const response = await api.get("/api/dashboard/lecturer-summary");
    return response.data;
  },
  getCourses: async () => {
    const response = await api.get("/api/dashboard/lecturer-courses");
    return response.data;
  },
  getAvailability: async (lecturerId) => {
    const response = await api.get(`/availability/${lecturerId}`);
    return response.data;
  },
  syncAvailability: async (payload) => {
    const response = await api.post("/availability/sync", payload);
    return response.data;
  },
  getWorkingConstraints: async () => {
    const response = await api.get("/api/dashboard/lecturer-working-constraints");
    return response.data;
  },
  getTimetable: async () => {
    const response = await api.get("/api/timetable/lecturer/me");
    return response.data;
  },
  getAllAvailabilityRequests: async (params) => {
    const response = await api.get("/availability/requests", { params });
    return response.data;
  },
  updateAvailabilityRequestStatus: async (availId, status) => {
    const response = await api.put(`/availability/requests/${availId}/status`, { status });
    return response.data;
  },
};

export const semesterRegistrationAPI = {
  getFormData: async () => {
    const response = await api.get("/api/semester-registration/form-data");
    return response.data;
  },
  generateForm: async (payload, format) => {
    const response = await api.post(
      "/api/semester-registration/generate",
      payload,
      {
        params: { format },
        responseType: "blob",
      }
    );
    return response.data;
  },
};

export const medicalAPI = {
  getMySubmissions: async () => {
    const response = await api.get("/api/medical-submissions/me");
    return response.data;
  },
  createSubmission: async (payload) => {
    const response = await api.post("/api/medical-submissions", payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  getAdminSubmissions: async (params = {}) => {
    const response = await api.get("/api/medical-submissions/admin", { params });
    return response.data;
  },
  getAdminSummary: async () => {
    const response = await api.get("/api/medical-submissions/admin/summary");
    return response.data;
  },
  reviewSubmission: async (submissionId, payload) => {
    const response = await api.put(
      `/api/medical-submissions/${submissionId}/review`,
      payload
    );
    return response.data;
  },
};

export const studentAPI = {
  getCourses: async () => {
    const response = await api.get("/api/dashboard/student-courses");
    return response.data;
  },
  getTimetable: async () => {
    const response = await api.get("/api/timetable/student/me");
    return response.data;
  },
  getDashboardSummary: async () => {
    const response = await api.get("/api/dashboard/student-summary");
    return response.data;
  },
};

export const reportAPI = {
  getOverview: async (params) => {
    const response = await api.get("/api/reports/overview", { params });
    return response.data;
  },
  getUsers: async (params) => {
    const response = await api.get("/api/reports/users", { params });
    return response.data;
  },
  getAcademic: async (params) => {
    const response = await api.get("/api/reports/academic", { params });
    return response.data;
  },
  getResources: async (params) => {
    const response = await api.get("/api/reports/resources", { params });
    return response.data;
  },
  getRequests: async (params) => {
    const response = await api.get("/api/reports/requests", { params });
    return response.data;
  },
  getMedical: async (params) => {
    const response = await api.get("/api/reports/medical", { params });
    return response.data;
  },
  getTimetable: async (params) => {
    const response = await api.get("/api/reports/timetable", { params });
    return response.data;
  },
};

export const timetableAPI = {
  generate: async (payload) => {
    const response = await api.post("/api/timetable/generate", payload);
    return response.data;
  },
  save: async (payload) => {
    const response = await api.post("/api/timetable/save", payload);
    return response.data;
  },
  getManaged: async (params) => {
    const response = await api.get("/api/timetable/manage", { params });
    return response.data;
  },
  editSession: async (sessionId, payload) => {
    const response = await api.put(`/api/timetable/sessions/${sessionId}`, payload);
    return response.data;
  },
  suggestAlternatives: async (sessionId, lecturerId = null) => {
    const payload = { session_id: sessionId };
    if (lecturerId) {
      payload.lecturer_id = lecturerId;
    }
    const response = await api.post("/api/timetable/suggest-alternatives", payload);
    return response.data;
  },
  getFilters: async () => {
    const response = await api.get("/api/timetable/filters");
    return response.data;
  },
  publish: async (payload) => {
    const response = await api.post("/api/timetable/publish", payload);
    return response.data;
  },
  archive: async (payload) => {
    const response = await api.post("/api/timetable/archive", payload);
    return response.data;
  },
  getContext: async ({ degree_id, dept_id, faculty_id } = {}) => {
    const params = {};
    if (degree_id) params.degree_id = degree_id;
    if (dept_id) params.dept_id = dept_id;
    if (faculty_id) params.faculty_id = faculty_id;
    const response = await api.get("/api/timetable/context", { params });
    return response.data;
  },
  exportTimetable: async (queryParams, status, format) => {
    const response = await api.get(`/api/timetable/export/`, {
      params: { ...queryParams, status, format },
      responseType: "blob",
    });
    
    let filename = `timetable.${format}`;
    const disposition = response.headers['content-disposition'];
    if (disposition && disposition.indexOf('filename=') !== -1) {
      filename = disposition.split('filename=')[1].replace(/["']/g, '');
    }
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};

export const setAuthToken = (token) => {
  localStorage.setItem("token", token);
};

export const getAuthToken = () => localStorage.getItem("token");

export const setUser = (user) => {
  const normalizedUser = {
    ...user,
    role: normalizeRole(user?.role),
  };
  localStorage.setItem("user", JSON.stringify(normalizedUser));
};

export const getUser = () => {
  const rawUser = localStorage.getItem("user");
  if (!rawUser) {
    return null;
  }
  try {
    const parsed = JSON.parse(rawUser);
    return {
      ...parsed,
      role: normalizeRole(parsed?.role),
    };
  } catch {
    return null;
  }
};

export const isAuthenticated = () => !!getAuthToken();

export const normalizeRole = (role) => {
  switch (role) {
    case "SUPER_ADMIN":
      return "SuperAdmin";
    case "RESOURCE_MANAGER":
      return "ResourceManager";
    case "SCHEDULER":
      return "Scheduler";
    case "LECTURER":
      return "Lecturer";
    case "STUDENT":
      return "Student";
    default:
      return role;
  }
};

export const auditAPI = {
  getAuditLogs: async (params) => {
    const response = await api.get("/api/audit-logs", { params });
    return response.data;
  },
};

export const getHomeRouteByRole = (role) => {
  switch (normalizeRole(role)) {
    case "SuperAdmin":
      return "/admin/dashboard";
    case "Scheduler":
      return "/scheduler/dashboard";
    case "Lecturer":
      return "/lecturer/dashboard";
    case "Student":
      return "/student/dashboard";
    case "ResourceManager":
      return "/resource/dashboard";
    default:
      return "/";
  }
};

export default api;
