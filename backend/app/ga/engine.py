"""
GA Engine using DEAP
====================
Implements a Genetic Algorithm to generate conflict-free university timetables.

Gene    = (task_index, day, timeslot_index, resource_id)
Individual = list of Genes, one per session task slot
            (if a module needs 3 hrs/week → 3 genes for that task)
"""
from __future__ import annotations

import math
import random
from typing import Any, Dict, List, Optional, Tuple

from deap import base, creator, tools, algorithms

from app.ga.data_loader import (
    DAYS, BatchInfo, LecturerInfo, ResourceInfo,
    SchedulingContext, SessionTask,
)

# ─── Gene & Individual type ───────────────────────────────────────────────────
# Gene tuple: (task_index: int, day_index: int, slot_index: int, resource_id: int)
# Individual: list[Gene]

# DEAP creator (only create once)
if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMin)


# ─── Helper ──────────────────────────────────────────────────────────────────

def _minutes_to_time_str(m: int) -> str:
    h, mn = divmod(m, 60)
    return f"{h:02d}:{mn:02d}"


def _overlaps(s1: int, e1: int, s2: int, e2: int) -> bool:
    return s1 < e2 and e1 > s2


# ─── Valid Slots Helper ──────────────────────────────────────────────────────

def _get_valid_start_indices(task: SessionTask, ctx: SchedulingContext) -> List[int]:
    """Find slot indices where the task can start and fit its full duration
    without crossing the lunch break or working hours."""
    valid = []
    duration = task.hours_per_week * 60
    
    batch_info = ctx.batches.get(task.batch_id)
    c = batch_info.constraints if batch_info and batch_info.constraints else ctx.global_constraints
    
    lunch_s = c.lunch_start
    lunch_e = c.lunch_end
    work_s = c.working_start
    work_e = c.working_end

    for idx, (s, e) in enumerate(ctx.timeslots):
        end_time = s + duration
        if s < work_s or end_time > work_e:
            continue
        if s < lunch_e and end_time > lunch_s:
            continue
        valid.append(idx)
        
    return valid if valid else list(range(len(ctx.timeslots)))


# ─── Individual creation ─────────────────────────────────────────────────────

def _create_gene(
    task_index: int,
    task: SessionTask,
    ctx: SchedulingContext,
    rng: random.Random,
) -> Tuple[int, int, int, int]:
    """Create one random gene for the given task."""
    day_idx = rng.randint(0, len(DAYS) - 1)
    
    valid_slots = _get_valid_start_indices(task, ctx)
    slot_idx = rng.choice(valid_slots)
    
    # Filter resources by type; fall back to any resource if none match
    compatible = [
        r for r in ctx.resources
        if r.type.lower() == task.required_resource_type.lower()
    ] or ctx.resources
    resource = rng.choice(compatible)
    return (task_index, day_idx, slot_idx, resource.resource_id)


def _make_individual(
    tasks: List[SessionTask],
    ctx: SchedulingContext,
    rng: random.Random,
) -> List[Tuple]:
    ind = creator.Individual()
    for i, task in enumerate(tasks):
        ind.append(_create_gene(i, task, ctx, rng))
    return ind


# ─── Fitness function ─────────────────────────────────────────────────────────

