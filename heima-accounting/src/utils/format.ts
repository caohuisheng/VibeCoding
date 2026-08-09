/**
 * 格式化金额为人民币显示
 * @param amount 金额（元）
 * @returns 格式化字符串，如 "¥12.50"
 */
export function formatAmount(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}

/**
 * 格式化日期为中文显示
 * @param dateStr 日期字符串 YYYY-MM-DD
 * @returns 如 "2026年8月8日"
 */
export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${year}年${parseInt(month)}月${parseInt(day)}日`;
}

/**
 * 获取今天的日期字符串
 */
export function getToday(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 获取当前月份字符串 YYYY-MM
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 获取本周一日期
 */
export function getWeekStart(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 周一为起始
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return formatDateStr(monday);
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 格式化金额为带正负号的显示
 * @param amount 金额
 * @param billType 收支类型
 * @returns 如 "-¥12.50" 或 "+¥100.00"
 */
export function formatAmountWithType(amount: number, billType: string): string {
  const prefix = billType === 'income' ? '+' : '-';
  return `${prefix}¥${amount.toFixed(2)}`;
}

/**
 * 获取金额颜色
 * @param billType 收支类型
 * @returns 支出红色 '#ff4d4f'，收入绿色 '#52c41a'
 */
export function getAmountColor(billType: string): string {
  return billType === 'income' ? '#52c41a' : '#ff4d4f';
}
