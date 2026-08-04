import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-28 text-center sm:px-6">
      <div className="font-display text-7xl font-bold gold-text">404</div>
      <h1 className="mt-4 font-display text-3xl font-semibold text-zinc-50">
        This scent doesn't exist
      </h1>
      <p className="mx-auto mt-3 max-w-md text-zinc-400">
        The page you're looking for evaporated. Let's get you back to the collection.
      </p>
      <Link href="/shop" className="btn btn-gold mt-8">
        Browse fragrances →
      </Link>
    </div>
  );
}
