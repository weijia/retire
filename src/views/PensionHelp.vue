<template>
  <div class="pension-help-page">
    <div class="page-header">
      <button class="back-btn" @click="$router.back()">‹ 返回</button>
      <h1>养老金计算说明</h1>
      <span></span>
    </div>

    <!-- 计算公式 -->
    <div class="card">
      <div class="card-title">📐 计算公式</div>
      <div class="formula-box">
        <div class="formula-main">月养老金 = 基础养老金 + 个人账户养老金 + 过渡性养老金</div>
      </div>

      <div class="formula-detail">
        <div class="formula-item">
          <div class="formula-label">1. 基础养老金</div>
          <div class="formula-text">
            = 退休时上年度社平工资 × (1 + 平均缴费指数) / 2 × 缴费年限 × 1%
          </div>
        </div>
        <div class="formula-item">
          <div class="formula-label">2. 个人账户养老金</div>
          <div class="formula-text">
            = 个人账户储存额 / 计发月数
          </div>
          <div class="formula-note">
            计发月数：50岁→195, 55岁→170, 60岁→139, 65岁→101
          </div>
        </div>
        <div class="formula-item">
          <div class="formula-label">3. 过渡性养老金（中人）</div>
          <div class="formula-text">
            = 退休时社平工资 × 视同缴费指数 × 视同缴费年限 × 过渡系数
          </div>
          <div class="formula-note">
            仅适用于 1996 年前参加工作的人员（"中人"），过渡系数通常 1.0%-1.4%
          </div>
        </div>
      </div>
    </div>

    <!-- 缴费比例 -->
    <div class="card">
      <div class="card-title">💰 缴费比例</div>
      <div class="compare-table">
        <div class="table-header">
          <span>项目</span>
          <span>在职职工</span>
          <span>灵活就业</span>
        </div>
        <div class="table-row">
          <span>总缴费比例</span>
          <span>24%</span>
          <span class="highlight">20%</span>
        </div>
        <div class="table-row">
          <span>个人缴纳</span>
          <span>8%</span>
          <span class="highlight">20%（全部）</span>
        </div>
        <div class="table-row">
          <span>单位缴纳</span>
          <span>16%</span>
          <span>—</span>
        </div>
        <div class="table-row">
          <span>入个人账户</span>
          <span>8%</span>
          <span>8%</span>
        </div>
        <div class="table-row">
          <span>入社会统筹</span>
          <span>16%</span>
          <span>12%</span>
        </div>
        <div class="table-row">
          <span>缴费基数</span>
          <span>实际工资</span>
          <span>社平工资 60%-300%</span>
        </div>
      </div>
    </div>

    <!-- 灵活就业档位选择 -->
    <div class="card">
      <div class="card-title">📊 灵活就业：60% 还是 100% 更划算？</div>
      <div class="insight-box">
        <div class="insight-conclusion">
          <span class="conclusion-icon">💡</span>
          <span class="conclusion-text">结论：<strong>60% 档位性价比最高</strong>，回本最快</span>
        </div>
      </div>

      <div class="insight-detail">
        <p>基础养老金公式中 <code>(1 + 缴费指数) / 2</code> 这个因子意味着<strong>缴费指数越低，每元钱"买"到的养老金越多</strong>：</p>

        <div class="roi-table">
          <div class="table-header">
            <span>档位</span>
            <span>缴费指数</span>
            <span>公式因子</span>
            <span>每元回报</span>
          </div>
          <div class="table-row best">
            <span>60%</span>
            <span>0.6</span>
            <span>0.8</span>
            <span class="highlight">1.33 倍</span>
          </div>
          <div class="table-row">
            <span>100%</span>
            <span>1.0</span>
            <span>1.0</span>
            <span>1.00 倍</span>
          </div>
          <div class="table-row">
            <span>300%</span>
            <span>3.0</span>
            <span>2.0</span>
            <span>0.67 倍</span>
          </div>
        </div>
      </div>

      <div class="insight-detail">
        <p><strong>具体算一笔账</strong>（社平工资 8000 元/月，缴费 15 年，60 岁退休）：</p>

        <div class="compare-table">
          <div class="table-header">
            <span>对比项</span>
            <span>60% 档位</span>
            <span>100% 档位</span>
          </div>
          <div class="table-row">
            <span>月缴费</span>
            <span>960 元</span>
            <span>1,600 元</span>
          </div>
          <div class="table-row">
            <span>15 年总缴费</span>
            <span>172,800 元</span>
            <span>288,000 元</span>
          </div>
          <div class="table-row">
            <span>月养老金</span>
            <span>1,457 元</span>
            <span>2,029 元</span>
          </div>
          <div class="table-row best">
            <span>回本年限</span>
            <span class="highlight">9.9 年</span>
            <span>11.8 年</span>
          </div>
        </div>

        <div class="insight-note">
          <p>从 60% 提到 100% 多交的 115,200 元，需要 <strong>16.8 年</strong>才能回本。</p>
        </div>
      </div>

      <div class="insight-detail">
        <p><strong>实用建议：</strong></p>
        <ul class="advice-list">
          <li>✅ 预算有限 → <strong>选 60%</strong>，回本最快</li>
          <li>✅ 经济宽裕 → <strong>选 100%</strong>，绝对金额更高</li>
          <li>✅ 年轻人 → <strong>60% 起步</strong>，临近退休再提高</li>
          <li>✅ 距离退休不到 10 年 → <strong>选 100%</strong>，边际回本来得及</li>
          <li>✅ 折中策略 → <strong>前期 60%，最后 5-10 年提到 100%</strong></li>
        </ul>
      </div>
    </div>

    <!-- 数据来源 -->
    <div class="card">
      <div class="card-title">📚 数据来源</div>
      <ul class="source-list">
        <li>《国务院关于完善企业职工基本养老保险制度的决定》（国发〔2005〕38号）</li>
        <li>历年个人账户记账利率（人社部公布）</li>
        <li>全国城镇非私营单位就业人员平均工资（国家统计局）</li>
        <li>预期寿命评估基于 WHO 生命表及流行病学研究</li>
      </ul>
      <div class="disclaimer">
        ⚠️ 本工具仅供个人参考，不构成任何财务或保险建议。实际养老金以社保机构核定为准。
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.pension-help-page {
  padding-bottom: 80px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.page-header h1 {
  font-size: 18px;
  font-weight: 600;
}

.back-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: var(--primary);
  cursor: pointer;
  padding: 4px;
}

