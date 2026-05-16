import { useEffect, useMemo, useState } from "react";
import { Calendar, AlertCircle } from "lucide-react";
import { studentAPI } from "../../services/api";

const DEFAULT_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_SHORT = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

const DAY_NORMALIZE = {
  MON: "Monday",
  MONDAY: "Monday",
  TUE: "Tuesday",
  TUESDAY: "Tuesday",
  WED: "Wednesday",
  WEDNESDAY: "Wednesday",
  THU: "Thursday",
  THURSDAY: "Thursday",
  FRI: "Friday",
  FRIDAY: "Friday",
  SAT: "Saturday",
  SATURDAY: "Saturday",
  SUN: "Sunday",
  SUNDAY: "Sunday",
};

const CARD_COLORS = [
  "bg-teal-50 border-l-4 border-teal-500 text-teal-800",
  "bg-blue-50 border-l-4 border-blue-500 text-blue-800",
  "bg-purple-50 border-l-4 border-purple-500 text-purple-800",
  "bg-orange-50 border-l-4 border-orange-500 text-orange-800",
  "bg-pink-50 border-l-4 border-pink-500 text-pink-800",
];

const parseMinutes = (value) => {
  if (!value) {
    return 0;
  }
  const token = String(value).trim();
  const [hourToken, minuteToken] = token.split(":");
  const hour = Number.parseInt(hourToken, 10);
  const minute = Number.parseInt(minuteToken, 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return 0;
  }
  return (hour * 60) + minute;
};

const minutesToTime = (value) => {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const generateTimeRows = (startTime, endTime) => {
  const start = parseMinutes(startTime);
  const end = parseMinutes(endTime);
  const rows = [];

  for (let marker = start; marker < end; marker += 60) {
    const slotStart = minutesToTime(marker);
    const slotEnd = minutesToTime(Math.min(marker + 60, end));
    rows.push({
      start: slotStart,
      end: slotEnd,
      label: `${slotStart} - ${slotEnd}`,
    });
  }

  return rows;
};

export default function StudentTimetable() {
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [timeSlots, setTimeSlots] = useState(generateTimeRows("08:00", "17:00"));
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadTimetableData = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const fetchedSessions = await studentAPI.getTimetable();

        if (!isMounted) {
          return;
        }

        const filtered = Array.isArray(fetchedSessions) ? fetchedSessions : [];
        setSessions(filtered);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setErrorMessage(
          error?.response?.data?.detail || error?.message || "Failed to load timetable"
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadTimetableData();

    return () => {
      isMounted = false;
    };
  }, []);

  const { sessionMap, skipMap } = useMemo(() => {
    const sMap = new Map();
    const skip = new Set();

    sessions.forEach((item) => {
      const normalizedDay = DAY_NORMALIZE[String(item.day_of_week || "").toUpperCase()];
      if (!normalizedDay) {
        return;
      }
      const start = String(item.start_time || "").slice(0, 5);
      const end = String(item.end_time || "").slice(0, 5);
      if (!start || !end) {
        return;
      }

      const startMin = parseMinutes(start);
      const endMin = parseMinutes(end);
      const durationHours = Math.max(1, Math.ceil((endMin - startMin) / 60));

      item.durationHours = durationHours;
      sMap.set(`${normalizedDay}__${start}`, item);

      for (let i = 1; i < durationHours; i++) {
        const skipTime = minutesToTime(startMin + i * 60);
        skip.add(`${normalizedDay}__${skipTime}`);
      }
    });

    return { sessionMap: sMap, skipMap: skip };
  }, [sessions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Timetable</h2>
          <p className="text-sm text-gray-500 mt-0.5">Your weekly class schedule</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white border border-gray-200 px-4 py-2 rounded-lg">
          <Calendar size={16} />
          08:00 - 17:00 • {days.map((day) => DAY_SHORT[day] || day).join(", ")}
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={18} />
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-200 shadow-sm text-gray-500">
          <Calendar size={48} className="text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No published timetable available yet</h3>
          <p className="text-sm mt-1">Check back later or contact your department if you think this is a mistake.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">
                    Time
                  </th>
                  {days.map((day) => (
                    <th key={day} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {timeSlots.map((timeSlot) => (
                  <tr key={timeSlot.label} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-xs text-gray-400 font-medium whitespace-nowrap">
                      {timeSlot.label}
                    </td>
                    {days.map((day, index) => {
                      const cellKey = `${day}__${timeSlot.start}`;
                      
                      if (skipMap.has(cellKey)) {
                        return null;
                      }

                      const session = sessionMap.get(cellKey);
                      const colorClass = CARD_COLORS[index % CARD_COLORS.length];

                      return (
                        <td 
                          key={day} 
                          className="px-4 py-3 align-top min-w-[150px]"
                          rowSpan={session ? session.durationHours : 1}
                        >
                          {isLoading ? (
                            <div className="text-xs text-gray-400">...</div>
                          ) : session ? (
                            <div className={`${colorClass} rounded-lg p-3 h-full flex flex-col`}>
                              <p className="text-xs font-semibold">{session.module_code} - {session.module_name}</p>
                              <p className="text-xs mt-1 opacity-80">
                                {session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)}
                              </p>
                              <p className="text-xs mt-1 opacity-80">
                                Room: {session.room_name} • {session.lecturer_name}
                              </p>
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
        {days.map((day, index) => (
          <div key={day} className="px-2 py-1 rounded-full bg-gray-100 text-gray-600">
            {index + 1}. {DAY_SHORT[day] || day}
          </div>
        ))}
      </div>
    </div>
  );
}