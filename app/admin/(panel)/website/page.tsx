import { ExternalLink } from "lucide-react";
import { requirePermission } from "@/lib/admin";
import { getContent } from "@/lib/site";
import PageTransition from "@/components/PageTransition";
import PageHeader from "@/components/admin/PageHeader";
import { ContentForm } from "./forms";

export const metadata = { title: "Site content – TEIN UENR Admin" };

export default async function SiteContentPage() {
  await requirePermission("website.edit");
  return (
    <PageTransition>
      <div>
        <PageHeader title="Site content" sub="Text on the main website: home page, about us and contact details.">
          <a href="/" target="_blank" className="btn btn-ghost"><ExternalLink className="h-4 w-4" /> View website</a>
        </PageHeader>
        <div className="mt-6 max-w-4xl">
          <ContentForm c={await getContent()} />
        </div>
      </div>
    </PageTransition>
  );
}
