import { Calendar, Clock } from "lucide-react";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const times = ["08:00", "09:00", "10:00", "11:00", "12:00", 
               "13:00", "14:00", "15:00", "16:00"];

export default function LecturerTimetable() {
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">My Timetable</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Your weekly class schedule
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 
                        bg-white border border-gray-200 px-4 py-2 rounded-lg">
          <Calendar size={16} />
          Semester 1 - 2026
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium 
                               text-gray-500 uppercase w-20">
                  Time
                </th>
                {days.map((day) => (
                  <th key={day}
                    className="px-4 py-3 text-left text-xs font-medium 
                               text-gray-500 uppercase">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {times.map((time) => (
                <tr key={time} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-xs text-gray-400 
                                 font-medium whitespace-nowrap">
                    {time}
                  </td>
                  {days.map((day) => (
                    <td key={day} className="px-4 py-3">
                      {/* Example class */}
                      {day === "Monday" && time === "08:00" && (
                        <div className="bg-teal-50 border-l-4 border-teal-500 
                                        rounded-lg p-2">
                          <p className="text-xs font-semibold text-teal-800">
                            Database Mgmt
                          </p>
                          <p className="text-xs text-teal-600 mt-0.5">
                            Lab 01 • ICT/21
                          </p>
                        </div>
                      )}
                      {day === "Wednesday" && time === "10:00" && (
                        <div className="bg-blue-50 border-l-4 border-blue-500 
                                        rounded-lg p-2">
                          <p className="text-xs font-semibold text-blue-800">
                            Software Eng.
                          </p>
                          <p className="text-xs text-blue-600 mt-0.5">
                            Hall A • ICT/22
                          </p>
                        </div>
                      )}
                      {day === "Friday" && time === "13:00" && (
                        <div className="bg-purple-50 border-l-4 border-purple-500 
                                        rounded-lg p-2">
                          <p className="text-xs font-semibold text-purple-800">
                            Web Technologies
                          </p>
                          <p className="text-xs text-purple-600 mt-0.5">
                            Lab 02 • ICT/21
                          </p>
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-teal-500"></div>
          Database Management
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500"></div>
          Software Engineering
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-purple-500"></div>
          Web Technologies
        </div>
      </div>

    </div>
  );
}