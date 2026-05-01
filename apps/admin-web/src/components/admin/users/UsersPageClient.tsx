"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import GlobalPageLoader from "@/components/admin/GlobalPageLoader";
import {
  CheckCircle2,
  Edit3,
  Filter,
  Loader2,
  Mail,
  MoreHorizontal,
  Plus,
  Power,
  Search,
  Trash2,
  UserPlus2,
  Users,
  X,
  XCircle,
} from "lucide-react";
import UserFormModal from "./UserFormModal";
import type { PortalUser, UserStatusFilter } from "@/types/user";
import type { UserFormValues } from "@/lib/user-validation";
import {
  createUser,
  deleteUser,
  getUsers,
  sendUserCredentials,
  toggleUserStatus,
  updateUser,
} from "@/lib/users-api";

type ActionMessage = {
  type: "success" | "error";
  text: string;
} | null;

function formatDate(date?: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type UserActionMenuProps = {
  user: PortalUser;
  open: boolean;
  loading: boolean;
  mobile?: boolean;
  onToggle: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDeactivateToggle: () => void;
  onSendEmail: () => void;
  onDelete: () => void;
};

function UserActionMenu({
  user,
  open,
  loading,
  mobile = false,
  onToggle,
  onClose,
  onEdit,
  onDeactivateToggle,
  onSendEmail,
  onDelete,
}: UserActionMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open, onClose]);

  const runAction = (callback: () => void) => {
    callback();
    window.requestAnimationFrame(() => {
      onClose();
    });
  };

  return (
    <div
      ref={menuRef}
      className="relative inline-flex items-center justify-end overflow-visible"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition duration-200 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
      >
        <MoreHorizontal size={18} />
      </button>

{open && !mobile && (
  <div className="absolute right-0 top-full z-[100] mt-2 w-52 rounded-[20px] border border-violet-100/80 bg-white p-2 shadow-[0_18px_48px_rgba(124,58,237,0.12)] lg:right-full lg:top-1/2 lg:mt-0 lg:mr-3 lg:-translate-y-1/2">
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        runAction(onEdit);
      }}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
    >
      <Edit3 size={15} />
      Edit User
    </button>

    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        runAction(onDeactivateToggle);
      }}
      disabled={loading}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-amber-50 disabled:opacity-60"
    >
      <Power size={15} />
      {user.isActive ? "Deactivate" : "Activate"}
    </button>

    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        runAction(onSendEmail);
      }}
      disabled={loading}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-violet-50 disabled:opacity-60"
    >
      <Mail size={15} />
      Send Email
    </button>

    <div className="my-1 h-px bg-slate-100" />

    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        runAction(onDelete);
      }}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
    >
      <Trash2 size={15} />
      Delete User
    </button>
  </div>
)}
    </div>
  );
}

export default function UsersPageClient() {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<UserStatusFilter>("all");

  const [message, setMessage] = useState<ActionMessage>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [editUser, setEditUser] = useState<PortalUser | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const [deleteUserData, setDeleteUserData] = useState<PortalUser | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
const [mobileSearchDraft, setMobileSearchDraft] = useState("");
const [mobileStatusDraft, setMobileStatusDraft] =
  useState<UserStatusFilter>("all");
const [mounted, setMounted] = useState(false);

  const loadUsers = async (soft = false) => {
    try {
      if (soft) setTableLoading(true);
      else setLoading(true);

      const data = await getUsers({ search, status });
      setUsers(data.items || []);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to load users",
      });
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

 useEffect(() => {
  setMounted(true);
}, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadUsers(true);
  }, [search, status]);
  useEffect(() => {
  if (!mobileFilterOpen) return;

  setMobileSearchDraft(searchInput);
  setMobileStatusDraft(status);
}, [mobileFilterOpen, searchInput, status]);
useEffect(() => {
  if (!openActionMenuId) {
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
}, [openActionMenuId]);
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const inactive = users.filter((u) => !u.isActive).length;
    return { total, active, inactive };
  }, [users]);

  const onCreate = async (values: UserFormValues) => {
    setCreateLoading(true);
    setMessage(null);

    try {
      await createUser({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || undefined,
        gstin: values.gstin.trim() || undefined,
        pan: values.pan.trim() || undefined,
        address: values.address.trim(),
        sendCredentials: values.sendCredentials,
      });

      setCreateOpen(false);
      setMessage({
        type: "success",
        text: values.sendCredentials
          ? "User created and credentials mail sent successfully."
          : "User created successfully.",
      });
      await loadUsers(true);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create user",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const onEdit = async (values: UserFormValues) => {
    if (!editUser) return;

    setEditLoading(true);
    setMessage(null);

    try {
     await updateUser(editUser.id, {
  name: values.name.trim(),
  email: values.email.trim(),
  phone: values.phone.trim() || null,
  gstin: values.gstin.trim() || null,
  pan: values.pan.trim() || null,
  address: values.address.trim() || null,
});

      setEditUser(null);
      setMessage({
        type: "success",
        text: "User updated successfully.",
      });
      await loadUsers(true);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update user",
      });
    } finally {
      setEditLoading(false);
    }
  };

  const onDelete = async () => {
    if (!deleteUserData) return;

    setActionLoadingId(deleteUserData.id);
    setMessage(null);

    try {
      await deleteUser(deleteUserData.id);
      setDeleteUserData(null);
      setMessage({
        type: "success",
        text: "User deleted successfully.",
      });
      await loadUsers(true);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to delete user",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const onToggleStatus = async (user: PortalUser) => {
    setActionLoadingId(user.id);
    setMessage(null);

    try {
      await toggleUserStatus(user.id, !user.isActive);
      setMessage({
        type: "success",
        text: user.isActive
          ? "User deactivated successfully."
          : "User activated successfully.",
      });
      await loadUsers(true);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update status",
      });
    } finally {
      setActionLoadingId(null);
    }
  };
