import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../layout/AdminLayout";
import { academicAPI, settingsAPI } from "../../../services/api";
import AboutSystemCard from "../../../components/AboutSystemCard";

const DAY_OPTIONS = [
	{ label: "Mon", value: "MON" },
	{ label: "Tue", value: "TUE" },
	{ label: "Wed", value: "WED" },
	{ label: "Thu", value: "THU" },
	{ label: "Fri", value: "FRI" },
	{ label: "Sat", value: "SAT" },
	{ label: "Sun", value: "SUN" },
];

const CONSTRAINT_KEYS = {
	workingHoursStart: "working_hours_start",
	workingHoursEnd: "working_hours_end",
	lunchBreakStart: "lunch_break_start",
	lunchBreakEnd: "lunch_break_end",
	maxStudentConsecutiveHours: "max_consecutive_hours_students",
	maxLecturerConsecutiveHours: "max_consecutive_hours_lecturers",
	workingDaysMask: "working_days_mask",
};

const LOOKUP_CATEGORIES = [
	{
		key: "RESOURCE_TYPES",
		label: "Resource Types",
		placeholder: "Add resource type",
	},
	{
		key: "LOCATIONS",
		label: "Locations",
		placeholder: "Add location",
	},
	{
		key: "FACILITIES",
		label: "Facilities",
		placeholder: "Add facility",
	},
];

const DEFAULT_CONSTRAINT_FORM = {
	workingHoursStart: "08:00",
	workingHoursEnd: "17:00",
	lunchBreakStart: "12:00",
	lunchBreakEnd: "13:00",
	maxStudentConsecutiveHours: 3,
	maxLecturerConsecutiveHours: 4,
	workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
};

const getErrorMessage = (error, fallback) => {
	const detail = error?.response?.data?.detail;
	if (typeof detail === "string") {
		return detail;
	}
	if (Array.isArray(detail)) {
		return detail.map((item) => item.msg || "Invalid value").join(", ");
	}
	return error?.message || fallback;
};

const toMinutes = (value) => {
	if (!value || !value.includes(":")) {
		return 0;
	}
	const [hours, minutes] = value.split(":").map((part) => Number(part));
	if (Number.isNaN(hours) || Number.isNaN(minutes)) {
		return 0;
	}
	return hours * 60 + minutes;
};

