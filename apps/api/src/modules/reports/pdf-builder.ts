import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { formatMoney } from '../../common/utils/money';

export type PdfDoc = InstanceType<typeof PDFDocument>;

const BRAND = { navy: '#2E3192', cyan: '#00AEEF', green: '#00A651', red: '#ED1C24' };

export function reportsDir() {
  const dir = path.join(process.cwd(), 'uploads', 'reports');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function drawHeader(doc: PdfDoc, title: string, subtitle?: string) {
  doc.rect(0, 0, doc.page.width, 72).fill(BRAND.navy);
  doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text('VegaCore OS', 50, 22);
  doc.fontSize(11).font('Helvetica').text('Smart Report', 50, 46);
  doc.fontSize(16).font('Helvetica-Bold').text(title, 50, 88, { width: doc.page.width - 100 });
  if (subtitle) {
    doc.fontSize(10).font('Helvetica').fillColor('#666666').text(subtitle, 50, 112);
  }
  doc.fillColor('#000000');
  doc.y = 140;
}

function drawFooter(doc: PdfDoc, pageNum: number) {
  const y = doc.page.height - 40;
  doc.fontSize(8).fillColor('#999999').text(
    `Generated ${new Date().toLocaleString('en-AE')} · Page ${pageNum}`,
    50,
    y,
    { align: 'center', width: doc.page.width - 100 },
  );
  doc.fillColor('#000000');
}

function sectionTitle(doc: PdfDoc, text: string) {
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica-Bold').fillColor(BRAND.navy).text(text);
  doc.moveDown(0.3);
  doc.fillColor('#000000').font('Helvetica');
}

function statRow(doc: PdfDoc, label: string, value: string) {
  const y = doc.y;
  doc.fontSize(10).text(label, 50, y, { width: 200 });
  doc.font('Helvetica-Bold').text(value, 260, y, { width: 280 });
  doc.font('Helvetica');
  doc.moveDown(0.6);
}

function tableHeader(doc: PdfDoc, cols: string[], widths: number[]) {
  const y = doc.y;
  let x = 50;
  doc.fontSize(9).font('Helvetica-Bold').fillColor(BRAND.navy);
  cols.forEach((c, i) => {
    doc.text(c, x, y, { width: widths[i] });
    x += widths[i];
  });
  doc.moveDown(0.8);
  doc.fillColor('#000000').font('Helvetica');
}

function ensureSpace(doc: PdfDoc, needed = 80) {
  if (doc.y + needed > doc.page.height - 60) {
    doc.addPage();
    doc.y = 50;
  }
}

export async function buildPdf(
  filePath: string,
  title: string,
  subtitle: string,
  render: (doc: PdfDoc) => void,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    drawHeader(doc, title, subtitle);
    render(doc);

    let page = 1;
    doc.on('pageAdded', () => {
      page += 1;
      doc.y = 50;
    });

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      drawFooter(doc, i + 1);
    }

    doc.end();
    stream.on('finish', () => {
      const stat = fs.statSync(filePath);
      resolve(stat.size);
    });
    stream.on('error', reject);
    doc.on('error', reject);
  });
}

export function renderExecutive(doc: PdfDoc, data: Record<string, unknown>) {
  const overview = data.overview as Record<string, number>;
  sectionTitle(doc, 'Executive Summary');
  statRow(doc, 'Total projects', String(overview.totalProjects ?? 0));
  statRow(doc, 'Active projects', String(overview.activeProjects ?? 0));
  statRow(doc, 'Delayed projects', String(overview.delayedProjects ?? 0));
  statRow(doc, 'Delayed tasks', String(overview.delayedTasks ?? 0));
  statRow(doc, 'Monthly revenue (USD)', money(overview.monthlyRevenue));
  statRow(doc, 'Monthly profit (USD)', money(overview.monthlyProfit));
  statRow(doc, 'Collection rate', `${overview.collectionRate ?? 0}%`);

  const projects = (data.projects as { name: string; status: string; progress: number; isDelayed: boolean }[]) || [];
  if (projects.length) {
    ensureSpace(doc, 120);
    sectionTitle(doc, 'Projects Overview');
    tableHeader(doc, ['Project', 'Status', 'Progress', 'Delayed'], [180, 90, 70, 60]);
    projects.slice(0, 15).forEach((p) => {
      ensureSpace(doc);
      const y = doc.y;
      doc.fontSize(9).text(p.name.slice(0, 35), 50, y, { width: 180 });
      doc.text(p.status, 230, y, { width: 90 });
      doc.text(`${p.progress}%`, 320, y, { width: 70 });
      doc.text(p.isDelayed ? 'Yes' : 'No', 390, y, { width: 60 });
      doc.moveDown(0.7);
    });
  }

  const delayed = (data.delayedTasks as { title: string; daysOverdue: number; project?: { name: string } }[]) || [];
  if (delayed.length) {
    ensureSpace(doc, 100);
    sectionTitle(doc, 'Overdue Tasks (Top 10)');
    delayed.slice(0, 10).forEach((t) => {
      ensureSpace(doc);
      doc.fontSize(9).text(`• ${t.title} — ${t.project?.name || 'N/A'} (${t.daysOverdue}d late)`);
      doc.moveDown(0.4);
    });
  }
}

