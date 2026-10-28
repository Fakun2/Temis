import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-24 text-center sm:px-8">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Incidente no encontrado</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        El incidente solicitado no existe o ya no está publicado.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Volver al estado actual
      </Link>
    </div>
  );
}