def evaluate(
    individual: List[Tuple],
    tasks: List[SessionTask],
    ctx: SchedulingContext,
) -> Tuple[float]:
    """
    Returns a penalty score (lower = better, 0 = perfect).

    Hard constraint penalties (×100):
    H1 - Room double-booking
    H2 - Lecturer double-booking
    H3 - Room capacity < batch student count
    H4 - Room type mismatch
    H5 - Slot falls in lecturer's unavailability
    H6 - Slot overlaps global lunch break or exceeds working hours
    H7 - Back-to-back sessions in different locations

    Soft constraint penalties (×1):
    S1 - Consecutive hours exceed max for students
    S2 - Consecutive hours exceed max for lecturers
    """
    HARD = 100
    SOFT = 1

    penalties = 0.0

    # scheduled[i] = (batch_id, lecturer_id, resource_id, day, slot_start, slot_end, building)
    scheduled = []
    resource_map: Dict[int, ResourceInfo] = {r.resource_id: r for r in ctx.resources}

    gc = ctx.global_constraints

    for i, gene in enumerate(individual):
        task_idx, day_idx, slot_idx, resource_id = gene
        task = tasks[task_idx]
        day = DAYS[day_idx]
        
        slot_start = ctx.timeslots[slot_idx][0]
        duration = task.hours_per_week * 60
        slot_end = slot_start + duration
        
        batch_info = ctx.batches.get(task.batch_id)
        lec_info = ctx.lecturers.get(task.lecturer_user_id)
        res_info = resource_map.get(resource_id)

        if not batch_info or not lec_info or not res_info:
            penalties += HARD * 5
            scheduled.append(None)
            continue

        scheduled.append((
            task.batch_id,
            task.lecturer_user_id,
            resource_id,
            day,
            slot_start,
            slot_end,
            res_info.building
        ))

        # H3 – Room capacity
        if res_info.capacity < batch_info.student_count:
            penalties += HARD

        # H4 – Room type
        if res_info.type.lower() != task.required_resource_type.lower():
            penalties += HARD

        # H5 – Lecturer unavailability
        for (uday, ustart, uend) in lec_info.unavailable_slots:
            if uday == day and _overlaps(slot_start, slot_end, ustart, uend):
                penalties += HARD
                break

        # H6 – Lunch break / Working hours
        c = batch_info.constraints if batch_info and batch_info.constraints else gc
        if slot_start < c.working_start or slot_end > c.working_end:
            penalties += HARD
        if _overlaps(slot_start, slot_end, c.lunch_start, c.lunch_end):
            penalties += HARD

    # H1 & H2 – Double-booking checks
    for i in range(len(scheduled)):
        if scheduled[i] is None:
            continue
        bi, li, ri, di, ss, se, bldg_i = scheduled[i]
        for j in range(i + 1, len(scheduled)):
            if scheduled[j] is None:
                continue
            bj, lj, rj, dj, sss, see, bldg_j = scheduled[j]
            if di != dj:
                continue
            if not _overlaps(ss, se, sss, see):
                continue
            # H1 – Same room at the same time
            if ri == rj:
                penalties += HARD
            # H2 – Same lecturer at the same time
            if li == lj:
                penalties += HARD
            # Same batch at same time (implicit hard)
            if bi == bj:
                penalties += HARD

    # Group by batch (students) and lecturer for consecutive / location checks
    batch_day_slots: Dict[int, Dict[str, List]] = {}
    lec_day_slots: Dict[int, Dict[str, List]] = {}

    for item in scheduled:
        if item is None:
            continue
        bi, li, ri, di, ss, se, bldg = item
        batch_day_slots.setdefault(bi, {}).setdefault(di, []).append((ss, se, bldg))
        lec_day_slots.setdefault(li, {}).setdefault(di, []).append((ss, se, bldg))

    def _consecutive_and_location_penalty(sessions_by_day: Dict[str, List[Tuple[int, int, str]]], limit: int) -> float:
        p = 0.0
        for day, slots in sessions_by_day.items():
            slots_sorted = sorted(slots, key=lambda x: x[0])
            consec = 0
            for k in range(len(slots_sorted)):
                duration_hrs = (slots_sorted[k][1] - slots_sorted[k][0]) // 60
                
                if k > 0 and slots_sorted[k][0] == slots_sorted[k - 1][1]:  # back-to-back
                    consec += duration_hrs
                    # H7 - Different building location back-to-back
                    if slots_sorted[k][2] and slots_sorted[k-1][2] and slots_sorted[k][2] != slots_sorted[k-1][2]:
                        p += HARD
                else:
                    consec = duration_hrs
                    
                if consec > limit:
                    p += SOFT * (consec - limit)
        return p

    for batch_id, days in batch_day_slots.items():
        b_info = ctx.batches.get(batch_id)
        c = b_info.constraints if b_info and b_info.constraints else gc
        penalties += _consecutive_and_location_penalty(days, c.max_consecutive_students)

    for lec_uid, days in lec_day_slots.items():
        penalties += _consecutive_and_location_penalty(days, gc.max_consecutive_lecturers)

    return (penalties,)


# ─── Mutation ────────────────────────────────────────────────────────────────

def _mutate_gene(
    gene: Tuple,
    task: SessionTask,
    ctx: SchedulingContext,
    rng: random.Random,
    indpb: float = 0.3,
) -> Tuple:
    task_idx, day_idx, slot_idx, resource_id = gene
    if rng.random() < indpb:
        day_idx = rng.randint(0, len(DAYS) - 1)
    if rng.random() < indpb:
        valid_slots = _get_valid_start_indices(task, ctx)
        slot_idx = rng.choice(valid_slots)
    if rng.random() < indpb:
        compatible = [
            r for r in ctx.resources
            if r.type.lower() == task.required_resource_type.lower()
        ] or ctx.resources
        resource_id = rng.choice(compatible).resource_id
    return (task_idx, day_idx, slot_idx, resource_id)


def mutate_individual(
    individual: List[Tuple],
    tasks: List[SessionTask],
    ctx: SchedulingContext,
    rng: random.Random,
    indpb: float = 0.2,
) -> Tuple[List[Tuple]]:
    for i in range(len(individual)):
        if rng.random() < indpb:
            individual[i] = _mutate_gene(
                individual[i], tasks[individual[i][0]], ctx, rng
            )
    return (individual,)


