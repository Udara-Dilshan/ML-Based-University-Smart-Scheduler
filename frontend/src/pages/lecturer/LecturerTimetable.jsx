import { useEffect, useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import { getUser, lecturerAPI } from "../../services/api";

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

export default function LecturerTimetable() {
  const currentUser = getUser();
  const lecturerId = currentUser?.user_id;

  const [days, setDays] = useState(DEFAULT_DAYS);
  const [timeSlots, setTimeSlots] = useState(generateTimeRows("08:00", "17:00"));
  const [sessions, setSessions] = useState([]);
  const [constraints, setConstraints] = useState({
    working_hours_start: "08:00",
    working_hours_end: "17:00",
    working_days: DEFAULT_DAYS,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadTimetableData = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [constraints, allSessions] = await Promise.all([
          lecturerAPI.getWorkingConstraints(),
          lecturerAPI.getTimetable(),
        ]);

        if (!isMounted) {
          return;
        }

        const configuredDays = Array.isArray(constraints?.working_days) && constraints.working_days.length
          ? constraints.working_days
          : DEFAULT_DAYS;
        setConstraints({
          working_hours_start: constraints?.working_hours_start || "08:00",
          working_hours_end: constraints?.working_hours_end || "17:00",
          working_days: configuredDays,
        });
        setDays(configuredDays);

        const configuredTimes = generateTimeRows(
          constraints?.working_hours_start || "08:00",
          constraints?.working_hours_end || "17:00"
        );
        setTimeSlots(configuredTimes.length ? configuredTimes : generateTimeRows("08:00", "17:00"));

        const filtered = (allSessions || []).filter(
          (item) => Number(item.lecturer_id) === Number(lecturerId)
        );
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
  }, [lecturerId]);

  const sessionMap = useMemo(() => {
    const map = new Map();

    sessions.forEach((item) => {
      const normalizedDay = DAY_NORMALIZE[String(item.day_of_week || "").toUpperCase()];
      if (!normalizedDay) {
        return;
      }
      const start = String(item.start_time || "").slice(0, 5);
      if (!start) {
        return;
      }
      map.set(`${normalizedDay}__${start}`, item);
    });

    return map;
  }, [sessions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">My Timetable</h2>
          <p className="text-sm text-gray-500 mt-0.5">Your weekly class schedule</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white border border-gray-200 px-4 py-2 rounded-lg">
          <Calendar size={16} />
          {constraints.working_hours_start} - {constraints.working_hours_end} • {constraints.working_days.map((day) => DAY_SHORT[day] || day).join(", ")}
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                    const session = sessionMap.get(`${day}__${timeSlot.start}`);
                    const colorClass = CARD_COLORS[index % CARD_COLORS.length];

                    return (
                      <td key={day} className="px-4 py-3 align-top min-w-[150px]">
                        {isLoading ? (
                          <div className="text-xs text-gray-400">...</div>
                        ) : session ? (
                          <div className={`${colorClass} rounded-lg p-2`}>
                            <p className="text-xs font-semibold">Module #{session.module_id}</p>
                            <p className="text-xs mt-0.5 opacity-80">
                              {session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)}
                            </p>
                            <p className="text-xs mt-0.5 opacity-80">
                              Batch #{session.batch_id} • Room #{session.resource_id}
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