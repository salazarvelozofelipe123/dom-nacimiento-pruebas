# Gestión integral DOM · versión 0.2.0

Primera integración funcional del análisis de la ficha técnica, con casos sintéticos y almacenamiento local. No habilita uso oficial ni información real. Las funciones de prueba no autentican personas. Los módulos nuevos se bloquean si se activa un entorno cloud sin su backend.

## Funciones implementadas

- Bandeja transversal: casos activos, asignaciones personales, objetivos operativos, garantías próximas a vencer y certificados activos.
- Expedientes: materias (incluye declaración jurada), admisibilidad, revisión, actas de referencia, observaciones numeradas, respuestas, evaluación y propuesta de aprobación o rechazo. Rechazo permite observaciones mantenidas; la aprobación exige subsanación completa.
- Fiscalización: separación entre reclamo de atención, denuncia y hallazgo; ubicación sin ROL, visitas por ciclo, hechos, evidencia de referencia, informes, seguimiento y cierre.
- Contratos: monto y término originales, modificaciones propuestas/aprobadas, avance físico programado/constatado, garantías con alertas, presentación/observación/visación/remisión/pago de estados de pago. La confirmación financiera corresponde exclusivamente a la función de prueba Finanzas.
- BNUP: período, cantidad, tarifa de referencia con fuente, pago de prueba, autorización y restitución.
- Correspondencia: derivación, respuesta, revisión de dirección, devolución y despacho con constancia.
- Relaciones: múltiples ROL, vínculos entre casos, vínculos recibidos y consulta de gestión desde ficha predial o certificado.
- Archivo: índice de referencias documentales de los módulos nuevos y adjuntos existentes de certificados. Una referencia documental NO adjunta ni valida un archivo.
- Versiones completas por actividad, historial con identidad funcional, motivo obligatorio, validación de revisión y exclusión de escrituras concurrentes mediante Web Locks.
- Filtros por texto/ROL, etapa y asignación; exportación CSV con protección de fórmulas, ficha JSON y respaldo JSON de gestión con versiones. El respaldo es independiente del de certificados; no hay importación habilitada.

## Recorrido de prueba

1. Abrir Inicio y bandeja.
2. Cambiar Función de prueba a Director DOM y pulsar Crear ejemplos ficticios.
3. Abrir cada módulo y su ficha. Los ejemplos se asignan a profesional, inspector, ITO o administrativo según materia.
4. Cambiar la función para probar las actividades de cada responsable. Solo dirección asigna y cierra las etapas que exigen su intervención.
5. En un expediente completar admisibilidad; avanzar a revisión; registrar observaciones, acta y comunicación; registrar respuestas; recibir subsanación y evaluar. Para aprobación todas las observaciones deben quedar subsanadas; para rechazo registrar el resultado propuesto y sus fundamentos en los antecedentes e historial.
6. En un contrato completar monto, término, contrato y acta de entrega; registrar avances, modificaciones y estados de pago. Una modificación solicitada no cambia el monto vigente. Visado no equivale a pagado.
7. Exportar desde el módulo (CSV), la ficha (JSON) o Archivo y referencias (respaldo JSON).

## Pendiente: no se presenta como implementado

- Repositorio privado, hosting protegido, autenticación y autorización de servidor para gestión integral.
- Integración de cartografía, catastro y documentación reales; genealogía predial y maestro de calles.
- Portal ciudadano y acceso restringido a denunciante/patrocinante/contratista.
- Archivo binario protegido y validación criptográfica de firma en los módulos nuevos.
- Reglas normativas verificadas, calendarios de días hábiles, suspensiones legales y cálculo oficial de derechos.
- DOMEL, correo, Tesorería y firma; notificaciones de asignación de los módulos nuevos (actualmente las tareas se ven en la bandeja).
- Gantt, Curva S, detalle por partidas, reajustes, liberación de retenciones, sustitución/liberación de garantías y multas contractuales.
- OCR e IA, métricas IMUDEL consolidadas, respaldo institucional y restauración comprobada.

## Pruebas

`npm test` ejecuta reglas de dominio y repositorio. `npm run check` comprueba el contenido de la demo y resolución de imports. La lógica local no sustituye reglas y transacciones en servidor; las pruebas no acreditan un despliegue Firebase ni integración real.

Las fechas objetivo son días corridos operativos, no plazos legales. No se genera numeración oficial en los módulos nuevos. Los datos locales pueden perderse al limpiar el navegador. Web Locks es obligatorio para guardar; si no está disponible, se permite lectura y se explica la limitación.

## Continuación 0.2.2 · borradores de expedientes

En la ficha de cada expediente se dispone de seis actuaciones: edificación, obra menor,
modificación, recepción definitiva, alteración y declaración jurada. Cada una enlaza a
la familia oficial MINVU (fuentes consultadas el 13-11-2026). Las DJ permiten consultar
obras menores y edificación. No se selecciona automáticamente una variante normativa.

El profesional asignado o dirección puede preparar una ficha estructurada, guardar
versiones con motivo, visualizarla y descargar HTML imprimible desde el navegador.
Los borradores se incluyen en las exportaciones JSON y versiones del caso. No cambian
la etapa, resultado, pago ni numeración del expediente. En propuesta de resolución,
cierre y anulación quedan en lectura. Para corregir una propuesta se devuelve a revisión.

Estas fichas NO son reproducciones de los PDF MINVU: quedan pendientes la integración
exacta de cada plantilla y sus campos, la validación normativa y la emisión oficial.
Las superficies se registran como antecedentes sin calcular derechos ni sumar conceptos
que podrían superponerse. Persisten los límites de demo pública y guardado local.

Verificación: 126 pruebas automatizadas y auditoría de archivos/imports satisfactorias.

## Continuación 0.2.3 · inicio por áreas

Inicio muestra seis accesos: Certificados, Expedientes, Reclamos y fiscalización,
Contratos de obras, BNUP y Correspondencia. Las acciones de ingreso y desarrollo
permanecen dentro de cada ambiente. El menú agrupa herramientas y administración en
un desplegable; las rutas anteriores y los datos locales se conservan.

Certificados incluye navegación propia de Resumen, Bandeja y proceso y Formularios.
Su resumen permite filtrar la bandeja por etapa. Los otros ambientes muestran activos,
asignaciones, alertas y finalizados, más etapas con conteos y filtro directo.
La ficha conserva las actividades, permisos y requisitos del proceso existente.
La carga de ejemplos ficticios se trasladó a Herramientas → Mejoras y alcance.

Validación: 126 pruebas y auditoría de imports/contenido aprobadas. La vista local
no fue accesible desde el navegador remoto; se verifica el despliegue por GitHub.
