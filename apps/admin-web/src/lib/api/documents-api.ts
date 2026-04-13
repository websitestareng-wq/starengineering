import { API_BASE_URL, apiRequest } from "../api-client";

export type DocumentFileRecord = {
  id: string;
  name: string;
  originalName: string;
  fileName: string;
  fileUrl: string;
  r2Key?: string | null;
  mimeType?: string | null;
  sizeInBytes?: number | null;
  categoryId?: string | null;
  folderId?: string | null;
  uploadedById?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentFolderRecord = {
  id: string;
  name: string;
  categoryId?: string | null;
  parentFolderId?: string | null;
  createdAt: string;
  updatedAt: string;
  childFolders?: DocumentFolderRecord[];
  files?: DocumentFileRecord[];
};

export type DocumentCategoryRecord = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  folders?: DocumentFolderRecord[];
  files?: DocumentFileRecord[];
};

export type DocumentTreeRecord = DocumentCategoryRecord[];

export async function getDocumentTree(): Promise<DocumentTreeRecord> {
  return apiRequest<DocumentTreeRecord>("/documents/tree", {
    method: "GET",
  });
}

export async function createDocumentCategory(
  name: string,
): Promise<DocumentCategoryRecord> {
  return apiRequest<DocumentCategoryRecord>("/documents/categories", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function deleteDocumentCategory(
  id: string,
): Promise<{ success: true }> {
  return apiRequest<{ success: true }>(`/documents/categories/${id}`, {
    method: "DELETE",
  });
}
export async function updateDocumentCategory(
  id: string,
  name: string,
): Promise<DocumentCategoryRecord> {
  return apiRequest<DocumentCategoryRecord>(`/documents/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export type CreateDocumentFolderPayload = {
  name: string;
  categoryId?: string;
  parentFolderId?: string;
};

export async function createDocumentFolder(
  payload: CreateDocumentFolderPayload,
): Promise<DocumentFolderRecord> {
  return apiRequest<DocumentFolderRecord>("/documents/folders", {
    method: "POST",
    body: JSON.stringify({
      name: payload.name,
      categoryId: payload.categoryId,
      parentFolderId: payload.parentFolderId,
    }),
  });
}

export async function deleteDocumentFolder(
  id: string,
): Promise<{ success: true }> {
  return apiRequest<{ success: true }>(`/documents/folders/${id}`, {
    method: "DELETE",
  });
}
export async function updateDocumentFolder(
  id: string,
  name: string,
): Promise<DocumentFolderRecord> {
  return apiRequest<DocumentFolderRecord>(`/documents/folders/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export type UploadDocumentFilesPayload = {
  files: File[];
  categoryId?: string;
  folderId?: string;
};

export async function uploadDocumentFiles(
  payload: UploadDocumentFilesPayload,
): Promise<DocumentFileRecord[]> {
  const formData = new FormData();

  if (payload.categoryId?.trim()) {
    formData.append("categoryId", payload.categoryId.trim());
  }

  if (payload.folderId?.trim()) {
    formData.append("folderId", payload.folderId.trim());
  }

  for (const file of payload.files) {
    formData.append("files", file);
  }

  return apiRequest<DocumentFileRecord[]>("/documents/files", {
    method: "POST",
    body: formData,
  });
}

export async function deleteDocumentFile(
  id: string,
): Promise<{ success: true }> {
  return apiRequest<{ success: true }>(`/documents/files/${id}`, {
    method: "DELETE",
  });
}

export function getDocumentFileDownloadUrl(id: string) {
  return `${API_BASE_URL}/documents/files/${id}/download`;
}