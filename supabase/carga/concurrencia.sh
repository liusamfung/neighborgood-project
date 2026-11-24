#!/bin/sh
# =====================================================================
# NeighborGood · RNF5 (escalabilidad) · lanza la carga concurrente con pgbench
#
# Qué hace: ejecuta `concurrencia.pgbench` con N clientes simultáneos durante T segundos dentro del
#   contenedor de Postgres del Supabase local (ahí viene `pgbench`) y muestra el resultado: transacciones
#   por segundo, latencia media y la latencia promedio de cada sentencia (opción `-r`).
# Uso: `sh supabase/carga/concurrencia.sh [clientes] [segundos]` (por defecto 20 clientes, 30 s), o con
#   `npm run carga:concurrencia -- 50 30`.
# Se relaciona con: `concurrencia.pgbench` (la carga), `generar_datos.sql` (los datos) y
#   `docs/pruebas/RNF.md` (donde se anotan los resultados). Solo para la base local de pruebas.
# =====================================================================
CLIENTES="${1:-20}"
SEGUNDOS="${2:-30}"
CONTENEDOR="supabase_db_neighborgood-project"

# El archivo de la carga se copia al contenedor y se ejecuta allí.
docker cp supabase/carga/concurrencia.pgbench "$CONTENEDOR":/tmp/concurrencia.pgbench
docker exec "$CONTENEDOR" pgbench -U postgres -d postgres -n -r \
  -f /tmp/concurrencia.pgbench -c "$CLIENTES" -j 4 -T "$SEGUNDOS"
