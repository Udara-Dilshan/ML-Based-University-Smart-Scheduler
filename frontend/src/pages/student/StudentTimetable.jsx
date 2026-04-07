import { AlertCircle } from "lucide-react";

const times = ["8:00 AM","9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM"];
const days  = ["Monday","Tuesday","Wednesday","Thursday","Friday"];

const classes = [
  { day: "Monday",    time: "8:00 AM",  code: "CS301",  name: "Data Structures", lecturer: "Dr. Johnson",  room: "Lab 201",  color: "bg-blue-50 border-blue-400 text-blue-800"   },
  { day: "Tuesday",   time: "9:00 AM",  code: "PHY101", name: "Physics I",       lecturer: "Dr. Park",     room: "Lab 301",  color: "bg-yellow-50 border-yellow-400 text-yellow-800" },
  { day: "Wednesday", time: "10:00 AM", code: "CS401",  name: "Machine Learning",lecturer: "Dr. Johnson",  room: "Lab 301",  color: "bg-blue-50 border-blue-400 text-blue-800"   },
  { day: "Thursday",  time: "8:00 AM",  code: "ENG201", name: "Mechanics",       lecturer: "Prof. Taylor", room: "Room 202", color: "bg-red-50 border-red-400 text-red-800"       },
  { day: "Thursday",  time: "9:00 AM",  code: "CS101",  name: "Intro to Prog",   lecturer: "Dr. Williams", room: "Lab D",    color: "bg-blue-50 border-blue-400 text-blue-800"   },
];

export default function StudentTimetable() {
  const getClass = (day, time) => classes.find((c) => c.day === day && c.time === time);

  return (
    <div className="space-y-4">

      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
        <AlertCircle size={18} className="text-yellow-600 flex-shrink-0" />
        <p className="text-sm text-yellow-800">
          <strong>2 scheduling conflicts detected</strong> — Dr. Johnson has overlapping classes on Monday.
        </p>
        <button className="ml-auto text-xs text-yellow-700 font-medium">View Conflicts</button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 w-24">Time</th>
                {days.map((d) => (
                  <th key={d} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {times.map((time) => (
                <tr key={time} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{time}</td>
                  {days.map((day) => {
                    const cls = getClass(day, time);
                    return (
                      <td key={day} className="px-2 py-2">
                        {cls && (
                          <div className={`border-l-4 rounded-lg p-2 ${cls.color}`}>
                            <p className="text-xs font-bold">{cls.code}</p>
                            <p className="text-xs font-medium">{cls.name}</p>
                            <p className="text-xs opacity-70">{cls.lecturer}</p>
                            <p className="text-xs opacity-70">{cls.room}</p>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}