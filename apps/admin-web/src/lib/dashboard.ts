import { apiRequest } from "./api-client";

function getAccessToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("accessToken") || "";
}

export type DashboardPartyOption = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  gstin?: string | null;
  pan?: string | null;
};

export type DashboardOverviewResponse = {
  filters: {
    from: string;
    to: string;
    partyId: string;
  };
  parties: DashboardPartyOption[];
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    totalTransactions: number;
    totalTransactionAmount: number;

    totalSales: number;
    totalPurchase: number;
    totalReceipts: number;
    totalPayments: number;

    totalDebitNote: number;
    totalCreditNote: number;
    totalJournalDr: number;
    totalJournalCr: number;

    outstandingReceivable: number;
    outstandingPayable: number;

    billsReceivableClosing: number;
    billsPayableClosing: number;
    unraisedInvoiceClosing: number;
    unreceivedInvoiceClosing: number;
    onAccountClosing: number;
    onAccountClosingSide: string;

    finalClosingAmount: number;
    finalClosingSide: string;
    finalClosingLabel: string;
  };
  charts: {
    monthlyTrend: Array<{
      monthKey: string;
      monthLabel: string;
      sales: number;
      purchase: number;
      receipt: number;
      payment: number;
    }>;
    topPartiesByType: {
      sales: Array<{
        partyId: string;
        partyName: string;
        amount: number;
      }>;
      purchase: Array<{
        partyId: string;
        partyName: string;
        amount: number;
      }>;
      receipt: Array<{
        partyId: string;
        partyName: string;
        amount: number;
      }>;
      payment: Array<{
        partyId: string;
        partyName: string;
        amount: number;
      }>;
    };
    voucherTypeDistribution: Array<{
      name: string;
      value: number;
    }>;
    receivableVsPayable: Array<{
      name: string;
      value: number;
    }>;
    topParties: Array<{
      partyId: string;
      partyName: string;
      amount: number;
    }>;
  };
  recentTransactions: Array<{
    id: string;
    voucherNo: string;
    voucherDate: string;
    type: string;
    side: string;
    amount: number;
    particulars: string;
    attachmentUrl?: string;
    party?: {
      id: string;
      name: string;
      email?: string | null;
      phone?: string | null;
    } | null;
  }>;
  recentCustomers: Array<{
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    gstin?: string | null;
    pan?: string | null;
    isActive: boolean;
    createdAt: string;
  }>;
  reminders: {
    active: number;
    completed: number;
    stopped: number;
  };
  recentDocuments: Array<{
    id: string;
    name: string;
    originalName: string;
    fileUrl: string;
    mimeType?: string | null;
    createdAt: string;
  }>;
};

export async function getDashboardOverview(params: {
  from?: string;
  to?: string;
  partyId?: string;
}) {
  const query = new URLSearchParams();

  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.partyId) query.set("partyId", params.partyId);

  return apiRequest<DashboardOverviewResponse>(
    `/dashboard/overview?${query.toString()}`,
    {
      method: "GET",
      token: getAccessToken(),
    },
  );
}