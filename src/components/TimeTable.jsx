import { useMemo, useState } from "react";
import html2pdf from "html2pdf.js";
import { generateTimetable } from "../services/api";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const palette = [
  "bg-sky-100 text-sky-950",
  "bg-emerald-100 text-emerald-950",
  "bg-amber-100 text-amber-950",
  "bg-rose-100 text-rose-950",
  "bg-violet-100 text-violet-950",
];

// Department configurations for multi-department scheduling
const DEPARTMENT_CONFIG = {
  engineering: { name: "Engineering", color: "blue", prefix: "EN" },
  pharmacy: { name: "Pharmacy", color: "green", prefix: "PH" },
  management: { name: "Management", color: "purple", prefix: "MG" },
};

const BRANCH_OPTIONS = Object.entries(DEPARTMENT_CONFIG).map(([value, config]) => [value, config.name]);

const makePeriod = (i, s, e, label = `Period ${i + 1}`) => ({
  id: crypto.randomUUID(),
  label,
  startTime: s,
  endTime: e,
});

const makeTeacher = (name, dept, email, department = "engineering") => ({
  id: crypto.randomUUID(),
  name,
  department: dept,
  email,
  branch: department,
});

const makeRoom = (name, building, capacity, department = "engineering") => ({
  id: crypto.randomUUID(),
  name,
  building,
  capacity,
  branch: department,
});

const makeGroup = (name, program, year, section, size, department = "engineering") => ({
  id: crypto.randomUUID(),
  name,
  program,
  year,
  section,
  size,
  branch: department,
});

const makeCourse = (code, title, teacherId, roomId, weeklySessions, groupId, mode, department = "engineering") => ({
  id: crypto.randomUUID(),
  code,
  title,
  teacherId,
  roomId,
  weeklySessions,
  groupId,
  deliveryMode: mode,
  branch: department,
});

const blank = {
  institutionName: "",
  campusName: "",
  facultyName: "",
  departmentName: "",
  programName: "",
  termName: "",
  cohortName: "",
  section: "",
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  periods: [makePeriod(0, "09:00", "10:00"), makePeriod(1, "10:00", "11:00"), makePeriod(2, "11:15", "12:15")],
  teachers: [makeTeacher("", "", "", "engineering")],
  rooms: [makeRoom("", "", 60, "engineering")],
  groups: [makeGroup("", "", "", "", 60, "engineering")],
  courses: [makeCourse("", "", "", "", 1, "", "Lecture", "engineering")],
  constraints: "",
};

const standardWeek = [
  makePeriod(0, "08:30", "09:30"),
  makePeriod(1, "09:30", "10:30"),
  makePeriod(2, "10:45", "11:45"),
  makePeriod(3, "11:45", "12:45"),
  makePeriod(4, "13:45", "14:45"),
  makePeriod(5, "14:45", "15:45"),
];

