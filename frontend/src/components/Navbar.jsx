import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, ChevronDown, LogOut, Search, Settings, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authAPI, getUser, notificationsAPI, getImageUrl } from "../services/api";

const SEARCH_TARGETS = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    keywords: ["home", "overview"],
    roles: ["SuperAdmin"],
  },
  {
    label: "Users",
    path: "/admin/users",
    keywords: ["all users", "user management"],
    roles: ["SuperAdmin"],
  },
  {
    label: "Super Admins",
    path: "/admin/users/admins",
    keywords: ["admins", "admin users"],
    roles: ["SuperAdmin"],
  },
  {
    label: "Schedulers",
    path: "/admin/users/schedulers",
    keywords: ["scheduler", "scheduling staff"],
    roles: ["SuperAdmin"],
  },
  {
    label: "Lecturers",
    path: "/admin/users/lecturers",
    keywords: ["lecturer users", "faculty"],
    roles: ["SuperAdmin"],
  },
  {
    label: "Students",
    path: "/admin/users/students",
    keywords: ["student users", "enrollment"],
    roles: ["SuperAdmin"],
  },
  {
    label: "Resource Managers",
    path: "/admin/users/resource-managers",
    keywords: ["resource manager", "staff"],
    roles: ["SuperAdmin"],
  },
  {
    label: "Timetable Generation",
    path: "/admin/timetable",
    keywords: ["timetable", "generate"],
    roles: ["SuperAdmin"],
  },
  {
    label: "Manage Timetables",
    path: "/admin/timetable/manage",
    keywords: ["schedule management", "timetable manage"],
    roles: ["SuperAdmin"],
  },
  {
    label: "Resources",
    path: "/admin/resources",
    keywords: ["rooms", "equipment", "vehicles"],
    roles: ["SuperAdmin"],
  },
  {
    label: "Requests",
    path: "/admin/requests",
    keywords: ["approval", "pending requests"],
    roles: ["SuperAdmin"],
  },
  {
    label: "Medical Submissions",
    path: "/admin/medical-submissions",
    keywords: ["medical", "absences"],
    roles: ["SuperAdmin"],
  },
  {
    label: "Reports & Analytics",
    path: "/admin/reports",
    keywords: ["reports", "analytics"],
    roles: ["SuperAdmin"],
  },
  {
    label: "Settings",
    path: "/admin/settings",
    keywords: ["preferences", "configuration"],
    roles: ["SuperAdmin"],
  },
  {
    label: "Faculties",
    path: "/admin/faculties",
    keywords: ["academic data"],
    roles: ["SuperAdmin"],
  },
  {
    label: "Departments",
    path: "/admin/departments",
    keywords: ["academic data"],
    roles: ["SuperAdmin"],
  },
  {
    label: "Courses",
    path: "/admin/courses",
    keywords: ["academic data"],
    roles: ["SuperAdmin"],
  },
  {
    label: "Degrees",
    path: "/admin/degrees",
    keywords: ["academic data"],
    roles: ["SuperAdmin"],
  },
  {
    label: "Batches",
    path: "/admin/batches",
    keywords: ["academic data"],
    roles: ["SuperAdmin"],
  },
  {
    label: "Degree Semester Modules",
    path: "/admin/curriculum/degree-semester-modules",
    keywords: ["curriculum", "modules"],
    roles: ["SuperAdmin"],
  },
  {
    label: "Lecturer Allocations",
    path: "/admin/lecturer-allocations",
    keywords: ["allocations", "lecture assignment"],
    roles: ["SuperAdmin"],
  },
  {
    label: "Admin Profile",
    path: "/admin/profile",
    keywords: ["account", "my profile"],
    roles: ["SuperAdmin"],
  },
  {
    label: "Scheduler Dashboard",
    path: "/scheduler/dashboard",
    keywords: ["schedule", "overview"],
    roles: ["Scheduler"],
  },
  {
    label: "Lecturer Dashboard",
    path: "/lecturer/dashboard",
    keywords: ["overview"],
    roles: ["Lecturer"],
  },
  {
    label: "Lecturer Timetable",
    path: "/lecturer/timetable",
    keywords: ["schedule", "timetable"],
    roles: ["Lecturer"],
  },
  {
    label: "Lecturer Availability",
    path: "/lecturer/availability",
    keywords: ["availability", "slots"],
    roles: ["Lecturer"],
  },
  {
    label: "Lecturer Courses",
    path: "/lecturer/courses",
    keywords: ["modules", "subjects"],
    roles: ["Lecturer"],
  },
  {
    label: "Lecturer Profile",
    path: "/lecturer/profile",
    keywords: ["account", "my profile"],
    roles: ["Lecturer"],
  },
  {
    label: "Lecturer Settings",
    path: "/lecturer/settings",
    keywords: ["preferences"],
    roles: ["Lecturer"],
  },
  {
    label: "Student Dashboard",
    path: "/student/dashboard",
    keywords: ["overview", "home"],
    roles: ["Student"],
  },
  {
    label: "Student Courses",
    path: "/student/courses",
    keywords: ["modules", "subjects"],
    roles: ["Student"],
  },
  {
    label: "Student Profile",
    path: "/student/profile",
    keywords: ["account", "my profile"],
    roles: ["Student"],
  },
  {
    label: "Semester Registration",
    path: "/student/registration",
    keywords: ["registration", "semester"],
    roles: ["Student"],
  },
  {
    label: "Student Timetable",
    path: "/student/timetable",
    keywords: ["schedule", "timetable"],
    roles: ["Student"],
  },
  {
    label: "Medical Submissions",
    path: "/student/medical",
    keywords: ["medical", "absences"],
    roles: ["Student"],
  },
  {
    label: "Student Events",
    path: "/student/events",
    keywords: ["events"],
    roles: ["Student"],
  },
  {
    label: "Student Clubs",
    path: "/student/clubs",
    keywords: ["clubs"],
    roles: ["Student"],
  },
  {
    label: "Student Support",
    path: "/student/support",
    keywords: ["support", "help"],
    roles: ["Student"],
  },
  {
    label: "Student Settings",
    path: "/student/settings",
    keywords: ["preferences"],
    roles: ["Student"],
  },
  {
    label: "Resource Dashboard",
    path: "/resource/dashboard",
    keywords: ["overview"],
    roles: ["ResourceManager"],
  },
  {
    label: "Manage Rooms",
    path: "/resource/rooms",
    keywords: ["rooms"],
    roles: ["ResourceManager"],
  },
  {
    label: "Manage Equipment",
    path: "/resource/equipment",
    keywords: ["equipment"],
    roles: ["ResourceManager"],
  },
  {
    label: "Manage Vehicles",
    path: "/resource/vehicles",
    keywords: ["vehicles"],
    roles: ["ResourceManager"],
  },
  {
    label: "Resource Manager Profile",
    path: "/resource/profile",
    keywords: ["account", "my profile"],
    roles: ["ResourceManager"],
  },
  {
    label: "Resource Manager Settings",
    path: "/resource/settings",
    keywords: ["preferences", "password"],
    roles: ["ResourceManager"],
  },
];

