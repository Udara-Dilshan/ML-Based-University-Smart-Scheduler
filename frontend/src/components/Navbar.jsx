import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, ChevronDown, LogOut, Search, Settings, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authAPI, getUser } from "../services/api";

export default function Navbar({ title }) {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userRefresh, setUserRefresh] = useState(0);
  const menuRef = useRef(null);
  const currentUser = getUser();
  const isLecturer = currentUser?.role === "Lecturer";
  const isStudent = currentUser?.role === "Student";

  // Listen for storage changes to update profile image
  useEffect(() => {
    const handleProfileUpdate = () => {
      setUserRefresh((prev) => prev + 1);
    };

    window.addEventListener("userProfileUpdated", handleProfileUpdate);
    return () => window.removeEventListener("userProfileUpdated", handleProfileUpdate);
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

  const initials = useMemo(() => {
    const parts = userName.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return "SA";
  }, [userName]);

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

  const handleLogout = () => {
    authAPI.logout();
    navigate("/");
  };

  const handleProfile = () => {
    if (isLecturer) {
      navigate("/lecturer/profile");
    } else if (isStudent) {
      navigate("/student/profile");
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
    } else {
      navigate("/admin/settings");
    }
    setIsMenuOpen(false);
  };

  const handleEmail = () => {
    window.location.href = `mailto:${userEmail}`;
    setIsMenuOpen(false);
  };

  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between gap-6">
      <h1 className="text-lg font-semibold text-gray-900 min-w-28">{title}</h1>

      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search anything..."
            className="h-10 w-full rounded-full border border-gray-200 pl-9 pr-4 text-sm outline-none focus:border-blue-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="text-gray-500 hover:text-gray-700">
          <Bell size={18} />
        </button>
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
                src={`http://localhost:8000${currentUser.profile_image}`}
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
