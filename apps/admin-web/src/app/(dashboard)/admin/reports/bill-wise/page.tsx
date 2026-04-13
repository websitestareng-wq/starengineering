import { redirect } from "next/navigation";

export default function BillWisePage() {
  redirect("/admin/reports/bill-wise/receivable");
}