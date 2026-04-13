import { redirect } from "next/navigation";

export default function BillWiseIndexPage() {
  redirect("/admin/reports/bill-wise/receivable");
}