.card {
  margin: 12px 16px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
}

.formula-box {
  background: var(--bg);
  border-radius: var(--radius);
  padding: 12px;
  margin-bottom: 12px;
}

.formula-main {
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  color: var(--primary);
}

.formula-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.formula-item {
  padding: 10px;
  background: var(--bg);
  border-radius: var(--radius);
}

.formula-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.formula-text {
  font-size: 13px;
  color: var(--text-secondary);
  font-family: monospace;
  word-break: break-all;
}

.formula-note {
  font-size: 12px;
  color: var(--text-light);
  margin-top: 4px;
}

.compare-table,
.roi-table {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-light);
}

.roi-table .table-header {
  grid-template-columns: 1fr 1fr 1fr 1fr;
}

.table-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--text-secondary);
  border-top: 1px solid var(--border);
}

.roi-table .table-row {
  grid-template-columns: 1fr 1fr 1fr 1fr;
}

.table-row.best {
  background: rgba(82, 196, 26, 0.05);
}

.highlight {
  font-weight: 600;
  color: var(--primary);
}

.insight-box {
  margin-bottom: 12px;
}

.insight-conclusion {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(74, 144, 217, 0.08);
  border-radius: var(--radius);
  font-size: 14px;
}

.conclusion-icon {
  font-size: 20px;
}

.insight-detail {
  margin-bottom: 16px;
}

.insight-detail p {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 8px;
}

.insight-detail code {
  background: var(--bg);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.insight-note {
  padding: 10px;
  background: rgba(255, 77, 79, 0.05);
  border-radius: var(--radius);
  border-left: 3px solid var(--danger, #ff4d4f);
  font-size: 13px;
  color: var(--text-secondary);
}

.advice-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.advice-list li {
  padding: 8px 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  border-bottom: 1px solid var(--border);
}

.advice-list li:last-child {
  border-bottom: none;
}

.source-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.source-list li {
  padding: 6px 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  border-bottom: 1px solid var(--border);
}

.source-list li:last-child {
  border-bottom: none;
}

.disclaimer {
  margin-top: 12px;
  padding: 10px;
  background: rgba(250, 173, 20, 0.1);
  border-radius: var(--radius);
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}
</style>
