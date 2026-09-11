import { NotFound } from "@/components/ui/not-found";

export default function NotFoundPage() {
  return (
    <NotFound
      title="Pagina no encontrada"
      description="La ruta que intentas abrir no existe o ya no esta disponible en Temis."
      showSearch
      searchPlaceholder="Buscar en Temis"
    />
  );
}