const normalizeSearchText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export default function Navbar({ title }) {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const [userRefresh, setUserRefresh] = useState(0);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const currentUser = getUser();
  const currentRole = currentUser?.role || "SuperAdmin";
  const isLecturer = currentUser?.role === "Lecturer";
  const isStudent = currentUser?.role === "Student";
  const scopedTargets = useMemo(
    () => SEARCH_TARGETS.filter((target) => !target.roles || target.roles.includes(currentRole)),
    [currentRole]
  );
  const searchResults = useMemo(() => {
    const query = normalizeSearchText(searchQuery);

    if (!query) {
      return [];
    }

    return scopedTargets.filter((target) => {
      const haystack = normalizeSearchText([target.label, target.path, ...(target.keywords || [])].join(" "));
      return haystack.includes(query);
    }).slice(0, 6);
  }, [searchQuery, scopedTargets]);

  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const data = await notificationsAPI.getNotifications();
      setNotifications(data);
      setHasUnreadNotifications(data.some(n => !n.is_read));
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  useEffect(() => {
    if (currentUser?.user_id) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [currentUser?.user_id]);

  const getNotificationRoute = (notification) => {
    switch (notification.type) {
      case "EVENT_REQUEST":
        if (currentRole === "ResourceManager") return "/resource/event-requests";
        if (currentRole === "Student") return "/student/events";
        if (currentRole === "Lecturer") return "/lecturer/my-requests";
        return "/admin/requests";
      case "VEHICLE_REQUEST":
        if (currentRole === "ResourceManager") return "/resource/vehicle-requests";
        if (currentRole === "Lecturer") return "/lecturer/my-requests";
        return "/admin/requests";
      case "MEDICAL_SUBMISSION":
        if (currentRole === "SuperAdmin") return "/admin/medical-submissions";
        if (currentRole === "Scheduler") return "/scheduler/medical-submissions";
        return "/student/medical";
      case "TIMETABLE_PUBLISH":
        return isLecturer ? "/lecturer/timetable" : "/student/timetable";
      default:
        return "/";
    }
  };

  const handleNotificationClick = async (notification) => {
    setIsNotificationsOpen(false);
    if (!notification.is_read) {
      try {
        await notificationsAPI.markAsRead(notification.id);
        fetchNotifications();
      } catch (err) {}
    }
    navigate(getNotificationRoute(notification));
  };

  // Listen for storage changes to update profile image
  useEffect(() => {
    const handleProfileUpdate = () => {
      setUserRefresh((prev) => prev + 1);
    };

    const handleNotificationsRead = () => {
      fetchNotifications();
    };

    window.addEventListener("userProfileUpdated", handleProfileUpdate);
    window.addEventListener("notificationsRead", handleNotificationsRead);
    
    return () => {
      window.removeEventListener("userProfileUpdated", handleProfileUpdate);
      window.removeEventListener("notificationsRead", handleNotificationsRead);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userName = useMemo(() => {
    if (!currentUser) {
      return "Super Admin";
    }

    const fullName = [currentUser.first_name, currentUser.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (fullName) {
      return fullName;
    }

    return currentUser.username || "Super Admin";
  }, [currentUser]);

  const userEmail = currentUser?.email || "admin@university.edu";

  const initials = (() => {
    const parts = userName.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return "SA";
  })();

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLogout = async () => {
    await authAPI.logout();
    navigate("/");
  };

  const handleSearchNavigate = (target) => {
    if (!target) {
      return;
    }

    navigate(target.path);
    setSearchQuery("");
    setActiveSearchIndex(-1);
    searchRef.current?.blur();
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    if (searchResults.length > 0) {
      const chosen = activeSearchIndex >= 0 ? searchResults[activeSearchIndex] : searchResults[0];
      handleSearchNavigate(chosen);
      return;
    }

    const query = normalizeSearchText(searchQuery);
    if (!query) {
      return;
    }

    const fallbackTarget = scopedTargets.find((target) => {
      const haystack = normalizeSearchText([target.label, target.path, ...(target.keywords || [])].join(" "));
      return haystack.includes(query);
    });

    handleSearchNavigate(fallbackTarget);
  };

  const handleProfile = () => {
    if (isLecturer) {
      navigate("/lecturer/profile");
    } else if (isStudent) {
      navigate("/student/profile");
    } else if (currentUser?.role === "ResourceManager") {
      navigate("/resource/profile");
    } else if (currentUser?.role === "Scheduler") {
      navigate("/scheduler/profile");
    } else {
      navigate("/admin/profile");
    }
    setIsMenuOpen(false);
  };

  const handleSettings = () => {
    if (isLecturer) {
      navigate("/lecturer/settings");
    } else if (isStudent) {
      navigate("/student/settings");
    } else if (currentUser?.role === "ResourceManager") {
      navigate("/resource/settings");
    } else if (currentUser?.role === "Scheduler") {
      navigate("/scheduler/settings");
    } else {
      navigate("/admin/settings");
    }
    setIsMenuOpen(false);
  };


  useEffect(() => {
    if (!searchResults.length) {
      setActiveSearchIndex(-1);
      return;
    }

    if (activeSearchIndex >= searchResults.length) {
      setActiveSearchIndex(0);
    }
  }, [searchResults, activeSearchIndex]);

  const handleSearchKeyDown = (event) => {
    if (!searchResults.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSearchIndex((prev) => (prev + 1) % searchResults.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSearchIndex((prev) => (prev <= 0 ? searchResults.length - 1 : prev - 1));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const chosen = activeSearchIndex >= 0 ? searchResults[activeSearchIndex] : searchResults[0];
      handleSearchNavigate(chosen);
    }
  };

  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between gap-6">
      <h1 className="text-lg font-semibold text-gray-900 min-w-28">{title}</h1>

      <form className="relative flex-1 max-w-xl" onSubmit={handleSearchSubmit}>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setActiveSearchIndex(-1);
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search anything..."
            className="h-11 w-full rounded-2xl border border-gray-200 bg-white/80 pl-10 pr-12 text-sm text-gray-800 shadow-sm outline-none backdrop-blur focus:border-blue-400 focus:bg-white focus:shadow-md"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Search and navigate"
          >
            <Search size={14} />
          </button>
        </div>

        {searchQuery.trim() && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-gray-100 bg-white/95 shadow-xl backdrop-blur">
            <div className="border-b border-gray-100 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
              Quick navigation
            </div>
            <div className="max-h-72 overflow-y-auto py-1">
              {searchResults.map((target, index) => (
                <button
                  key={target.path}
                  type="button"
                  onClick={() => handleSearchNavigate(target)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${index === activeSearchIndex
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-blue-50"
                    }`}
                  aria-selected={index === activeSearchIndex}
                >
                  <span className="font-medium text-gray-900">{target.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </form>

      <div className="flex items-center gap-4">
        <div className="relative" ref={notificationsRef}>
          <button 
            className="relative text-gray-500 hover:text-gray-700"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
          >
            <Bell size={18} />
            {hasUnreadNotifications && (
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                {hasUnreadNotifications && (
                  <button 
                    onClick={async () => {
                      await notificationsAPI.markAllAsRead();
                      fetchNotifications();
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="max-h-[28rem] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-500">No notifications yet.</div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      onClick={() => handleNotificationClick(n)}
                      className={`cursor-pointer px-4 py-3 border-b border-gray-50 transition-colors hover:bg-gray-50 ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-sm ${!n.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{n.title}</span>
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></span>}
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">{n.message}</p>
                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          <LogOut size={14} />
          Logout
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-gray-100"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
          >
            {currentUser?.profile_image ? (
              <img
                src={getImageUrl(currentUser.profile_image)}
                alt="Profile"
                className="h-8 w-8 rounded-full object-cover border border-gray-300"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-blue-500 text-white text-xs font-medium flex items-center justify-center">
                {initials}
              </div>
            )}
            <ChevronDown
              size={14}
              className={`text-gray-500 transition-transform ${isMenuOpen ? "rotate-180" : "rotate-0"}`}
            />
          </button>

          {isMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-lg z-30"
              role="menu"
            >
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
              </div>

              <div className="p-2">
                <button
                  type="button"
                  onClick={handleProfile}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  <User size={15} />
                  Profile
                </button>

                <button
                  type="button"
                  onClick={handleSettings}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  <Settings size={15} />
                  Settings
                </button>

              </div>

              <div className="border-t border-gray-100 p-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  role="menuitem"
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
