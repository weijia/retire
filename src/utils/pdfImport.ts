import type { PensionRecord } from '../types';

// pdfjs-dist 动态导入（按需加载，减少初始包体积）
async function getPdfjs() {
  const pdfjs = await import('pdfjs-dist');
  const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.js?url');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;
  return pdfjs;
}

/**
 * 浙里办参保证明 PDF 解析结果
 */
export interface ZhelibaoPensionImportResult {
  success: boolean;
  name?: string;
  socialSecurityNumber?: string;
  gender?: string;
  totalYears?: string;
  records: PensionRecord[];
  errors: string[];
}

/**
 * 解析浙里办"基本养老历年参保证明"PDF
 */
export async function parseZhelibaoPensionPdf(
  file: File
): Promise<ZhelibaoPensionImportResult> {
  const result: ZhelibaoPensionImportResult = {
    success: false,
    records: [],
    errors: [],
  };

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjs = await getPdfjs();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join('');
      fullText += pageText + '\n';
    }

    // 解析头部信息
    const nameMatch = fullText.match(/姓名\s*(\S+)/);
    const ssMatch = fullText.match(/社会保障号\s*(\d+)/);
    const genderMatch = fullText.match(/性别\s*(.)/);
    const totalYearsMatch = fullText.match(/累计缴费\s*(\d+年\d+月|\d+年)/);

    if (nameMatch) result.name = nameMatch[1];
    if (ssMatch) result.socialSecurityNumber = ssMatch[1];
    if (genderMatch) result.gender = genderMatch[1];
    if (totalYearsMatch) result.totalYears = totalYearsMatch[1];

    // 解析历年缴费记录
    console.log('[PDF Debug] fullText length:', fullText.length);
    console.log('[PDF Debug] first 500 chars:', fullText.substring(0, 500));
    const rawRecords = parseRecordsFromText(fullText);
    console.log('[PDF Debug] rawRecords count:', rawRecords.length);
    const mergedRecords = mergeRecordsByYear(rawRecords);

    result.records = mergedRecords;
    result.success = mergedRecords.length > 0;

    if (mergedRecords.length === 0) {
      result.errors.push('未能从PDF中解析出缴费记录，请确认是否为"基本养老历年参保证明"');
    }

    return result;
  } catch (err) {
    result.errors.push(`PDF解析失败: ${err instanceof Error ? err.message : String(err)}`);
    return result;
  }
}

/**
 * 从文本中解析原始记录
 */
function parseRecordsFromText(text: string): Array<{
  year: number;
  startMonth: string;
  endMonth: string;
  monthlyBase: number;
  employer: string;
  monthsPaid: number;
}> {
  const records: Array<{
    year: number;
    startMonth: string;
    endMonth: string;
    monthlyBase: number;
    employer: string;
    monthsPaid: number;
  }> = [];

  const lines = text.split('\n');

  for (const line of lines) {
    const match = line.match(
      /(\S+?)\s+(\d{4})\s+(\d{6})\s*-\s*(\d{6})\s+([\d,\.]+)\s+(.*)/
    );

    if (match) {
      const year = parseInt(match[2], 10);
      const startMonth = match[3];
      const endMonth = match[4];
      const baseStr = match[5].replace(/,/g, '');
      const monthlyBase = parseFloat(baseStr);
      const employer = match[6].trim();

      const startY = parseInt(startMonth.substring(0, 4), 10);
      const startM = parseInt(startMonth.substring(4, 6), 10);
      const endY = parseInt(endMonth.substring(0, 4), 10);
      const endM = parseInt(endMonth.substring(4, 6), 10);
      const monthsPaid = (endY - startY) * 12 + (endM - startM) + 1;

      if (!isNaN(year) && !isNaN(monthlyBase) && monthlyBase > 0) {
        records.push({
          year,
          startMonth,
          endMonth,
          monthlyBase,
          employer,
          monthsPaid: Math.max(1, monthsPaid),
        });
      }
    }
  }

  return records;
}

/**
 * 按年度合并记录
 */
function mergeRecordsByYear(
  rawRecords: Array<{
    year: number;
    startMonth: string;
    endMonth: string;
    monthlyBase: number;
    employer: string;
    monthsPaid: number;
  }>
): PensionRecord[] {
  const yearMap = new Map<
    number,
    {
      monthlyBaseSum: number;
      monthsPaid: number;
      employers: string[];
    }
  >();

  for (const r of rawRecords) {
    const existing = yearMap.get(r.year);
    if (existing) {
      existing.monthlyBaseSum += r.monthlyBase * r.monthsPaid;
      existing.monthsPaid += r.monthsPaid;
      if (!existing.employers.includes(r.employer)) {
        existing.employers.push(r.employer);
      }
    } else {
      yearMap.set(r.year, {
        monthlyBaseSum: r.monthlyBase * r.monthsPaid,
        monthsPaid: r.monthsPaid,
        employers: [r.employer],
      });
    }
  }

  const now = new Date().toISOString();
  const records: PensionRecord[] = [];

  for (const [year, data] of yearMap) {
    const avgMonthlyBase = Math.round(data.monthlyBaseSum / data.monthsPaid);
    const personalRate = 8;
    const employerRate = 16;
    const monthlyPersonal = Math.round(avgMonthlyBase * 0.08);
    const monthlyEmployer = Math.round(avgMonthlyBase * 0.16);
    const estimatedAvgWage = avgMonthlyBase;

    records.push({
      _id: `import_zhelibao_${year}`,
      type: 'pension_record',
      createdAt: now,
      updatedAt: now,
      data: {
        year,
        monthlyBase: avgMonthlyBase,
        avgWage: estimatedAvgWage,
        personalRate,
        monthlyPersonal,
        employerRate,
        monthlyEmployer,
        monthsPaid: Math.min(data.monthsPaid, 12),
        totalPaid: (monthlyPersonal + monthlyEmployer) * Math.min(data.monthsPaid, 12),
        pensionType: 'basic',
        description: `浙里办导入: ${data.employers.join(', ')}`,
      },
    });
  }

  return records.sort((a, b) => a.data.year - b.data.year);
}

/**
 * 检查文件是否为浙里办参保证明
 */
export function isZhelibaoPensionPdf(text: string): boolean {
  return text.includes('浙江省职工基本养老保险历年参保证明');
}
