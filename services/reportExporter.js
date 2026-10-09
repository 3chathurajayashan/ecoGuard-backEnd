import { summaryLines } from "./analyticsService.js";

// Builds a neutral document model from a stored report, then renders it as PDF, CSV or XLSX.
// No third-party libraries: the PDF and the XLSX (a zip of XML files) are written by hand.

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/** { title, subtitle, sections: [{ heading, lines?, table?: { columns, rows }, bars?: { labels, values } }] } */
export function toDocument(report) {
  const r = report.results;
  const c = report.criteria;
  const sections = [{ heading: "Summary", lines: summaryLines(r) }];

  const s = r.incidentStatistics;
  sections.push({
    heading: "Incident Statistics",
    lines: [`Total incidents: ${s.total} (${s.changePercent >= 0 ? "+" : ""}${s.changePercent}% vs previous period)`],
    bars: { labels: s.byPeriod.map((p) => p.label), values: s.byPeriod.map((p) => p.count) },
    table: { columns: ["Incident type", "Count"], rows: s.byType.map((t) => [t.type, t.count]) },
  });

  if (r.hotspots) {
    sections.push({
      heading: "Hotspot Findings",
      table: {
        columns: ["Latitude", "Longitude", "Incidents", "Level", "Main type"],
        rows: r.hotspots.hotspots.map((h) => [h.latitude, h.longitude, h.incidents, h.level, h.mainType]),
      },
    });
  }
  if (r.patrolCoverage) {
    const p = r.patrolCoverage;
    sections.push({
      heading: "Patrol Coverage Summary",
      lines: [`${p.patrols} patrols, ${p.totalKm} km, average coverage ${p.averageCoverage}%`, `Route points covered: ${p.coveredPoints}, not covered: ${p.notCoveredPoints}`],
      table: {
        columns: ["Route", "Patrols", "Distance (km)", "Avg coverage %"],
        rows: p.routes.map((x) => [x.route, x.patrols, x.km, x.averageCoverage]),
      },
    });
  }
  if (r.conflictTrends) {
    const t = r.conflictTrends;
    sections.push({
      heading: "Human-Wildlife Conflict Trends",
      lines: [
        `${t.total} alerts (${t.changePercent >= 0 ? "+" : ""}${t.changePercent}% vs previous period), ${t.resolvedPercent}% resolved`,
        `Average time to acknowledge: ${t.avgResponseMinutes} min. Community reports received: ${t.communityReports}`,
      ],
      bars: { labels: t.byPeriod.map((p) => p.label), values: t.byPeriod.map((p) => p.count) },
      table: { columns: ["Risk zone", "Alerts"], rows: t.topZones.map((z) => [z.zone, z.count]) },
    });
  }

  return {
    title: report.title,
    subtitle: `${c.park}  |  ${r.criteria.periodLabel}  |  Generated ${fmtDate(r.generatedAt)}`,
    sections,
  };
}

// ───────────────────────────── CSV ─────────────────────────────
const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(doc) {
  const out = [csvCell(doc.title), csvCell(doc.subtitle), ""];
  for (const sec of doc.sections) {
    out.push(csvCell(sec.heading));
    (sec.lines ?? []).forEach((l) => out.push(csvCell(l)));
    if (sec.bars) {
      out.push(["Period", ...sec.bars.labels].map(csvCell).join(","));
      out.push(["Count", ...sec.bars.values].map(csvCell).join(","));
    }
    if (sec.table) {
      out.push(sec.table.columns.map(csvCell).join(","));
      sec.table.rows.forEach((row) => out.push(row.map(csvCell).join(",")));
    }
    out.push("");
  }
  return Buffer.from("﻿" + out.join("\r\n"), "utf8");
}

// ───────────────────────────── XLSX (zip of XML) ─────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

/** Minimal zip writer (stored, no compression), enough for an .xlsx container. */
function zip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + data.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

const xml = (s) => String(s ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]);
const colName = (i) => String.fromCharCode(65 + i);

