"use client";
import { apiRequest } from "@/lib/api-client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BellRing,
  Calendar,
  MoreHorizontal,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Loader2,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

type ReminderType = "ONE_TIME" | "WEEKLY" | "MONTHLY" | "YEARLY";
type ReminderStatus = "ACTIVE" | "COMPLETED" | "STOPPED";

type WeekDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

type QuarterCode = "Q1" | "Q2" | "Q3" | "Q4";

type ReminderItem = {
  id: string;
  title: string;
  notes: string;
  type: ReminderType;
  dueDate: string;
  weeklyDays: WeekDay[];
  monthlyDay: number | null;
  quarterlyQuarter: QuarterCode | null;
  quarterlyDay: number | null;
  yearlyMonth: number | null;
  yearlyDay: number | null;
  emailEnabled: boolean;
    notifyHour: number | null;
  notifyMinute: number | null;
  lastNotifiedAt: string | null;
  status: ReminderStatus;
  isSeriesStopped: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

type FilterTab = "ALL" | "ACTIVE" | "COMPLETED" | "STOPPED" | "OVERDUE";

type FormState = {
  id: string | null;
  title: string;
  notes: string;
  type: ReminderType;
  dueDate: string;
  weeklyDays: WeekDay[];
  monthlyDay: string;
  yearlyMonth: string;
  yearlyDay: string;
  notifyHour: string;
  notifyMinute: string;
  emailEnabled: boolean;
};

const weekdayOptions: { label: string; value: WeekDay }[] = [
  { label: "Mon", value: "MONDAY" },
  { label: "Tue", value: "TUESDAY" },
  { label: "Wed", value: "WEDNESDAY" },
  { label: "Thu", value: "THURSDAY" },
  { label: "Fri", value: "FRIDAY" },
  { label: "Sat", value: "SATURDAY" },
  { label: "Sun", value: "SUNDAY" },
];

const typeOptions: { label: string; value: ReminderType }[] = [
  { label: "One Time", value: "ONE_TIME" },
  { label: "Weekly", value: "WEEKLY" },
  { label: "Monthly", value: "MONTHLY" },
  { label: "Yearly", value: "YEARLY" },
];

const monthOptions = [
  { label: "January", value: "1" },
  { label: "February", value: "2" },
  { label: "March", value: "3" },
  { label: "April", value: "4" },
  { label: "May", value: "5" },
  { label: "June", value: "6" },
  { label: "July", value: "7" },
  { label: "August", value: "8" },
  { label: "September", value: "9" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
];

const emptyForm: FormState = {
  id: null,
  title: "",
  notes: "",
  type: "ONE_TIME",
  dueDate: "",
  weeklyDays: [],
  monthlyDay: "",
  yearlyMonth: "1",
  yearlyDay: "",
  notifyHour: "09",
  notifyMinute: "00",
  emailEnabled: true,
};
function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
function formatDateForInput(dateString: string) {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  return toDateInputValue(date);
}
function formatDate(dateString: string) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
function formatTime(hour: number | null, minute: number | null) {
  if (
    hour === null ||
    hour === undefined ||
    minute === null ||
    minute === undefined
  ) {
    return "";
  }

  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${hh}:${mm}`;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getReminderBucket(item: ReminderItem) {
  if (item.status === "COMPLETED") return "COMPLETED";
  if (item.status === "STOPPED") return "STOPPED";

  const due = new Date(item.dueDate);
  const today = startOfToday();
  const dueOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  if (dueOnly.getTime() < today.getTime()) return "OVERDUE";
  if (dueOnly.getTime() === today.getTime()) return "TODAY";
  return "UPCOMING";
}

function buildScheduleLabel(item: ReminderItem) {
  const timeText = formatTime(item.notifyHour, item.notifyMinute);

  switch (item.type) {
    case "ONE_TIME":
      return `${formatDate(item.dueDate)}${timeText ? ` at ${timeText}` : ""}`;
    case "WEEKLY":
      return item.weeklyDays.length
        ? `Every ${item.weeklyDays
            .map((day) => day.slice(0, 1) + day.slice(1).toLowerCase())
            .join(", ")}${timeText ? ` at ${timeText}` : ""}`
        : "Weekly";
    case "MONTHLY":
      return item.monthlyDay
        ? `Every month on ${item.monthlyDay}${timeText ? ` at ${timeText}` : ""}`
        : "Monthly";
    case "YEARLY": {
      const month = monthOptions.find(
        (entry) => Number(entry.value) === item.yearlyMonth,
      )?.label;

      return month && item.yearlyDay
        ? `${month} ${item.yearlyDay}${timeText ? ` at ${timeText}` : ""} every year`
        : "Yearly";
    }
    default:
      return "—";
  }
}

function validateForm(form: FormState) {
  if (!form.title.trim()) return "Title is required.";

  if (form.type === "ONE_TIME") {
    if (!form.dueDate) return "Due date is required for one-time reminder.";
  }

  if (form.type === "WEEKLY" && form.weeklyDays.length === 0) {
    return "Select at least one weekly day.";
  }

  if (form.type === "MONTHLY") {
    const day = Number(form.monthlyDay);
    if (!day || day < 1 || day > 31) {
      return "Monthly reminder needs a valid day between 1 and 31.";
    }
    }

  if (form.type === "YEARLY") {
    const month = Number(form.yearlyMonth);
    const day = Number(form.yearlyDay);

    if (!month || month < 1 || month > 12) {
      return "Yearly reminder needs a valid month.";
    }
    if (!day || day < 1 || day > 31) {
      return "Yearly reminder needs a valid date between 1 and 31.";
    }
  }
  const hour = Number(form.notifyHour);
  const minute = Number(form.notifyMinute);

  if (Number.isNaN(hour) || hour < 0 || hour > 23) {
    return "Please enter a valid hour between 0 and 23.";
  }

  if (Number.isNaN(minute) || minute < 0 || minute > 59) {
    return "Please enter a valid minute between 0 and 59.";
  }
  return "";
}

function computeDueDateFromForm(form: FormState) {
  const today = new Date();
  const year = today.getFullYear();

  if (form.type === "ONE_TIME") {
    return form.dueDate;
  }

  if (form.type === "MONTHLY") {
    const day = Number(form.monthlyDay);
    const month = today.getMonth();
    let candidate = new Date(year, month, day);

    if (candidate < today) {
      candidate = new Date(year, month + 1, day);
    }

    return toDateInputValue(candidate);
  }

  if (form.type === "YEARLY") {
    const month = Number(form.yearlyMonth);
    const day = Number(form.yearlyDay);
    let candidate = new Date(year, month - 1, day);

    if (candidate < today) {
      candidate = new Date(year + 1, month - 1, day);
    }

    return toDateInputValue(candidate);
  }

  if (form.type === "WEEKLY") {
    const dayMap: Record<WeekDay, number> = {
      SUNDAY: 0,
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
    };

    const selected = [...form.weeklyDays]
      .map((day) => dayMap[day])
      .sort((a, b) => a - b);

    const current = today.getDay();
    let diff = 0;

    const upcoming = selected.find((day) => day >= current);
    if (upcoming !== undefined) {
      diff = upcoming - current;
    } else {
      diff = 7 - current + selected[0];
    }

    const candidate = new Date(today);
    candidate.setDate(today.getDate() + diff);

    return toDateInputValue(candidate);
  }

  return "";
}

function sortItems(items: ReminderItem[]) {
  return [...items].sort((a, b) => {
    const aBucket = getReminderBucket(a);
    const bBucket = getReminderBucket(b);

    const rank: Record<string, number> = {
      TODAY: 1,
      UPCOMING: 2,
      OVERDUE: 3,
      COMPLETED: 4,
      STOPPED: 5,
    };

    if (rank[aBucket] !== rank[bBucket]) {
      return rank[aBucket] - rank[bBucket];
    }

    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

export default function RemindersPage() {
  const [items, setItems] = useState<ReminderItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [tab, setTab] = useState<FilterTab>("ALL");
const [isModalOpen, setIsModalOpen] = useState(false);
const [form, setForm] = useState<FormState>(emptyForm);
const [error, setError] = useState("");
const [openMenuId, setOpenMenuId] = useState<string | null>(null);
const [mounted, setMounted] = useState(false);
  

useEffect(() => {
  loadReminders();
}, []);
useEffect(() => {
  setMounted(true);
}, []);
useEffect(() => {
  if (!openMenuId) {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    return;
  }

  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";

  return () => {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  };
}, [openMenuId]);
  const stats = useMemo(() => {
    return {
      dueToday: items.filter((item) => getReminderBucket(item) === "TODAY").length,
      upcoming: items.filter((item) => getReminderBucket(item) === "UPCOMING")
        .length,
      overdue: items.filter((item) => getReminderBucket(item) === "OVERDUE").length,
      completed: items.filter((item) => item.status === "COMPLETED").length,
    };
  }, [items]);
const [isRefreshing, setIsRefreshing] = useState(false);

const loadReminders = async (showLoader = false) => {
  try {
    if (showLoader) {
      setIsRefreshing(true);
    }

   const data = await apiRequest<ReminderItem[]>("/reminders");
    setItems(sortItems(data));
  } catch (e) {
    setItems([]);
  } finally {
    setIsLoaded(true);
    if (showLoader) {
      setIsRefreshing(false);
    }
  }
};
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const bucket = getReminderBucket(item);

      if (tab === "ALL") return true;
      if (tab === "ACTIVE") {
        return item.status === "ACTIVE";
      }
      if (tab === "COMPLETED") {
        return item.status === "COMPLETED";
      }
      if (tab === "STOPPED") {
        return item.status === "STOPPED";
      }
      if (tab === "OVERDUE") {
        return bucket === "OVERDUE";
      }
      return true;
    });
  }, [items, tab]);
  const openCreateModal = () => {
  setForm({
    ...emptyForm,
  });
  setError("");
  setIsModalOpen(true);
};

  const openEditModal = (item: ReminderItem) => {
    setForm({
      id: item.id,
      title: item.title,
      notes: item.notes,
      type: item.type,
      dueDate: item.type === "ONE_TIME" ? formatDateForInput(item.dueDate) : "",
      weeklyDays: item.weeklyDays,
      monthlyDay: item.monthlyDay ? String(item.monthlyDay) : "",
      yearlyMonth: item.yearlyMonth ? String(item.yearlyMonth) : "1",
      yearlyDay: item.yearlyDay ? String(item.yearlyDay) : "",
      emailEnabled: item.emailEnabled,
            notifyHour:
        item.notifyHour !== null && item.notifyHour !== undefined
          ? String(item.notifyHour).padStart(2, "0")
          : "09",
      notifyMinute:
        item.notifyMinute !== null && item.notifyMinute !== undefined
          ? String(item.notifyMinute).padStart(2, "0")
          : "00",
    });
    setError("");
    setIsModalOpen(true);
  };

 const closeModal = () => {
  setIsModalOpen(false);
  setError("");
};

const saveReminder = async () => {
  const validationError = validateForm(form);
  if (validationError) {
    setError(validationError);
    return;
  }

  const isEdit = Boolean(form.id);
  const actionLabel = isEdit ? "update" : "save";
  const ok = window.confirm(
    `Are you sure you want to ${actionLabel} this reminder?`,
  );
  if (!ok) return;

  try {
    const dueDate = computeDueDateFromForm(form);

    const payload = {
      title: form.title.trim(),
      notes: form.notes.trim(),
      type: form.type,
      dueDate,
      weeklyDays: form.type === "WEEKLY" ? form.weeklyDays : [],
      monthlyDay: form.type === "MONTHLY" ? Number(form.monthlyDay) : null,
      yearlyMonth: form.type === "YEARLY" ? Number(form.yearlyMonth) : null,
      yearlyDay: form.type === "YEARLY" ? Number(form.yearlyDay) : null,
      notifyHour: Number(form.notifyHour),
      notifyMinute: Number(form.notifyMinute),
      emailEnabled: form.emailEnabled,
    };

    await apiRequest(
  isEdit ? `/reminders/${form.id}` : "/reminders",
  {
    method: isEdit ? "PATCH" : "POST",
    body: JSON.stringify(payload),
  },
);

    closeModal();
    await loadReminders(true);
  } catch (err) {
    setError(form.id ? "Failed to update reminder" : "Failed to save reminder");
  }
};

  const toggleWeeklyDay = (day: WeekDay) => {
    setForm((prev) => ({
      ...prev,
      weeklyDays: prev.weeklyDays.includes(day)
        ? prev.weeklyDays.filter((item) => item !== day)
        : [...prev.weeklyDays, day],
    }));
  };

const markCompleted = async (id: string) => {
  const ok = window.confirm("Mark this reminder as completed?");
  if (!ok) return;

  try {
    const res = await apiRequest(`/reminders/${id}/complete`, {
  method: "PATCH",
});


    await loadReminders(true);
  } catch (error) {
    setError("Failed to mark reminder as completed.");
  }
};

const markActive = async (id: string) => {
  const ok = window.confirm("Mark this reminder as active again?");
  if (!ok) return;

  try {
    const res = await apiRequest(`/reminders/${id}/active`, {
  method: "PATCH",
});


    await loadReminders(true);
  } catch (error) {
    setError("Failed to mark reminder as active.");
  }
};

const stopSeries = async (id: string) => {
  const ok = window.confirm("Stop this reminder series?");
  if (!ok) return;

  try {
    const res = await apiRequest(`/reminders/${id}/stop`, {
  method: "PATCH",
});


    await loadReminders(true);
  } catch (error) {
    setError("Failed to stop reminder series.");
  }
};

const deleteReminder = async (id: string) => {
  const ok = window.confirm("Delete this reminder permanently?");
  if (!ok) return;

  try {
    const res = await apiRequest(`/reminders/${id}`, {
  method: "DELETE",
});
    await loadReminders(true);
  } catch (error) {
    setError("Failed to delete reminder.");
  }
};
const getTypeLabel = (type: ReminderType) => {
  if (type === "ONE_TIME") return "One Time";
  if (type === "WEEKLY") return "Weekly";
  if (type === "MONTHLY") return "Monthly";
  return "Yearly";
};
  return (
    <div className="space-y-4">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
      >
       <div className="bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.10),transparent_34%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.10),transparent_30%),linear-gradient(180deg,#ffffff_0%,#fcf7ff_100%)] px-3 py-3.5 sm:px-5 sm:py-5">
          <div className="flex flex-col gap-3.5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-100 bg-fuchsia-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-fuchsia-700">
                Reminder Center
              </div>

              <h1 className="mt-3 text-[24px] font-semibold leading-none tracking-tight text-slate-900 sm:text-[34px]">
                Business Reminders
              </h1>
             <p className="mt-2 text-[13px] leading-5 text-slate-600 sm:text-sm sm:leading-6">
                Create one-time and recurring reminders with proper business schedules.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openCreateModal}
                 className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#d946ef_0%,#7c3aed_100%)] px-3.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(168,85,247,0.24)] transition hover:scale-[1.01] sm:px-4"
                >
                  <Plus className="h-4 w-4" />
                  Add Reminder
                </button>

              <button
  type="button"
  onClick={() => loadReminders(true)}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:px-4"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
{isRefreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>

            <div className="hidden w-full grid-cols-2 gap-2.5 md:grid xl:max-w-[410px]">
              {[
                {
                  title: "Due Today",
                  value: stats.dueToday,
                  icon: Clock3,
                  tone: "bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_100%)] border-orange-100",
                },
                {
                  title: "Upcoming",
                  value: stats.upcoming,
                  icon: CalendarDays,
                  tone: "bg-[linear-gradient(180deg,#fdf4ff_0%,#ffffff_100%)] border-fuchsia-100",
                },
                {
                  title: "Overdue",
                  value: stats.overdue,
                  icon: BellRing,
                  tone: "bg-[linear-gradient(180deg,#fff1f2_0%,#ffffff_100%)] border-rose-100",
                },
                {
                  title: "Completed",
                  value: stats.completed,
                  icon: CheckCircle2,
                  tone: "bg-[linear-gradient(180deg,#ecfdf5_0%,#ffffff_100%)] border-emerald-100",
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.title}
                    className={`rounded-[20px] border p-3 shadow-sm sm:rounded-[22px] sm:p-4 ${card.tone}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                       <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-[11px] sm:tracking-[0.22em]">
                          {card.title}
                        </p>
                        <p className="mt-1.5 text-[22px] font-semibold text-slate-900 sm:mt-2 sm:text-2xl">
                          {card.value}
                        </p>
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white shadow-sm sm:h-10 sm:w-10">
                        <Icon className="h-5 w-5 text-slate-700" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.04 }}
        className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.05)]"
      >
       <div className="flex flex-col gap-3 border-b border-slate-100 px-3 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Reminder List
            </p>
            <h2 className="mt-1 text-base font-semibold text-slate-900 sm:text-lg">
              All Saved Reminders
            </h2>
          </div>

          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {[
              { label: "All", value: "ALL" },
              { label: "Active", value: "ACTIVE" },
              { label: "Overdue", value: "OVERDUE" },
              { label: "Completed", value: "COMPLETED" },
              { label: "Stopped", value: "STOPPED" },
            ].map((entry) => {
              const active = tab === entry.value;
              return (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => setTab(entry.value as FilterTab)}
                  className={`rounded-2xl px-3 py-1.5 text-[13px] font-medium transition sm:px-3.5 sm:py-2 sm:text-sm ${
                    active
                      ? "border border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {entry.label}
                </button>
              );
            })}
          </div>
        </div>

        {!isLoaded ? (
          <div className="flex h-[240px] items-center justify-center">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading reminders...
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,#f5d0fe_0%,#e9d5ff_100%)] text-fuchsia-700 shadow-sm">
              <Calendar className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No reminders found
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Add your business reminders and recurring schedules here.
            </p>
          </div>
        ) : (
<>
 <div className="md:hidden overflow-x-hidden">
    <table className="min-w-full text-left">
      <thead className="bg-slate-50/70">
        <tr className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
 <th className="w-[62%] px-3 py-3">Task</th>
<th className="w-[22%] px-2 py-3 text-center">Status</th>
<th className="w-[16%] px-3 py-3 text-right">Actions</th>
        </tr>
      </thead>

      <tbody>
        {filteredItems.map((item) => {
          const bucket = getReminderBucket(item);
          const statusLabel =
            bucket === "TODAY"
              ? "Due Today"
              : bucket === "UPCOMING"
                ? "Upcoming"
                : bucket === "OVERDUE"
                  ? "Overdue"
                  : bucket === "STOPPED"
                    ? "Stopped"
                    : "Completed";

          return (
            <tr
              key={item.id}
              className="border-t border-slate-100 transition hover:bg-slate-50/60"
            >
           <td className="w-[62%] px-3 py-3 align-top">
  <div className="min-w-0 max-w-[220px]">
                 <p className="line-clamp-2 text-[14px] font-semibold leading-5 text-slate-900">
                    {item.title}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-slate-500">
                    {getTypeLabel(item.type)}
                  </p>
                </div>
              </td>

            <td className="w-[22%] px-2 py-3 align-top">
  <span
    className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
      bucket === "TODAY"
        ? "bg-orange-50 text-orange-600 ring-1 ring-orange-100"
        : bucket === "UPCOMING"
          ? "bg-fuchsia-50 text-fuchsia-600 ring-1 ring-fuchsia-100"
          : bucket === "OVERDUE"
            ? "bg-rose-50 text-rose-600 ring-1 ring-rose-100"
            : bucket === "STOPPED"
              ? "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
              : "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"
    }`}
    title={statusLabel}
  >
    {bucket === "TODAY" ? (
      <Clock3 className="h-4 w-4" />
    ) : bucket === "UPCOMING" ? (
      <CalendarDays className="h-4 w-4" />
    ) : bucket === "OVERDUE" ? (
      <BellRing className="h-4 w-4" />
    ) : bucket === "STOPPED" ? (
      <Power className="h-4 w-4" />
    ) : (
      <CheckCircle2 className="h-4 w-4" />
    )}
  </span>
</td>

             <td className="w-[16%] px-3 py-3 text-right align-top">
<div className="inline-flex justify-end">
                  <button
                    type="button"
onClick={(e) => {
  e.stopPropagation();
  setOpenMenuId((prev) => (prev === item.id ? null : item.id));
}}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>

  <div className="hidden overflow-x-auto md:block">
    <table className="min-w-full text-left">
              <thead className="bg-slate-50/70">
                <tr className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-4 py-3.5 sm:px-5">Task</th>
                  <th className="px-4 py-3.5">Schedule</th>
                  <th className="px-4 py-3.5">Next Due</th>
                  <th className="px-4 py-3.5">Email</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right sm:px-5">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.map((item) => {
                  const bucket = getReminderBucket(item);

                  return (
                    <tr
                      key={item.id}
                      className="border-t border-slate-100 transition hover:bg-slate-50/60"
                    >
                      <td className="px-4 py-4 align-top sm:px-5">
                        <div className="min-w-[230px]">
                          <p className="text-sm font-semibold text-slate-900">
                            {item.title}
                          </p>
               <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
  <span>{getTypeLabel(item.type)}</span>
</div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700">
                        {buildScheduleLabel(item)}
                      </td>

                      <td className="px-4 py-4 text-sm font-medium text-slate-700">
                        {formatDate(item.dueDate)}
                      </td>

                      <td className="px-4 py-4 text-sm font-medium text-slate-700">
                        {item.emailEnabled ? "On" : "Off"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            bucket === "TODAY"
                              ? "bg-orange-50 text-orange-700 ring-1 ring-orange-100"
                              : bucket === "UPCOMING"
                                ? "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-100"
                                : bucket === "OVERDUE"
                                  ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                                  : bucket === "STOPPED"
                                    ? "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                                    : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                          }`}
                        >
                          {bucket === "TODAY"
                            ? "Due Today"
                            : bucket === "UPCOMING"
                              ? "Upcoming"
                              : bucket === "OVERDUE"
                                ? "Overdue"
                                : bucket === "STOPPED"
                                  ? "Stopped"
                                  : "Completed"}
                        </span>
                      </td>

                      <td className="px-4 py-4 sm:px-5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          {item.status === "COMPLETED" ? (
                            <button
                              type="button"
                              onClick={() => markActive(item.id)}
                              className="rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              Mark Active
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => markCompleted(item.id)}
                              className="rounded-xl bg-fuchsia-600 px-3 text-xs font-semibold text-white transition hover:bg-fuchsia-700"
                            >
                              Complete
                            </button>
                          )}

                          {item.type !== "ONE_TIME" && item.status !== "STOPPED" ? (
                            <button
                              type="button"
                              onClick={() => stopSeries(item.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                              title="Stop Series"
                            >
                              <Power className="h-4 w-4" />
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => deleteReminder(item.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
    </table>
  </div>
</>
        )}
      </motion.section>
{mounted && openMenuId && (
  <div className="fixed inset-0 z-[135] flex items-end bg-slate-900/30 px-3 py-3 backdrop-blur-[2px] md:hidden">
    <div className="w-full rounded-[28px] border border-fuchsia-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(252,247,255,0.98))] p-3 shadow-[0_24px_60px_rgba(168,85,247,0.16)]">
      <div className="mb-2 flex justify-center">
        <div className="h-1.5 w-12 rounded-full bg-slate-200" />
      </div>

      {(() => {
        const selectedReminder =
          filteredItems.find((item) => item.id === openMenuId) || null;

        if (!selectedReminder) return null;

        return (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                openEditModal(selectedReminder);
                setOpenMenuId(null);
              }}
              className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Pencil size={16} />
              Edit Reminder
            </button>

            {selectedReminder.status === "COMPLETED" ? (
              <button
                type="button"
                onClick={() => {
                  void markActive(selectedReminder.id);
                  setOpenMenuId(null);
                }}
                className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-emerald-50"
              >
                <CheckCircle2 size={16} />
                Mark Active
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  void markCompleted(selectedReminder.id);
                  setOpenMenuId(null);
                }}
                className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-fuchsia-50"
              >
                <CheckCircle2 size={16} />
                Complete
              </button>
            )}

            {selectedReminder.type !== "ONE_TIME" &&
            selectedReminder.status !== "STOPPED" ? (
              <button
                type="button"
                onClick={() => {
                  void stopSeries(selectedReminder.id);
                  setOpenMenuId(null);
                }}
                className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-amber-50"
              >
                <Power size={16} />
                Stop Series
              </button>
            ) : null}

            <div className="my-1 h-px bg-slate-100" />

            <button
              type="button"
              onClick={() => {
                void deleteReminder(selectedReminder.id);
                setOpenMenuId(null);
              }}
              className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
            >
              <Trash2 size={16} />
              Delete Reminder
            </button>

            <button
              type="button"
              onClick={() => setOpenMenuId(null)}
              className="mt-2 flex w-full items-center justify-center rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
          </div>
        );
      })()}
    </div>
  </div>
)}
      <AnimatePresence>
        {isModalOpen ? (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 p-3 backdrop-blur-[2px] sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.985 }}
              transition={{ duration: 0.2 }}
              className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {form.id ? "Edit Reminder" : "New Reminder"}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-slate-900">
                    {form.id ? "Update Business Reminder" : "Add Business Reminder"}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1.5 md:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Title
                    </span>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Enter reminder title"
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Reminder Type
                    </span>
                    <select
                      value={form.type}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          type: e.target.value as ReminderType,
                        }))
                      }
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                    >
                      {typeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {form.type === "ONE_TIME" ? (
                    <label className="space-y-1.5 md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Due Date
                      </span>
                      <input
                        type="date"
                        value={form.dueDate}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, dueDate: e.target.value }))
                        }
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                      />
                    </label>
                  ) : null}

                  {form.type === "WEEKLY" ? (
                    <div className="space-y-2 md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Weekly Days
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {weekdayOptions.map((day) => {
                          const active = form.weeklyDays.includes(day.value);
                          return (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() => toggleWeeklyDay(day.value)}
                              className={`rounded-2xl px-3.5 py-2 text-sm font-medium transition ${
                                active
                                  ? "border border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700"
                                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {form.type === "MONTHLY" ? (
                    <label className="space-y-1.5 md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Every Month On Date
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={form.monthlyDay}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            monthlyDay: e.target.value,
                          }))
                        }
                        placeholder="e.g. 10"
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                      />
                    </label>
                  ) : null}

                  {form.type === "YEARLY" ? (
                    <>
                      <label className="space-y-1.5">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Month
                        </span>
                        <select
                          value={form.yearlyMonth}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              yearlyMonth: e.target.value,
                            }))
                          }
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                        >
                          {monthOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-1.5">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Date
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={form.yearlyDay}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              yearlyDay: e.target.value,
                            }))
                          }
                          placeholder="e.g. 31"
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                        />
                      </label>
                    </>
                  ) : null}
<label className="space-y-1.5">
  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
    Hour
  </span>
  <input
    type="number"
    min={0}
    max={23}
    value={form.notifyHour}
    onChange={(e) =>
      setForm((prev) => ({
        ...prev,
        notifyHour: e.target.value,
      }))
    }
    placeholder="09"
    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
  />
</label>

<label className="space-y-1.5">
  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
    Minute
  </span>
  <input
    type="number"
    min={0}
    max={59}
    value={form.notifyMinute}
    onChange={(e) =>
      setForm((prev) => ({
        ...prev,
        notifyMinute: e.target.value,
      }))
    }
    placeholder="00"
    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
  />
</label>
                  <label className="space-y-1.5 md:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Notes
                    </span>
                    <textarea
                      rows={4}
                      value={form.notes}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      placeholder="Optional note"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none"
                    />
                  </label>
                </div>

                <label className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={form.emailEnabled}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        emailEnabled: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Send reminder email on due date
                  </span>
                </label>

                {error ? (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                    {error}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveReminder}
                  className="h-11 rounded-2xl bg-[linear-gradient(135deg,#d946ef_0%,#7c3aed_100%)] px-4 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(168,85,247,0.24)]"
                >
                  {form.id ? "Update Reminder" : "Save Reminder"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}