function TimeTable({ onBack }) {
  const [form, setForm] = useState(blank);
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeGroup, setActiveGroup] = useState("");

  const teacherMap = useMemo(
    () => Object.fromEntries(form.teachers.map((teacher) => [teacher.id, teacher])),
    [form.teachers]
  );
  const roomMap = useMemo(
    () => Object.fromEntries(form.rooms.map((room) => [room.id, room])),
    [form.rooms]
  );
  const groupMap = useMemo(
    () => Object.fromEntries(form.groups.map((group) => [group.id, group])),
    [form.groups]
  );
  const labels = useMemo(
    () => form.periods.map((period, i) => period.label?.trim() || `Period ${i + 1}`),
    [form.periods]
  );
  const grid = useMemo(() => {
    const next = {};
    timetable.forEach((item) => {
      const groupKey = item.group || "Default";
      if (!next[groupKey]) next[groupKey] = {};
      if (!next[groupKey][item.day]) next[groupKey][item.day] = {};
      next[groupKey][item.day][item.time] = item;
    });
    return next;
  }, [timetable]);
  const colors = useMemo(() => {
    const names = Array.from(new Set(timetable.map((item) => item.subject).filter(Boolean)));
    return names.reduce((acc, name, i) => {
      acc[name] = palette[i % palette.length];
      return acc;
    }, {});
  }, [timetable]);

  const courses = useMemo(
    () =>
      form.courses.map((course) => ({
        ...course,
        teacher: teacherMap[course.teacherId],
        room: roomMap[course.roomId],
        group: groupMap[course.groupId],
      })),
    [form.courses, teacherMap, roomMap, groupMap]
  );

  const generatedGroups = useMemo(() => {
    const responseGroups = Array.from(new Set(timetable.map((item) => item.group).filter(Boolean)));
    return responseGroups;
  }, [timetable]);
  const readiness = useMemo(
    () => ({
      unnamedTeachers: form.teachers.filter((teacher) => !teacher.name.trim()).length,
      teachersWithoutBranch: form.teachers.filter((teacher) => !(teacher.branch || "").trim()).length,
      incompleteRooms: form.rooms.filter((room) => !room.name.trim() || !room.building.trim()).length,
      incompleteGroups: form.groups.filter((group) => !group.name.trim() || !group.program.trim()).length,
      groupsWithoutBranch: form.groups.filter((group) => !(group.branch || "").trim()).length,
      unassignedCourses: courses.filter(
        (course) => !course.teacher?.name || !course.room?.name || !course.group?.name
      ).length,
    }),
    [courses, form.groups, form.rooms, form.teachers]
  );

  const plannerMetrics = useMemo(
    () => [
      { label: "Payload days", value: form.workingDays.length },
      { label: "Periods", value: form.periods.length },
      { label: "Subjects", value: form.courses.length },
      { label: "Groups", value: form.groups.length },
      { label: "Teachers", value: form.teachers.length },
      { label: "Rooms", value: form.rooms.length },
    ],
    [form.courses.length, form.groups.length, form.periods.length, form.rooms.length, form.teachers.length, form.workingDays.length]
  );

  const totalRequested = form.courses.reduce((sum, course) => sum + (Number(course.weeklySessions) || 0), 0);
  const totalAvailable = form.workingDays.length * form.periods.length;
  const totalNetworkCapacity = totalAvailable * Math.max(form.groups.length, 1);
  const groupLoads = useMemo(() => {
    return form.courses.reduce((acc, course) => {
      const key = course.groupId || "__unassigned__";
      acc[key] = (acc[key] || 0) + (Number(course.weeklySessions) || 0);
      return acc;
    }, {});
  }, [form.courses]);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const resetTo = (next) => {
    setForm(structuredClone(next));
    setTimetable([]);
    setError("");
    setActiveGroup("");
  };
  const updateList = (key, id, field, value) => {
    setForm((current) => ({
      ...current,
      [key]: current[key].map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };
  const addItem = (key, item) => setForm((current) => ({ ...current, [key]: [...current[key], item] }));
  const duplicateItem = (key, id, factory) => {
    setForm((current) => {
      const source = current[key].find((item) => item.id === id);
      if (!source) return current;
      const clone = factory(source);
      const nextItems = [];
      current[key].forEach((item) => {
        nextItems.push(item);
        if (item.id === id) nextItems.push(clone);
      });
      return { ...current, [key]: nextItems };
    });
  };
  const loadStandardSchedule = () =>
    setForm((current) => ({
      ...current,
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      periods: structuredClone(standardWeek),
    }));
  const clearGenerated = () => {
    setTimetable([]);
    setActiveGroup("");
    setError("");
  };
  const addSmartCourse = () =>
    addItem(
      "courses",
      makeCourse(
        "",
        "",
        form.teachers[0]?.id || "",
        form.rooms[0]?.id || "",
        1,
        form.groups[0]?.id || "",
        "Lecture",
        "engineering"
      )
    );

  const removeItem = (key, id) => {
    setForm((current) => {
      if (current[key].length === 1) return current;
      const next = { ...current, [key]: current[key].filter((item) => item.id !== id) };
      if (key === "teachers") next.courses = next.courses.map((course) => (course.teacherId === id ? { ...course, teacherId: "" } : course));
      if (key === "rooms") next.courses = next.courses.map((course) => (course.roomId === id ? { ...course, roomId: "" } : course));
      if (key === "groups") next.courses = next.courses.map((course) => (course.groupId === id ? { ...course, groupId: "" } : course));
      return next;
    });
  };

  const toggleDay = (day) =>
    setForm((current) => {
      const active = current.workingDays.includes(day);
      const nextDays = active ? current.workingDays.filter((item) => item !== day) : [...current.workingDays, day];
      return { ...current, workingDays: days.filter((item) => nextDays.includes(item)) };
    });

  const buildPayload = () => ({
    institutionName: form.institutionName.trim(),
    campusName: form.campusName.trim(),
    facultyName: form.facultyName.trim(),
    departmentName: form.departmentName.trim(),
    className: `${form.programName.trim()} ${form.cohortName.trim()}`.trim(),
    programName: form.programName.trim(),
    termName: form.termName.trim(),
    cohortName: form.cohortName.trim(),
    section: form.section.trim(),
    workingDays: form.workingDays,
    periods: form.periods.map((period, i) => ({
      label: period.label.trim() || `Period ${i + 1}`,
      startTime: period.startTime,
      endTime: period.endTime,
    })),
    teachers: form.teachers.map((teacher) => ({
      name: teacher.name.trim(),
      department: teacher.department.trim(),
      email: teacher.email.trim(),
      branch: teacher.branch || "engineering",
    })),
    rooms: form.rooms.map((room) => ({
      name: room.name.trim(),
      building: room.building.trim(),
      capacity: Number(room.capacity) || 0,
      branch: room.branch || "engineering",
    })),
    groups: form.groups.map((group) => ({
      name: group.name.trim(),
      program: group.program.trim(),
      year: group.year.trim(),
      section: group.section.trim(),
      size: Number(group.size) || 0,
      branch: group.branch || "engineering",
    })),
    subjects: courses.map((course) => ({
      name: `${course.code.trim()} ${course.title.trim()}`.trim(),
      teacher: course.teacher?.name?.trim() || "",
      room: course.room?.name?.trim() || "",
      weeklySessions: Number(course.weeklySessions) || 0,
      group: course.group?.name?.trim() || "",
      deliveryMode: course.deliveryMode.trim(),
      branch: course.branch || "engineering",
    })),
    constraints: form.constraints.split("\n").map((item) => item.trim()).filter(Boolean),
  });

  const validateForm = () => {
    if (!form.institutionName.trim() || !form.programName.trim()) return "Institution name and program name are required.";
    if (!form.termName.trim() || !form.cohortName.trim()) return "Term and cohort details are required.";
    if (!form.workingDays.length) return "Select at least one working day.";
    if (form.periods.some((period) => !period.startTime || !period.endTime)) return "Every period needs a start and end time.";
    if (form.teachers.some((teacher) => !teacher.name.trim() || !teacher.department.trim())) return "Each teacher entry needs a name and department.";
    if (form.rooms.some((room) => !room.name.trim() || !room.building.trim() || Number(room.capacity) <= 0)) return "Each room entry needs a room name, block, and capacity.";
    if (form.groups.some((group) => !group.name.trim() || !group.program.trim() || !group.year.trim() || !group.section.trim())) return "Each group entry needs a name, program, year, and section.";
    if (courses.some((course) => !course.code.trim() || !course.title.trim() || !course.teacher?.name || !course.room?.name || !course.group?.name || Number(course.weeklySessions) <= 0)) return "Every course must include a code, title, teacher, room, target group, and weekly load.";
    const overloadedGroup = form.groups.find((group) => (groupLoads[group.id] || 0) > totalAvailable);
    if (overloadedGroup) return `Requested weekly periods exceed the available timetable slots for ${overloadedGroup.name || "one group"}.`;
    return "";
  };

  const normalize = (response) => {
    const payload = Array.isArray(response) ? response : response?.timetable ?? response?.data ?? [];
    return payload.map((item) => ({
      day: item.day,
      time: item.time ?? item.period ?? item.slot ?? item.periodLabel ?? "",
      subject: item.subject ?? item.name ?? "",
      teacher: item.teacher ?? "",
      room: item.room ?? "",
      group: item.group ?? item.cohort ?? item.section ?? "",
      branch: item.branch ?? item.department ?? "",
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const problem = validateForm();
    if (problem) return setError(problem);
    setLoading(true);
    setError("");
    try {
      const nextTimetable = normalize(await generateTimetable(buildPayload()));
      setTimetable(nextTimetable);
      setActiveGroup(nextTimetable[0]?.group || "");
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          requestError.response?.data?.message ||
          requestError.response?.data?.detail ||
          "The timetable request failed. Check that the backend is running and accepts POST /api/generate/."
      );
    } finally {
      setLoading(false);
    }
  };

  const getColSpan = (day, startIndex) => {
    const groupKey = activeGroup || generatedGroups[0] || "Default";
    const cell = grid[groupKey]?.[day]?.[labels[startIndex]];
    if (!cell) return 1;
    let span = 1;
    for (let i = startIndex + 1; i < labels.length; i += 1) {
      const next = grid[groupKey]?.[day]?.[labels[i]];
      if (!next || next.subject !== cell.subject || next.teacher !== cell.teacher || next.room !== cell.room) break;
      span += 1;
    }
    return span;
  };

  const downloadPDF = () => {
    const element = document.getElementById("timetable-preview");
    if (element && timetable.length) html2pdf().from(element).save("university-timetable.pdf");
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-[1500px] space-y-8">
        <section className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.24),_transparent_28%),linear-gradient(135deg,_#101a33,_#0f172a_55%,_#172554)] p-8 shadow-2xl">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <p className="text-xs uppercase tracking-[0.35em] text-sky-300">Timetable Operations Console</p>
              <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
                Post clean scheduling data to the backend and review the generated timetable in one workspace.
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-300">
                This screen mirrors the Django scheduler contract: working days, periods, teachers, rooms, groups, and subjects.
                Branch assignments stay visible so admin users can prepare data that passes backend validation the first time.
              </p>
              <div className="flex flex-wrap gap-3">
                {onBack ? (
                  <button type="button" onClick={onBack} className="rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10">
                    Back to dashboard
                  </button>
                ) : null}
                <button type="button" onClick={() => resetTo(blank)} className="rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10">
                  Clear planner
                </button>
                <button type="button" onClick={loadStandardSchedule} className="rounded-full border border-sky-400/30 px-5 py-3 text-sm font-medium text-sky-200 transition hover:bg-sky-400 hover:text-slate-950">
                  Apply standard week
                </button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/35 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Backend payload</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {plannerMetrics.map((metric) => (
                    <div key={metric.label} className="rounded-xl border border-white/8 bg-white/5 px-4 py-3">
                      <p className="text-2xl font-semibold text-white">{metric.value}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{metric.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/35 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Validation focus</p>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  <div className="rounded-xl border border-white/8 bg-white/5 px-4 py-3">
                    Teachers and groups should share the same department when assigned together.
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/5 px-4 py-3">
                    Subjects are built from course code, title, teacher, room, weekly sessions, and target group.
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/5 px-4 py-3">
                    Periods are time slots, while blocks are buildings mapped to departments.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <form onSubmit={submit} className="space-y-6 rounded-[2rem] border border-white/10 bg-slate-900/85 p-6 shadow-2xl">
            <Block title="Academic Profile" subtitle="Institution, faculty, program, and term details">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="University name" value={form.institutionName} onChange={(v) => setField("institutionName", v)} placeholder="Global Institute of Technology" />
                <Field label="Campus" value={form.campusName} onChange={(v) => setField("campusName", v)} placeholder="Main Campus" />
                <Field label="Faculty / school" value={form.facultyName} onChange={(v) => setField("facultyName", v)} placeholder="School of Engineering" />
                <Field label="Department" value={form.departmentName} onChange={(v) => setField("departmentName", v)} placeholder="Computer Science" />
                <Field label="Program" value={form.programName} onChange={(v) => setField("programName", v)} placeholder="B.Tech Computer Science" />
                <Field label="Term" value={form.termName} onChange={(v) => setField("termName", v)} placeholder="Autumn Semester 2026" />
                <Field label="Cohort" value={form.cohortName} onChange={(v) => setField("cohortName", v)} placeholder="Year 3" />
                <Field label="Section / group" value={form.section} onChange={(v) => setField("section", v)} placeholder="Section B" />
              </div>
            </Block>

            <Block title="Period Timing" subtitle="Teaching days and period timings">
              <div className="mb-4 flex flex-wrap gap-2">
                {days.map((day) => {
                  const active = form.workingDays.includes(day);
                  return (
                    <button key={day} type="button" onClick={() => toggleDay(day)} className={`rounded-full px-4 py-2 text-sm transition ${active ? "bg-sky-400 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
                      {day}
                    </button>
                  );
                })}
              </div>
              <Toolbar label="Periods" action="Add period" onClick={() => addItem("periods", makePeriod(form.periods.length, "15:45", "16:45"))} />
              <div className="space-y-3">
                {form.periods.map((period) => (
                  <div key={period.id} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950 p-4 md:grid-cols-[1.2fr_1fr_1fr_auto]">
                    <Input value={period.label} onChange={(v) => updateList("periods", period.id, "label", v)} placeholder="Period label" />
                    <Input type="time" value={period.startTime} onChange={(v) => updateList("periods", period.id, "startTime", v)} />
                    <Input type="time" value={period.endTime} onChange={(v) => updateList("periods", period.id, "endTime", v)} />
                    <RowActions
                      onDuplicate={() =>
                        duplicateItem("periods", period.id, (source) =>
                          makePeriod(form.periods.length, source.startTime, source.endTime, source.label)
                        )
                      }
                      onRemove={() => removeItem("periods", period.id)}
                    />
                  </div>
                ))}
              </div>
            </Block>

            <Block title="Teaching Roster" subtitle="Faculty members available for scheduling">
              <Toolbar label="Teachers" action="Add teacher" onClick={() => addItem("teachers", makeTeacher("", "", ""))} />
              <div className="space-y-3">
                {form.teachers.map((teacher) => (
                  <div key={teacher.id} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950 p-4 lg:grid-cols-[1fr_1fr_1.1fr_0.9fr_auto]">
                    <Input value={teacher.name} onChange={(v) => updateList("teachers", teacher.id, "name", v)} placeholder="Teacher name" />
                    <Input value={teacher.department} onChange={(v) => updateList("teachers", teacher.id, "department", v)} placeholder="Department" />
                    <Input value={teacher.email} onChange={(v) => updateList("teachers", teacher.id, "email", v)} placeholder="Email" />
                    <Select value={teacher.branch} onChange={(v) => updateList("teachers", teacher.id, "branch", v)} options={BRANCH_OPTIONS} />
                    <RowActions
                      onDuplicate={() =>
                        duplicateItem("teachers", teacher.id, (source) =>
                          makeTeacher(source.name, source.department, source.email, source.branch)
                        )
                      }
                      onRemove={() => removeItem("teachers", teacher.id)}
                    />
                  </div>
                ))}
              </div>
            </Block>

            <Block title="Room Inventory" subtitle="Venue list with block, department, and capacity">
              <Toolbar label="Rooms" action="Add room" onClick={() => addItem("rooms", makeRoom("", "", 40))} />
              <div className="space-y-3">
                {form.rooms.map((room) => (
                  <div key={room.id} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950 p-4 lg:grid-cols-[1fr_1.2fr_0.7fr_0.9fr_auto]">
                    <Input value={room.name} onChange={(v) => updateList("rooms", room.id, "name", v)} placeholder="Room name" />
                    <Input value={room.building} onChange={(v) => updateList("rooms", room.id, "building", v)} placeholder="Academic block" />
                    <Input type="number" value={room.capacity} onChange={(v) => updateList("rooms", room.id, "capacity", v)} placeholder="Capacity" />
                    <Select value={room.branch} onChange={(v) => updateList("rooms", room.id, "branch", v)} options={BRANCH_OPTIONS} />
                    <RowActions
                      onDuplicate={() =>
                        duplicateItem("rooms", room.id, (source) =>
                          makeRoom(source.name, source.building, source.capacity, source.branch)
                        )
                      }
                      onRemove={() => removeItem("rooms", room.id)}
                    />
                  </div>
                ))}
              </div>
            </Block>

            <Block title="Student Groups" subtitle="Programs, years, and sections to schedule together">
              <Toolbar label="Groups" action="Add group" onClick={() => addItem("groups", makeGroup("", "", "", "", 60))} />
              <div className="space-y-3">
                {form.groups.map((group) => (
                  <div key={group.id} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950 p-4 xl:grid-cols-[1fr_1.1fr_0.9fr_0.8fr_0.7fr_0.9fr_auto]">
                    <Input value={group.name} onChange={(v) => updateList("groups", group.id, "name", v)} placeholder="CS-Y2-A" />
                    <Input value={group.program} onChange={(v) => updateList("groups", group.id, "program", v)} placeholder="B.Tech Computer Science" />
                    <Input value={group.year} onChange={(v) => updateList("groups", group.id, "year", v)} placeholder="Year 2" />
                    <Input value={group.section} onChange={(v) => updateList("groups", group.id, "section", v)} placeholder="Section A" />
                    <Input type="number" value={group.size} onChange={(v) => updateList("groups", group.id, "size", v)} placeholder="Size" />
                    <Select value={group.branch} onChange={(v) => updateList("groups", group.id, "branch", v)} options={BRANCH_OPTIONS} />
                    <RowActions
                      onDuplicate={() =>
                        duplicateItem("groups", group.id, (source) =>
                          makeGroup(source.name, source.program, source.year, source.section, source.size, source.branch)
                        )
                      }
                      onRemove={() => removeItem("groups", group.id)}
                    />
                  </div>
                ))}
              </div>
            </Block>

            <Block title="Course Load" subtitle="Assign each course to a teacher and room">
              <Toolbar label="Courses" action="Add course" onClick={addSmartCourse} />
              <div className="space-y-3">
                {form.courses.map((course) => (
                  <div key={course.id} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950 p-4 xl:grid-cols-[0.75fr_1.2fr_1fr_1fr_0.95fr_0.65fr_0.8fr_0.9fr_auto]">
                    <Input value={course.code} onChange={(v) => updateList("courses", course.id, "code", v)} placeholder="CS301" />
                    <Input value={course.title} onChange={(v) => updateList("courses", course.id, "title", v)} placeholder="Course title" />
                    <Select value={course.teacherId} onChange={(v) => updateList("courses", course.id, "teacherId", v)} options={form.teachers.map((teacher) => [teacher.id, teacher.name || "Unnamed teacher"])} empty="Select teacher" />
                    <Select value={course.roomId} onChange={(v) => updateList("courses", course.id, "roomId", v)} options={form.rooms.map((room) => [room.id, room.name || "Unnamed room"])} empty="Select room" />
                    <Select value={course.groupId} onChange={(v) => updateList("courses", course.id, "groupId", v)} options={form.groups.map((group) => [group.id, group.name || "Unnamed group"])} empty="Target group" />
                    <Input type="number" value={course.weeklySessions} onChange={(v) => updateList("courses", course.id, "weeklySessions", v)} placeholder="Weekly" />
                    <Select value={course.deliveryMode} onChange={(v) => updateList("courses", course.id, "deliveryMode", v)} options={[["Lecture", "Lecture"], ["Lab", "Lab"], ["Seminar", "Seminar"], ["Studio", "Studio"]]} />
                    <Select value={course.branch} onChange={(v) => updateList("courses", course.id, "branch", v)} options={BRANCH_OPTIONS} />
                    <RowActions
                      onDuplicate={() =>
                        duplicateItem("courses", course.id, (source) =>
                          makeCourse(
                            source.code,
                            source.title,
                            source.teacherId,
                            source.roomId,
                            source.weeklySessions,
                            source.groupId,
                            source.deliveryMode,
                            source.branch
                          )
                        )
                      }
                      onRemove={() => removeItem("courses", course.id)}
                    />
                  </div>
                ))}
              </div>
            </Block>

            <Block title="Planning Notes" subtitle="Operational constraints for the generator">
              <textarea value={form.constraints} onChange={(event) => setField("constraints", event.target.value)} className="min-h-32 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-400" placeholder={"One instruction per line\nKeep labs in lab rooms\nReserve large halls for core modules"} />
            </Block>

            {error ? <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={loading} className="rounded-full bg-sky-400 px-6 py-3 font-medium text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? "Generating..." : "Generate university timetable"}
              </button>
              <button type="button" onClick={downloadPDF} disabled={!timetable.length} className="rounded-full border border-white/15 px-6 py-3 font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">
                Download PDF
              </button>
            </div>
          </form>

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <StatCard value={form.courses.length} label="Courses" />
              <StatCard value={form.teachers.length} label="Teachers" />
              <StatCard value={form.rooms.length} label="Rooms" />
              <StatCard value={form.groups.length} label="Groups" />
              <StatCard value={`${totalRequested}/${totalNetworkCapacity}`} label="Weekly Load" />
            </div>

            <section className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Planner Status</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill label={`${readiness.unnamedTeachers} teacher names missing`} tone={readiness.unnamedTeachers ? "warn" : "ok"} />
                <StatusPill label={`${readiness.teachersWithoutBranch} teachers missing department`} tone={readiness.teachersWithoutBranch ? "warn" : "ok"} />
                <StatusPill label={`${readiness.incompleteRooms} rooms incomplete`} tone={readiness.incompleteRooms ? "warn" : "ok"} />
                <StatusPill label={`${readiness.incompleteGroups} groups incomplete`} tone={readiness.incompleteGroups ? "warn" : "ok"} />
                <StatusPill label={`${readiness.groupsWithoutBranch} groups missing department`} tone={readiness.groupsWithoutBranch ? "warn" : "ok"} />
                <StatusPill label={`${readiness.unassignedCourses} courses need assignment`} tone={readiness.unassignedCourses ? "warn" : "ok"} />
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-300">
                Backend rules to watch: each subject needs a teacher, room, group, and weekly session count; teacher and group departments should match, and each room should carry its academic block.
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={addSmartCourse} className="rounded-full border border-white/15 px-4 py-2 text-sm text-white transition hover:bg-white/10">
                  Quick add course
                </button>
                <button type="button" onClick={clearGenerated} className="rounded-full border border-white/15 px-4 py-2 text-sm text-white transition hover:bg-white/10">
                  Clear generated view
                </button>
              </div>
            </section>

            <section id="timetable-preview" className="rounded-[2rem] border border-white/10 bg-slate-50 p-6 text-slate-900 shadow-2xl">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Backend response preview</p>
                  <h2 className="mt-2 text-3xl font-semibold text-slate-950">{form.institutionName || "University timetable"}</h2>
                  <p className="mt-1 text-sm text-slate-500">{[form.programName, form.cohortName, form.section].filter(Boolean).join(" | ") || "Program details will appear here"}</p>
                  <p className="mt-1 text-sm text-slate-400">{[form.facultyName, form.departmentName, form.termName].filter(Boolean).join(" | ")}</p>
                </div>
                <div className="rounded-2xl bg-slate-200 px-4 py-3 text-sm text-slate-600">
                  {timetable.length ? `${timetable.length} backend slots loaded` : "Generated timetable will appear here"}
                </div>
              </div>

              {generatedGroups.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {generatedGroups.map((groupName) => (
                    <button
                      key={groupName}
                      type="button"
                      onClick={() => setActiveGroup(groupName)}
                      className={`rounded-full px-4 py-2 text-sm transition ${
                        (activeGroup || generatedGroups[0]) === groupName
                          ? "bg-slate-900 text-white"
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      }`}
                    >
                      {groupName}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full border-collapse text-center text-sm">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="border border-slate-200 p-3">Day / Period</th>
                      {labels.map((label, index) => (
                        <th key={label} className="border border-slate-200 p-3">
                          <div>{label}</div>
                          <div className="mt-1 text-[11px] font-normal text-slate-300">{form.periods[index]?.startTime} - {form.periods[index]?.endTime}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.workingDays.map((day) => {
                      const row = [];
                      const groupKey = activeGroup || generatedGroups[0] || "Default";
                      for (let i = 0; i < labels.length; i += 1) {
                        const label = labels[i];
                        const cell = grid[groupKey]?.[day]?.[label];
                        if (cell) {
                          const span = getColSpan(day, i);
                          row.push(
                            <td key={`${day}-${label}`} colSpan={span} className={`border border-slate-200 p-3 align-top ${colors[cell.subject] || "bg-slate-100 text-slate-900"}`}>
                              <div className="font-semibold">{cell.subject}</div>
                              <div className="mt-1 text-xs opacity-80">{cell.teacher}</div>
                              <div className="mt-1 text-xs opacity-70">{cell.room}</div>
                            </td>
                          );
                          i += span - 1;
                        } else {
                          row.push(<td key={`${day}-${label}`} className="border border-slate-200 p-3 text-slate-300">-</td>);
                        }
                      }
                      return (
                        <tr key={day} className="hover:bg-slate-100">
                          <td className="border border-slate-200 bg-slate-100 p-3 font-semibold">{day}</td>
                          {row}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Block({ title, subtitle, children }) {
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs uppercase tracking-[0.3em] text-sky-300">{title}</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">{subtitle}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Toolbar({ label, action, onClick }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <p className="text-sm text-slate-300">{label}</p>
      <button type="button" onClick={onClick} className="rounded-full border border-sky-400/40 px-4 py-2 text-sm text-sky-200 transition hover:bg-sky-400 hover:text-slate-950">
        {action}
      </button>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label className="space-y-2">
      <span className="text-sm text-slate-300">{label}</span>
      <Input value={value} onChange={onChange} placeholder={placeholder} />
    </label>
  );
}

function Input({ value, onChange, placeholder, type = "text" }) {
  return <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none transition focus:border-sky-400" />;
}

function Select({ value, onChange, options, empty }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none transition focus:border-sky-400">
      {empty ? <option value="">{empty}</option> : null}
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}

function RowActions({ onDuplicate, onRemove }) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onDuplicate} className="rounded-xl bg-slate-800 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700 hover:text-white">
        Duplicate
      </button>
      <DangerButton onClick={onRemove} />
    </div>
  );
}

function DangerButton({ onClick }) {
  return <button type="button" onClick={onClick} className="rounded-xl bg-slate-800 px-3 py-2 text-sm text-slate-300 transition hover:bg-rose-500 hover:text-white">Remove</button>;
}

function StatusPill({ label, tone }) {
  const toneClass =
    tone === "warn"
      ? "bg-amber-400/15 text-amber-200 border-amber-400/30"
      : "bg-emerald-400/15 text-emerald-200 border-emerald-400/30";
  return <div className={`rounded-full border px-3 py-2 text-sm ${toneClass}`}>{label}</div>;
}

function StatCard({ value, label }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-5">
      <p className="text-3xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{label}</p>
    </div>
  );
}

export default TimeTable;
