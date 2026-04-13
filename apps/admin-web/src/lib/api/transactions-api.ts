import { apiRequest } from "../api-client";
function getAccessToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("accessToken") || "";
}
export type TransactionType =
  | "SALES"
  | "PURCHASE"
  | "PAYMENT"
  | "RECEIPT"
  | "DEBIT_NOTE"
  | "CREDIT_NOTE"
  | "JOURNAL_DR"
  | "JOURNAL_CR";

export type EntrySide = "DR" | "CR";

export type BillAllocationType =
  | "NEW_REF"
  | "AGAINST_REF"
  | "ADVANCE"
  | "ON_ACCOUNT";

export type OpenRefRecord = {
  id: string;
  transactionId: string;
  voucherNo: string;
  voucherDate: string;
  transactionType: TransactionType;
  allocationType: BillAllocationType;
  side: EntrySide;
  refNo: string | null;
  originalAmount: number;
  settledAmount: number;
  pendingAmount: number;
};

export type TransactionBillRowRecord = {
  adjustedAmount: number;
  id: string;
  transactionId: string;
  allocationType: BillAllocationType;
  side: EntrySide;
  refNo: string | null;
  againstBillRowId: string | null;
  amount: number;
  createdAt?: string;
  updatedAt?: string;
  againstBillRow?: {
    id: string;
    refNo: string | null;
    side: EntrySide;
    allocationType: BillAllocationType;
    transaction?: {
      id: string;
      voucherNo: string;
      voucherDate: string;
      type: TransactionType;
    };
  } | null;
};

export type TransactionAttachmentRecord = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  sizeInBytes?: number | null;
  createdAt?: string;
};

export type TransactionRecord = {
  id: string;
  voucherNo: string;
  voucherDate: string;
  type: TransactionType;
  side: EntrySide;
  amount: number;
  particulars: string;
  sendEmail: boolean;
  partyId: string;
  createdById?: string | null;
  createdAt?: string;
  updatedAt?: string;
  party?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  createdBy?: {
    id: string;
    name: string;
    email?: string | null;
  } | null;
  billRows: TransactionBillRowRecord[];
  attachments?: TransactionAttachmentRecord[];
};

export type TransactionBillRowPayload = {
  allocationType: BillAllocationType;
  side: EntrySide;
  refNo?: string;
  againstBillRowId?: string;
  amount: number;
};

export type CreateTransactionPayload = {
  voucherNo: string;
  voucherDate: string;
  type: TransactionType;
  side: EntrySide;
  amount: number;
  particulars: string;
  sendEmail?: boolean;
  partyId: string;
  createdById?: string;
  billRows: TransactionBillRowPayload[];
};

export type UpdateTransactionPayload = Partial<CreateTransactionPayload>;

export type ParsedTransactionDocumentResponse = {
  success: boolean;
  data: {
    fileName: string;
    detectedType: TransactionType | null;
    detectedSide: EntrySide | null;
    voucherNo: string;
    voucherDate: string;
    amount: number | null;
    partyName: string;
    matchedParty: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
    } | null;
    particulars: string;
    textPreview: string;
  };
};

export type GetTransactionsParams = {
  q?: string;
  type?: TransactionType | "all";
  partyId?: string;
  from?: string;
  to?: string;
};

type TransactionFileOptions = {
  mainDocument?: File | null;
  attachments?: File[];
  removeAttachmentIds?: string[];
};

function appendIfDefined(
  formData: FormData,
  key: string,
  value: string | number | boolean | undefined | null,
) {
  if (value === undefined || value === null) return;
  formData.append(key, String(value));
}

function appendTransactionPayloadToFormData(
  formData: FormData,
  payload: CreateTransactionPayload | UpdateTransactionPayload,
) {
  appendIfDefined(formData, "voucherNo", payload.voucherNo);
  appendIfDefined(formData, "voucherDate", payload.voucherDate);
  appendIfDefined(formData, "type", payload.type);
  appendIfDefined(formData, "side", payload.side);
  appendIfDefined(formData, "amount", payload.amount);
  appendIfDefined(formData, "particulars", payload.particulars);
  appendIfDefined(formData, "sendEmail", payload.sendEmail);
  appendIfDefined(formData, "partyId", payload.partyId);
  appendIfDefined(formData, "createdById", payload.createdById);

  if (payload.billRows !== undefined) {
    const safeBillRows = payload.billRows.map((row) => ({
      allocationType: row.allocationType,
      side: row.side,
      refNo: row.refNo?.trim() || undefined,
      againstBillRowId: row.againstBillRowId?.trim() || undefined,
      amount: Number(String(row.amount ?? 0).replace(/,/g, "").trim()),
    }));

    formData.append("billRows", JSON.stringify(safeBillRows));
  }
}

