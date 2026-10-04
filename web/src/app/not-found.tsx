import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-muted-foreground">ఈ పేజీ కనబడలేదు</p>
      <Link className="font-semibold text-primary underline" href="/">Go home</Link>
    </main>
  );
}