# ─── Main GA runner ──────────────────────────────────────────────────────────

def run_ga(
    ctx: SchedulingContext,
    population_size: int = 200,
    generations: int = 300,
    cx_prob: float = 0.7,
    mut_prob: float = 0.3,
    seed: Optional[int] = 42,
) -> Dict:
    """
    Run the genetic algorithm and return a structured timetable dict.
    """
    rng = random.Random(seed)
    tasks = ctx.tasks

    if not tasks:
        raise ValueError("No session tasks to schedule. Check data aggregation.")

    if not ctx.timeslots:
        raise ValueError("No valid timeslots generated. Check working_hours constraints.")

    toolbox = base.Toolbox()
    toolbox.register(
        "individual",
        _make_individual,
        tasks=tasks,
        ctx=ctx,
        rng=rng,
    )
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)
    toolbox.register("evaluate", evaluate, tasks=tasks, ctx=ctx)
    toolbox.register("mate", tools.cxTwoPoint)
    toolbox.register(
        "mutate",
        mutate_individual,
        tasks=tasks,
        ctx=ctx,
        rng=rng,
        indpb=0.25,
    )
    toolbox.register("select", tools.selTournament, tournsize=5)

    population = toolbox.population(n=population_size)

    # Stats
    stats = tools.Statistics(lambda ind: ind.fitness.values)
    stats.register("min", min)
    stats.register("avg", lambda vals: sum(v[0] for v in vals) / len(vals))

    hof = tools.HallOfFame(1)

    population, logbook = algorithms.eaSimple(
        population,
        toolbox,
        cxpb=cx_prob,
        mutpb=mut_prob,
        ngen=generations,
        stats=stats,
        halloffame=hof,
        verbose=False,
    )

    best_individual = hof[0]
    best_fitness = best_individual.fitness.values[0]

    # Decode best individual → structured output
    timetable = _decode_individual(best_individual, tasks, ctx)

    # Build evolution log (every 10 gens)
    evolution_log = []
    for record in logbook:
        if record["gen"] % 10 == 0:
            evolution_log.append({
                "generation": record["gen"],
                "min_penalty": record["min"][0] if isinstance(record["min"], tuple) else record["min"],
                "avg_penalty": round(record["avg"], 2),
            })

    return {
        "status": "success",
        "best_penalty": best_fitness,
        "conflict_free": best_fitness == 0,
        "total_sessions": len(timetable),
        "evolution_log": evolution_log,
        "timetable": timetable,
        "metadata": {
            "generations": generations,
            "population_size": population_size,
            "active_semester": ctx.active_semester_name,
            "batches_scheduled": len(ctx.batches),
            "total_tasks": len(tasks),
        }
    }


def _decode_individual(
    individual: List[Tuple],
    tasks: List[SessionTask],
    ctx: SchedulingContext,
) -> List[Dict]:
    """Convert the best individual genes into human-readable session dicts."""
    resource_map = {r.resource_id: r for r in ctx.resources}
    sessions = []

    for gene in individual:
        task_idx, day_idx, slot_idx, resource_id = gene
        task = tasks[task_idx]
        day = DAYS[day_idx]
        
        slot_start = ctx.timeslots[slot_idx][0]
        duration = task.hours_per_week * 60
        slot_end = slot_start + duration
        
        batch = ctx.batches.get(task.batch_id)
        module = ctx.modules.get(task.module_id)
        lecturer = ctx.lecturers.get(task.lecturer_user_id)
        resource = resource_map.get(resource_id)

        # We will split the contiguous block into 1-hour chunks for the frontend to render easily
        for t in range(slot_start, slot_end, 60):
            sessions.append({
                "batch_id": task.batch_id,
                "batch_code": batch.batch_code if batch else "N/A",
                "student_count": batch.student_count if batch else 0,
                "module_id": task.module_id,
                "module_name": module.name if module else "N/A",
                "module_code": module.code if module else "N/A",
                "lecturer_id": task.lecturer_id,
                "lecturer_name": lecturer.name if lecturer else "N/A",
                "lecturer_staff_id": lecturer.staff_id if lecturer else "N/A",
                "resource_id": resource_id,
                "room_name": resource.name if resource else "N/A",
                "room_type": resource.type if resource else "N/A",
                "room_capacity": resource.capacity if resource else 0,
                "building": resource.building if resource else "N/A",
                "day": day,
                "start_time": _minutes_to_time_str(t),
                "end_time": _minutes_to_time_str(t + 60),
                "is_contiguous": task.hours_per_week > 1,
                "duration_hours": task.hours_per_week
            })

    return sessions