function appendTransactionFilesToFormData(
  formData: FormData,
  options?: TransactionFileOptions,
) {
  if (options?.mainDocument) {
    formData.append("mainDocument", options.mainDocument);
  }

  if (options?.attachments?.length) {
    for (const file of options.attachments) {
      formData.append("attachments", file);
    }
  }

  if (options?.removeAttachmentIds?.length) {
    formData.append(
      "removeAttachmentIds",
      JSON.stringify(
        options.removeAttachmentIds
          .map((id) => String(id || "").trim())
          .filter(Boolean),
      ),
    );
  }
}

function buildTransactionFormData(
  payload: CreateTransactionPayload | UpdateTransactionPayload,
  options?: TransactionFileOptions,
) {
  const formData = new FormData();
  appendTransactionPayloadToFormData(formData, payload);
  appendTransactionFilesToFormData(formData, options);
  return formData;
}

export async function getTransactions(
  params: GetTransactionsParams = {},
): Promise<TransactionRecord[]> {
  const searchParams = new URLSearchParams();

  if (params.q?.trim()) {
    searchParams.set("q", params.q.trim());
  }

  if (params.type && params.type !== "all") {
    searchParams.set("type", params.type);
  }

  if (params.partyId?.trim()) {
    searchParams.set("partyId", params.partyId.trim());
  }

  if (params.from?.trim()) {
    searchParams.set("from", params.from.trim());
  }

  if (params.to?.trim()) {
    searchParams.set("to", params.to.trim());
  }

  const query = searchParams.toString();

  return apiRequest<TransactionRecord[]>(
  `/transactions${query ? `?${query}` : ""}`,
  {
    method: "GET",
    token: getAccessToken(),
  },
);
}

export async function getTransactionById(
  id: string,
): Promise<TransactionRecord> {
 return apiRequest<TransactionRecord>(`/transactions/${id}`, {
  method: "GET",
  token: getAccessToken(),
});
}

export async function parseTransactionDocument(
  file: File,
): Promise<ParsedTransactionDocumentResponse> {
  const formData = new FormData();
  formData.append("mainDocument", file);

  return apiRequest<ParsedTransactionDocumentResponse>(
  "/transactions/parse-document",
  {
    method: "POST",
    body: formData,
    token: getAccessToken(),
  },
);
}

export async function createTransaction(
  payload: CreateTransactionPayload,
  options?: TransactionFileOptions,
): Promise<TransactionRecord> {
  const formData = buildTransactionFormData(payload, options);

  return apiRequest<TransactionRecord>("/transactions", {
  method: "POST",
  body: formData,
  token: getAccessToken(),
});
}

export async function updateTransaction(
  id: string,
  payload: UpdateTransactionPayload,
  options?: TransactionFileOptions,
): Promise<TransactionRecord> {
  const formData = buildTransactionFormData(payload, options);

  return apiRequest<TransactionRecord>(`/transactions/${id}`, {
  method: "PATCH",
  body: formData,
  token: getAccessToken(),
});
}

export async function deleteTransaction(
  id: string,
): Promise<{ success: true }> {
  return apiRequest<{ success: true }>(`/transactions/${id}`, {
    method: "DELETE",
  });
}

export async function getOpenRefs(
  partyId: string,
  asOf?: string,
): Promise<OpenRefRecord[]> {
  const searchParams = new URLSearchParams();
  searchParams.set("partyId", partyId);

  if (asOf?.trim()) {
    searchParams.set("asOf", asOf.trim());
  }

  return apiRequest<OpenRefRecord[]>(
  `/transactions/open-refs?${searchParams.toString()}`,
  {
    method: "GET",
    token: getAccessToken(),
  },
);
}

export async function sendTransactionEmail(
  id: string,
): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(
  `/transactions/${id}/send-email`,
  {
    method: "POST",
    token: getAccessToken(),
  },
);
}

export async function bulkSendTransactionEmails(
  transactionIds: string[],
): Promise<{ success: boolean; message: string; total: number }> {
  return apiRequest<{ success: boolean; message: string; total: number }>(
  `/transactions/bulk-send-email`,
  {
    method: "POST",
    body: JSON.stringify({ transactionIds }),
    token: getAccessToken(),
  },
);
}