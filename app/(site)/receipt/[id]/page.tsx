import { permanentRedirect } from "next/navigation";

// Receipts moved under /portal. Old links (sent to members, in exports) keep working.
export default async function OldReceiptLink({ params }: PageProps<"/receipt/[id]">) {
  const { id } = await params;
  permanentRedirect(`/portal/receipt/${id}`);
}
