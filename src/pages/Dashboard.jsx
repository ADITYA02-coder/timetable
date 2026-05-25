import React, { useState, useMemo } from "react";
import TimeTable from "../components/TimeTable";

// Department icons and colors matching TimeTable.jsx
const departmentConfig = {
  engineering: { name: "Engineering", color: "text-sky-400", bg: "bg-sky-500/20", icon: "⚙️" },
  pharmacy: { name: "Pharmacy", color: "text-emerald-400", bg: "bg-emerald-500/20", icon: "💊" },
  management: { name: "Management", color: "text-violet-400", bg: "bg-violet-500/20", icon: "📊" },
};

// Demo data for university statistics
const universityStats = {
  totalFaculty: 47,
  totalStudents: 2850,
  totalCourses: 42,
  totalBranches: 8,
  totalBlocks: 6,
  departments: [
    { id: "engineering", name: "Engineering", faculty: 18, students: 1200, courses: 18, branches: 4 },
    { id: "pharmacy", name: "Pharmacy", faculty: 12, students: 650, courses: 12, branches: 2 },
    { id: "management", name: "Management", faculty: 17, students: 1000, courses: 12, branches: 2 },
  ],
  recentActivity: [
    { id: 1, action: "Timetable Generated", details: "Engineering Dept - Autumn 2026", time: "2 mins ago" },
    { id: 2, action: "New Course Added", details: "ML301 - Machine Learning", time: "15 mins ago" },
    { id: 3, action: "Faculty Updated", details: "Dr. Priya Sharma - ME Dept", time: "1 hour ago" },
    { id: 4, action: "Room Allocation", details: "CS-Lab-3 - Programming Lab", time: "2 hours ago" },
    { id: 5, action: "Group Created", details: "CS-Y3-A - Year 3 Section A", time: "3 hours ago" },
  ],
};

const StatCard = ({ icon, label, value, color, trend }) => (
  <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 transition-all duration-300 hover:border-white/20 hover:shadow-lg hover:shadow-sky-500/10">
    <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-sky-500/10 blur-2xl"></div>
    <div className="relative flex items-start justify-between">
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-400">{label}</p>
        <p className="text-3xl font-bold text-white">{value.toLocaleString()}</p>
        {trend && (
          <p className={`text-xs font-medium ${trend > 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}% from last semester
          </p>
        )}
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color} bg-slate-800/50`}>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  </div>
);

const DepartmentCard = ({ dept, config }) => (
  <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-slate-800/30 p-4 transition-all duration-300 hover:border-white/15 hover:bg-slate-800/50">
    <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-sky-500/5 blur-xl transition-all duration-300 group-hover:scale-150"></div>
    <div className="relative flex items-center gap-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${config.bg}`}>
        <span className="text-xl">{config.icon}</span>
      </div>
      <div className="flex-1">
        <h3 className={`font-semibold ${config.color}`}>{config.name}</h3>
        <p className="text-xs text-slate-400">{dept.faculty} Faculty • {dept.students} Students</p>
      </div>
      <div className="text-right">
        <p className="text-2xl font-bold text-white">{dept.courses}</p>
        <p className="text-xs text-slate-500">Courses</p>
      </div>
    </div>
  </div>
);

const ActivityItem = ({ activity }) => (
  <div className="flex items-start gap-3 border-b border-white/5 py-3 last:border-0">
    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/20">
      <svg className="h-4 w-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-white">{activity.action}</p>
      <p className="text-xs text-slate-400 truncate">{activity.details}</p>
    </div>
    <p className="text-xs text-slate-500 shrink-0">{activity.time}</p>
  </div>
);

const Dashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showTimetable, setShowTimetable] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    // Simple admin authentication (in production, use proper auth)
    if (username.toLowerCase() === "admin" && password === "admin123") {
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("Invalid credentials.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername("");
    setPassword("");
    setShowTimetable(false);
  };

  const stats = useMemo(() => universityStats, []);

  // Show TimeTable component when requested
  if (showTimetable) {
    return <TimeTable onBack={() => setShowTimetable(false)} />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="relative rounded-4xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.15),transparent_40%),linear-gradient(135deg,#0f172a,#1e293b)] p-8 shadow-2xl">
            <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-sky-500/20 blur-3xl"></div>
            <div className="relative">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/20">
                  <svg className="h-8 w-8 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-semibold text-white">Admin Portal</h1>
                <p className="mt-2 text-sm text-slate-400">University Timetable System</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 transition-all focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 transition-all focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                    placeholder="Enter password"
                  />
                </div>
                {error && (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3">
                    <p className="text-sm text-rose-400">{error}</p>
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full rounded-xl bg-sky-500 py-3 font-medium text-white transition-all hover:bg-sky-400 hover:shadow-lg hover:shadow-sky-500/25"
                >
                  Sign In
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">University Dashboard</h1>
            <p className="text-sm text-slate-400">Academic Year 2026 • Autumn Semester</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowTimetable(true)}
              className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 font-medium text-white transition-all hover:bg-sky-400"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Generate Timetable
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:bg-white/5"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard icon="👨‍🏫" label="Total Faculty" value={stats.totalFaculty} color="bg-sky-500/20" trend={12} />
          <StatCard icon="👨‍🎓" label="Total Students" value={stats.totalStudents} color="bg-emerald-500/20" trend={8} />
          <StatCard icon="📚" label="Total Courses" value={stats.totalCourses} color="bg-amber-500/20" trend={5} />
          <StatCard icon="🏛️" label="Branches" value={stats.totalBranches} color="bg-violet-500/20" />
          <StatCard icon="⏰" label="Time Blocks" value={stats.totalBlocks} color="bg-rose-500/20" />
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Departments */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Departments Overview</h2>
                <span className="rounded-full bg-sky-500/20 px-3 py-1 text-xs font-medium text-sky-400">
                  {stats.departments.length} Active
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {stats.departments.map((dept) => (
                  <DepartmentCard key={dept.id} dept={dept} config={departmentConfig[dept.id]} />
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
              <button className="text-xs text-sky-400 hover:text-sky-300">View All</button>
            </div>
            <div className="space-y-1">
              {stats.recentActivity.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { icon: "➕", label: "Add Faculty", color: "hover:border-sky-500/50" },
            { icon: "👥", label: "Manage Students", color: "hover:border-emerald-500/50" },
            { icon: "📖", label: "Add Courses", color: "hover:border-amber-500/50" },
            { icon: "🏠", label: "Room Allocation", color: "hover:border-violet-500/50" },
          ].map((action, idx) => (
            <button
              key={idx}
              className={`flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-800/30 py-4 text-sm font-medium text-slate-300 transition-all hover:bg-slate-800/50 ${action.color}`}
            >
              <span>{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
