# DOM Nacimiento · entorno de pruebas

Versión de demostración derivada del sistema DOM Nacimiento. **Repositorio y demostración públicos: usar exclusivamente datos ficticios.**

## Gestión integral 0.2.0

La pantalla inicial ahora es la bandeja transversal. Incluye expedientes (con DJ y observaciones), reclamos y fiscalización, contratos de obras, BNUP, correspondencia e índice documental. Asignaciones, etapas, versiones y exportaciones funcionan localmente con información ficticia. Consulta [DEVELOPMENT.md](DEVELOPMENT.md) para el recorrido de prueba y las funciones pendientes.

## Qué permite probar
- Identidad municipal y diseño adaptable a teléfono.
- Formularios, certificados y pagos simulados.
- Recorrido de preparación, revisión por director, numeración de prueba, firma externa y entrega.
- Roles de prueba, notificaciones locales, versiones y ficha reutilizable por ROL.
- Consulta de tres ROL ficticios: **9999-1, 9999-2 y 9999-3**.
- Exportación Word/PDF según el tipo de certificado.

## Límites
El guardado ocurre en este navegador. Cambiar de rol simula otra función, no autentica a otra persona. La demo no valida firmas ni pagos reales. No ingresar nombres, RUT, correos ni documentos reales. La importación de respaldos y conexión a Firebase están deshabilitadas. No existe sincronización con Drive ni con el sitio privado. La cartografía municipal y los expedientes originales están excluidos.

## Ejecutar
Node 22 o posterior, sin instalar dependencias:

```sh
npm test
npm run check
npm run serve
```

Abrir http://localhost:8080. No abrir index.html con file://.

## GitHub Pages
En Settings → Pages → Build and deployment, seleccionar **Deploy from a branch**, rama **main**, carpeta **/docs**, y guardar. El sitio utiliza rutas relativas y admite la subcarpeta del repositorio. El código queda listo para ese despliegue; hay que comprobar la URL una vez que GitHub termine la publicación.

## Próxima etapa Firebase
La aplicación privada original conserva el código de producción. Esta rama pública bloquea expresamente conexiones a Firebase. Para pruebas multiusuario debe habilitarse un proyecto Firebase de desarrollo independiente, con reglas, funciones, autenticación Google y pruebas en emuladores antes de usar información municipal. GitHub Pages no ejecuta /api/sync ni funciones de servidor.

La primera integración funcional de las mejoras de la ficha SmartDOM está implementada en modo de prueba local. Las integraciones reales, privacidad, cartografía, motor normativo, Gantt, IA y demás pendientes se detallan en DEVELOPMENT.md y en la pantalla «Mejoras y alcance».
