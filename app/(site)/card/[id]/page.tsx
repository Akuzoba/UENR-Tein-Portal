import { permanentRedirect } from "next/navigation";

// Members no longer download their own card (executives print it). Old card links now open the receipt.
export default async function OldCardLink({ params }: PageProps<"/card/[id]">) {
  const { id } = await params;
  permanentRedirect(`/portal/receipt/${id}`);
}
