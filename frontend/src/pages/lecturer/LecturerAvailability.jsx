import { useState } from "react";
import { Clock, Save, Check } from "lucide-react";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const timeSlots = [
  "08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00",
  "11:00 - 12:00", "13:00 - 14:00", "14:00 - 15:00",
  "15:00 - 16:00", "16:00 - 17:00",
];

export default function LecturerAvailability() {
  const [availability, setAvailability] = useState({});
  const [saved, setSaved] = useState(false);

  const toggleSlot = (day, slot) => {
    const key = `${day}-${slot}`;
    setAvailability((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const isAvailable = (day, slot) => availability[`${day}-${slot}`] || false;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">My Availability</h2>
          <p className="text-sm text-gray-500 mt-0.5">Select your available time slots</p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            saved ? "bg-green-500 text-white" : "bg-teal-600 hover:bg-teal-700 text-white"
          }`}
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saved ? "Saved!" : "Save Availability"}
        </button>
      </div>

      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3">
        <Clock size={18} className="text-teal-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-teal-700">
          Click slots to mark as <strong>Available</strong>. Scheduler will use this for timetable generation.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-36">
                  Time Slot
                </th>
                {days.map((day) => (
                  <th key={day} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {timeSlots.map((slot) => (
                <tr key={slot} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">
                    {slot}
                  </td>
                  {days.map((day) => (
                    <td key={day} className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleSlot(day, slot)}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-medium transition-all border ${
                          isAvailable(day, slot)
                            ? "bg-teal-500 text-white border-teal-500"
                            : "bg-gray-50 text-gray-400 border-gray-200 hover:border-teal-300"
                        }`}
                      >
                        {isAvailable(day, slot) ? "✓ Available" : "—"}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}