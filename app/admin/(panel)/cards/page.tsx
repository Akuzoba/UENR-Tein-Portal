import Link from "next/link";
import { Printer } from "lucide-react";
import { getSignatory, listMembers } from "@/lib/db";
import { cardData } from "@/lib/card";
import { CardBack, CardFront, type CardData } from "@/components/MemberCard";
import PageTransition from "@/components/PageTransition";
import PageHeader from "@/components/admin/PageHeader";
import MemberFilters from "@/components/admin/MemberFilters";
import PrintButton from "./PrintButton";

export const metadata = { title: "Print cards – TEIN UENR Admin" };

const MAX = 100;

export default async function BulkCards({ searchParams }: PageProps<"/admin/cards">) {
  const sp = await searchParams;
  const q = String(sp.q ?? "").trim();
  const paid = await listMembers({ q, status: "paid" });
  const batch = paid.slice(0, MAX);
  const signatory = await getSignatory();
  const cards = (await Promise.all(batch.map(async (m) => ({ id: m.id, card: await cardData(m, signatory) })))).filter(
    (c): c is { id: string; card: CardData } => c.card !== null,
  );

  return (
    <PageTransition>
      <div>
        <PageHeader
          title="Print cards"
          sub={
            <>
              {cards.length} paid member card{cards.length === 1 ? "" : "s"}
              {q && <> matching “{q}”</>}
              {paid.length > MAX && ` · showing the first ${MAX}, narrow the search to print the rest`}
            </>
          }
        >
          <PrintButton disabled={cards.length === 0} />
        </PageHeader>

        <div className="mt-6">
          <MemberFilters base="/admin/cards" q={q} status="" />
        </div>

        <div className="no-print mt-3 rounded-md border-l-4 border-ink bg-white px-4 py-3 text-sm text-muted">
          <span>
            Each card prints front then back at CR80 size (85.6 × 54 mm). In the print dialog choose your card printer (or
            “Save as PDF”), set margins to <b>None</b> and turn on <b>Background graphics</b>. To download one member&apos;s
            PDF, open them from <Link href="/admin/members" className="underline">Members</Link>.
          </span>
        </div>

        {cards.length === 0 ? (
          <div className="panel mt-6 flex flex-col items-center py-20 text-center">
            <Printer className="h-8 w-8 text-muted/60" />
            <p className="mt-4 font-semibold">No paid members to print yet</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 2xl:grid-cols-2">
            {cards.map(({ id, card }, i) => (
              <div key={id} className="panel anim-rise p-5" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
                <div className="no-print mb-4 flex items-center justify-between text-sm">
                  <span className="font-semibold">{card.name}</span>
                  <Link href={`/admin/members/${id}`} className="font-mono text-xs text-muted hover:text-ink">{card.code}</Link>
                </div>
                <div className={`card-sm print-area flex flex-wrap justify-center gap-4 ${i === 0 ? "print-first" : ""}`}>
                  <CardFront d={card} />
                  <CardBack d={card} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
