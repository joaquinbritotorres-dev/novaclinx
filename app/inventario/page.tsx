import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import InventarioView, { type InventarioItem } from "./InventarioView";

export default async function InventarioPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: medico } = await supabase
    .from("medicos")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!medico) redirect("/onboarding/especialidad");

  const { data: rows } = await supabase
    .from("inventario_items")
    .select("*")
    .eq("medico_id", medico.id)
    .is("deleted_at", null)
    .order("fecha_caducidad", { ascending: true, nullsFirst: false })
    .order("nombre", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: InventarioItem[] = (rows ?? []).map((r: any) => ({
    id: r.id,
    tipo: r.tipo,
    nombre: r.nombre,
    descripcion: r.descripcion ?? null,
    lote: r.lote ?? null,
    fecha_caducidad: r.fecha_caducidad ?? null,
    cantidad: r.cantidad,
    unidad: r.unidad,
    stock_minimo: r.stock_minimo,
    medico_id: r.medico_id,
  }));

  return <InventarioView items={items} />;
}