const toTimeString = (minutes) => {
	const safeMinutes = Math.max(0, Number(minutes) || 0);
	const hours = Math.floor(safeMinutes / 60);
	const mins = safeMinutes % 60;
	return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const encodeWorkingDays = (days) => {
	return DAY_OPTIONS.reduce((mask, day, index) => {
		if (days.includes(day.value)) {
			return mask | (1 << index);
		}
		return mask;
	}, 0);
};

const decodeWorkingDays = (mask) => {
	return DAY_OPTIONS.filter((_, index) => ((Number(mask) || 0) & (1 << index)) !== 0).map(
		(day) => day.value
	);
};

const formFromConstraints = (constraints) => {
	const values = { ...DEFAULT_CONSTRAINT_FORM };

	constraints.forEach((item) => {
		switch (item.name) {
			case CONSTRAINT_KEYS.workingHoursStart:
				values.workingHoursStart = toTimeString(item.value);
				break;
			case CONSTRAINT_KEYS.workingHoursEnd:
				values.workingHoursEnd = toTimeString(item.value);
				break;
			case CONSTRAINT_KEYS.lunchBreakStart:
				values.lunchBreakStart = toTimeString(item.value);
				break;
			case CONSTRAINT_KEYS.lunchBreakEnd:
				values.lunchBreakEnd = toTimeString(item.value);
				break;
			case CONSTRAINT_KEYS.maxStudentConsecutiveHours:
				values.maxStudentConsecutiveHours = item.value;
				break;
			case CONSTRAINT_KEYS.maxLecturerConsecutiveHours:
				values.maxLecturerConsecutiveHours = item.value;
				break;
			case CONSTRAINT_KEYS.workingDaysMask: {
				const decodedDays = decodeWorkingDays(item.value);
				values.workingDays = decodedDays.length > 0 ? decodedDays : DEFAULT_CONSTRAINT_FORM.workingDays;
				break;
			}
			default:
				break;
		}
	});

	return values;
};

const pickConstraintRowsForScope = (rows, selectedScope, selectedBatchId) => {
	if (selectedScope === "global") {
		return rows.filter((row) => row.batch_id === null);
	}

	const batchId = Number(selectedBatchId);
	const byName = new Map();

	rows.forEach((row) => {
		const existing = byName.get(row.name);
		const isBatchSpecific = row.batch_id === batchId;
		const isExistingBatchSpecific = existing?.batch_id === batchId;

		if (!existing) {
			byName.set(row.name, row);
			return;
		}

		if (isBatchSpecific && !isExistingBatchSpecific) {
			byName.set(row.name, row);
		}
	});

	return Array.from(byName.values());
};

export default function Settings() {
	const [activeTab, setActiveTab] = useState("global");
	const [scope, setScope] = useState("global");
	const [selectedYear, setSelectedYear] = useState("");
	const [batches, setBatches] = useState([]);
	const [constraintRows, setConstraintRows] = useState([]);
	const [constraintForm, setConstraintForm] = useState(DEFAULT_CONSTRAINT_FORM);
	const [settingsRows, setSettingsRows] = useState([]);
	const [lookupInput, setLookupInput] = useState({
		RESOURCE_TYPES: "",
		LOCATIONS: "",
		FACILITIES: "",
	});
	const [isLoadingConstraints, setIsLoadingConstraints] = useState(false);
	const [isLoadingLookups, setIsLoadingLookups] = useState(false);
	const [isSavingConstraints, setIsSavingConstraints] = useState(false);
	const [isSavingGlobal, setIsSavingGlobal] = useState(false);
	const [message, setMessage] = useState({ type: "", text: "" });
	const [globalSettingsForm, setGlobalSettingsForm] = useState({
		CURRENT_ACADEMIC_YEAR: "",
		ACTIVE_SEMESTER_CYCLE: "",
	});

	const lookupByCategory = useMemo(() => {
		return LOOKUP_CATEGORIES.reduce((acc, category) => {
			acc[category.key] = settingsRows.filter((item) => item.category === category.key);
			return acc;
		}, {});
	}, [settingsRows]);

	const availableYears = useMemo(() => {
		const years = new Set(batches.map(b => Math.ceil(b.current_semester / 2)).filter(y => !isNaN(y) && y > 0));
		return Array.from(years).sort((a, b) => a - b);
	}, [batches]);

	const targetBatches = useMemo(() => {
		if (scope === "year" && selectedYear) {
			return batches.filter(b => Math.ceil(b.current_semester / 2) === Number(selectedYear));
		}
		return [];
	}, [scope, selectedYear, batches]);

	useEffect(() => {
		const timer = setTimeout(() => {
			setMessage({ type: "", text: "" });
		}, 5000);
		return () => clearTimeout(timer);
	}, [message]);

	useEffect(() => {
		const academicYear = settingsRows.find(s => s.category === "CURRENT_ACADEMIC_YEAR")?.value || "";
		const semesterCycle = settingsRows.find(s => s.category === "ACTIVE_SEMESTER_CYCLE")?.value || "";
		setGlobalSettingsForm({
			CURRENT_ACADEMIC_YEAR: academicYear,
			ACTIVE_SEMESTER_CYCLE: semesterCycle
		});
	}, [settingsRows]);

	useEffect(() => {
		const loadBaseData = async () => {
			setIsLoadingLookups(true);
			try {
				const [batchResult, settingResult] = await Promise.allSettled([
					academicAPI.getBatches(),
					settingsAPI.getSystemSettings(),
				]);

				if (batchResult.status === "fulfilled") {
					setBatches(batchResult.value || []);
				} else {
					setBatches([]);
				}

				if (settingResult.status === "fulfilled") {
					setSettingsRows(settingResult.value || []);
				} else {
					setSettingsRows([]);
				}

				if (batchResult.status === "rejected" || settingResult.status === "rejected") {
					const primaryError =
						batchResult.status === "rejected" ? batchResult.reason : settingResult.reason;
					setMessage({
						type: "error",
						text: getErrorMessage(primaryError, "Failed to fully load settings data."),
					});
				}
			} finally {
				setIsLoadingLookups(false);
			}
		};

		loadBaseData();
	}, []);

	useEffect(() => {
		const loadConstraintData = async () => {
			if (scope === "year" && !selectedYear) {
				setConstraintRows([]);
				setConstraintForm(DEFAULT_CONSTRAINT_FORM);
				return;
			}

			setIsLoadingConstraints(true);
			try {
				let representativeBatchId = null;
				if (scope === "year" && targetBatches.length > 0) {
					representativeBatchId = targetBatches[0].batch_id;
				}

				const payload =
					scope === "year"
						? { scope: "all", batchId: representativeBatchId }
						: { scope: "global" };
				const rows = await settingsAPI.getSystemConstraints(payload);
				setConstraintRows(rows || []);

				const formRows = pickConstraintRowsForScope(rows || [], scope, representativeBatchId);
				setConstraintForm(formFromConstraints(formRows));
			} catch (error) {
				setMessage({
					type: "error",
					text: getErrorMessage(error, "Failed to load timetable constraints."),
				});
			} finally {
				setIsLoadingConstraints(false);
			}
		};

		loadConstraintData();
	}, [scope, selectedYear, targetBatches]);

	const toggleWorkingDay = (dayValue) => {
		setConstraintForm((prev) => {
			const alreadySelected = prev.workingDays.includes(dayValue);
			if (alreadySelected) {
				return {
					...prev,
					workingDays: prev.workingDays.filter((value) => value !== dayValue),
				};
			}
			return {
				...prev,
				workingDays: [...prev.workingDays, dayValue],
			};
		});
	};

	const handleConstraintInput = (field, value) => {
		setConstraintForm((prev) => ({ ...prev, [field]: value }));
	};

	const buildConstraintValueMap = () => ({
		[CONSTRAINT_KEYS.workingHoursStart]: toMinutes(constraintForm.workingHoursStart),
		[CONSTRAINT_KEYS.workingHoursEnd]: toMinutes(constraintForm.workingHoursEnd),
		[CONSTRAINT_KEYS.lunchBreakStart]: toMinutes(constraintForm.lunchBreakStart),
		[CONSTRAINT_KEYS.lunchBreakEnd]: toMinutes(constraintForm.lunchBreakEnd),
		[CONSTRAINT_KEYS.maxStudentConsecutiveHours]: Number(constraintForm.maxStudentConsecutiveHours) || 0,
		[CONSTRAINT_KEYS.maxLecturerConsecutiveHours]: Number(constraintForm.maxLecturerConsecutiveHours) || 0,
		[CONSTRAINT_KEYS.workingDaysMask]: encodeWorkingDays(constraintForm.workingDays),
	});

	const saveConstraints = async () => {
		if (scope === "year" && !selectedYear) {
			setMessage({ type: "error", text: "Select a year before saving year-specific constraints." });
			return;
		}

		if (scope === "year" && targetBatches.length === 0) {
			setMessage({ type: "error", text: "No batches found for the selected year." });
			return;
		}

		if (constraintForm.workingDays.length === 0) {
			setMessage({ type: "error", text: "Select at least one working day." });
			return;
		}

		const workingStart = toMinutes(constraintForm.workingHoursStart);
		const workingEnd = toMinutes(constraintForm.workingHoursEnd);
		const lunchStart = toMinutes(constraintForm.lunchBreakStart);
		const lunchEnd = toMinutes(constraintForm.lunchBreakEnd);

		if (workingStart >= workingEnd) {
			setMessage({ type: "error", text: "Working hours start must be before end." });
			return;
		}

		if (lunchStart >= lunchEnd) {
			setMessage({ type: "error", text: "Lunch break start must be before end." });
			return;
		}

		const batchIdsToUpdate = scope === "year" ? targetBatches.map(b => b.batch_id) : [null];

		setIsSavingConstraints(true);
		try {
			const values = buildConstraintValueMap();
			const allConstraints = await settingsAPI.getSystemConstraints({ scope: "all" });

			const updates = [];

			for (const targetBatchId of batchIdsToUpdate) {
				const scopedRows = allConstraints.filter((row) => {
					if (targetBatchId === null) return row.batch_id === null;
					return row.batch_id === targetBatchId;
				});

				Object.entries(values).forEach(([name, value]) => {
					const existing = scopedRows.find((row) => row.name === name);
					const payload = {
						name,
						value,
						type: "HARD",
						batch_id: targetBatchId,
					};

					if (existing) {
						updates.push(settingsAPI.updateSystemConstraint(existing.constraint_id, payload));
					} else {
						updates.push(settingsAPI.createSystemConstraint(payload));
					}
				});
			}

			await Promise.all(updates);

			let representativeBatchId = null;
			if (scope === "year" && targetBatches.length > 0) {
				representativeBatchId = targetBatches[0].batch_id;
			}
			const refreshed = await settingsAPI.getSystemConstraints(
				scope === "year" ? { scope: "all", batchId: representativeBatchId } : { scope: "global" }
			);
			setConstraintRows(refreshed || []);
			const formRows = pickConstraintRowsForScope(refreshed || [], scope, representativeBatchId);
			setConstraintForm(formFromConstraints(formRows));
			setMessage({ type: "success", text: "Timetable constraints saved successfully." });
		} catch (error) {
			setMessage({
				type: "error",
				text: getErrorMessage(error, "Failed to save timetable constraints."),
			});
		} finally {
			setIsSavingConstraints(false);
		}
	};

	const saveGlobalSettings = async () => {
		setIsSavingGlobal(true);
		try {
			const academicYearSetting = settingsRows.find(s => s.category === "CURRENT_ACADEMIC_YEAR");
			const semesterCycleSetting = settingsRows.find(s => s.category === "ACTIVE_SEMESTER_CYCLE");

			const promises = [];
			if (academicYearSetting) {
				promises.push(settingsAPI.updateSystemSetting(academicYearSetting.id, { value: globalSettingsForm.CURRENT_ACADEMIC_YEAR }));
			} else if (globalSettingsForm.CURRENT_ACADEMIC_YEAR) {
				promises.push(settingsAPI.createSystemSetting({ category: "CURRENT_ACADEMIC_YEAR", value: globalSettingsForm.CURRENT_ACADEMIC_YEAR }));
			}

			if (semesterCycleSetting) {
				promises.push(settingsAPI.updateSystemSetting(semesterCycleSetting.id, { value: globalSettingsForm.ACTIVE_SEMESTER_CYCLE }));
			} else if (globalSettingsForm.ACTIVE_SEMESTER_CYCLE) {
				promises.push(settingsAPI.createSystemSetting({ category: "ACTIVE_SEMESTER_CYCLE", value: globalSettingsForm.ACTIVE_SEMESTER_CYCLE }));
			}

			await Promise.all(promises);
			const refreshed = await settingsAPI.getSystemSettings();
			setSettingsRows(refreshed || []);
			setMessage({ type: "success", text: "Global academic settings saved successfully." });
		} catch (error) {
			setMessage({
				type: "error",
				text: getErrorMessage(error, "Failed to save global academic settings."),
			});
		} finally {
			setIsSavingGlobal(false);
		}
	};

	const addLookupValue = async (category) => {
		const inputValue = (lookupInput[category] || "").trim();
		if (!inputValue) {
			return;
		}

		try {
			await settingsAPI.createSystemSetting({ category, value: inputValue });
			const refreshed = await settingsAPI.getSystemSettings();
			setSettingsRows(refreshed || []);
			setLookupInput((prev) => ({ ...prev, [category]: "" }));
			setMessage({ type: "success", text: `${inputValue} added to ${category}.` });
		} catch (error) {
			setMessage({
				type: "error",
				text: getErrorMessage(error, `Failed to add ${category} value.`),
			});
		}
	};

	const deleteLookupValue = async (settingId) => {
		try {
			await settingsAPI.deleteSystemSetting(settingId);
			setSettingsRows((prev) => prev.filter((item) => item.id !== settingId));
			setMessage({ type: "success", text: "Lookup value deleted." });
		} catch (error) {
			setMessage({
				type: "error",
				text: getErrorMessage(error, "Failed to delete lookup value."),
			});
		}
	};

	return (
		<AdminLayout>
			<h1 className="text-2xl font-semibold mb-6">Settings and Constraints</h1>

			<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
				<div className="flex flex-wrap gap-3 mb-6">
					<button
						type="button"
						onClick={() => setActiveTab("global")}
						className={`px-4 py-2 rounded-md text-sm font-medium transition ${
							activeTab === "global"
								? "bg-blue-600 text-white"
								: "bg-slate-100 text-slate-700 hover:bg-slate-200"
						}`}
					>
						Global Academic Settings
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("constraints")}
						className={`px-4 py-2 rounded-md text-sm font-medium transition ${
							activeTab === "constraints"
								? "bg-blue-600 text-white"
								: "bg-slate-100 text-slate-700 hover:bg-slate-200"
						}`}
					>
						Timetable Constraints
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("lookups")}
						className={`px-4 py-2 rounded-md text-sm font-medium transition ${
							activeTab === "lookups"
								? "bg-blue-600 text-white"
								: "bg-slate-100 text-slate-700 hover:bg-slate-200"
						}`}
					>
						System Dropdowns
					</button>
				</div>

				{message.text && (
					<div
						className={`mb-6 rounded-md px-4 py-3 text-sm ${
							message.type === "error"
								? "bg-red-50 text-red-700 border border-red-200"
								: "bg-emerald-50 text-emerald-700 border border-emerald-200"
						}`}
					>
						{message.text}
					</div>
				)}

				{activeTab === "global" && (
					<div className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<label className="block text-sm text-slate-700">
								<span className="mb-1 block">Current Academic Year</span>
								<input
									type="text"
									placeholder="e.g. 2025/2026"
									value={globalSettingsForm.CURRENT_ACADEMIC_YEAR}
									onChange={(event) => setGlobalSettingsForm((prev) => ({ ...prev, CURRENT_ACADEMIC_YEAR: event.target.value }))}
									className="w-full border border-slate-300 rounded-md px-3 py-2"
								/>
							</label>

							<label className="block text-sm text-slate-700">
								<span className="mb-1 block">Active Semester Cycle</span>
								<select
									value={globalSettingsForm.ACTIVE_SEMESTER_CYCLE}
									onChange={(event) => setGlobalSettingsForm((prev) => ({ ...prev, ACTIVE_SEMESTER_CYCLE: event.target.value }))}
									className="w-full border border-slate-300 rounded-md px-3 py-2"
								>
									<option value="">Select Cycle</option>
									<option value="Semester 1">Semester 1</option>
									<option value="Semester 2">Semester 2</option>
								</select>
							</label>
						</div>
						<div>
							<button
								type="button"
								onClick={saveGlobalSettings}
								disabled={isSavingGlobal}
								className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-2 rounded-md text-sm font-medium"
							>
								{isSavingGlobal ? "Saving..." : "Save Settings"}
							</button>
						</div>
					</div>
				)}

				{activeTab === "constraints" && (
					<div className="space-y-6">
						<div className="flex flex-wrap items-center gap-4">
							<label className="text-sm font-medium text-slate-700">Apply constraints for:</label>
							<label className="inline-flex items-center gap-2 text-sm text-slate-700">
								<input
									type="radio"
									name="scope"
									value="global"
									checked={scope === "global"}
									onChange={() => setScope("global")}
								/>
								Global
							</label>
							<label className="inline-flex items-center gap-2 text-sm text-slate-700">
								<input
									type="radio"
									name="scope"
									value="year"
									checked={scope === "year"}
									onChange={() => setScope("year")}
								/>
								Year-specific
							</label>

							{scope === "year" && (
								<select
									value={selectedYear}
									onChange={(event) => setSelectedYear(event.target.value)}
									className="ml-0 sm:ml-2 border border-slate-300 rounded-md px-3 py-2 text-sm"
								>
									<option value="">Select Year</option>
									{availableYears.map((year) => (
										<option key={year} value={year}>
											Year {year}
										</option>
									))}
								</select>
							)}
						</div>

						{isLoadingConstraints ? (
							<div className="text-sm text-slate-500">Loading constraints...</div>
						) : (
							<>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<label className="block text-sm text-slate-700">
										<span className="mb-1 block">Working Hours Start</span>
										<input
											type="time"
											value={constraintForm.workingHoursStart}
											onChange={(event) => handleConstraintInput("workingHoursStart", event.target.value)}
											className="w-full border border-slate-300 rounded-md px-3 py-2"
										/>
									</label>

									<label className="block text-sm text-slate-700">
										<span className="mb-1 block">Working Hours End</span>
										<input
											type="time"
											value={constraintForm.workingHoursEnd}
											onChange={(event) => handleConstraintInput("workingHoursEnd", event.target.value)}
											className="w-full border border-slate-300 rounded-md px-3 py-2"
										/>
									</label>

									<label className="block text-sm text-slate-700">
										<span className="mb-1 block">Lunch Break Start</span>
										<input
											type="time"
											value={constraintForm.lunchBreakStart}
											onChange={(event) => handleConstraintInput("lunchBreakStart", event.target.value)}
											className="w-full border border-slate-300 rounded-md px-3 py-2"
										/>
									</label>

									<label className="block text-sm text-slate-700">
										<span className="mb-1 block">Lunch Break End</span>
										<input
											type="time"
											value={constraintForm.lunchBreakEnd}
											onChange={(event) => handleConstraintInput("lunchBreakEnd", event.target.value)}
											className="w-full border border-slate-300 rounded-md px-3 py-2"
										/>
									</label>

									<label className="block text-sm text-slate-700">
										<span className="mb-1 block">Max Consecutive Hours (Students)</span>
										<input
											type="number"
											min="1"
											value={constraintForm.maxStudentConsecutiveHours}
											onChange={(event) =>
												handleConstraintInput("maxStudentConsecutiveHours", event.target.value)
											}
											className="w-full border border-slate-300 rounded-md px-3 py-2"
										/>
									</label>

									<label className="block text-sm text-slate-700">
										<span className="mb-1 block">Max Consecutive Hours (Lecturers)</span>
										<input
											type="number"
											min="1"
											value={constraintForm.maxLecturerConsecutiveHours}
											onChange={(event) =>
												handleConstraintInput("maxLecturerConsecutiveHours", event.target.value)
											}
											className="w-full border border-slate-300 rounded-md px-3 py-2"
										/>
									</label>
								</div>

								<div>
									<p className="text-sm font-medium text-slate-700 mb-2">Working Days</p>
									<div className="flex flex-wrap gap-2">
										{DAY_OPTIONS.map((day) => {
											const selected = constraintForm.workingDays.includes(day.value);
											return (
												<button
													key={day.value}
													type="button"
													onClick={() => toggleWorkingDay(day.value)}
													className={`px-3 py-1.5 text-sm rounded-md border transition ${
														selected
															? "bg-blue-600 text-white border-blue-600"
															: "bg-white text-slate-700 border-slate-300 hover:border-blue-400"
													}`}
												>
													{day.label}
												</button>
											);
										})}
									</div>
								</div>

								<div>
									<button
										type="button"
										onClick={saveConstraints}
										disabled={isSavingConstraints}
										className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-2 rounded-md text-sm font-medium"
									>
										{isSavingConstraints ? "Saving..." : "Save Constraints"}
									</button>
								</div>
							</>
						)}
					</div>
				)}

				{activeTab === "lookups" && (
					<div className="space-y-6">
						{isLoadingLookups ? (
							<div className="text-sm text-slate-500">Loading dropdown values...</div>
						) : (
							LOOKUP_CATEGORIES.map((category) => {
								const rows = lookupByCategory[category.key] || [];
								return (
									<div
										key={category.key}
										className="border border-slate-200 rounded-md p-4 bg-slate-50"
									>
										<h3 className="text-base font-semibold text-slate-800 mb-3">{category.label}</h3>

										<div className="flex flex-wrap gap-2 mb-4">
											{rows.length === 0 && (
												<span className="text-sm text-slate-500">No values added yet.</span>
											)}

											{rows.map((row) => (
												<span
													key={row.id}
													className="inline-flex items-center gap-2 bg-white border border-slate-300 rounded-full px-3 py-1 text-sm text-slate-700"
												>
													{row.value}
													<button
														type="button"
														className="text-red-600 hover:text-red-700 font-semibold"
														onClick={() => deleteLookupValue(row.id)}
														aria-label={`Delete ${row.value}`}
													>
														x
													</button>
												</span>
											))}
										</div>

										<div className="flex gap-2">
											<input
												type="text"
												value={lookupInput[category.key]}
												placeholder={category.placeholder}
												onChange={(event) =>
													setLookupInput((prev) => ({
														...prev,
														[category.key]: event.target.value,
													}))
												}
												className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm"
											/>
											<button
												type="button"
												onClick={() => addLookupValue(category.key)}
												className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm"
											>
												Add
											</button>
										</div>
									</div>
								);
							})
						)}
					</div>
				)}

				<AboutSystemCard />
			</div>
		</AdminLayout>
	);
}