export function toXlsx(doc) {
  const rows = [[doc.title], [doc.subtitle], []];
  for (const sec of doc.sections) {
    rows.push([sec.heading]);
    (sec.lines ?? []).forEach((l) => rows.push([l]));
    if (sec.bars) {
      rows.push(["Period", ...sec.bars.labels]);
      rows.push(["Count", ...sec.bars.values]);
    }
    if (sec.table) {
      rows.push(sec.table.columns);
      sec.table.rows.forEach((r) => rows.push(r));
    }
    rows.push([]);
  }
  const sheetRows = rows
    .map((row, r) => {
      const cells = row
        .map((v, c) =>
          typeof v === "number"
            ? `<c r="${colName(c)}${r + 1}"><v>${v}</v></c>`
            : `<c r="${colName(c)}${r + 1}" t="inlineStr"><is><t>${xml(v)}</t></is></c>`
        )
        .join("");
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join("");

  const files = [
    { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>` },
    { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Report" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>` },
    { name: "xl/worksheets/sheet1.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>` },
  ].map((f) => ({ name: f.name, data: Buffer.from(f.data, "utf8") }));
  return zip(files);
}

// ───────────────────────────── PDF ─────────────────────────────
const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 48;
// PDF text is Latin-1; replace anything else so a stray symbol cannot corrupt the file
const pdfText = (s) => String(s ?? "").replace(/[^\x20-\x7e]/g, "?").replace(/([()\\])/g, "\\$1");

export function toPdf(doc) {
  const pages = [];
  let ops = [];
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    pages.push(ops.join("\n"));
    ops = [];
    y = PAGE_H - MARGIN;
  };
  const ensure = (h) => {
    if (y - h < MARGIN) newPage();
  };
  const text = (s, x, size, bold = false, color = "0 0 0") => {
    ops.push(`BT ${color} rg /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${pdfText(s)}) Tj ET`);
  };
  const wrap = (s, max) => {
    const words = String(s).split(" ");
    const out = [];
    let line = "";
    for (const w of words) {
      if ((line + " " + w).trim().length > max) {
        out.push(line);
        line = w;
      } else line = (line + " " + w).trim();
    }
    if (line) out.push(line);
    return out;
  };

  // header band
  ops.push(`0.12 0.34 0.19 rg ${0} ${PAGE_H - 96} ${PAGE_W} 96 re f`);
  y = PAGE_H - 44;
  text("WildLife Conservation", MARGIN, 11, false, "1 1 1");
  y -= 24;
  text(doc.title, MARGIN, 20, true, "1 1 1");
  y -= 22;
  text(doc.subtitle, MARGIN, 9, false, "0.85 0.95 0.88");
  y = PAGE_H - 126;

  for (const sec of doc.sections) {
    ensure(40);
    text(sec.heading, MARGIN, 13, true, "0.12 0.34 0.19");
    y -= 8;
    ops.push(`0.12 0.34 0.19 RG 1 w ${MARGIN} ${y} m ${PAGE_W - MARGIN} ${y} l S`);
    y -= 16;

    for (const line of sec.lines ?? []) {
      for (const l of wrap(line, 95)) {
        ensure(16);
        text(l, MARGIN, 10);
        y -= 14;
      }
    }

    if (sec.bars) {
      const max = Math.max(1, ...sec.bars.values);
      const h = 90;
      ensure(h + 34);
      const n = sec.bars.values.length;
      const slot = (PAGE_W - 2 * MARGIN) / n;
      const baseY = y - h;
      sec.bars.values.forEach((v, i) => {
        const bh = (v / max) * (h - 16);
        const x = MARGIN + i * slot + slot * 0.2;
        ops.push(`0.2 0.55 0.3 rg ${x} ${baseY} ${slot * 0.6} ${bh} re f`);
        ops.push(`BT 0.2 0.2 0.2 rg /F1 8 Tf ${x + 2} ${baseY + bh + 3} Td (${v}) Tj ET`);
        ops.push(`BT 0.35 0.35 0.35 rg /F1 8 Tf ${x} ${baseY - 11} Td (${pdfText(sec.bars.labels[i])}) Tj ET`);
      });
      y = baseY - 26;
    }

    if (sec.table) {
      const cols = sec.table.columns.length;
      const colW = (PAGE_W - 2 * MARGIN) / cols;
      ensure(20);
      ops.push(`0.92 0.96 0.93 rg ${MARGIN} ${y - 4} ${PAGE_W - 2 * MARGIN} 16 re f`);
      sec.table.columns.forEach((c, i) => {
        ops.push(`BT 0.1 0.1 0.1 rg /F2 9 Tf ${MARGIN + i * colW + 4} ${y} Td (${pdfText(c)}) Tj ET`);
      });
      y -= 18;
      for (const row of sec.table.rows) {
        ensure(16);
        row.forEach((v, i) => {
          const cell = String(v).length > Math.floor(colW / 5) ? String(v).slice(0, Math.floor(colW / 5) - 1) + "." : String(v);
          ops.push(`BT 0 0 0 rg /F1 9 Tf ${MARGIN + i * colW + 4} ${y} Td (${pdfText(cell)}) Tj ET`);
        });
        y -= 14;
      }
    }
    y -= 14;
  }
  pages.push(ops.join("\n"));

  // assemble objects: 1 catalog, 2 pages, 3 F1, 4 F2, then page + content pairs
  const objects = [];
  const kids = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  pages.forEach((content, i) => {
    const pageObj = 5 + i * 2;
    const contentObj = pageObj + 1;
    kids.push(`${pageObj} 0 R`);
    objects[pageObj] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObj} 0 R >>`;
    objects[contentObj] = `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`;
  });
  objects[2] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = Buffer.byteLength(pdf, "latin1");
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefAt = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

export const EXPORTERS = {
  PDF: { build: (doc) => toPdf(doc), mime: "application/pdf", ext: "pdf" },
  CSV: { build: (doc) => toCsv(doc), mime: "text/csv; charset=utf-8", ext: "csv" },
  XLSX: {
    build: (doc) => toXlsx(doc),
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ext: "xlsx",
  },
};
