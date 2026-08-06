"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ReviewForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  const [checked, setChecked] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (!cancelled) {
        setUser(
          u
            ? {
                id: u.id,
                name:
                  (u.user_metadata?.full_name as string) ||
                  (u.user_metadata?.name as string) ||
                  u.email?.split("@")[0] ||
                  "Customer",
              }
            : null
        );
        setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      setMessage("Pick a star rating first.");
      return;
    }
    if (!text.trim()) {
      setMessage("Write a short review.");
      return;
    }
    if (!user) return;
    setSending(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.from("reviews").insert({
      product_id: productId,
      user_id: user.id,
      author: user.name,
      rating,
      text: text.trim(),
    });
    setSending(false);
    if (error) {
      setMessage(`Could not post review: ${error.message}`);
      return;
    }
    setMessage("Thanks! Your review is live. 🎉");
    setRating(0);
    setText("");
    router.refresh();
  }

  if (!checked) return null;

  if (!user) {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <h3 className="font-display text-xl font-semibold text-zinc-100">Share your scent story</h3>
        <p className="mt-2 text-sm text-zinc-400">Sign in to leave a review.</p>
        <Link
          href={`/login?redirectTo=/product/${productId}`}
          className="btn btn-gold mt-4 px-6 py-2.5 text-xs"
        >
          Sign in to review
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="glass rounded-2xl p-6">
      <h3 className="font-display text-xl font-semibold text-zinc-100">Leave a review</h3>
      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className={`text-2xl transition-all hover:scale-110 ${
              n <= (hover || rating) ? "text-gold-400 drop-shadow-[0_0_6px_rgba(226,189,102,0.4)]" : "text-zinc-600"
            }`}
          >
            ★
          </button>
        ))}
        <span className="ml-2 text-xs text-zinc-500">{rating ? `${rating}/5` : "Tap to rate"}</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="How does it smell? How long does it last?"
        className="input mt-3 resize-none"
      />
      {message && (
        <p className={`mt-2 text-xs ${message.includes("live") ? "text-emerald-300" : "text-amber-300"}`}>
          {message}
        </p>
      )}
      <button type="submit" disabled={sending} className="btn btn-gold mt-4 w-full py-2.5 text-xs">
        {sending ? "Posting…" : "Post review"}
      </button>
    </form>
  );
}
