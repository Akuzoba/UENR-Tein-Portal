"use client";

import { useActionState, useState } from "react";
import { CreditCard, Loader2, Lock, ShieldCheck, Smartphone } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { payTest, type TestPayState } from "./actions";

type Props = {
  id: string;
  reference: string;
  name: string;
  phone: string;
  amount: string;
  momo: { number: string; provider: string };
  card: { number: string; cvv: string; expiry: string };
};

const NETWORKS = [
  { id: "MTN", color: "bg-yellow-400 text-black" },
  { id: "Telecel", color: "bg-red-600 text-white" },
  { id: "AirtelTigo", color: "bg-blue-600 text-white" },
];

const field = "mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-3 font-mono outline-none focus:border-[#0ba4db] focus:ring-4 focus:ring-sky-100";

export default function TestCheckout({ id, reference, name, phone, amount, momo, card }: Props) {
  const [channel, setChannel] = useState<"momo" | "card">("momo");
  const [network, setNetwork] = useState("MTN");
  const [state, action, pending] = useActionState<TestPayState, FormData>(payTest, {});
  const [momoValue, setMomo] = useState("");
  const [cardValue, setCard] = useState("");
  const [cvvValue, setCvv] = useState("");

  return (
    <form action={action} className="anim-rise relative overflow-hidden rounded-xl bg-white text-neutral-900 shadow-[0_24px_60px_-20px_rgba(0,0,0,.35)]">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="ref" value={reference} />
      <input type="hidden" name="channel" value={channel} />

      <div className="flex items-center justify-between bg-[#011b33] px-6 py-5 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white">
            <LogoMark height={34} />
          </span>
          <div>
            <div className="text-xs text-white/60">Pay TEIN UENR</div>
            <div className="text-sm font-semibold">{name}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-white/60">Amount</div>
          <div className="text-2xl font-bold">{amount}</div>
        </div>
      </div>

      <div className="mx-6 mt-5 grid grid-cols-2 rounded-lg bg-neutral-100 p-1 text-sm font-semibold">
        {(["momo", "card"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setChannel(c)}
            className={`flex items-center justify-center gap-2 rounded-md py-2.5 transition ${channel === c ? "bg-white text-[#011b33] shadow" : "text-neutral-500"}`}
          >
            {c === "momo" ? <Smartphone className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
            {c === "momo" ? "Mobile Money" : "Card"}
          </button>
        ))}
      </div>

      <div className="space-y-4 px-6 py-5">
        <div key={channel} className="anim-fade space-y-4">
          {channel === "momo" ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                {NETWORKS.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setNetwork(n.id)}
                    className={`rounded-lg border-2 px-2 py-2.5 text-xs font-bold transition ${network === n.id ? "border-[#0ba4db] bg-sky-50" : "border-neutral-200 hover:border-neutral-300"}`}
                  >
                    <span className={`mx-auto mb-1 block h-6 w-6 rounded-full leading-6 ${n.color}`}>{n.id[0]}</span>
                    {n.id}
                  </button>
                ))}
              </div>
              <label className="block text-sm font-semibold text-neutral-700">
                Mobile money number
                <input name="momo" value={momoValue} onChange={(e) => setMomo(e.target.value)} inputMode="tel" placeholder={phone} className={field} />
              </label>
              <Hint onUse={() => setMomo(momo.number)}>
                Test number <b className="font-mono">{momo.number}</b>
              </Hint>
            </>
          ) : (
            <>
              <label className="block text-sm font-semibold text-neutral-700">
                Card number
                <input name="card" value={cardValue} onChange={(e) => setCard(e.target.value)} inputMode="numeric" placeholder="0000 0000 0000 0000" className={field} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-semibold text-neutral-700">
                  Expiry
                  <input defaultValue={card.expiry} className={field} />
                </label>
                <label className="block text-sm font-semibold text-neutral-700">
                  CVV
                  <input name="cvv" value={cvvValue} onChange={(e) => setCvv(e.target.value)} inputMode="numeric" placeholder="123" className={field} />
                </label>
              </div>
              <Hint onUse={() => (setCard(card.number), setCvv(card.cvv))}>
                Test card <b className="font-mono">{card.number}</b> · CVV <b className="font-mono">{card.cvv}</b>
              </Hint>
            </>
          )}
        </div>

        {state.error && !pending && <p className="anim-shake rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{state.error}</p>}

        <button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3bb75e] py-4 font-bold text-white transition hover:brightness-105 disabled:opacity-70">
          <Lock className="h-4 w-4" /> Pay {amount}
        </button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-neutral-400">
          <ShieldCheck className="h-3.5 w-3.5" /> Secured by Paystack · simulated
        </p>
      </div>

      {pending && (
        <div className="anim-fade absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-white/95">
          <Loader2 className="h-12 w-12 animate-spin text-[#0ba4db]" />
          <div className="text-center">
            <p className="font-bold">Processing payment…</p>
            <p className="text-sm text-neutral-500">{channel === "momo" ? `Authorising with ${network} Mobile Money` : "Authorising your card"}</p>
          </div>
        </div>
      )}
    </form>
  );
}

function Hint({ children, onUse }: { children: React.ReactNode; onUse: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-sky-50 px-3.5 py-2.5 text-xs text-sky-900">
      <span>{children}</span>
      <button type="button" onClick={onUse} className="shrink-0 rounded-md bg-sky-600 px-2.5 py-1 font-semibold text-white transition hover:bg-sky-700">
        Use it
      </button>
    </div>
  );
}
