-- ============================================================
-- Novaclinx — Migración: RPC atómico de movimientos de inventario
-- Pegar en: Supabase → SQL Editor → New query → Run
-- ============================================================
--
-- ⚠ APLICAR ANTES de desplegar el route nuevo: el endpoint
-- app/api/inventario/[id]/movimientos/route.ts pasa a llamar a esta función.
-- Sin la función, el endpoint daría error 500.
--
-- POR QUÉ
-- ------------------------------------------------------------
-- El endpoint hacía read-modify-write (leer cantidad → validar → UPDATE con
-- valor absoluto), lo que con dos peticiones simultáneas del mismo médico
-- (doble clic / dos pestañas) descuadraba el stock (lost update). Esta función
-- lo hace ATÓMICO:
--   • SELECT ... FOR UPDATE bloquea la fila del ítem → serializa los
--     movimientos concurrentes del mismo ítem.
--   • La validación de stock y el decremento ocurren bajo el lock.
--   • El UPDATE del stock y el INSERT del movimiento van en la MISMA
--     transacción (toda función plpgsql es atómica): o ambos, o ninguno.
--
-- SEGURIDAD
-- ------------------------------------------------------------
-- SECURITY INVOKER (corre como el usuario) → la RLS de inventario_items /
-- inventario_movimientos sigue aplicando. El medico_id se DERIVA de
-- auth.uid() dentro de la función: no se confía en ningún parámetro externo,
-- así que no se puede mover inventario ajeno aunque se manipule el request.
-- search_path = '' + nombres calificados por schema (anti-hijacking).
--
-- Devuelve jsonb que el route mapea a los MISMOS códigos/mensajes HTTP:
--   {'resultado':'not_found'}                          → 404
--   {'resultado':'insufficient_stock','disponible':N}  → 400
--   {'resultado':'ok','nueva_cantidad':N,'movimiento':{…}} → 201

CREATE OR REPLACE FUNCTION registrar_movimiento_inventario(
  p_item_id     uuid,
  p_tipo        text,      -- 'entrada' | 'salida'
  p_cantidad    integer,
  p_motivo      text,
  p_paciente_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_medico_id  uuid;
  v_disponible integer;
  v_nueva      integer;
  v_mov        jsonb;
BEGIN
  -- Médico del usuario autenticado (no se confía en parámetros externos).
  SELECT id INTO v_medico_id
  FROM public.medicos
  WHERE user_id = auth.uid();
  IF v_medico_id IS NULL THEN
    RETURN jsonb_build_object('resultado', 'not_found');
  END IF;

  -- Lock de la fila del ítem → serializa movimientos concurrentes (anti-carrera).
  SELECT cantidad INTO v_disponible
  FROM public.inventario_items
  WHERE id = p_item_id
    AND medico_id = v_medico_id
    AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('resultado', 'not_found');
  END IF;

  IF p_tipo = 'salida' THEN
    IF v_disponible < p_cantidad THEN
      RETURN jsonb_build_object('resultado', 'insufficient_stock', 'disponible', v_disponible);
    END IF;
    UPDATE public.inventario_items
       SET cantidad = cantidad - p_cantidad
     WHERE id = p_item_id AND medico_id = v_medico_id
     RETURNING cantidad INTO v_nueva;
  ELSE  -- 'entrada'
    UPDATE public.inventario_items
       SET cantidad = cantidad + p_cantidad
     WHERE id = p_item_id AND medico_id = v_medico_id
     RETURNING cantidad INTO v_nueva;
  END IF;

  INSERT INTO public.inventario_movimientos
    (medico_id, item_id, tipo_movimiento, cantidad, motivo, paciente_id)
  VALUES (v_medico_id, p_item_id, p_tipo, p_cantidad, p_motivo, p_paciente_id)
  RETURNING to_jsonb(inventario_movimientos.*) INTO v_mov;

  RETURN jsonb_build_object(
    'resultado', 'ok',
    'nueva_cantidad', v_nueva,
    'movimiento', v_mov
  );
END;
$$;
