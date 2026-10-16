/**
 * SLONTEC — receptor de la página de reseñas.
 * Guarda en esta Hoja de Google:
 *   - "Visitas":  cada vez que un cliente pulsa «Publicar reseña en Google» (fecha y técnico)
 *   - "Clientes": solo quien ha dado su consentimiento, con sus preferencias
 *   - "Bajas":    registro de solicitudes de baja / borrado
 *
 * Instalación: ver README.md del repositorio (apartado "Guardar los datos").
 */

// Email que recibe un aviso con cada cliente nuevo y cada baja. Dejar "" para no avisar.
var EMAIL_AVISOS = "";

var HOJAS = {
  "Visitas": ["Fecha", "Técnico", "Servicio", "Comentario", "Dejó sus datos"],
  "Clientes": ["Alta", "Teléfono", "Email", "Consentimiento gestión interna",
               "Consentimiento comunicaciones", "Versión texto consentimiento", "Última actualización", "Baja comunicaciones"],
  "Bajas": ["Fecha", "Teléfono", "Email", "Acción", "Cliente encontrado"]
};

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.tipo === "visita") guardarVisita_(d);
    else if (d.tipo === "baja") guardarBaja_(d);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput("Slontec: receptor activo.");
}

function hoja_(nombre) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(nombre);
  if (!sh) {
    sh = ss.insertSheet(nombre);
    sh.appendRow(HOJAS[nombre]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HOJAS[nombre].length).setFontWeight("bold");
  }
  return sh;
}

function limpio_(v, max) { return String(v == null ? "" : v).slice(0, max || 500); }
function normTel_(t) { return String(t || "").replace(/[^\d+]/g, "").replace(/^\+34/, ""); }
function normEmail_(m) { return String(m || "").trim().toLowerCase(); }

function guardarVisita_(d) {
  var fecha = new Date();
  var conDatos = d.consentimientoGestion === true && !!(d.telefono || d.email);
  hoja_("Visitas").appendRow([fecha, limpio_(d.tecnico, 100), limpio_(d.servicio, 100), limpio_(d.comentario, 4000), conDatos ? "Sí" : "No"]);

  if (conDatos) {
    var nuevo = upsertCliente_(d, fecha);
    if (EMAIL_AVISOS && nuevo) {
      MailApp.sendEmail(EMAIL_AVISOS, "Nuevo cliente desde la web",
        "Teléfono: " + (d.telefono || "-") + "\nEmail: " + (d.email || "-") +
        "\nAcepta comunicaciones: " + (d.consentimientoComercial ? "Sí" : "No") +
        "\nTécnico: " + (d.tecnico || "-"));
    }
  }
}

function buscarCliente_(sh, tel, email) {
  var datos = sh.getDataRange().getValues();
  var t = normTel_(tel), m = normEmail_(email);
  for (var i = 1; i < datos.length; i++) {
    if ((t && normTel_(datos[i][1]) === t) || (m && normEmail_(datos[i][2]) === m)) return i + 1; // fila
  }
  return 0;
}

/** Añade o actualiza un cliente. Devuelve true si es nuevo. */
function upsertCliente_(d, fecha) {
  var sh = hoja_("Clientes");
  var fila = buscarCliente_(sh, d.telefono, d.email);
  var valores = [
    fecha,
    limpio_(d.telefono, 50),
    limpio_(d.email, 200),
    "SÍ",
    d.consentimientoComercial === true ? "SÍ" : "NO",
    limpio_(d.versionTextoConsentimiento, 40),
    fecha,
    ""
  ];
  if (fila) {
    var previo = sh.getRange(fila, 1, 1, valores.length).getValues()[0];
    valores[0] = previo[0] || fecha;
    valores[1] = valores[1] || previo[1];
    valores[2] = valores[2] || previo[2];
    sh.getRange(fila, 1, 1, valores.length).setValues([valores]);
    return false;
  }
  sh.appendRow(valores);
  return true;
}

function guardarBaja_(d) {
  var fecha = new Date();
  var sh = hoja_("Clientes");
  var fila = buscarCliente_(sh, d.telefono, d.email);
  if (fila) {
    if (d.accion === "borrar_todo") {
      sh.deleteRow(fila);
    } else {
      sh.getRange(fila, 5).setValue("NO");
      sh.getRange(fila, 7).setValue(fecha);
      sh.getRange(fila, 8).setValue(fecha);
    }
  }
  // En "Bajas" solo se guarda lo imprescindible para acreditar la petición.
  hoja_("Bajas").appendRow([fecha, limpio_(d.telefono, 50), limpio_(d.email, 200),
    d.accion === "borrar_todo" ? "Borrar datos" : "Baja comunicaciones", fila ? "Sí" : "No"]);

  if (EMAIL_AVISOS) {
    MailApp.sendEmail(EMAIL_AVISOS, "Solicitud de baja (" + (d.accion === "borrar_todo" ? "borrar datos" : "comunicaciones") + ")",
      "Teléfono: " + (d.telefono || "-") + "\nEmail: " + (d.email || "-") +
      "\nCliente encontrado: " + (fila ? "Sí" : "No — revisar manualmente") +
      (d.accion === "borrar_todo" ? "\n\nRecuerda borrar también este cliente de agendas, WhatsApp u otros sistemas." : ""));
  }
}
