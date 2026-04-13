import GlobalPageLoader from "@/components/admin/GlobalPageLoader";

export default function Loading() {
  return (
    <GlobalPageLoader
      title="Opening page..."
      subtitle="Please wait while we prepare the page and load business data."
    />
  );
}