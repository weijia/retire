import type { ExpenseRecord, ExpenseItem, ExpenseRecordCategory } from '../types';
import { ExpenseRecordCategoryLabels } from '../types';

/**
 * JSON 导入的原始记录格式
 */
export interface JsonExpenseRecord {
  date: string;                    // YYYY-MM-DD
  amount: number;                  // 总金额
  category: string;               // 类别（中文或英文枚举值）
  description: string;             // 消费描述
  paymentMethod?: string;          // 支付方式
  tags?: string[];                // 标签
  items?: Array<{                 // 商品明细
    name: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
    unit?: string;
    category?: string;
  }>;
}

export interface JsonImportData {
  records: JsonExpenseRecord[];
}

export interface ImportResult {
  success: boolean;
  records: ExpenseRecord[];
  errors: ImportError[];
  warnings: string[];
}

export interface ImportError {
  index: number;
  field: string;
  message: string;
}

// 中文类别名 → 枚举值映射
const categoryNameMap: Record<string, ExpenseRecordCategory> = {
  '补充医疗保险': 'supplementary_medical',
  '社保（养老金）': 'social_pension',
  '社保养老金': 'social_pension',
  '社保': 'social_pension',
  '养老金': 'social_pension',
  '医保固定支出': 'medical_insurance',
  '医保': 'medical_insurance',
  '医疗保险': 'medical_insurance',
  '家庭固定支出': 'family_fixed',
  '家庭': 'family_fixed',
  '个人固定支出': 'personal_fixed',
  '个人灵活支出': 'personal_flexible',
  '灵活支出': 'personal_flexible',
  '日常餐饮': 'daily_food',
  '餐饮': 'daily_food',
  '吃饭': 'daily_food',
  '外卖': 'daily_food',
  '日常交通': 'daily_transport',
  '交通': 'daily_transport',
  '出行': 'daily_transport',
  '日常购物': 'daily_shopping',
  '购物': 'daily_shopping',
  '超市': 'daily_shopping',
  '日常娱乐': 'daily_entertainment',
  '娱乐': 'daily_entertainment',
  '日常住房': 'daily_housing',
  '住房': 'daily_housing',
  '水电': 'daily_housing',
  '物业': 'daily_housing',
  '其他日常支出': 'daily_other',
  '其他': 'daily_other',
};

// 类别枚举值 → 中文名
const categoryToChinese: Record<string, string> = {};
for (const [cn, key] of Object.entries(categoryNameMap)) {
  if (!categoryToChinese[key]) {
    categoryToChinese[key] = cn;
  }
}

/**
 * 将中文类别名转换为枚举值
 */
function resolveCategory(input: string): ExpenseRecordCategory | null {
  // 直接匹配枚举值
  const validCategories = Object.keys(ExpenseRecordCategoryLabels);
  if (validCategories.includes(input)) {
    return input as ExpenseRecordCategory;
  }

  // 中文名匹配
  if (categoryNameMap[input]) {
    return categoryNameMap[input];
  }

  // 模糊匹配（包含关键词）
  for (const [keyword, category] of Object.entries(categoryNameMap)) {
    if (input.includes(keyword) || keyword.includes(input)) {
      return category;
    }
  }

  return null;
}

/**
 * 验证一行 JSON 记录
 */
function validateRecord(record: JsonExpenseRecord, index: number): ImportError[] {
  const errors: ImportError[] = [];

  if (!record.date) {
    errors.push({ index, field: 'date', message: '缺少日期' });
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
    errors.push({ index, field: 'date', message: `日期格式错误: ${record.date}，应为 YYYY-MM-DD` });
  }

  if (typeof record.amount !== 'number' || record.amount <= 0) {
    errors.push({ index, field: 'amount', message: `金额无效: ${record.amount}` });
  }

  if (!record.description) {
    errors.push({ index, field: 'description', message: '缺少消费描述' });
  }

  if (!record.category) {
    errors.push({ index, field: 'category', message: '缺少消费类别' });
  } else if (!resolveCategory(record.category)) {
    errors.push({
      index,
      field: 'category',
      message: `未知类别: "${record.category}"，可用: ${Object.values(ExpenseRecordCategoryLabels).join(', ')}`,
    });
  }

  // 验证 items 数组
  if (record.items && Array.isArray(record.items)) {
    for (let i = 0; i < record.items.length; i++) {
      const item = record.items[i];
      if (!item.name) {
        errors.push({ index, field: `items[${i}].name`, message: '缺少商品名称' });
      }
      if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
        errors.push({ index, field: `items[${i}].unitPrice`, message: '单价无效' });
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        errors.push({ index, field: `items[${i}].quantity`, message: '数量无效' });
      }
      if (typeof item.subtotal !== 'number' || item.subtotal < 0) {
        errors.push({ index, field: `items[${i}].subtotal`, message: '小计金额无效' });
      }
    }
  }

  return errors;
}

/**
 * 将一行 JSON 记录转换为 ExpenseRecord
 */
