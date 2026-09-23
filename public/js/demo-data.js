// =============================================================
// PROJECTFORGE — INTERACTIVE DEMO DATA
// Pre-populated data for guest live preview and portfolio showcase.
// Ensures reviewers and visitors can explore full UI without
// requiring private Firebase keys.
// =============================================================

export const DEMO_USER = {
  uid: "demo-guest-user",
  email: "guest@projectforge.dev",
  displayName: "Alex Rivera",
  emailVerified: true,
  photoURL: null,
  role: "admin",
  skills: ["React", "TypeScript", "Node.js", "System Architecture"],
  bio: "Lead Product Engineer exploring ProjectForge live preview.",
  theme: "dark"
};

export const DEMO_PROJECTS = [
  {
    id: "demo-p1",
    name: "AI Workflow Engine & Orchestration",
    description: "Autonomous agent pipeline integrating LLM task dispatching, context pruning, and automated code review.",
    status: "in_progress",
    priority: "high",
    color: "#7C5CFF",
    taskCount: 14,
    completedTaskCount: 9,
    deadline: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
    tags: ["AI", "Architecture", "Priority"],
    memberIds: ["demo-guest-user", "user-sara", "user-marcus"],
    members: [
      { name: "Alex Rivera", email: "guest@projectforge.dev" },
      { name: "Sara Chen", email: "sara@company.io" },
      { name: "Marcus Vance", email: "marcus@company.io" }
    ],
    createdAt: new Date(Date.now() - 10 * 86400000)
  },
  {
    id: "demo-p2",
    name: "Fintech Mobile App Redesign",
    description: "Next-gen banking experience with biometric verification, instant transfers, and wealth management dashboards.",
    status: "in_progress",
    priority: "medium",
    color: "#22D3EE",
    taskCount: 18,
    completedTaskCount: 12,
    deadline: new Date(Date.now() + 12 * 86400000).toISOString().split("T")[0],
    tags: ["Mobile", "React Native", "UI/UX"],
    memberIds: ["demo-guest-user", "user-elena"],
    members: [
      { name: "Alex Rivera", email: "guest@projectforge.dev" },
      { name: "Elena Rostova", email: "elena@design.org" }
    ],
    createdAt: new Date(Date.now() - 18 * 86400000)
  },
  {
    id: "demo-p3",
    name: "Zero-Trust Cloud Infrastructure Audit",
    description: "Enterprise security audit covering IAM role least-privilege, encrypted VPC peering, and SOC2 compliance monitoring.",
    status: "completed",
    priority: "high",
    color: "#35D19E",
    taskCount: 8,
    completedTaskCount: 8,
    deadline: new Date(Date.now() - 1 * 86400000).toISOString().split("T")[0],
    tags: ["DevOps", "AWS", "Security"],
    memberIds: ["demo-guest-user", "user-david"],
    members: [
      { name: "Alex Rivera", email: "guest@projectforge.dev" },
      { name: "David Kim", email: "david@secops.io" }
    ],
    createdAt: new Date(Date.now() - 30 * 86400000)
  },
  {
    id: "demo-p4",
    name: "Design System & Glassmorphic Tokens v2",
    description: "Unified token architecture, accessible typography scale, and reusable component library in Figma & CSS.",
    status: "planning",
    priority: "low",
    color: "#F5B94A",
    taskCount: 10,
    completedTaskCount: 3,
    deadline: new Date(Date.now() + 24 * 86400000).toISOString().split("T")[0],
    tags: ["Design System", "CSS", "Tokens"],
    memberIds: ["demo-guest-user", "user-sara", "user-elena"],
    members: [
      { name: "Alex Rivera", email: "guest@projectforge.dev" },
      { name: "Sara Chen", email: "sara@company.io" },
      { name: "Elena Rostova", email: "elena@design.org" }
    ],
    createdAt: new Date(Date.now() - 5 * 86400000)
  }
];

export const DEMO_TASKS = [
  {
    id: "task-101",
    projectId: "demo-p1",
    title: "Design Streaming Tool Call Parser",
    description: "Parse token chunks in realtime to detect function calling payloads before end of turn.",
    status: "done",
    priority: "high",
    tags: ["AI", "Core"],
    assigneeName: "Alex Rivera",
    deadline: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
    commentsCount: 3
  },
  {
    id: "task-102",
    projectId: "demo-p1",
    title: "Context Pruning & Summarization Cache",
    description: "Implement rolling LRU cache to reduce LLM input tokens on long multi-agent sessions.",
    status: "done",
    priority: "high",
    tags: ["Performance"],
    assigneeName: "Sara Chen",
    deadline: new Date(Date.now() - 1 * 86400000).toISOString().split("T")[0],
    commentsCount: 1
  },
  {
    id: "task-103",
    projectId: "demo-p1",
    title: "Implement Parallel Worker Pool",
    description: "Scale background subagent tasks with graceful timeout handling and cancellation tokens.",
    status: "in_progress",
    priority: "medium",
    tags: ["Concurrency"],
    assigneeName: "Alex Rivera",
    deadline: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
    commentsCount: 4
  },
  {
    id: "task-104",
    projectId: "demo-p1",
    title: "Automated Evaluation Test Suite",
    description: "Benchmark test cases against mock developer queries to evaluate accuracy and latency.",
    status: "review",
    priority: "medium",
    tags: ["Testing"],
    assigneeName: "Marcus Vance",
    deadline: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
    commentsCount: 2
  },
  {
    id: "task-105",
    projectId: "demo-p1",
    title: "Production Telemetry & Metrics Dashboard",
    description: "Hook Prometheus and OpenTelemetry spans into API endpoints to monitor p99 latency.",
    status: "todo",
    priority: "low",
    tags: ["Observability"],
    assigneeName: "Sara Chen",
    deadline: new Date(Date.now() + 6 * 86400000).toISOString().split("T")[0],
    commentsCount: 0
  }
];

export const DEMO_ACTIVITIES = [
  {
    id: "act-1",
    action: "completed task",
    target: "Design Streaming Tool Call Parser",
    userName: "Alex Rivera",
    time: "25m ago"
  },
  {
    id: "act-2",
    action: "pushed commit",
    target: "feat: add token cache layer",
    userName: "Sara Chen",
    time: "2h ago"
  },
  {
    id: "act-3",
    action: "moved to review",
    target: "Automated Evaluation Test Suite",
    userName: "Marcus Vance",
    time: "4h ago"
  },
  {
    id: "act-4",
    action: "created project",
    target: "AI Workflow Engine & Orchestration",
    userName: "Alex Rivera",
    time: "1d ago"
  }
];