const applyMobileFilters = () => {
  setSearchInput(mobileSearchDraft);
  setStatus(mobileStatusDraft);
  setMobileFilterOpen(false);
};
  const onSendCredentials = async (user: PortalUser) => {
    setActionLoadingId(user.id);
    setMessage(null);

    try {
      await sendUserCredentials(user.id);
      setMessage({
        type: "success",
        text: `Credentials mail sent to ${user.email}`,
      });
      await loadUsers(true);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to send credentials",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="w-full px-0 py-0">
      <div className="w-full rounded-none border-0 bg-transparent p-0 shadow-none">
       <div className="rounded-[26px] border border-violet-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,245,255,0.96))] p-4 shadow-[0_24px_70px_rgba(124,58,237,0.10)] backdrop-blur-xl md:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
             <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 shadow-sm">
  <Users size={14} />
 User Portal
</div>

              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                Users Management
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Add, manage, edit, deactivate, delete, and send credentials to
                customer portal users from one advanced control panel.
              </p>
            </div>

            <button
  type="button"
  onClick={() => setCreateOpen(true)}
  className="hidden items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-violet-600 to-violet-700 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(147,51,234,0.24)] transition duration-300 hover:-translate-y-0.5 hover:opacity-95 active:scale-[0.98] xl:inline-flex"
>
              <Plus size={18} />
              Add User
            </button>
          </div>

          
       {message && (
  <div
    className={`mt-5 rounded-[22px] border px-4 py-3 text-sm font-medium shadow-sm ${
      message.type === "success"
        ? "border-emerald-200 bg-emerald-50/80 text-emerald-700"
        : "border-rose-200 bg-rose-50/80 text-rose-700"
    }`}
  >
    {message.text}
  </div>
)}
<div className="mt-4 grid grid-cols-2 gap-3 lg:hidden">
  <button
    type="button"
    onClick={() => setCreateOpen(true)}
    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-violet-600 to-violet-700 px-4 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(147,51,234,0.24)]"
  >
    <Plus size={17} />
    Add User
  </button>

  <button
    type="button"
    onClick={() => setMobileFilterOpen(true)}
    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-violet-100 bg-white/92 px-4 text-sm font-semibold text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
  >
    <Filter size={16} />
    Apply Filter
  </button>
</div>
          <div className="mt-5 rounded-[26px] border border-violet-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,245,255,0.94))] p-4 shadow-[0_18px_46px_rgba(124,58,237,0.08)]">
            <div className="hidden flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:flex">
              <div className="relative w-full lg:max-w-xl">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by name, email, phone, GSTIN, PAN..."
                 className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-800 outline-none transition duration-300 placeholder:text-slate-400 focus:border-violet-400 focus:shadow-[0_0_0_4px_rgba(167,139,250,0.12)]"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as UserStatusFilter)}
                 className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition duration-300 focus:border-violet-400 focus:shadow-[0_0_0_4px_rgba(167,139,250,0.10)]"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                <button
                  type="button"
                  onClick={() => loadUsers(true)}
                 className="h-12 rounded-2xl border border-violet-100 bg-white/90 px-5 text-sm font-semibold text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.03)] transition duration-300 hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50/60"
                >
                  Refresh
                </button>
              </div>
            </div>
            <div className="mt-5">
{loading ? (
  <div className="flex min-h-[280px] items-center justify-center rounded-[24px] border border-dashed border-violet-200 bg-white">
    <div className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-700">
        Loading users...
      </p>

      <p className="mt-1 text-sm text-slate-500">
        Please wait while we prepare the list.
      </p>
    </div>
  </div>
) : users.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[24px] border border-dashed border-violet-200 bg-white text-center">
  <div className="rounded-full bg-violet-50 p-4 text-violet-600">
    <UserPlus2 size={30} />
  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    No users found
                  </h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Try changing filters or create your first customer portal user.
                  </p>
                </div>
              ) : (
                <>
                 <div className="hidden overflow-visible rounded-[24px] border border-violet-100/80 bg-white lg:block shadow-[0_12px_28px_rgba(124,58,237,0.05)] lg:block">
                    <div className="overflow-visible">
                      <table className="w-full table-fixed">
                        <colgroup>
                          <col className="w-[28%]" />
                          <col className="w-[29%]" />
                          <col className="w-[25%]" />
                          <col className="w-[10%]" />
                          <col className="w-[10%]" />
                        </colgroup>

                        <thead className="border-b border-violet-100 bg-[linear-gradient(135deg,rgba(168,85,247,0.07),rgba(124,58,237,0.05),rgba(236,72,153,0.04))]">
                          <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">
                            <th className="px-4 py-4 font-semibold">User</th>
                            <th className="px-4 py-4 font-semibold">Contact</th>
                            <th className="px-4 py-4 font-semibold">Tax</th>
                            <th className="px-4 py-4 font-semibold">Status</th>
                            <th className="px-3 py-4 text-right font-semibold">Action</th>
                          </tr>
                        </thead>

                        <tbody>
                          {users.map((user, index) => (
                            <tr
                              key={user.id}
                              className={`transition duration-300 hover:bg-violet-50/40 ${
                                index !== users.length - 1 ? "border-t border-slate-100" : ""
                              }`}
                            >
                              <td className="px-4 py-4 align-top">
                                <div className="max-w-full">
                                  <p className="truncate text-[15px] font-semibold text-slate-900">
                                    {user.name}
                                  </p>
                                  <p className="mt-1 truncate text-xs text-slate-500">
                                    Created: {formatDate(user.createdAt)}
                                  </p>
                                </div>
                              </td>

                              <td className="px-4 py-4 align-top">
                                <div className="max-w-full space-y-1">
                                  <p className="truncate text-sm font-medium text-slate-800">
                                    {user.email}
                                  </p>
                                  <p className="truncate text-sm text-slate-500">
                                    {user.phone || "No phone"}
                                  </p>
                                </div>
                              </td>

                              <td className="px-4 py-4 align-top">
                                <div className="max-w-full space-y-1">
                                  <p className="truncate text-sm text-slate-700">
                                    GSTIN: {user.gstin || "—"}
                                  </p>
                                  <p className="truncate text-sm text-slate-500">
                                    PAN: {user.pan || "—"}
                                  </p>
                                </div>
                              </td>

                              <td className="px-4 py-4 align-top">
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                                    user.isActive
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border-rose-200 bg-rose-50 text-rose-700"
                                  }`}
                                >
                                  {user.isActive ? "Active" : "Inactive"}
                                </span>
                              </td>

                              <td className="px-3 py-4 align-top">
                                <div className="flex justify-end overflow-visible">
                                  <UserActionMenu
                                    user={user}
                                    open={openActionMenuId === user.id}
                                    loading={actionLoadingId === user.id}
                                    onToggle={() =>
                                      setOpenActionMenuId((prev) =>
                                        prev === user.id ? null : user.id
                                      )
                                    }
                                    onClose={() => setOpenActionMenuId(null)}
                                    onEdit={() => setEditUser(user)}
                                    onDeactivateToggle={() => onToggleStatus(user)}
                                    onSendEmail={() => onSendCredentials(user)}
                                    onDelete={() => setDeleteUserData(user)}
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {tableLoading && (
                      <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                        Updating list...
                      </div>
                    )}
                  </div>

<div className="lg:hidden">
  <table className="w-full table-fixed overflow-hidden rounded-[20px] border border-violet-100/80 bg-white">
    <colgroup>
      <col className="w-[76%]" />
      <col className="w-[24%]" />
    </colgroup>

    <thead className="border-b border-violet-100 bg-[linear-gradient(135deg,rgba(168,85,247,0.07),rgba(124,58,237,0.05),rgba(236,72,153,0.04))]">
      <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-slate-500">
        <th className="px-3 py-2.5 font-semibold">Name</th>
        <th className="px-2 py-2.5 text-center font-semibold">Action</th>
      </tr>
    </thead>

    <tbody>
      {users.map((user, index) => (
        <tr
          key={user.id}
          className={`${index !== 0 ? "border-t border-slate-100" : ""}`}
        >
          <td className="px-3 py-3 align-middle">
            <p className="truncate text-[14px] font-bold text-slate-900">
              {user.name}
            </p>
          </td>

          <td className="px-2 py-2 align-middle text-center">
            <div className="flex justify-center">
             <UserActionMenu
  user={user}
  mobile
  open={openActionMenuId === user.id}
  loading={actionLoadingId === user.id}
  onToggle={() =>
    setOpenActionMenuId((prev) =>
      prev === user.id ? null : user.id
    )
  }
  onClose={() => setOpenActionMenuId(null)}
  onEdit={() => setEditUser(user)}
  onDeactivateToggle={() => onToggleStatus(user)}
  onSendEmail={() => onSendCredentials(user)}
  onDelete={() => setDeleteUserData(user)}
/>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
{mounted && mobileFilterOpen && (
  <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/30 px-4 py-5 backdrop-blur-[2px] lg:hidden">
    <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-violet-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(250,245,255,0.98))] shadow-[0_24px_60px_rgba(124,58,237,0.14)]">
      <div className="flex items-center justify-between border-b border-violet-100 bg-[linear-gradient(135deg,rgba(168,85,247,0.08),rgba(124,58,237,0.06),rgba(236,72,153,0.05))] px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">
            User Filter
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">
            Apply Filter
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setMobileFilterOpen(false)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-4 px-5 py-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Search
          </label>
          <input
            value={mobileSearchDraft}
            onChange={(e) => setMobileSearchDraft(e.target.value)}
            placeholder="Search by name, email, phone..."
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:shadow-[0_0_0_4px_rgba(167,139,250,0.12)]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Status
          </label>
          <select
            value={mobileStatusDraft}
            onChange={(e) =>
              setMobileStatusDraft(e.target.value as UserStatusFilter)
            }
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:shadow-[0_0_0_4px_rgba(167,139,250,0.10)]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMobileFilterOpen(false)}
            className="h-11 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={applyMobileFilters}
            className="h-11 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-violet-600 to-violet-700 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(147,51,234,0.24)]"
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  </div>
)}
{mounted && openActionMenuId && (
  <div className="fixed inset-0 z-[135] flex items-end bg-slate-900/30 px-3 py-3 backdrop-blur-[2px] lg:hidden">
    <div className="w-full rounded-[28px] border border-violet-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(250,245,255,0.98))] p-3 shadow-[0_24px_60px_rgba(124,58,237,0.16)]">
      <div className="mb-2 flex justify-center">
        <div className="h-1.5 w-12 rounded-full bg-slate-200" />
      </div>

      {(() => {
        const selectedUser =
          users.find((user) => user.id === openActionMenuId) || null;

        if (!selectedUser) return null;

        return (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                setEditUser(selectedUser);
                setOpenActionMenuId(null);
              }}
              className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Edit3 size={16} />
              Edit User
            </button>

            <button
              type="button"
              onClick={() => {
                void onToggleStatus(selectedUser);
                setOpenActionMenuId(null);
              }}
              className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-amber-50"
            >
              <Power size={16} />
              {selectedUser.isActive ? "Deactivate" : "Activate"}
            </button>

            <button
              type="button"
              onClick={() => {
                void onSendCredentials(selectedUser);
                setOpenActionMenuId(null);
              }}
              className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-violet-50"
            >
              <Mail size={16} />
              Send Email
            </button>

            <div className="my-1 h-px bg-slate-100" />

            <button
              type="button"
              onClick={() => {
                setDeleteUserData(selectedUser);
                setOpenActionMenuId(null);
              }}
              className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
            >
              <Trash2 size={16} />
              Delete User
            </button>

            <button
              type="button"
              onClick={() => setOpenActionMenuId(null)}
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
      <UserFormModal
        open={createOpen}
        mode="create"
        loading={createLoading}
        onClose={() => setCreateOpen(false)}
        onSubmit={onCreate}
      />

      <UserFormModal
        open={!!editUser}
        mode="edit"
        user={editUser}
        loading={editLoading}
        onClose={() => setEditUser(null)}
        onSubmit={onEdit}
      />

      {deleteUserData && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
            <h3 className="text-xl font-bold text-slate-900">Delete User</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900">
                {deleteUserData.name}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteUserData(null)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition duration-300 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={onDelete}
                disabled={actionLoadingId === deleteUserData.id}
                className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-rose-500 disabled:opacity-60"
              >
                {actionLoadingId === deleteUserData.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}