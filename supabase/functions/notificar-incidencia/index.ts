/** RF30: entrada privada para Database Webhook de la cola de incidencias.
 * Usa un secreto de servidor propio (no un JWT del teléfono) y delega en manejador.ts.
 * Supabase inyecta la service_role; nunca se distribuye al cliente ni se guarda en Git.
 */
import { createClient } from "@supabase/supabase-js";
import { manejar } from "./manejador.ts";

/** Autentica antes de leer datos privados y falla cerrado si falta configuración. */
async function fetchWebhook(req: Request): Promise<Response> {
  const secreto = Deno.env.get("INCIDENCIAS_WEBHOOK_SECRET");
  const url = Deno.env.get("SUPABASE_URL");
  const clave = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secreto || secreto.length < 32 || !url || !clave) {
    return Response.json({ error: "servidor_no_configurado" }, { status: 503 });
  }
  if (req.method !== "POST") return new Response(null, { status: 405 });
  if (req.headers.get("x-incidencias-webhook-secret") !== secreto) {
    return new Response(null, { status: 401 });
  }
  const admin = createClient(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    return await manejar(req, admin, Deno.env.get("EXPO_ACCESS_TOKEN"));
  } catch {
    return Response.json({ error: "procesamiento_pendiente_de_revision" }, {
      status: 500,
    });
  }
}

export default { fetch: fetchWebhook };
