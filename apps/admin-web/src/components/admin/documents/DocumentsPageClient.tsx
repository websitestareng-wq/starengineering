"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FilePlus2,
  FileText,
  Folder,
  FolderKanban,
  FolderPlus,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import {
  createDocumentCategory,
  createDocumentFolder,
  deleteDocumentCategory,
  deleteDocumentFile,
  deleteDocumentFolder,
  DocumentCategoryRecord,
  DocumentFileRecord,
  DocumentFolderRecord,
  getDocumentFileDownloadUrl,
  getDocumentTree,
  updateDocumentCategory,
  updateDocumentFolder,
  uploadDocumentFiles,
} from "@/lib/api/documents-api";

type TreeResponse = {
  rootFiles: DocumentFileRecord[];
  categories: DocumentCategoryRecord[];
};

type ExplorerNode =
  | {
      type: "category";
      id: string;
      name: string;
    }
  | {
      type: "folder";
      id: string;
      name: string;
      categoryId?: string | null;
      parentFolderId?: string | null;
    };

type CreateModalMode = "category" | "folder" | null;

type RenameTarget =
  | { type: "category"; id: string }
  | { type: "folder"; id: string }
  | null;

type ActionMenuState = {
  fileId: string;
  x: number;
  y: number;
} | null;

const listMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
  transition: { duration: 0.2, ease: "easeOut" as const },
};