function convertRecord(record: JsonExpenseRecord, index: number): ExpenseRecord {
  const now = new Date().toISOString();
  const category = resolveCategory(record.category) || 'daily_other';

  const items: ExpenseItem[] | undefined = record.items?.map(item => ({
    name: item.name,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    subtotal: item.subtotal,
    unit: item.unit,
    category: item.category,
  }));

  return {
    _id: `import_${Date.now().toString(36)}_${index}`,
    type: 'expense_record',
    createdAt: now,
    updatedAt: now,
    data: {
      date: record.date,
      amount: record.amount,
      category,
      description: record.description,
      paymentMethod: record.paymentMethod,
      tags: record.tags,
      items: items && items.length > 0 ? items : undefined,
    },
  };
}

/**
 * 解析并验证 JSON 导入数据
 */
export function parseExpenseJson(jsonStr: string): ImportResult {
  const result: ImportResult = {
    success: false,
    records: [],
    errors: [],
    warnings: [],
  };

  // 1. 解析 JSON
  let data: any;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    result.errors.push({
      index: -1,
      field: 'json',
      message: `JSON 格式错误: ${e instanceof Error ? e.message : String(e)}`,
    });
    return result;
  }

  // 2. 支持顶层数组或 { records: [...] } 对象
  let records: any[];
  if (Array.isArray(data)) {
    records = data;
  } else if (data.records && Array.isArray(data.records)) {
    records = data.records;
  } else {
    result.errors.push({
      index: -1,
      field: 'json',
      message: 'JSON 格式错误：需要数组或包含 "records" 字段的对象',
    });
    return result;
  }

  if (records.length === 0) {
    result.errors.push({
      index: -1,
      field: 'json',
      message: '至少需要一条消费记录',
    });
    return result;
  }

  // 3. 逐行验证
  let allErrors: ImportError[] = [];
  for (let i = 0; i < records.length; i++) {
    const errors = validateRecord(records[i], i);
    allErrors = allErrors.concat(errors);
  }

  result.errors = allErrors;

  if (allErrors.length > 0) {
    return result;
  }

  // 4. 转换记录
  for (let i = 0; i < records.length; i++) {
    result.records.push(convertRecord(records[i], i));
  }

  // 5. 检查金额一致性
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (record.items && Array.isArray(record.items) && record.items.length > 0) {
      const itemsTotal = record.items.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0);
      if (Math.abs(itemsTotal - record.amount) > 0.02) {
        result.warnings.push(
          `第${i + 1}条: 商品明细合计 ${itemsTotal.toFixed(2)} 与总金额 ${record.amount} 不一致`
        );
      }
    }
  }

  result.success = true;
  return result;
}

/**
 * 生成 AI 提示词模板
 */
export function getAiPromptTemplates(): Record<string, string> {
  const categoryOptions = Object.values(ExpenseRecordCategoryLabels)
    .map(label => `"${label}"`)
    .join('、');

  const template1 = `请根据以下消费小票/订单截图，生成 JSON 格式的消费记录数据。

要求：
1. 输出一个 JSON 对象，包含 "records" 数组
2. 每条记录包含以下字段：
   - date: 消费日期，格式 YYYY-MM-DD
   - amount: 总金额（数字）
   - category: 消费类别，从以下选项中选择：${categoryOptions}
   - description: 消费描述，简洁概括（如"超市购物"、"午餐外卖"）
   - paymentMethod: 支付方式（可选，如"支付宝"、"微信"、"现金"）
   - tags: 标签数组（可选，如["超市","周末优惠"]）
   - items: 商品明细数组（可选，如果有小票明细），每项包含：
     * name: 商品名称
     * unitPrice: 单价（元）
     * quantity: 数量
     * subtotal: 小计（元）
     * unit: 单位（可选，如"个"、"斤"、"瓶"）

3. 如果一条记录中包含多个商品，items 中的 subtotal 之和应等于 amount

示例输出格式：
{
  "records": [
    {
      "date": "2026-06-19",
      "amount": 85.30,
      "category": "日常购物",
      "description": "超市采购",
      "paymentMethod": "支付宝",
      "tags": ["超市", "周末"],
      "items": [
        { "name": "鲜牛奶", "unitPrice": 12.50, "quantity": 2, "subtotal": 25.00, "unit": "瓶" },
        { "name": "全麦面包", "unitPrice": 8.00, "quantity": 3, "subtotal": 24.00, "unit": "袋" },
        { "name": "鸡蛋", "unitPrice": 15.00, "quantity": 1, "subtotal": 15.00, "unit": "盒" },
        { "name": "苹果", "unitPrice": 5.00, "quantity": 4.26, "subtotal": 21.30, "unit": "斤" }
      ]
    }
  ]
}

请仅输出 JSON，不要包含其他文字。`;

  const template2 = `请根据以下账单/截图，提取所有消费记录，输出 JSON 格式。

每条记录需要：date(日期YYYY-MM-DD)、amount(金额)、category(类别可选: ${categoryOptions})、description(描述)。
如果有商品明细，请额外输出 items 数组，每项包含 name、unitPrice、quantity、subtotal。

输出格式：
{ "records": [ ... ] }

请仅输出 JSON。`;

  return {
    standard: template1,
    simple: template2,
  };
}