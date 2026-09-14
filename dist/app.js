(function () {
  "use strict";

  const CONCEPTS = [
    ["005", "Recargo nocturno"],
    ["006", "Hora extra diurna"],
    ["007", "Hora extra nocturna"],
    ["008", "Hora extra diurna festiva"],
    ["009", "Hora extra nocturna festiva"],
    ["236", "Simple disponibilidad diurna"],
    ["237", "Simple disponibilidad nocturna"],
    ["238", "Simple disponibilidad diurna festiva"],
    ["239", "Simple disponibilidad nocturna festiva"],
    ["240", "Ejecución disponibilidad diurna"],
    ["241", "Ejecución disponibilidad nocturna"],
    ["242", "Ejecución disponibilidad diurna festiva"],
    ["243", "Ejecución disponibilidad nocturna festiva"]
  ];
  const CONCEPT_CODES = new Set(CONCEPTS.map(([code]) => code));
  const STORAGE_KEY = "registro-horas-extras-v1";
  let rowSequence = 0;
  let rows = [];
  let toastTimer;

  const elements = {
    start: document.querySelector("#start-date"),
    end: document.querySelector("#end-date"),
    year: document.querySelector("#period-year"),
    month: document.querySelector("#period-month"),
    body: document.querySelector("#records-body"),
    preview: document.querySelector("#preview-body"),
    employees: document.querySelector("#employee-count"),
    records: document.querySelector("#record-count"),
    hours: document.querySelector("#hours-total"),
    status: document.querySelector("#status-message"),
    toast: document.querySelector("#toast")
  };

  function makeRow(values = {}) {
    rowSequence += 1;
    return {
      key: `row-${rowSequence}`,
      identification: String(values.identification || ""),
      concept: String(values.concept || ""),
      hours: values.hours === undefined ? "" : String(values.hours)
    };
  }

  function toIsoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function defaultPeriod() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    if (today.getDate() <= 15) {
      return [toIsoDate(new Date(year, month, 1)), toIsoDate(new Date(year, month, 15))];
    }
    return [toIsoDate(new Date(year, month, 16)), toIsoDate(new Date(year, month + 1, 0))];
  }

  function conceptOptions(selected) {
    const groups = [
      ["Recargos y horas extras", CONCEPTS.slice(0, 5)],
      ["Simple disponibilidad", CONCEPTS.slice(5, 9)],
      ["Ejecución de disponibilidad", CONCEPTS.slice(9)]
    ];
    return `<option value="">Seleccionar concepto</option>${groups.map(([label, concepts]) =>
      `<optgroup label="${label}">${concepts.map(([code, name]) => `<option value="${code}"${selected === code ? " selected" : ""}>${code} — ${name}</option>`).join("")}</optgroup>`
    ).join("")}`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character]));
  }

  function renderRows() {
    elements.body.innerHTML = rows.map((row, index) => `
      <tr data-key="${row.key}">
        <td><div class="id-field"><span class="row-number">${index + 1}</span><input class="identification" inputmode="numeric" autocomplete="off" maxlength="15" aria-label="Identificación de la fila ${index + 1}" placeholder="Ej. 100000001" value="${escapeHtml(row.identification)}"></div></td>
        <td><select class="concept" aria-label="Concepto de la fila ${index + 1}">${conceptOptions(row.concept)}</select></td>
        <td><input class="hours" type="number" min="0.01" max="999.99" step="0.01" inputmode="decimal" aria-label="Número de horas de la fila ${index + 1}" placeholder="0" value="${escapeHtml(row.hours)}"></td>
        <td><button class="remove-row" type="button" aria-label="Eliminar fila ${index + 1}" title="Eliminar fila">×</button></td>
      </tr>`).join("");
    updateSummary();
  }

  function formatDate(isoDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate || "")) return "";
    const [year, month, day] = isoDate.split("-");
    return `${day}/${month}/${year}`;
  }

  function periodInfo() {
    if (!elements.start.value) return { year: "—", month: "—" };
    const [year, month] = elements.start.value.split("-").map(Number);
    return { year, month };
  }

  function aggregateRows() {
    const grouped = new Map();
    rows.forEach((row) => {
      const identification = row.identification.trim();
      const concept = row.concept;
      const hours = Number(row.hours);
      if (!identification || !concept || !Number.isFinite(hours) || hours <= 0) return;
      const key = `${identification}|${concept}`;
      const existing = grouped.get(key);
      if (existing) existing.hours = Math.round((existing.hours + hours) * 100) / 100;
      else grouped.set(key, { identification, concept, hours });
    });
    return [...grouped.values()].sort((a, b) => {
      const idComparison = a.identification.localeCompare(b.identification, "es", { numeric: true });
      return idComparison || Number(a.concept) - Number(b.concept);
    });
  }

  function exportRecords() {
    const { year, month } = periodInfo();
    return aggregateRows().map((row) => ({
      ...row,
      start: elements.start.value,
      end: elements.end.value,
      year,
      month
    }));
  }

  function updateSummary() {
    const aggregated = aggregateRows();
    const employees = new Set(aggregated.map((row) => row.identification));
    const hours = aggregated.reduce((sum, row) => sum + row.hours, 0);
    const period = periodInfo();
    elements.year.textContent = period.year;
    elements.month.textContent = period.month;
    elements.employees.textContent = employees.size;
    elements.records.textContent = aggregated.length;
    elements.hours.textContent = hours.toLocaleString("es-CO", { maximumFractionDigits: 2 });
    renderPreview(aggregated, period);
    saveState();
  }

  function renderPreview(aggregated, period) {
    if (!aggregated.length) {
      elements.preview.innerHTML = '<tr><td colspan="7">Agrega registros para ver la vista previa.</td></tr>';
      return;
    }
    elements.preview.innerHTML = aggregated.slice(0, 8).map((row) => `<tr>
      <td>${escapeHtml(row.identification)}</td><td>${row.concept}</td><td>${formatDate(elements.start.value)}</td><td>${formatDate(elements.end.value)}</td><td>${row.hours}</td><td>${period.year}</td><td>${period.month}</td>
    </tr>`).join("") + (aggregated.length > 8 ? `<tr><td colspan="7">Y ${aggregated.length - 8} registros más…</td></tr>` : "");
  }

  function syncRowFromInput(input) {
    const tableRow = input.closest("tr");
    const row = rows.find((item) => item.key === tableRow.dataset.key);
    if (!row) return;
    if (input.classList.contains("identification")) {
      const clean = input.value.replace(/\D/g, "");
      if (input.value !== clean) input.value = clean;
      row.identification = clean;
    } else if (input.classList.contains("concept")) row.concept = input.value;
    else if (input.classList.contains("hours")) row.hours = input.value;
    input.classList.remove("invalid");
    updateSummary();
  }

  function validate() {
    document.querySelectorAll(".invalid").forEach((field) => field.classList.remove("invalid"));
    const errors = [];
    if (!elements.start.value) { errors.push("Selecciona la fecha inicial."); elements.start.classList.add("invalid"); }
    if (!elements.end.value) { errors.push("Selecciona la fecha final."); elements.end.classList.add("invalid"); }
    if (elements.start.value && elements.end.value && elements.end.value < elements.start.value) {
      errors.push("La fecha final no puede ser anterior a la inicial.");
      elements.end.classList.add("invalid");
    }
    if (elements.start.value && elements.end.value && elements.start.value.slice(0, 7) !== elements.end.value.slice(0, 7)) {
      errors.push("El periodo debe comenzar y terminar en el mismo mes.");
      elements.start.classList.add("invalid");
      elements.end.classList.add("invalid");
    }

    let validRows = 0;
    rows.forEach((row) => {
      const tr = elements.body.querySelector(`[data-key="${row.key}"]`);
      const isBlank = !row.identification && !row.concept && !row.hours;
      if (isBlank) return;
      validRows += 1;
      if (!/^\d{3,15}$/.test(row.identification)) {
        errors.push("Revisa las identificaciones: deben contener solamente números.");
        tr?.querySelector(".identification")?.classList.add("invalid");
      }
      if (!CONCEPT_CODES.has(row.concept)) {
        errors.push("Selecciona un concepto en todas las filas diligenciadas.");
        tr?.querySelector(".concept")?.classList.add("invalid");
      }
      const hours = Number(row.hours);
      if (!Number.isFinite(hours) || hours <= 0) {
        errors.push("Las horas deben ser mayores que cero.");
        tr?.querySelector(".hours")?.classList.add("invalid");
      }
    });
    if (!validRows) errors.push("Agrega al menos una novedad completa.");
    return [...new Set(errors)];
  }

  function showToast(message, isError = false) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.className = `toast show${isError ? " error" : ""}`;
    toastTimer = setTimeout(() => { elements.toast.className = "toast"; }, 3600);
  }

  function downloadExcel() {
    const errors = validate();
    if (errors.length) {
      elements.status.textContent = errors[0];
      showToast(errors[0], true);
      document.querySelector(".invalid")?.focus();
      return { ok: false, errors };
    }
    const records = exportRecords();
    const { year, month } = periodInfo();
    const filename = `Novedades_Horas_Extras_${year}_${String(month).padStart(2, "0")}.xlsx`;
    window.ExcelExporter.download(records, filename);
    elements.status.textContent = `${records.length} registros listos para nómina.`;
    showToast(`Excel descargado: ${filename}`);
    return { ok: true, filename, records: records.length };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ start: elements.start.value, end: elements.end.value, rows }));
    } catch (_) { /* El registro sigue funcionando sin almacenamiento local. */ }
  }

  function loadState() {
    const [defaultStart, defaultEnd] = defaultPeriod();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      elements.start.value = saved?.start || defaultStart;
      elements.end.value = saved?.end || defaultEnd;
      rows = Array.isArray(saved?.rows) && saved.rows.length ? saved.rows.map(makeRow) : [makeRow()];
    } catch (_) {
      elements.start.value = defaultStart;
      elements.end.value = defaultEnd;
      rows = [makeRow()];
    }
  }

  function loadExample() {
    rows = [
      makeRow({ identification: "100000001", concept: "006", hours: 2 }),
      makeRow({ identification: "100000001", concept: "007", hours: 3.5 }),
      makeRow({ identification: "100000002", concept: "242", hours: 4 }),
      makeRow({ identification: "100000002", concept: "243", hours: 2 })
    ];
    renderRows();
    elements.status.textContent = "Ejemplo cargado. Puedes modificarlo o descargarlo.";
    showToast("Ejemplo cargado correctamente.");
  }

  function clearAll() {
    if (!window.confirm("¿Quieres borrar el periodo y todas las novedades ingresadas?")) return;
    const [start, end] = defaultPeriod();
    elements.start.value = start;
    elements.end.value = end;
    rows = [makeRow()];
    renderRows();
    elements.status.textContent = "Completa los datos para descargar el Excel.";
  }

  function registerWebMcp() {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const annotations = { readOnlyHint: false, untrustedContentHint: false };
    Promise.resolve(context.registerTool({
      name: "stage_overtime_entries",
      title: "Preparar novedades de horas extras",
      description: "Carga un periodo y varias novedades en el formulario visible sin descargar todavía el archivo.",
      inputSchema: {
        type: "object",
        properties: {
          startDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          endDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          entries: { type: "array", minItems: 1, items: { type: "object", properties: { identification: { type: "string", pattern: "^\\d{3,15}$" }, concept: { type: "string", enum: [...CONCEPT_CODES] }, hours: { type: "number", exclusiveMinimum: 0 } }, required: ["identification", "concept", "hours"], additionalProperties: false } }
        },
        required: ["startDate", "endDate", "entries"],
        additionalProperties: false
      },
      annotations,
      execute(input) {
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!input || !datePattern.test(input.startDate || "") || !datePattern.test(input.endDate || "")) {
          throw new Error("Las fechas deben usar el formato AAAA-MM-DD.");
        }
        if (input.endDate < input.startDate || input.startDate.slice(0, 7) !== input.endDate.slice(0, 7)) {
          throw new Error("El periodo debe comenzar y terminar en el mismo mes.");
        }
        if (!Array.isArray(input.entries) || !input.entries.length) throw new Error("Se requiere al menos una novedad.");
        const entriesAreValid = input.entries.every((entry) =>
          entry && /^\d{3,15}$/.test(String(entry.identification || "")) &&
          CONCEPT_CODES.has(String(entry.concept || "")) &&
          Number.isFinite(Number(entry.hours)) && Number(entry.hours) > 0
        );
        if (!entriesAreValid) throw new Error("Hay novedades con identificación, concepto u horas inválidas.");
        elements.start.value = input.startDate;
        elements.end.value = input.endDate;
        rows = input.entries.map(makeRow);
        renderRows();
        const errors = validate();
        if (errors.length) throw new Error(errors.join(" "));
        return { staged: rows.length, finalRecords: aggregateRows().length };
      }
    })).catch(() => {});

    Promise.resolve(context.registerTool({
      name: "read_overtime_summary",
      title: "Consultar resumen de novedades",
      description: "Devuelve el periodo, empleados, registros consolidados y total de horas visibles.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute() {
        const aggregated = aggregateRows();
        return { startDate: elements.start.value, endDate: elements.end.value, employees: new Set(aggregated.map((row) => row.identification)).size, finalRecords: aggregated.length, totalHours: aggregated.reduce((sum, row) => sum + row.hours, 0) };
      }
    })).catch(() => {});
  }

  elements.body.addEventListener("input", (event) => syncRowFromInput(event.target));
  elements.body.addEventListener("change", (event) => syncRowFromInput(event.target));
  elements.body.addEventListener("click", (event) => {
    const button = event.target.closest(".remove-row");
    if (!button) return;
    const key = button.closest("tr").dataset.key;
    rows = rows.filter((row) => row.key !== key);
    if (!rows.length) rows.push(makeRow());
    renderRows();
  });
  document.querySelector("#add-row").addEventListener("click", () => {
    rows.push(makeRow());
    renderRows();
    elements.body.querySelector("tr:last-child .identification")?.focus();
  });
  document.querySelector("#load-example").addEventListener("click", loadExample);
  document.querySelector("#download").addEventListener("click", downloadExcel);
  document.querySelector("#clear-all").addEventListener("click", clearAll);
  elements.start.addEventListener("change", updateSummary);
  elements.end.addEventListener("change", updateSummary);

  loadState();
  renderRows();
  registerWebMcp();
})();