function formatBytes(value?: number | null) {
  const size = Number(value || 0);
  if (!size) return "—";

  const units = ["B", "KB", "MB", "GB"];
  let current = size;
  let index = 0;

  while (current >= 1024 && index < units.length - 1) {
    current /= 1024;
    index += 1;
  }

  return `${current.toFixed(current >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function getFolderChildren(folder: DocumentFolderRecord): DocumentFolderRecord[] {
  return folder.childFolders || [];
}

function findFolderById(
  folders: DocumentFolderRecord[],
  id: string,
): DocumentFolderRecord | null {
  for (const folder of folders) {
    if (folder.id === id) return folder;

    const nested = findFolderById(getFolderChildren(folder), id);
    if (nested) return nested;
  }

  return null;
}

function flattenFolders(folders: DocumentFolderRecord[]): DocumentFolderRecord[] {
  const result: DocumentFolderRecord[] = [];

  for (const folder of folders) {
    result.push(folder);
    result.push(...flattenFolders(folder.childFolders || []));
  }

  return result;
}

export default function DocumentsPageClient() {
  const [tree, setTree] = useState<TreeResponse>({
    rootFiles: [],
    categories: [],
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [currentNode, setCurrentNode] = useState<ExplorerNode | null>(null);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [createModalMode, setCreateModalMode] = useState<CreateModalMode>(null);
  const [renameTarget, setRenameTarget] = useState<RenameTarget>(null);
  const [renameValue, setRenameValue] = useState("");
  const [actionMenu, setActionMenu] = useState<ActionMenuState>(null);
  const [fileSearch, setFileSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedExplorerItemId, setSelectedExplorerItemId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const openFolderNode = (folder: DocumentFolderRecord) => {
    setCurrentNode({
      type: "folder",
      id: folder.id,
      name: folder.name,
      categoryId: folder.categoryId,
      parentFolderId: folder.parentFolderId,
    });
    setSelectedExplorerItemId(folder.id);
  };

  const openCategoryNode = (category: DocumentCategoryRecord) => {
    setCurrentNode({
      type: "category",
      id: category.id,
      name: category.name,
    });
    setSelectedExplorerItemId(category.id);
  };

  const closeCreateModal = () => {
    setCreateModalMode(null);
    setNewCategoryName("");
    setNewFolderName("");
  };

  const startRenameCategory = (id: string, currentName: string) => {
    setRenameTarget({ type: "category", id });
    setRenameValue(currentName);
  };

  const startRenameFolder = (id: string, currentName: string) => {
    setRenameTarget({ type: "folder", id });
    setRenameValue(currentName);
  };

  const cancelRename = () => {
    setRenameTarget(null);
    setRenameValue("");
  };

  const loadTree = async () => {
    try {
      setLoading(true);
      const data = await getDocumentTree();
      setTree(data as unknown as TreeResponse);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to load documents.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRenameSave = async () => {
    const value = renameValue.trim();
    if (!renameTarget || !value) return;

    try {
      setSubmitting(true);

      if (renameTarget.type === "category") {
        await updateDocumentCategory(renameTarget.id, value);
      } else {
        await updateDocumentFolder(renameTarget.id, value);
      }

      setMessage({
        type: "success",
        text:
          renameTarget.type === "category"
            ? "Category renamed successfully."
            : "Folder renamed successfully.",
      });

      cancelRename();
      await loadTree();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Rename failed.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getCurrentFolder = () => {
    if (!currentNode || currentNode.type !== "folder") return null;

    for (const category of tree.categories) {
      const found = findFolderById(category.folders || [], currentNode.id);
      if (found) return found;
    }

    return null;
  };

  const openActionMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
    fileId: string,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();

    setActionMenu((prev) =>
      prev?.fileId === fileId
        ? null
        : {
            fileId,
            x: Math.max(12, rect.right - 192),
            y: rect.bottom + 10,
          },
    );
  };

  const searchableFiles = useMemo(() => {
    const term = fileSearch.trim().toLowerCase();
    if (!term) return [];

    const results: Array<{
      file: DocumentFileRecord;
      folder: DocumentFolderRecord | null;
      category: DocumentCategoryRecord | null;
    }> = [];

    for (const category of tree.categories) {
      const allFolders = flattenFolders(category.folders || []);

      for (const folder of allFolders) {
        for (const file of folder.files || []) {
          if (
            file.name.toLowerCase().includes(term) ||
            file.originalName.toLowerCase().includes(term)
          ) {
            results.push({
              file,
              folder,
              category,
            });
          }
        }
      }
    }

    return results.slice(0, 8);
  }, [fileSearch, tree]);

  const handleSearchSelect = (item: {
    file: DocumentFileRecord;
    folder: DocumentFolderRecord | null;
    category: DocumentCategoryRecord | null;
  }) => {
    if (item.folder) {
      openFolderNode(item.folder);
    } else if (item.category) {
      openCategoryNode(item.category);
    }

    setFileSearch("");
    setSearchOpen(false);
  };

  const breadcrumb = useMemo(() => {
    if (!currentNode) return [];

    if (currentNode.type === "category") {
      return [
        {
          id: currentNode.id,
          label: currentNode.name,
          type: "category" as const,
        },
      ];
    }

    const items: Array<{ id: string; label: string; type: "category" | "folder" }> = [];

    for (const category of tree.categories) {
      const walk = (
        folders: DocumentFolderRecord[],
        trail: DocumentFolderRecord[],
      ): DocumentFolderRecord[] | null => {
        for (const folder of folders) {
          if (folder.id === currentNode.id) {
            return [...trail, folder];
          }

          const nested = walk(getFolderChildren(folder), [...trail, folder]);
          if (nested) return nested;
        }

        return null;
      };

      const foundTrail = walk(category.folders || [], []);
      if (foundTrail) {
        items.push({
          id: category.id,
          label: category.name,
          type: "category",
        });

        for (const folder of foundTrail) {
          items.push({
            id: folder.id,
            label: folder.name,
            type: "folder",
          });
        }

        break;
      }
    }

    return items;
  }, [tree, currentNode]);

  const goBackOneLevel = () => {
    if (!breadcrumb.length || breadcrumb.length === 1) {
      setCurrentNode(null);
      setSelectedExplorerItemId(null);
      return;
    }

    const previous = breadcrumb[breadcrumb.length - 2];

    if (previous.type === "category") {
      setCurrentNode({
        type: "category",
        id: previous.id,
        name: previous.label,
      });
      setSelectedExplorerItemId(previous.id);
    } else {
      setCurrentNode({
        type: "folder",
        id: previous.id,
        name: previous.label,
      });
      setSelectedExplorerItemId(previous.id);
    }
  };

  useEffect(() => {
    loadTree();
  }, []);

  useEffect(() => {
    const close = () => {
      setOpenActionId(null);
      setActionMenu(null);
      setSearchOpen(false);
    };

    window.addEventListener("click", close);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);

    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, []);

  const isLeafFolderSelected = useMemo(() => {
    if (!currentNode || currentNode.type !== "folder") return false;

    const folder = getCurrentFolder();
    if (!folder) return false;

    return (folder.childFolders || []).length === 0;
  }, [currentNode, tree]);

  const shouldShowFiles = useMemo(() => {
    if (!currentNode) return false;
    if (currentNode.type === "category") return false;
    return isLeafFolderSelected;
  }, [currentNode, isLeafFolderSelected]);

  const currentFiles = useMemo(() => {
    if (!shouldShowFiles || !currentNode) return [];

    if (currentNode.type === "folder") {
      for (const category of tree.categories) {
        const found = findFolderById(category.folders || [], currentNode.id);
        if (found) {
          return found.files || [];
        }
      }
    }

    return [];
  }, [tree, currentNode, shouldShowFiles]);

  const currentFolders = useMemo(() => {
    if (!currentNode) {
      return tree.categories.map((category) => ({
        id: category.id,
        name: category.name,
        type: "category" as const,
        itemCount: (category.folders || []).length + (category.files || []).length,
        category,
        folder: null,
      }));
    }

    if (currentNode.type === "category") {
      const category = tree.categories.find((item) => item.id === currentNode.id);

      return (category?.folders || []).map((folder) => ({
        id: folder.id,
        name: folder.name,
        type: "folder" as const,
        itemCount: (folder.childFolders || []).length + (folder.files || []).length,
        category: null,
        folder,
      }));
    }

    let selectedFolder: DocumentFolderRecord | null = null;

    for (const category of tree.categories) {
      const found = findFolderById(category.folders || [], currentNode.id);
      if (found) {
        selectedFolder = found;
        break;
      }
    }

    return (selectedFolder?.childFolders || []).map((child) => ({
      id: child.id,
      name: child.name,
      type: "folder" as const,
      itemCount: (child.childFolders || []).length + (child.files || []).length,
      category: null,
      folder: child,
    }));
  }, [tree, currentNode]);

  const handleCreateCategory = async () => {
    const value = newCategoryName.trim();
    if (!value) return;

    try {
      setSubmitting(true);
      await createDocumentCategory(value);
      closeCreateModal();
      setMessage({ type: "success", text: "Category created successfully." });
      await loadTree();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create category.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateFolder = async () => {
    const value = newFolderName.trim();
    if (!value) return;

    if (!currentNode) {
      setMessage({
        type: "error",
        text: "Please open a category or folder first.",
      });
      return;
    }

    try {
      setSubmitting(true);

      if (currentNode.type === "category") {
        await createDocumentFolder({
          name: value,
          categoryId: currentNode.id,
        });
      } else {
        await createDocumentFolder({
          name: value,
          parentFolderId: currentNode.id,
        });
      }

      closeCreateModal();
      setMessage({ type: "success", text: "Folder created successfully." });
      await loadTree();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create folder.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const ok = window.confirm("Delete this category and everything inside it?");
    if (!ok) return;

    try {
      await deleteDocumentCategory(id);
      setCurrentNode(null);
      setMessage({ type: "success", text: "Category deleted successfully." });
      await loadTree();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to delete category.",
      });
    }
  };

  const handleDeleteFolder = async (id: string) => {
    const ok = window.confirm("Delete this folder and everything inside it?");
    if (!ok) return;

    try {
      await deleteDocumentFolder(id);
      setCurrentNode(null);
      setMessage({ type: "success", text: "Folder deleted successfully." });
      await loadTree();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to delete folder.",
      });
    }
  };

  const handleDeleteFile = async (id: string) => {
    const ok = window.confirm("Delete this file?");
    if (!ok) return;

    try {
      await deleteDocumentFile(id);
      setMessage({ type: "success", text: "File deleted successfully." });
      await loadTree();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to delete file.",
      });
    }
  };

  const handleUpload = async (incoming: FileList | null) => {
    if (!incoming?.length) return;

    const files = Array.from(incoming);

    try {
      setSubmitting(true);

      if (currentNode?.type === "folder") {
        await uploadDocumentFiles({
          files,
          folderId: currentNode.id,
        });
      } else if (currentNode?.type === "category") {
        await uploadDocumentFiles({
          files,
          categoryId: currentNode.id,
        });
      } else {
        await uploadDocumentFiles({
          files,
        });
      }

      setMessage({ type: "success", text: "Files uploaded successfully." });
      await loadTree();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to upload files.",
      });
    } finally {
      setSubmitting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl"
      >
        <div className="border-b border-slate-200/80 bg-[linear-gradient(135deg,rgba(244,63,94,0.04),rgba(139,92,246,0.05),rgba(59,130,246,0.03))] px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-600 via-violet-600 to-blue-600 text-white shadow-[0_18px_35px_rgba(99,102,241,0.22)]">
                  <FolderKanban className="h-5 w-5" />
                </div>

                <h1 className="text-[2rem] font-semibold leading-[1.05] tracking-tight text-slate-900 sm:text-[2.15rem]">
                  Documents Explorer
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  Browse categories, open folders, and manage files like a premium desktop explorer.
                </p>
              </div>

              <div className="min-w-0 xl:w-auto xl:max-w-[760px]">
                <div className="hidden items-center justify-end gap-2 md:flex">
                  <div
                    className="relative w-full max-w-[340px] lg:max-w-[380px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={fileSearch}
                      onChange={(e) => {
                        setFileSearch(e.target.value);
                        setSearchOpen(true);
                      }}
                      onFocus={() => setSearchOpen(true)}
                      placeholder="Search files..."
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    />

                    <AnimatePresence>
                      {searchOpen && fileSearch.trim() ? (
                        <motion.div
                          {...listMotion}
                          className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.12)]"
                        >
                          {searchableFiles.length ? (
                            searchableFiles.map((item) => (
                              <button
                                key={item.file.id}
                                type="button"
                                onClick={() => handleSearchSelect(item)}
                                className="flex w-full cursor-pointer items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50"
                              >
                                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                                  <FileText className="h-4 w-4" />
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {item.file.name}
                                  </p>
                                  <p className="truncate text-xs text-slate-500">
                                    {item.category?.name}
                                    {item.folder ? ` → ${item.folder.name}` : ""}
                                  </p>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-sm text-slate-500">
                              No matching files found.
                            </div>
                          )}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>

                  <motion.button
                    whileHover={{ y: -1, scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-violet-600 to-blue-600 px-4 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(99,102,241,0.22)] transition-all duration-200 hover:shadow-[0_20px_34px_rgba(99,102,241,0.28)]"
                  >
                    <UploadCloud className="h-4 w-4" />
                    Upload
                  </motion.button>

                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.985 }}
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      setCreateModalMode("category");
                    }}
                    className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50"
                  >
                    <Plus className="h-4 w-4" />
                    Category
                  </motion.button>

                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.985 }}
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      setCreateModalMode("folder");
                    }}
                    disabled={!currentNode || (currentNode.type !== "category" && currentNode.type !== "folder")}
                    className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl border px-4 text-sm font-medium transition-all duration-200 ${
                      !currentNode || (currentNode.type !== "category" && currentNode.type !== "folder")
                        ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-70"
                        : "cursor-pointer border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <FolderPlus className="h-4 w-4" />
                    {currentNode?.type === "folder" ? "Subfolder" : "Folder"}
                  </motion.button>
                </div>

                <div className="md:hidden">
                  <div className="flex items-center gap-2">
                    <div
                      className="relative min-w-0 flex-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={fileSearch}
                        onChange={(e) => {
                          setFileSearch(e.target.value);
                          setSearchOpen(true);
                        }}
                        onFocus={() => setSearchOpen(true)}
                        placeholder="Search files..."
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      />

                      <AnimatePresence>
                        {searchOpen && fileSearch.trim() ? (
                          <motion.div
                            {...listMotion}
                            className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.12)]"
                          >
                            {searchableFiles.length ? (
                              searchableFiles.map((item) => (
                                <button
                                  key={item.file.id}
                                  type="button"
                                  onClick={() => handleSearchSelect(item)}
                                  className="flex w-full cursor-pointer items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50"
                                >
                                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                                    <FileText className="h-4 w-4" />
                                  </div>

                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-900">
                                      {item.file.name}
                                    </p>
                                    <p className="truncate text-xs text-slate-500">
                                      {item.category?.name}
                                      {item.folder ? ` → ${item.folder.name}` : ""}
                                    </p>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-sm text-slate-500">
                                No matching files found.
                              </div>
                            )}
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      type="button"
                      onClick={() => {
                        setSearchOpen(false);
                        fileInputRef.current?.click();
                      }}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-fuchsia-600 via-violet-600 to-blue-600 text-white shadow-[0_12px_24px_rgba(99,102,241,0.22)]"
                    >
                      <UploadCloud className="h-4 w-4" />
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      type="button"
                      onClick={() => {
                        setSearchOpen(false);
                        setCreateModalMode("category");
                      }}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"
                    >
                      <Plus className="h-4 w-4" />
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      type="button"
                      onClick={() => {
                        setSearchOpen(false);
                        setCreateModalMode("folder");
                      }}
                      disabled={!currentNode || (currentNode.type !== "category" && currentNode.type !== "folder")}
                      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                        !currentNode || (currentNode.type !== "category" && currentNode.type !== "folder")
                          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-70"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      <FolderPlus className="h-4 w-4" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>

        {message ? (
          <div className="px-5 pt-5 sm:px-6">
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {message.text}
            </div>
          </div>
        ) : null}

        <AnimatePresence>
          {createModalMode ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
             className="fixed inset-0 z-[88] flex items-start justify-center bg-slate-900/25 px-4 pt-16 pb-6 backdrop-blur-[2px] sm:pt-28"
              onClick={closeCreateModal}
            >
              <motion.div
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_30px_80px_rgba(15,23,42,0.18)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {createModalMode === "category"
                        ? "Create Category"
                        : currentNode?.type === "folder"
                          ? "Create Subfolder"
                          : "Create Folder"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {createModalMode === "category"
                        ? "Create a top-level category for document grouping."
                        : currentNode
                          ? `Selected: ${currentNode.name}`
                          : "Please open a category or folder first."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {createModalMode === "category" ? (
                  <div className="space-y-3">
                    <input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Enter category name"
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    />

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={closeCreateModal}
                        className="inline-flex h-11 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        disabled={submitting || !newCategoryName.trim()}
                        className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {submitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Save Category
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder={currentNode?.type === "folder" ? "Enter subfolder name" : "Enter folder name"}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    />

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={closeCreateModal}
                        className="inline-flex h-11 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={handleCreateFolder}
                        disabled={
                          submitting ||
                          !newFolderName.trim() ||
                          !currentNode ||
                          (currentNode.type !== "category" && currentNode.type !== "folder")
                        }
                        className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {submitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FilePlus2 className="h-4 w-4" />
                        )}
                        Save Folder
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {renameTarget ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
             className="fixed inset-0 z-[90] flex items-start justify-center bg-slate-900/20 px-4 pt-16 pb-6 backdrop-blur-[2px] sm:pt-28"
            >
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_30px_80px_rgba(15,23,42,0.18)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Rename {renameTarget.type === "category" ? "Category" : "Folder"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Update the display name for this {renameTarget.type}.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={cancelRename}
                    className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    placeholder={`Enter ${renameTarget.type} name`}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition-all duration-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={cancelRename}
                      className="inline-flex h-11 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleRenameSave}
                      disabled={submitting || !renameValue.trim()}
                      className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Save
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="min-h-[620px] p-3 sm:p-4">
          <div className="mb-4 rounded-[22px] border border-slate-200/80 bg-white px-4 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
            <div className="flex flex-wrap items-center gap-2">
              {breadcrumb.length ? (
                <button
                  type="button"
                  onClick={goBackOneLevel}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              ) : null}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-semibold text-slate-900 sm:text-lg">
                    {currentNode ? currentNode.name : "Explorer"}
                  </h2>

                  {breadcrumb.length ? (
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      {breadcrumb.map((item, index) => (
                        <div
                          key={`${item.type}-${item.id}`}
                          className="flex items-center gap-1.5"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (item.type === "category") {
                                setCurrentNode({
                                  type: "category",
                                  id: item.id,
                                  name: item.label,
                                });
                                setSelectedExplorerItemId(item.id);
                              } else {
                                setCurrentNode({
                                  type: "folder",
                                  id: item.id,
                                  name: item.label,
                                });
                                setSelectedExplorerItemId(item.id);
                              }
                            }}
                            className="max-w-[140px] truncate rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 sm:max-w-none"
                          >
                            {item.label}
                          </button>

                          {index < breadcrumb.length - 1 ? (
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  {currentNode
                    ? shouldShowFiles
                      ? "Folder contents"
                      : "Open a folder to continue browsing"
                    : "Open a category or folder like a desktop explorer"}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.04)]">
            <div className="border-b border-slate-200/80 bg-slate-50/70 px-4 py-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 md:grid-cols-[minmax(0,1.4fr)_140px_120px] md:gap-4">
                <div>Name</div>
                <div className="hidden md:block">Type</div>
                <div className="text-right md:text-left">Items / Size</div>
              </div>
            </div>

            {loading ? (
              <div className="space-y-0">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 px-4 py-3 md:grid-cols-[minmax(0,1.4fr)_140px_120px] md:gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 animate-pulse rounded-2xl bg-slate-200" />
                      <div className="space-y-2">
                        <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
                        <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                      </div>
                    </div>
                    <div className="hidden h-4 w-20 animate-pulse rounded bg-slate-200 md:block" />
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-200 justify-self-end md:justify-self-auto" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {currentFolders.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedExplorerItemId(item.id);

                      if (typeof window !== "undefined" && window.innerWidth < 768) {
                        if (item.type === "category" && item.category) {
                          openCategoryNode(item.category);
                        } else if (item.folder) {
                          openFolderNode(item.folder);
                        }
                      }
                    }}
                    onDoubleClick={() => {
                      if (item.type === "category" && item.category) {
                        openCategoryNode(item.category);
                      } else if (item.folder) {
                        openFolderNode(item.folder);
                      }
                    }}
                    className={`grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 px-4 py-3 transition-all duration-200 hover:bg-[linear-gradient(90deg,rgba(248,250,252,0.95),rgba(245,243,255,0.65),rgba(239,246,255,0.7))] md:grid-cols-[minmax(0,1.4fr)_140px_120px] md:gap-4 ${
                      selectedExplorerItemId === item.id ? "bg-violet-50/70" : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-yellow-50 text-amber-600 ring-1 ring-amber-200/60">
                        <Folder className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-slate-900">
                          {item.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {item.type === "category" ? "Tap to open category" : "Tap to open folder"}
                        </p>
                      </div>
                    </div>

                    <div className="hidden text-sm text-slate-600 md:block">
                      {item.type === "category" ? "Category" : "Folder"}
                    </div>

                    <div className="flex items-center justify-end gap-2 md:justify-between">
                      <span className="hidden text-sm text-slate-600 md:inline">
                        {item.itemCount}
                      </span>

                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.type === "category") {
                              startRenameCategory(item.id, item.name);
                            } else {
                              startRenameFolder(item.id, item.name);
                            }
                          }}
                          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.type === "category") {
                              handleDeleteCategory(item.id);
                            } else {
                              handleDeleteFolder(item.id);
                            }
                          }}
                          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-rose-500 transition hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {shouldShowFiles
                  ? currentFiles.map((file) => (
                      <div
                        key={file.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 px-4 py-3 transition-all duration-200 hover:bg-[linear-gradient(90deg,rgba(248,250,252,0.95),rgba(245,243,255,0.65),rgba(239,246,255,0.7))] md:grid-cols-[minmax(0,1.4fr)_140px_120px] md:gap-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-violet-700 ring-1 ring-slate-200/70">
                            <FileText className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-semibold leading-5 text-slate-900 md:text-[14px]">
                              {file.name}
                            </p>

                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                              <span className="truncate">{file.originalName}</span>
                              <span className="md:hidden">• {formatBytes(file.sizeInBytes)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="hidden text-sm text-slate-600 md:block">File</div>

                        <div className="flex items-center justify-end gap-2 md:justify-between">
                          <span className="hidden text-sm text-slate-600 md:inline">
                            {formatBytes(file.sizeInBytes)}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionId((prev) => (prev === file.id ? null : file.id));
                              openActionMenu(e, file.id);
                            }}
                            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm"
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  : null}

                {!currentFolders.length && !shouldShowFiles ? (
                  <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                      <Folder className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      No folders here
                    </h3>
                    <p className="mt-2 max-w-md text-sm text-slate-500">
                      Create a category or folder to start browsing.
                    </p>
                  </div>
                ) : null}

                {shouldShowFiles && !currentFiles.length && !currentFolders.length ? (
                  <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                      <FileText className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      No files here
                    </h3>
                    <p className="mt-2 max-w-md text-sm text-slate-500">
                      Upload files into this folder to see them here.
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </div>

          {typeof window !== "undefined" &&
            actionMenu &&
            openActionId === actionMenu.fileId &&
            createPortal(
              <AnimatePresence>
                <motion.div
                  {...listMotion}
                  onClick={(e) => e.stopPropagation()}
                  className="fixed z-[120] w-48 max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.14)]"
                  style={{
                    left: actionMenu.x,
                    top: actionMenu.y,
                  }}
                >
                  {(() => {
                    const file = currentFiles.find((item) => item.id === actionMenu.fileId);
                    if (!file) return null;

                    return (
                      <>
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => {
                            setOpenActionId(null);
                            setActionMenu(null);
                          }}
                          className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          <FileText className="h-4 w-4" />
                          View
                        </a>

                        <a
                          href={getDocumentFileDownloadUrl(file.id)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => {
                            setOpenActionId(null);
                            setActionMenu(null);
                          }}
                          className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            setOpenActionId(null);
                            setActionMenu(null);
                            handleDeleteFile(file.id);
                          }}
                          className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-sm text-rose-700 transition hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </>
                    );
                  })()}
                </motion.div>
              </AnimatePresence>,
              document.body,
            )}
        </div>
      </motion.div>
    </div>
  );
}