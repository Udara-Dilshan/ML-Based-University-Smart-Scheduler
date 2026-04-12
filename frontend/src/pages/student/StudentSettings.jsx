import { useState } from "react";
import { Save } from "lucide-react";

const tabs = ["General","Semester","Backup & Restore","Audit Logs"];

export default function StudentSettings() {
  const [activeTab, setActiveTab] = useState("Semester");
  const [form, setForm] = useState({ semester: "", year: "", startDate: "", endDate: "" });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Settings</h2>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-6">
            {tabs.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === "Semester" ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Save size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Semester Configuration</h3>
                  <p className="text-xs text-gray-500">Set academic calendar dates</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Current Semester", key: "semester", type: "text"  },
                  { label: "Academic Year",    key: "year",     type: "text"  },
                  { label: "Semester Start Date", key: "startDate", type: "date" },
                  { label: "Semester End Date",   key: "endDate",   type: "date" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-sm text-gray-700 mb-1">{f.label}</label>
                    <input type={f.type} value={form[f.key]}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                ))}
              </div>
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                Save Changes
              </button>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">Coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}