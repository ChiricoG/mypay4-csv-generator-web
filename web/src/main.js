const statusBox = document.getElementById("statusBox");
const tableBody = document.querySelector("#rowsTable tbody");
const tableWrap = document.getElementById("tableWrap");
const rowDialog = document.getElementById("rowDialog");
const rowForm = document.getElementById("rowForm");
const rowFields = document.getElementById("rowFields");
const dlgTitle = document.getElementById("dlgTitle");
const ipaInput = document.getElementById("ipaInput");
const fnamePreview = document.getElementById("fnamePreview");
const inputFile = document.getElementById("inputFile");

const bulkDialog = document.getElementById("bulkDialog");
const bulkValLabel = document.getElementById("bulkValLabel");

const dsrDialog = document.getElementById("dsrDialog");
const bilancioDialog = document.getElementById("bilancioDialog");
const bilancioPreviewDialog = document.getElementById("bilancioPreviewDialog");

const TABLE_COLS = [
  "IUD",
  "tipoIdentificativoUnivoco",
  "anagraficaPagatore",
  "dataEsecuzionePagamento",
  "importoDovuto",
  "tipoDovuto",
  "causaleVersamento",
  "bilancio",
  "azione",
  "flagMultiBeneficiario",
];

const FIELDS = [
  ["IUD", "IUD", "text"],
  ["codIuv", "Codice IUV", "text"],
  ["tipoIdentificativoUnivoco", "Tipo Identificativo", "combo_FG"],
  ["codiceIdentificativoUnivoco", "Codice Identificativo", "text"],
  ["anagraficaPagatore", "Anagrafica Pagatore", "text"],
  ["indirizzoPagatore", "Indirizzo Pagatore", "text"],
  ["civicoPagatore", "Civico Pagatore", "text"],
  ["capPagatore", "CAP Pagatore", "text"],
  ["localitaPagatore", "Localita Pagatore", "text"],
  ["provinciaPagatore", "Provincia Pagatore", "text"],
  ["nazionePagatore", "Nazione Pagatore", "text"],
  ["mailPagatore", "Email Pagatore", "text"],
  ["dataEsecuzionePagamento", "Data Esecuzione", "date"],
  ["importoDovuto", "Importo Dovuto", "decimal"],
  ["commissioneCaricoPa", "Commissione Carico PA", "decimal"],
  ["tipoDovuto", "Tipo Dovuto", "text"],
  ["tipoVersamento", "Tipo Versamento", "text"],
  ["causaleVersamento", "Causale Versamento", "textarea"],
  ["datiSpecificiRiscossione", "DSR", "dsr"],
  ["bilancio", "Bilancio XML", "bilancio_xml"],
  ["flgGeneraIuv", "Flag Genera IUV", "combo_bool"],
  ["flagMultiBeneficiario", "Flag Multi Beneficiario", "combo_bool"],
  ["codiceFiscaleEnteSecondario", "CF Ente Secondario", "text"],
  ["denominazioneEnteSecondario", "Denominazione Ente Secondario", "text"],
  ["ibanAccreditoEnteSecondario", "IBAN Ente Secondario", "text"],
  ["indirizzoEnteSecondario", "Indirizzo Ente Secondario", "text"],
  ["civicoEnteSecondario", "Civico Ente Secondario", "text"],
  ["capEnteSecondario", "CAP Ente Secondario", "text"],
  ["localitaEnteSecondario", "Localita Ente Secondario", "text"],
  ["provinciaEnteSecondario", "Provincia Ente Secondario", "text"],
  ["nazioneEnteSecondario", "Nazione Ente Secondario", "text"],
  ["datiSpecificiRiscossioneEnteSecondario", "DSR Ente Secondario", "dsr"],
  ["causaleVersamentoEnteSecondario", "Causale Ente Secondario", "textarea"],
  ["importoVersamentoEnteSecondario", "Importo Ente Secondario", "decimal"],
  ["azione", "Azione", "combo_IMA"],
];

let pyodide;
let rows = [];
let errorsByRow = [];
let editIdx = -1;
let selectedRowIdx = -1;
let savedCsvBasename = null;

let bilancioDraft = [];
let bilancioTargetTextarea = null;
let bilancioNotifyPreview = null;

let dsrTargetInput = null;

let FIELD_NOTES = {};
let FIELD_REQUIRED = {};

function applyFieldNote(el, name) {
  const t = FIELD_NOTES[name];
  if (t && el) el.title = t;
}

