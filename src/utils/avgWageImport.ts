import type { AvgWageDataSet, AvgWageYearData } from '../types';

/**
 * 社平工资 JSON 导入结果
 */
export interface AvgWageImportResult {
  success: boolean;
  data?: AvgWageDataSet['data'];
  errors: string[];
}

/**
 * 验证并解析社平工资 JSON 数据
 */
export function parseAvgWageJson(jsonText: string): AvgWageImportResult {
  const result: AvgWageImportResult = {
    success: false,
    errors: [],
  };

  try {
    const parsed = JSON.parse(jsonText);

    // 验证必要字段
    if (!parsed.city || typeof parsed.city !== 'string') {
      result.errors.push('缺少 city 字段（城市名称）');
    }
    if (!parsed.province || typeof parsed.province !== 'string') {
      result.errors.push('缺少 province 字段（省份名称）');
    }
    if (!parsed.scope || !['city', 'province', 'national'].includes(parsed.scope)) {
      result.errors.push('scope 字段必须是 city、province 或 national 之一');
    }
    if (!Array.isArray(parsed.years) || parsed.years.length === 0) {
      result.errors.push('years 必须是包含至少一条记录的非空数组');
    }

    if (result.errors.length > 0) {
      return result;
    }

    // 验证每条年份数据
    const years: AvgWageYearData[] = [];
    for (let i = 0; i < parsed.years.length; i++) {
      const y = parsed.years[i];
      const yearNum = Number(y.year);
      const avgWage = Number(y.avgWage);
      const monthlyAvgWage = Number(y.monthlyAvgWage);

      if (!Number.isInteger(yearNum) || yearNum < 1978 || yearNum > 2100) {
        result.errors.push(`第 ${i + 1} 条记录: year 必须是 1978-2100 之间的整数`);
        continue;
      }
      if (isNaN(avgWage) || avgWage <= 0) {
        result.errors.push(`第 ${i + 1} 条记录: avgWage 必须是正数`);
        continue;
      }
      if (isNaN(monthlyAvgWage) || monthlyAvgWage <= 0) {
        result.errors.push(`第 ${i + 1} 条记录: monthlyAvgWage 必须是正数`);
        continue;
      }

      years.push({
        year: yearNum,
        avgWage,
        monthlyAvgWage,
        source: y.source,
        note: y.note,
      });
    }

    if (result.errors.length > 0) {
      return result;
    }

    // 按年份排序
    years.sort((a, b) => a.year - b.year);

    result.data = {
      city: parsed.city,
      province: parsed.province,
      scope: parsed.scope,
      years,
      description: parsed.description,
    };
    result.success = true;
    return result;
  } catch (e) {
    result.errors.push(`JSON 解析失败: ${e instanceof Error ? e.message : String(e)}`);
    return result;
  }
}

/**
 * 生成 AI 提示词
 */
export function generateAvgWagePrompt(): string {
  return `请帮我生成一份历年社会平均工资数据，格式如下：

{
  "city": "杭州市",
  "province": "浙江省",
  "scope": "city",
  "description": "杭州市历年职工平均工资（在岗职工），数据来源：杭州市统计局",
  "years": [
    {
      "year": 2005,
      "avgWage": 30578,
      "monthlyAvgWage": 2548,
      "source": "杭州市统计局",
      "note": ""
    }
  ]
}

字段说明：
- city: 城市名称（必填）
- province: 省份名称（必填）
- scope: 统计范围，可选值：city（市级）、province（省级）、national（全国）（必填）
- description: 数据说明（可选）
- years: 历年数据数组（必填，至少一条）
  - year: 年份，整数（必填）
  - avgWage: 年平均工资，单位元（必填）
  - monthlyAvgWage: 月平均工资，单位元（必填）
  - source: 数据来源（可选）
  - note: 备注（可选）

请根据我提供的城市和年份范围，生成对应的 JSON 数据。
注意：
1. 数据要准确，优先使用统计局官方数据
2. 如果某年数据缺失，可以跳过该年或标注"数据缺失"
3. 月平均工资 = 年平均工资 / 12，请确保两者一致
4. 输出标准 JSON 格式，不要添加额外说明文字`;
}

/**
 * 导出社平工资数据为 JSON
 */
export function exportAvgWageToJson(data: AvgWageDataSet['data']): string {
  return JSON.stringify(data, null, 2);
}
