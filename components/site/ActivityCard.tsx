import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Images } from "lucide-react";
import { fmtDate } from "@/lib/config";
import type { ActivityWithCover } from "@/lib/site";
import Tilt from "../Tilt";
import { LogoMark } from "../brand/Logo";

export default function ActivityCard({ a }: { a: ActivityWithCover }) {
  return (
    <Tilt max={6} glare className="h-full rounded-xl">
      <Link href={`/activities/${a.slug}`} className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white transition-shadow duration-300 hover:shadow-[0_28px_50px_-24px_rgba(0,0,0,.45)]">
        <div className="relative aspect-[4/3] overflow-hidden bg-ink">
          {a.cover ? (
            <Image src={a.cover} alt="" fill sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]" />
          ) : (
            <div className="flex h-full items-center justify-center bg-ndc-green/5">
              <LogoMark height={72} className="opacity-40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          {a.photo_count > 0 && (
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
              <Images className="h-3.5 w-3.5" /> {a.photo_count}
            </span>
          )}
          <span className="absolute top-3 right-3 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-ndc-red text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <ArrowUpRight className="h-5 w-5" />
          </span>
        </div>
        <div className="flex flex-1 flex-col p-5">
          {a.happened_on && <p className="text-xs font-semibold tracking-wide text-ndc-red uppercase">{fmtDate(a.happened_on)}</p>}
          <h3 className="mt-1 font-display text-2xl leading-tight font-bold uppercase">{a.title}</h3>
          {a.summary && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{a.summary}</p>}
          <div className="mt-auto pt-4">
            <div className="h-0.5 w-10 bg-ndc-red transition-all duration-500 group-hover:w-full" />
          </div>
        </div>
      </Link>
    </Tilt>
  );
}
