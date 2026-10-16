# Slontec · Página de valoraciones

Página sencilla para que, tras cada servicio, el cliente:

1. **Puntúe con estrellas y deje un comentario** en la propia página.
2. Pulse **«Publicar mi opinión en Google»**: el comentario se copia solo y se abre directamente la ventana de reseña de la ficha de Google de Slontec. El cliente solo marca las estrellas y pega el texto.
3. Opcionalmente deje su **teléfono/email** con dos casillas separadas (sin marcar por defecto):
   - guardar los datos **solo para gestión interna**, sin cederlos a terceros;
   - recibir **información relevante y promociones puntuales**.
4. Pueda **darse de baja o pedir el borrado** en cualquier momento (`baja.html`).

| Archivo | Para qué |
|---|---|
| `index.html` | Página de valoración (la que abre el cliente) |
| `privacidad.html` | Política de privacidad (RGPD / LSSI) |
| `baja.html` | Baja de comunicaciones o borrado de datos |
| `qr.html` | Tarjetas con QR imprimibles para dejar al cliente |
| `config.js` | **Único archivo a editar**: teléfono, email, ficha de Google, URL de la hoja |
| `apps-script/Code.gs` | Código que guarda los datos en una Hoja de Google |

## Por qué el cliente termina la reseña en Google

Google **no permite** que una web publique reseñas en nombre de un cliente: no existe ninguna API para ello y la reseña tiene que salir de la cuenta de Google del propio cliente. Por eso la página hace lo máximo posible: recoge las estrellas y el comentario, copia el texto y abre la ventana de reseña ya apuntando a Slontec (en el móvil se abre en la app de Google Maps). Al cliente le quedan dos toques.

> **Importante (normas de Google):** la página envía a Google **a todos los clientes por igual**, pongan 1 o 5 estrellas. Filtrar y mandar a Google solo las buenas («review gating») está prohibido por Google y puede suponer que borren reseñas o penalicen la ficha. No lo cambiéis.

## Publicar la página (GitHub Pages, gratis)

1. En GitHub: **Settings → Pages**.
2. *Source*: **Deploy from a branch** · Branch: **main** · carpeta **/ (root)** → *Save*.
3. En un par de minutos estará en: **https://estebancalvobayarri.github.io/slontec/**

Si más adelante compráis un dominio (p. ej. `slontec.es`), se configura en ese mismo apartado (*Custom domain*).

## Guardar los datos (Hoja de Google, gratis)

Sin este paso la página funciona igual para las reseñas, pero **no guarda** los contactos.

1. Con la cuenta de Google de la empresa, crear una **Hoja de cálculo** nueva (p. ej. «Slontec – Clientes»).
2. Menú **Extensiones → Apps Script**. Borrar lo que haya y pegar el contenido de `apps-script/Code.gs`.
   - Opcional: poner un email en `EMAIL_AVISOS` para recibir un aviso con cada valoración y cada baja.
3. **Implementar → Nueva implementación** → tipo **Aplicación web**:
   - *Ejecutar como*: **Yo**
   - *Quién tiene acceso*: **Cualquier usuario**
   - Autorizar los permisos que pide.
4. Copiar la **URL de la aplicación web** (termina en `/exec`) y pegarla en `config.js`, en `appsScriptUrl`.

La hoja crea sola tres pestañas:

- **Reseñas**: todas las valoraciones (estrellas, comentario, técnico).
- **Clientes**: solo quien ha marcado la casilla de autorización, con la fecha y si acepta comunicaciones. Es la prueba del consentimiento: no borrar columnas.
- **Bajas**: registro de solicitudes. Las bajas se aplican solas en «Clientes» (deja de recibir comunicaciones, o se borra la fila si pide borrar todo).

> Al enviar promociones, filtrad siempre por **«Consentimiento comunicaciones» = SÍ** e incluid en cada mensaje el enlace de baja: `https://estebancalvobayarri.github.io/slontec/baja.html`

## Pendiente de confirmar

- [ ] **Email de contacto/bajas** en `config.js` (ahora pone `info@slontec.com`, sin verificar).
- [ ] Revisar la lista de servicios de `index.html`.
- [ ] Revisar `privacidad.html` (responsable: Slontec Instalaciones y Mantenimientos S.L., CIF B09978149, domicilio social Av. Francia 18, 46023 Valencia, según el registro mercantil). Es una base razonable, pero conviene que la valide vuestra gestoría o asesor de protección de datos.

## Uso diario

- Al acabar un servicio: enseñar el QR (o enviar el enlace por WhatsApp).
- Para saber qué técnico hizo cada servicio, usar el enlace con su nombre: `…/slontec/?tecnico=Michael`. En `qr.html` se generan las tarjetas con el nombre ya incluido.