export function renderFinance(doc: PdfDoc, data: Record<string, unknown>) {
  sectionTitle(doc, 'Financial Summary');
  statRow(doc, 'Monthly revenue (USD)', money(data.monthlyRevenue));
  statRow(doc, 'Monthly expenses (USD)', money(data.monthlyExpenses));
  statRow(doc, 'Monthly payroll (USD)', money(data.monthlyPayroll));
  statRow(doc, 'Monthly profit (USD)', money(data.monthlyProfit));
  statRow(doc, 'Collection rate', `${data.collectionRate ?? 0}%`);
  statRow(doc, 'Outstanding invoices', String((data.unpaidInvoices as unknown[])?.length ?? 0));

  const unpaid = (data.unpaidInvoices as { number: string; total: number; client: { companyName: string }; status: string }[]) || [];
  if (unpaid.length) {
    ensureSpace(doc, 120);
    sectionTitle(doc, 'Outstanding Invoices');
    tableHeader(doc, ['Invoice', 'Client', 'Amount', 'Status'], [90, 160, 80, 80]);
    unpaid.slice(0, 12).forEach((inv) => {
      ensureSpace(doc);
      const y = doc.y;
      doc.fontSize(9).text(inv.number, 50, y, { width: 90 });
      doc.text(inv.client.companyName.slice(0, 28), 140, y, { width: 160 });
      doc.text(money(inv.total), 300, y, { width: 80 });
      doc.text(inv.status, 380, y, { width: 80 });
      doc.moveDown(0.7);
    });
  }

  const months = (data.revenueByMonth as { month: string; revenue: number; expenses?: number; profit?: number }[]) || [];
  if (months.length) {
    ensureSpace(doc, 100);
    sectionTitle(doc, 'Revenue Trend (6 months)');
    tableHeader(doc, ['Month', 'Revenue', 'Profit'], [120, 120, 120]);
    months.forEach((m) => {
      ensureSpace(doc);
      const y = doc.y;
      const profit = m.profit ?? m.revenue - (m.expenses ?? 0);
      doc.fontSize(9).text(m.month, 50, y, { width: 120 });
      doc.text(money(m.revenue), 170, y, { width: 120 });
      doc.text(money(profit), 290, y, { width: 120 });
      doc.moveDown(0.7);
    });
  }
}

export function renderProjects(doc: PdfDoc, data: Record<string, unknown>) {
  const projects = (data.projects as {
    name: string;
    status: string;
    progress: number;
    priority: string;
    client?: { companyName: string };
    openTasks: number;
    delayedTasks: number;
    isDelayed: boolean;
  }[]) || [];

  sectionTitle(doc, 'Portfolio Status');
  statRow(doc, 'Total projects', String(projects.length));
  statRow(doc, 'Delayed', String(projects.filter((p) => p.isDelayed).length));
  statRow(doc, 'In progress', String(projects.filter((p) => p.status === 'IN_PROGRESS').length));

  ensureSpace(doc, 120);
  sectionTitle(doc, 'All Projects');
  tableHeader(doc, ['Project', 'Client', 'Status', 'Progress', 'Late tasks'], [140, 110, 80, 60, 70]);
  projects.forEach((p) => {
    ensureSpace(doc);
    const y = doc.y;
    doc.fontSize(8).text(p.name.slice(0, 30), 50, y, { width: 140 });
    doc.text((p.client?.companyName || '—').slice(0, 22), 190, y, { width: 110 });
    doc.text(p.status, 300, y, { width: 80 });
    doc.text(`${p.progress}%`, 380, y, { width: 60 });
    doc.text(String(p.delayedTasks), 440, y, { width: 70 });
    doc.moveDown(0.65);
  });
}

export function renderHr(doc: PdfDoc, data: Record<string, unknown>) {
  const employees = (data.employees as { name: string; department?: string; workload: number; activeTasks: number }[]) || [];
  const reports = (data.performanceReports as { employee: string; period: string; score: number }[]) || [];

  sectionTitle(doc, 'Team Workload');
  statRow(doc, 'Team members', String(employees.length));
  statRow(doc, 'Busy employees', String(employees.filter((e) => e.workload >= 3 || e.activeTasks >= 4).length));

  if (employees.length) {
    ensureSpace(doc, 120);
    sectionTitle(doc, 'Workload by Employee');
    tableHeader(doc, ['Employee', 'Department', 'Load', 'Active tasks'], [140, 120, 60, 90]);
    employees.slice(0, 20).forEach((e) => {
      ensureSpace(doc);
      const y = doc.y;
      doc.fontSize(9).text(e.name, 50, y, { width: 140 });
      doc.text(e.department || '—', 190, y, { width: 120 });
      doc.text(String(e.workload), 310, y, { width: 60 });
      doc.text(String(e.activeTasks), 370, y, { width: 90 });
      doc.moveDown(0.7);
    });
  }

  if (reports.length) {
    ensureSpace(doc, 100);
    sectionTitle(doc, 'Performance Scores');
    tableHeader(doc, ['Employee', 'Period', 'Score'], [180, 120, 80]);
    reports.slice(0, 15).forEach((r) => {
      ensureSpace(doc);
      const y = doc.y;
      doc.fontSize(9).text(r.employee, 50, y, { width: 180 });
      doc.text(r.period, 230, y, { width: 120 });
      doc.text(`${r.score}%`, 350, y, { width: 80 });
      doc.moveDown(0.7);
    });
  }
}

const money = formatMoney;