function applyFieldHelpToWrap(wrap, name) {
  const t = FIELD_NOTES[name];
  if (!t || !wrap) return;
  wrap.title = t;
  wrap.classList.add("field-has-help");
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function randomId4() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function timestampFname() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function ipaUpper() {
  return (ipaInput.value || "").trim().toUpperCase() || "ENTE";
}

function updateFnamePreview() {
  const ipa = ipaUpper();
  fnamePreview.textContent = `→  ${ipa}-<ID>_<data>_<hhmmss>-1_4.csv`;
}

function generateFname() {
  return `${ipaUpper()}-${randomId4()}_${timestampFname()}-1_4.csv`;
}

function setStatus(msg) {
  statusBox.textContent = msg;
}

function updateStatusBar() {
  const fname = savedCsvBasename || "(non salvato)";
  setStatus(`Righe nel flusso: ${rows.length}  |  File: ${fname}`);
}

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function displayCell(row, col) {
  if (col === "bilancio") return row[col] ? "[XML]" : "";
  return row[col] ?? "";
}

function parseFloatIt(v) {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

function collectValidationErrorLines() {
  const bridge = pyodide.globals.get("bridge_validate");
  const out = bridge(JSON.stringify(rows));
  const all = JSON.parse(out);
  const err_rows = [];
  rows.forEach((row, i) => {
    const errs = all[i] || [];
    if (errs.length) {
      err_rows.push(`Riga ${i + 1} (IUD: ${row.IUD || "?"}): ${errs.join("; ")}`);
    }
  });
  return err_rows;
}

async function performExport(csvName) {
  let name = (csvName || "").trim() || generateFname();
  if (!name.toLowerCase().endsWith(".csv")) name = `${name}.csv`;
  const err_rows = collectValidationErrorLines();
  if (err_rows.length) {
    let msg =
      `Sono stati riscontrati ${err_rows.length} record con errori di validazione.\n` +
      `Il file generato potrebbe essere rifiutato da MyPay.\n\n` +
      `Esempi di errori:\n` +
      err_rows.slice(0, 5).join("\n");
    if (err_rows.length > 5) msg += `\n... e altri ${err_rows.length - 5} errori.`;
    msg += "\n\nVuoi procedere comunque con il salvataggio?";
    if (!confirm(msg)) return false;
  }

  const bridge = pyodide.globals.get("bridge_export");
  const outPath = "/tmp/out.zip";
  bridge(JSON.stringify(rows), name, outPath);
  const zipBytes = pyodide.FS.readFile(outPath);
  const blob = new Blob([zipBytes], { type: "application/zip" });
  const a = document.createElement("a");
  const zipDownloadName = name.replace(/\.csv$/i, "") + ".zip";
  a.href = URL.createObjectURL(blob);
  a.download = zipDownloadName;
  a.click();
  URL.revokeObjectURL(a.href);

  savedCsvBasename = name;
  alert(
    "File salvato correttamente:\n" +
      `  • ${zipDownloadName}\n\n` +
      "IMPORTANTE\n" +
      "Effettuare l'upload del file .zip sul sistema MyPay.\n" +
      "Non occorre spacchettare l'archivio per effettuare il caricamento.",
  );
  document.title = `MyPay4 — ${name}  |  Generatore CSV`;
  updateStatusBar();
  return true;
}

function emptyBilancioCap() {
  return {
    codCapitolo: "",
    codUfficio: "",
    accertamenti: [{ codAccertamento: "", importo: "" }],
  };
}

function normalizeBilancioCaps(parsed) {
  if (!parsed || !parsed.length) return [emptyBilancioCap()];
  return parsed.map((cap) => ({
    codCapitolo: cap.codCapitolo || "",
    codUfficio: cap.codUfficio || "",
    accertamenti:
      cap.accertamenti && cap.accertamenti.length
        ? cap.accertamenti.map((a) => ({
            codAccertamento: a.codAccertamento || "",
            importo: a.importo || "",
          }))
        : [{ codAccertamento: "", importo: "" }],
  }));
}

function updateBilancioTotal() {
  let total = 0;
  for (const cap of bilancioDraft) {
    for (const a of cap.accertamenti) {
      const x = parseFloatIt(a.importo);
      if (x != null) total += x;
    }
  }
  const el = document.getElementById("bilancioTotal");
  const target = parseFloatIt(rowForm.elements.namedItem("importoDovuto")?.value);
  let msg = `Totale accertamenti: EUR ${total.toFixed(2)}`;
  el.className = "bilancio-total";
  if (target != null) {
    if (Math.abs(total - target) > 0.001) {
      msg += `  !!  atteso EUR ${target.toFixed(2)}`;
      el.classList.add("warn");
    } else {
      msg += "  OK";
      el.classList.add("ok");
    }
  }
  el.textContent = msg;
}

function renderBilancioCapitoli() {
  const root = document.getElementById("bilancioCapitoliRoot");
  root.innerHTML = "";
  bilancioDraft.forEach((cap, ci) => {
    const box = document.createElement("div");
    box.className = "bilancio-cap";

    const h = document.createElement("h4");
    const tspan = document.createElement("span");
    tspan.textContent = `Capitolo ${ci + 1}`;
    const rmCap = document.createElement("button");
    rmCap.type = "button";
    rmCap.textContent = "Rimuovi capitolo";
    rmCap.className = "btn-secondary";
    rmCap.addEventListener("click", () => {
      if (bilancioDraft.length === 1) {
        alert("Deve rimanere almeno un capitolo.");
        return;
      }
      bilancioDraft.splice(ci, 1);
      renderBilancioCapitoli();
    });
    h.append(tspan, rmCap);
    box.appendChild(h);

    const grid = document.createElement("div");
    grid.className = "bilancio-cap-grid";
    for (const [lbl, key] of [
      ["Cod. capitolo *", "codCapitolo"],
      ["Cod. ufficio", "codUfficio"],
    ]) {
      const lb = document.createElement("span");
      lb.textContent = lbl;
      const inp = document.createElement("input");
      inp.type = "text";
      inp.value = cap[key];
      inp.addEventListener("input", (e) => {
        cap[key] = e.target.value;
      });
      grid.appendChild(lb);
      grid.appendChild(inp);
    }
    box.appendChild(grid);

    const accHead = document.createElement("div");
    accHead.className = "bilancio-acc-head";
    accHead.innerHTML =
      "<span>Cod. accertamento (opz.)</span><span>Importo *</span><span></span>";
    box.appendChild(accHead);

    cap.accertamenti.forEach((acc, ai) => {
      const row = document.createElement("div");
      row.className = "bilancio-acc-row";
      const i1 = document.createElement("input");
      i1.type = "text";
      i1.value = acc.codAccertamento;
      i1.addEventListener("input", (e) => {
        acc.codAccertamento = e.target.value;
      });
      const i2 = document.createElement("input");
      i2.type = "text";
      i2.value = acc.importo;
      i2.addEventListener("input", (e) => {
        acc.importo = e.target.value;
        updateBilancioTotal();
      });
      const rm = document.createElement("button");
      rm.type = "button";
      rm.textContent = "×";
      rm.title = "Rimuovi accertamento";
      rm.addEventListener("click", () => {
        if (cap.accertamenti.length === 1) {
          alert("Ogni capitolo deve avere almeno un accertamento.");
          return;
        }
        cap.accertamenti.splice(ai, 1);
        renderBilancioCapitoli();
      });
      row.append(i1, i2, rm);
      box.appendChild(row);
    });

    const addAcc = document.createElement("button");
    addAcc.type = "button";
    addAcc.textContent = "Aggiungi accertamento";
    addAcc.className = "btn-secondary";
    addAcc.addEventListener("click", () => {
      cap.accertamenti.push({ codAccertamento: "", importo: "" });
      renderBilancioCapitoli();
    });
    box.appendChild(addAcc);

    root.appendChild(box);
  });
  updateBilancioTotal();
}

function openBilancioEditor(textareaEl, onApplied) {
  bilancioTargetTextarea = textareaEl;
  bilancioNotifyPreview = onApplied;
  const xml = textareaEl.value.trim();
  const bridge = pyodide.globals.get("bridge_parse_bilancio");
  const parsed = JSON.parse(bridge(xml));
  bilancioDraft = normalizeBilancioCaps(parsed);
  const imp = rowForm.elements.namedItem("importoDovuto")?.value?.trim() || "";
  document.getElementById("bilancioImportoHint").textContent = imp
    ? `Importo da coprire: EUR ${imp.replace(",", ".")}`
    : "";
  renderBilancioCapitoli();
  bilancioDialog.showModal();
}

function confirmBilancio() {
  const errors = [];
  bilancioDraft.forEach((cap, i) => {
    if (!String(cap.codCapitolo).trim()) {
      errors.push(`Capitolo ${i + 1}: codCapitolo è obbligatorio.`);
    }
    cap.accertamenti.forEach((acc, j) => {
      if (!String(acc.importo).trim()) {
        errors.push(`Capitolo ${i + 1}, Accertamento ${j + 1}: importo obbligatorio.`);
      } else {
        const x = parseFloatIt(acc.importo);
        if (x == null) {
          errors.push(`Capitolo ${i + 1}, Accertamento ${j + 1}: importo non numerico.`);
        } else if (x <= 0) {
          errors.push(`Capitolo ${i + 1}, Accertamento ${j + 1}: importo deve essere > 0.`);
        }
      }
    });
  });
  const target = parseFloatIt(rowForm.elements.namedItem("importoDovuto")?.value);
  if (target != null) {
    let total = 0;
    for (const cap of bilancioDraft) {
      for (const a of cap.accertamenti) {
        const x = parseFloatIt(a.importo);
        if (x != null) total += x;
      }
    }
    if (Math.abs(total - target) > 0.001) {
      errors.push(
        `Somma accertamenti (EUR ${total.toFixed(2)}) ≠ importo dovuto (EUR ${target.toFixed(2)}).`,
      );
    }
  }
  if (errors.length) {
    alert(errors.join("\n"));
    return;
  }
  const build = pyodide.globals.get("bridge_build_bilancio");
  const xml = String(build(JSON.stringify(bilancioDraft)));
  if (xml.length > 4096) {
    alert(`XML troppo lungo (${xml.length} caratteri, massimo 4096).`);
    return;
  }
  bilancioTargetTextarea.value = xml;
  bilancioNotifyPreview?.();
  bilancioDialog.close();
}

function updateDsrPreview() {
  const code = document.getElementById("dsrTipo").value;
  const codice = document.getElementById("dsrCodice").value.trim();
  const el = document.getElementById("dsrPreview");
  el.textContent = code && codice ? `${code}/${codice}` : "—";
}

function openDsrHelper(inputEl, fieldLabel) {
  dsrTargetInput = inputEl;
  document.getElementById("dsrDlgTitle").textContent = fieldLabel
    ? `Helper — ${fieldLabel}`
    : "Helper Dati Specifici Riscossione";
  const cur = inputEl.value.trim();
  const tipoSel = document.getElementById("dsrTipo");
  const cod = document.getElementById("dsrCodice");
  const m = cur.match(/^([0129])\/(.*)/);
  if (m && [...tipoSel.options].some((o) => o.value === m[1])) {
    tipoSel.value = m[1];
    cod.value = m[2];
  } else {
    tipoSel.selectedIndex = 0;
    cod.value = "";
  }
  updateDsrPreview();
  dsrDialog.showModal();
}

async function loadCoreFiles() {
  const files = [
    "__init__.py",
    "constants.py",
    "helpers.py",
    "xml_engine.py",
    "validators.py",
    "csv_flow.py",
    "bulk_increase.py",
  ];
  pyodide.FS.mkdirTree("/app/mypay4_core");
  for (const name of files) {
    const res = await fetch(`../py/mypay4_core/${name}`);
    if (!res.ok) {
      throw new Error(`Impossibile caricare ${name}`);
    }
    const text = await res.text();
    pyodide.FS.writeFile(`/app/mypay4_core/${name}`, text);
  }
  await pyodide.runPythonAsync(`
import sys, json
sys.path.insert(0, "/app")
from mypay4_core.csv_flow import parse_csv_or_zip_bytes, rows_to_zip_bytes
from mypay4_core.validators import validate_row
from mypay4_core.xml_engine import build_bilancio_xml, parse_bilancio_xml
from mypay4_core.bulk_increase import apply_bulk_increase

def bridge_parse(path, file_name):
    with open(path, "rb") as f:
        payload = f.read()
    rows, version = parse_csv_or_zip_bytes(payload, file_name)
    return json.dumps({"rows": rows, "version": version}, ensure_ascii=False)

def bridge_validate(rows_json):
    data = json.loads(rows_json)
    return json.dumps([validate_row(r) for r in data], ensure_ascii=False)

def bridge_export(rows_json, csv_name, out_path):
    data = json.loads(rows_json)
    zip_bytes = rows_to_zip_bytes(data, csv_name)
    with open(out_path, "wb") as f:
        f.write(zip_bytes)

def bridge_build_bilancio(data_json):
    data = json.loads(data_json)
    return build_bilancio_xml(data)

def bridge_parse_bilancio(xml_str):
    return json.dumps(parse_bilancio_xml(xml_str or ""), ensure_ascii=False)

def bridge_bulk_increase(rows_json, cfg_json):
    rows = json.loads(rows_json)
    cfg = json.loads(cfg_json)
    apply_bulk_increase(
        rows,
        cfg["tipo"],
        float(cfg["delta"]),
        cfg["cap_mode"],
        cfg.get("filtro_cap", "") or "",
        cfg.get("new_cod_cap", "") or "",
        cfg.get("new_cod_uff", "") or "",
        cfg.get("new_cod_acc", "") or "",
    )
    return json.dumps(rows, ensure_ascii=False)
`);
}

function fillDsrTipoOptions() {
  const raw = pyodide.runPython(
    `import json; from mypay4_core.constants import DSR_TYPES; json.dumps(DSR_TYPES, ensure_ascii=False)`,
  );
  const types = JSON.parse(raw);
  const sel = document.getElementById("dsrTipo");
  sel.innerHTML = "";
  for (const [code, label] of types) {
    sel.appendChild(new Option(label, code));
  }
}

function loadFieldMetaFromPython() {
  const raw = pyodide.runPython(`
import json
from mypay4_core.constants import FIELDS
json.dumps({"notes": {f[0]: f[4] for f in FIELDS}, "required": {f[0]: f[2] for f in FIELDS}}, ensure_ascii=False)
`);
  const meta = JSON.parse(raw);
  FIELD_NOTES = meta.notes || {};
  FIELD_REQUIRED = meta.required || {};
}

async function initPyodide() {
  setStatus("Caricamento in corso…");
  pyodide = await loadPyodide();
  await loadCoreFiles();
  loadFieldMetaFromPython();
  fillDsrTipoOptions();
  updateFnamePreview();
  setStatus("Pronto.");
  updateStatusBar();
}

function makeFieldInput(name, label, kind, value) {
  const wrap = document.createElement("label");
  wrap.className = "field";
  applyFieldHelpToWrap(wrap, name);
  const labelNode = document.createElement("span");
  const req = !!FIELD_REQUIRED[name];
  labelNode.textContent = `${req ? "* " : "  "}${label} (${name})`;
  labelNode.style.color = req ? "#e07878" : "#029fe8";
  labelNode.style.fontWeight = req ? "bold" : "normal";
  wrap.appendChild(labelNode);

  let input;
  if (kind === "combo_FG") {
    input = document.createElement("select");
    ["", "F", "G"].forEach((v) => input.add(new Option(v, v)));
  } else if (kind === "combo_bool") {
    input = document.createElement("select");
    ["", "true", "false"].forEach((v) => input.add(new Option(v, v)));
  } else if (kind === "combo_IMA") {
    input = document.createElement("select");
    ["", "I", "M", "A"].forEach((v) => input.add(new Option(v, v)));
  } else if (kind === "textarea") {
    input = document.createElement("textarea");
    input.rows = 2;
  } else if (kind === "dsr") {
    const row = document.createElement("div");
    row.className = "field-row-dsr";
    input = document.createElement("input");
    input.type = "text";
    input.name = name;
    input.value = value || "";
    applyFieldNote(input, name);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Helper";
    applyFieldNote(btn, name);
    btn.addEventListener("click", () => openDsrHelper(input, label));
    row.appendChild(input);
    row.appendChild(btn);
    row.classList.add("field-has-help");
    row.title = FIELD_NOTES[name] || "";
    wrap.appendChild(row);
    return wrap;
  } else if (kind === "bilancio_xml") {
    const preview = document.createElement("div");
    preview.className = "bilancio-preview";
    const actions = document.createElement("div");
    actions.className = "field-actions";
    const ta = document.createElement("textarea");
    ta.name = name;
    ta.style.display = "none";
    ta.value = value || "";
    const upd = () => {
      const raw = ta.value.trim();
      preview.textContent = !raw
        ? "(vuoto)"
        : raw.length > 44
          ? `XML: ${raw.slice(0, 40)}…`
          : `XML: ${raw}`;
    };
    const btnEd = document.createElement("button");
    btnEd.type = "button";
    btnEd.textContent = "Editor bilancio";
    applyFieldNote(btnEd, name);
    applyFieldNote(preview, name);
    btnEd.addEventListener("click", () => openBilancioEditor(ta, upd));
    const btnClr = document.createElement("button");
    btnClr.type = "button";
    btnClr.textContent = "×";
    btnClr.title = "Svuota bilancio";
    btnClr.addEventListener("click", () => {
      ta.value = "";
      upd();
    });
    actions.append(btnEd, btnClr);
    wrap.appendChild(preview);
    wrap.appendChild(actions);
    wrap.appendChild(ta);
    applyFieldNote(ta, name);
    applyFieldNote(actions, name);
    upd();
    return wrap;
  } else {
    input = document.createElement("input");
    input.type = "text";
  }
  input.name = name;
  if (kind === "date") {
    input.value = value || todayIso();
  } else {
    input.value = value || "";
  }
  applyFieldNote(input, name);
  wrap.appendChild(input);
  return wrap;
}

function openRowDialog(initialRow, idx) {
  editIdx = idx;
  dlgTitle.textContent = idx >= 0 ? `Modifica riga ${idx + 1}` : "Nuova riga dovuto";
  rowFields.innerHTML = "";
  for (const [name, label, kind] of FIELDS) {
    rowFields.appendChild(makeFieldInput(name, label, kind, initialRow[name] || ""));
  }
  rowDialog.showModal();
}

function collectFormData() {
  const data = {};
  for (const [name] of FIELDS) {
    data[name] = (rowForm.elements.namedItem(name)?.value || "").trim();
  }
  return data;
}

function clearRowFormFields() {
  for (const [name, , kind] of FIELDS) {
    const el = rowForm.elements.namedItem(name);
    if (!el) continue;
    if (kind === "combo_FG" || kind === "combo_bool" || kind === "combo_IMA") el.value = "";
    else if (kind === "date") el.value = todayIso();
    else if (kind === "textarea") el.value = "";
    else el.value = "";
    if (kind === "bilancio_xml") {
      const ta = rowForm.elements.namedItem(name);
      if (ta) {
        ta.value = "";
        const prev = ta.closest("label.field")?.querySelector(".bilancio-preview");
        if (prev) prev.textContent = "(vuoto)";
      }
    }
  }
}

async function validateAllRows() {
  const bridge = pyodide.globals.get("bridge_validate");
  const out = bridge(JSON.stringify(rows));
  errorsByRow = JSON.parse(out);
}

async function refreshTable() {
  await validateAllRows();
  tableBody.innerHTML = "";
  rows.forEach((r, idx) => {
    const tr = document.createElement("tr");
    tr.dataset.idx = String(idx);
    if (idx === selectedRowIdx) tr.classList.add("row-selected");

    const errs = errorsByRow[idx] || [];

    const nTd = document.createElement("td");
    nTd.textContent = String(idx + 1);
    tr.appendChild(nTd);

    for (const c of TABLE_COLS) {
      const td = document.createElement("td");
      td.textContent = displayCell(r, c);
      tr.appendChild(td);
    }

    const tdErr = document.createElement("td");
    if (errs.length) tdErr.innerHTML = errs.map((e) => escHtml(e)).join("<br/>");
    tr.appendChild(tdErr);

    const tdAct = document.createElement("td");
    tdAct.innerHTML = `<button type="button" data-act="edit" data-idx="${idx}">Modifica</button> <button type="button" data-act="dup" data-idx="${idx}">Duplica</button> <button type="button" data-act="del" data-idx="${idx}">Elimina</button>`;
    tr.appendChild(tdAct);

    tableBody.appendChild(tr);
  });
  if (rows.length === 0) selectedRowIdx = -1;
  else if (selectedRowIdx >= rows.length) selectedRowIdx = rows.length - 1;
  updateStatusBar();
}

function updateTableSelectionHighlight() {
  tableBody.querySelectorAll("tr").forEach((tr) => {
    const idx = Number(tr.dataset.idx);
    tr.classList.toggle("row-selected", Number.isFinite(idx) && idx === selectedRowIdx);
  });
}

function updateBulkValLabel() {
  const tipo = document.querySelector('input[name="bulkTipo"]:checked')?.value;
  bulkValLabel.textContent =
    tipo === "percentuale" ? "Percentuale di aumento (%):" : "Importo fisso da aggiungere (€):";
}

function updateBulkCapFrames() {
  const mode = document.querySelector('input[name="bulkCapMode"]:checked')?.value || "preesistente";
  const map = [
    ["preesistente", "bulkSubA"],
    ["sostituisci", "bulkSubB"],
    ["differenza", "bulkSubC"],
  ];
  for (const [m, id] of map) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.classList.toggle("bulk-sub-active", m === mode);
    el.classList.toggle("bulk-sub-dim", m !== mode);
  }
}

document.getElementById("btnClearRow").addEventListener("click", clearRowFormFields);

document.getElementById("dsrBtnCancel").addEventListener("click", () => dsrDialog.close());
document.getElementById("dsrBtnOk").addEventListener("click", () => {
  const tipo = document.getElementById("dsrTipo").value;
  const codice = document.getElementById("dsrCodice").value.trim();
  if (!tipo) {
    alert("Seleziona il tipo contabilità.");
    return;
  }
  if (!codice || codice.length < 3 || codice.length > 138 || /\s/.test(codice)) {
    alert("Codice non valido (3-138 caratteri, senza spazi).");
    return;
  }
  dsrTargetInput.value = `${tipo}/${codice}`;
  dsrDialog.close();
});

document.getElementById("dsrTipo").addEventListener("change", updateDsrPreview);
document.getElementById("dsrCodice").addEventListener("input", updateDsrPreview);

document.getElementById("bilancioAddCap").addEventListener("click", () => {
  bilancioDraft.push(emptyBilancioCap());
  renderBilancioCapitoli();
});
document.getElementById("bilancioBtnClear").addEventListener("click", () => {
  bilancioDraft = [emptyBilancioCap()];
  renderBilancioCapitoli();
});
document.getElementById("bilancioBtnCancel").addEventListener("click", () => bilancioDialog.close());
document.getElementById("bilancioBtnOk").addEventListener("click", () => confirmBilancio());
document.getElementById("bilancioPreviewXml").addEventListener("click", () => {
  const build = pyodide.globals.get("bridge_build_bilancio");
  const xml = String(build(JSON.stringify(bilancioDraft)));
  const pretty = xml.replace(/></g, ">\n<");
  document.getElementById("bilancioPreviewPre").textContent = pretty;
  const lenEl = document.getElementById("bilancioPreviewLen");
  lenEl.textContent = `Lunghezza XML: ${xml.length} caratteri (limite: 4096)${xml.length > 4096 ? " — troppo lungo" : ""}`;
  lenEl.style.color = xml.length > 4096 ? "#c44" : "#5a7a8a";
  bilancioPreviewDialog.showModal();
});
document.getElementById("bilancioPreviewClose").addEventListener("click", () => bilancioPreviewDialog.close());

ipaInput.addEventListener("input", updateFnamePreview);

for (const el of document.querySelectorAll('input[name="bulkTipo"]')) {
  el.addEventListener("change", updateBulkValLabel);
}
for (const el of document.querySelectorAll('input[name="bulkCapMode"]')) {
  el.addEventListener("change", updateBulkCapFrames);
}
updateBulkValLabel();
updateBulkCapFrames();

document.getElementById("btnBulkCancel").addEventListener("click", () => bulkDialog.close());
document.getElementById("btnBulkApply").addEventListener("click", async () => {
  if (!rows.length) return;
  const raw = document.getElementById("bulkDelta").value.replace(",", ".").trim();
  let delta;
  try {
    delta = parseFloat(raw);
    if (!Number.isFinite(delta) || delta <= 0) throw new Error("x");
  } catch {
    alert("Inserisci un numero positivo (es. 5 oppure 1.50).");
    return;
  }
  const tipo = document.querySelector('input[name="bulkTipo"]:checked').value;
  const capMode = document.querySelector('input[name="bulkCapMode"]:checked').value;
  let new_cod_cap = "";
  let new_cod_uff = "";
  let new_cod_acc = "";
  if (capMode === "sostituisci") {
    new_cod_cap = document.getElementById("bulkCodCapB").value.trim();
    new_cod_uff = document.getElementById("bulkCodUffB").value.trim();
    new_cod_acc = document.getElementById("bulkCodAccB").value.trim();
  } else if (capMode === "differenza") {
    new_cod_cap = document.getElementById("bulkCodCapC").value.trim();
    new_cod_uff = document.getElementById("bulkCodUffC").value.trim();
    new_cod_acc = document.getElementById("bulkCodAccC").value.trim();
  }
  if ((capMode === "sostituisci" || capMode === "differenza") && !new_cod_cap) {
    alert(
      `Inserisci il Cod. Capitolo per l'opzione ${capMode === "sostituisci" ? "B" : "C"}.`,
    );
    return;
  }
  const cfg = {
    tipo,
    delta,
    cap_mode: capMode,
    filtro_cap: document.getElementById("bulkFiltroCap").value,
    new_cod_cap,
    new_cod_uff,
    new_cod_acc,
  };
  const bridge = pyodide.globals.get("bridge_bulk_increase");
  const out = bridge(JSON.stringify(rows), JSON.stringify(cfg));
  rows = JSON.parse(out);
  bulkDialog.close();
  alert("OK");
  await refreshTable();
});

document.getElementById("btnNuova").addEventListener("click", () => {
  const empty = Object.fromEntries(FIELDS.map(([name]) => [name, ""]));
  openRowDialog(empty, -1);
});

document.getElementById("btnModifica").addEventListener("click", () => {
  if (selectedRowIdx < 0 || selectedRowIdx >= rows.length) return;
  openRowDialog(rows[selectedRowIdx], selectedRowIdx);
});

document.getElementById("btnElimina").addEventListener("click", async () => {
  if (selectedRowIdx < 0 || selectedRowIdx >= rows.length) return;
  if (!confirm(`Eliminare la riga ${selectedRowIdx + 1}?`)) return;
  rows.splice(selectedRowIdx, 1);
  selectedRowIdx = Math.min(selectedRowIdx, rows.length - 1);
  await refreshTable();
});

document.getElementById("btnDuplica").addEventListener("click", async () => {
  if (selectedRowIdx < 0 || selectedRowIdx >= rows.length) return;
  const idx = selectedRowIdx;
  const copy = structuredClone(rows[idx]);
  rows.splice(idx + 1, 0, copy);
  selectedRowIdx = idx + 1;
  await refreshTable();
});

document.getElementById("btnSu").addEventListener("click", async () => {
  if (selectedRowIdx <= 0) return;
  const i = selectedRowIdx;
  [rows[i - 1], rows[i]] = [rows[i], rows[i - 1]];
  selectedRowIdx = i - 1;
  await refreshTable();
});

document.getElementById("btnGiu").addEventListener("click", async () => {
  if (selectedRowIdx < 0 || selectedRowIdx >= rows.length - 1) return;
  const i = selectedRowIdx;
  [rows[i + 1], rows[i]] = [rows[i], rows[i + 1]];
  selectedRowIdx = i + 1;
  await refreshTable();
});

document.getElementById("btnSalva").addEventListener("click", async () => {
  if (!rows.length) return;
  if (!savedCsvBasename) {
    document.getElementById("btnSalvaCome").click();
    return;
  }
  await performExport(savedCsvBasename);
});

document.getElementById("btnSalvaCome").addEventListener("click", async () => {
  if (!rows.length) return;
  const def = generateFname();
  const name = prompt("Nome file CSV", def);
  if (name === null) return;
  const finalName = (name || "").trim() || def;
  await performExport(finalName);
});

document.getElementById("btnNuovaSessione").addEventListener("click", async () => {
  if (rows.length && !confirm("Perdere le modifiche non salvate?")) return;
  rows = [];
  savedCsvBasename = null;
  selectedRowIdx = -1;
  document.title = "MyPay4 — Generatore CSV";
  await refreshTable();
  setStatus("Nuova sessione.");
});

document.getElementById("btnBulk").addEventListener("click", () => {
  if (!rows.length) return;
  document.getElementById("bulkDelta").value = "";
  bulkDialog.showModal();
});

rowForm.addEventListener("submit", async (ev) => {
  if (ev.submitter?.value === "cancel") return;
  ev.preventDefault();
  const row = collectFormData();
  const bridge = pyodide.globals.get("bridge_validate");
  const errs = JSON.parse(bridge(JSON.stringify([row])))[0];
  if (errs && errs.length) {
    alert(
      "Errori di validazione\n\nCorreggere i seguenti errori prima di proseguire:\n\n" +
        errs.map((e) => `• ${e}`).join("\n"),
    );
    return;
  }
  if (editIdx >= 0) rows[editIdx] = row;
  else rows.push(row);
  rowDialog.close();
  await refreshTable();
});

tableBody.addEventListener("click", async (ev) => {
  const button = ev.target.closest("button");
  const tr = ev.target.closest("tr");
  if (button) {
    const idx = Number(button.dataset.idx);
    const act = button.dataset.act;
    if (act === "edit") {
      selectedRowIdx = idx;
      openRowDialog(rows[idx], idx);
    }
    if (act === "dup") {
      rows.splice(idx + 1, 0, structuredClone(rows[idx]));
      selectedRowIdx = idx + 1;
      await refreshTable();
    }
    if (act === "del") {
      if (!confirm(`Eliminare la riga ${idx + 1}?`)) return;
      rows.splice(idx, 1);
      if (selectedRowIdx === idx) selectedRowIdx = -1;
      else if (selectedRowIdx > idx) selectedRowIdx--;
      await refreshTable();
    }
    return;
  }
  if (tr && tr.dataset.idx !== undefined) {
    selectedRowIdx = Number(tr.dataset.idx);
    updateTableSelectionHighlight();
  }
});

tableBody.addEventListener("dblclick", (ev) => {
  if (ev.target.closest("button")) return;
  const tr = ev.target.closest("tr");
  if (!tr || tr.dataset.idx === undefined) return;
  const idx = Number(tr.dataset.idx);
  selectedRowIdx = idx;
  updateTableSelectionHighlight();
  openRowDialog(rows[idx], idx);
});

tableWrap.addEventListener("keydown", async (ev) => {
  if (ev.key !== "Delete") return;
  if (selectedRowIdx < 0 || selectedRowIdx >= rows.length) return;
  if (!confirm(`Eliminare la riga ${selectedRowIdx + 1}?`)) return;
  rows.splice(selectedRowIdx, 1);
  selectedRowIdx = Math.min(selectedRowIdx, rows.length - 1);
  await refreshTable();
});

inputFile.addEventListener("change", async (ev) => {
  const file = ev.target.files?.[0];
  ev.target.value = "";
  if (!file) {
    alert("Seleziona un file .csv o .zip");
    return;
  }
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const inPath = "/tmp/upload.bin";
    pyodide.FS.writeFile(inPath, bytes);
    const bridge = pyodide.globals.get("bridge_parse");
    const parsed = JSON.parse(bridge(inPath, file.name));
    if (!parsed.rows || parsed.rows.length === 0) {
      alert("Nessuna riga trovata.");
      return;
    }
    rows = parsed.rows;
    savedCsvBasename = null;
    selectedRowIdx = -1;
    const stem = file.name.replace(/\.[^.]+$/i, "");
    const ipaGuess = stem.split("-")[0];
    if (ipaGuess) ipaInput.value = ipaGuess.toUpperCase();
    updateFnamePreview();
    if (parsed.version && parsed.version !== "1_4") {
      alert(
        `File importato in formato ${parsed.version}.\nCampi inizializzati a vuoto. Salvataggio avverrà in 1_4.`,
      );
    }
    await refreshTable();
    setStatus(`Aperto (tracciato ${parsed.version} → 1_4): ${file.name}  (${rows.length} righe)`);
    document.title = `MyPay4 — ${file.name}  |  Generatore CSV`;
  } catch (e) {
    alert(`Errore apertura: ${e.message || e}`);
  }
});

window.addEventListener("beforeunload", (e) => {
  if (rows.length) {
    e.preventDefault();
    e.returnValue = "";
  }
});

initPyodide().catch((err) => {
  console.error(err);
  setStatus(`Impossibile avviare l'applicazione: ${err.message}`);
});
