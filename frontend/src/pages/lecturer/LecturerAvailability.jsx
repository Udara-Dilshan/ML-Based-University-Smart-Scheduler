import { useEffect, useState } from "react";
import { Clock, Save, Check } from "lucide-react";
import { getUser, lecturerAPI } from "../../services/api";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const timeSlots = [
  "08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00",
  "11:00 - 12:00", "13:00 - 14:00", "14:00 - 15:00",
  "15:00 - 16:00", "16:00 - 17:00",
];

const DAY_TO_BACKEND = {
  Monday: "MONDAY",
  Tuesday: "TUESDAY",
  Wednesday: "WEDNESDAY",
  Thursday: "THURSDAY",
  Friday: "FRIDAY",
  Saturday: "SATURDAY",
  Sunday: "SUNDAY",
};

const BACKEND_TO_DAY = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

export default function LecturerAvailability() {
  const user = getUser();
  const lecturerId = user?.user_id;

  const [unavailability, setUnavailability] = useState({});
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [pendingSlot, setPendingSlot] = useState(null);
  const [reasonInput, setReasonInput] = useState("");

  const getSlotKey = (day, slot) => `${day}__${slot}`;

  const normalizeTime = (value) => {
    if (!value) {
      return "00:00";
    }
    const token = String(value).trim();
    if (token.includes(":")) {
      const [hourRaw, minuteRaw] = token.split(":");
      const hour = String(parseInt(hourRaw, 10)).padStart(2, "0");
      const minute = String(parseInt(minuteRaw, 10)).padStart(2, "0");
      return `${hour}:${minute}`;
    }
    return token;
  };

  useEffect(() => {
    let isMounted = true;

    const loadAvailability = async () => {
      if (!lecturerId) {
        setIsLoading(false);
        setErrorMessage("Lecturer identity not found.");
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");

        const rows = await lecturerAPI.getAvailability(lecturerId);
        if (!isMounted) {
          return;
        }

        const nextState = {};
        (rows || []).forEach((item) => {
          const dayLabel = BACKEND_TO_DAY[String(item.day_of_week || "").toUpperCase()];
          if (!dayLabel) {
            return;
          }

          const start = normalizeTime(item.start_time);
          const end = normalizeTime(item.end_time);
          const slotLabel = `${start} - ${end}`;
          nextState[getSlotKey(dayLabel, slotLabel)] = {
            day: dayLabel,
            startTime: start,
            endTime: end,
            unavailable: true,
            reason: item.reason || "",
          };
        });

        setUnavailability(nextState);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setErrorMessage(
          error?.response?.data?.detail || error?.message || "Failed to load availability"
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAvailability();

    return () => {
      isMounted = false;
    };
  }, [lecturerId]);

  const toggleSlot = (day, slot) => {
    const key = getSlotKey(day, slot);
    const current = unavailability[key];
    if (current?.unavailable) {
      setUnavailability((prev) => {
        const nextState = { ...prev };
        delete nextState[key];
        return nextState;
      });
      setSaved(false);
      return;
    }

    setPendingSlot({ day, slot, key });
    setReasonInput("");
    setIsReasonModalOpen(true);
  };

  const isUnavailable = (day, slot) => Boolean(unavailability[getSlotKey(day, slot)]?.unavailable);

  const handleMarkAllAvailable = () => {
    setUnavailability({});
    setPendingSlot(null);
    setReasonInput("");
    setIsReasonModalOpen(false);
    setSaved(false);
  };

  const buildUnavailablePayload = () => {
    return Object.entries(unavailability)
      .filter(([, slotData]) => Boolean(slotData?.unavailable))
      .map(([key]) => {
        const slotData = unavailability[key];
        return {
          day_of_week: DAY_TO_BACKEND[slotData?.day] || slotData?.day?.toUpperCase(),
          unavailable_start: slotData?.startTime,
          unavailable_end: slotData?.endTime,
          reason: slotData?.reason || null,
        };
      });
  };

  const confirmReason = () => {
    if (!pendingSlot) {
      setIsReasonModalOpen(false);
      return;
    }

    const { day, slot, key } = pendingSlot;
    const [startTime, endTime] = slot.split(" - ");

    setUnavailability((prev) => ({
      ...prev,
      [key]: {
        day,
        startTime,
        endTime,
        unavailable: true,
        reason: reasonInput.trim(),
      },
    }));

    setPendingSlot(null);
    setReasonInput("");
    setIsReasonModalOpen(false);
    setSaved(false);
  };

  const cancelReason = () => {
    setPendingSlot(null);
    setReasonInput("");
    setIsReasonModalOpen(false);
  };

  const handleSave = async () => {
    if (!lecturerId) {
      setErrorMessage("Lecturer identity not found.");
      return;
    }

    const unavailableSlots = buildUnavailablePayload();

    try {
      setIsSaving(true);
      setErrorMessage("");

      await lecturerAPI.syncAvailability({
        lecturer_id: lecturerId,
        unavailable_slots: unavailableSlots,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.detail || error?.message || "Failed to save availability"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Weekly Schedule - Set Unavailable Slots</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Click on time slots to mark when you are Unavailable (e.g., for meetings, visiting lectures, personal commitments). Standard working hours (08:00 - 17:00) are marked as available by default.
          </p>
          <p className="text-xs text-gray-600 mt-2">🟢 Available  🔴 Unavailable</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllAvailable}
            disabled={isLoading || isSaving}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          >
            Mark All as Available
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              saved ? "bg-green-500 text-white" : "bg-teal-600 hover:bg-teal-700 text-white"
            }`}
          >
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? "Saved!" : isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3">
        <Clock size={18} className="text-teal-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-teal-700">
          Mark only your blocked periods as <strong>Unavailable</strong>. All other slots are considered available.
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
                        disabled={isLoading || isSaving}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-medium transition-all border ${
                          isUnavailable(day, slot)
                            ? "bg-red-500 text-white border-red-500 hover:bg-red-600"
                            : "bg-green-500 text-white border-green-500 hover:bg-green-600"
                        }`}
                        title={
                          isUnavailable(day, slot)
                            ? `Unavailable${unavailability[getSlotKey(day, slot)]?.reason ? ` - ${unavailability[getSlotKey(day, slot)]?.reason}` : ""}`
                            : "Available"
                        }
                      >
                        {isLoading ? "..." : isUnavailable(day, slot) ? "Unavailable" : "Available"}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isReasonModalOpen && pendingSlot ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Mark as Unavailable</h3>
              <p className="mt-1 text-sm text-gray-500">
                {pendingSlot.day} • {pendingSlot.slot}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Reason (Optional)</label>
              <input
                type="text"
                value={reasonInput}
                onChange={(event) => setReasonInput(event.target.value)}
                placeholder="e.g. meeting, visiting lecture, personal commitment"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelReason}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReason}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}