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
  getCurrentUser: async () => {
    try {
      const response = await api.get("/api/auth/me");
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to fetch user data" };
    }
  },
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
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
  updateModule: async (id, payload) => {
    const response = await api.put(`/academic/modules/${id}`, payload);
    return response.data;
  },
  deleteModule: async (id) => {
    await api.delete(`/academic/modules/${id}`);
  },
  getBatches: async () => {
    const response = await api.get("/academic/batches");
    return response.data;
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
    const response = await api.get("/timetable/");
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

export const studentAPI = {
  getCourses: async () => {
    const response = await api.get("/api/dashboard/student-courses");
    return response.data;
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
