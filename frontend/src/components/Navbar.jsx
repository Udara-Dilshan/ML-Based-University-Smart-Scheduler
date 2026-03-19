import { Bell, ChevronDown, LogOut, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";

export default function Navbar({ title }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    authAPI.logout();
    navigate("/");
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
        <button className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-blue-500 text-white text-xs font-medium flex items-center justify-center">
            SA
          </div>
          <ChevronDown size={14} className="text-gray-500" />
        </button>
      </div>
    </header>
  );
}
