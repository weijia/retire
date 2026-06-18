<template>
  <div class="pension-phase-form-page">
    <div class="page-header">
      <button class="back-btn" @click="$router.back()">&#8249; 返回</button>
      <h1>{{ isEdit ? '编辑缴费阶段' : '添加缴费阶段' }}</h1>
      <span></span>
    </div>

    <div class="card">
      <div class="form-row">
        <div class="form-group half">
          <label class="form-label">起始年份</label>
          <input v-model.number="form.startYear" type="number" class="form-input" :min="1990" :max="form.endYear" />
        </div>
        <div class="form-group half">
          <label class="form-label">结束年份</label>
          <input v-model.number="form.endYear" type="number" class="form-input" :min="form.startYear" :max="new Date().getFullYear() + 30" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group half">
          <label class="form-label">月缴费基数（元）</label>
          <input v-model.number="form.monthlyBase" type="number" class="form-input" min="0" />
        </div>
        <div class="form-group half">
          <label class="form-label">社平工资（元/月）</label>
          <input v-model.number="form.avgWage" type="number" class="form-input" min="0" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group half">
          <label class="form-label">个人缴费比例（%）</label>
          <input v-model.number="form.personalRate" type="number" class="form-input" min="0" max="100" step="0.1" />
        </div>
        <div class="form-group half">
          <label class="form-label">单位缴费比例（%）</label>
          <input v-model.number="form.employerRate" type="number" class="form-input" min="0" max="100" step="0.1" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">每年缴费月数</label>
        <input v-model.number="form.monthsPaidPerYear" type="number" class="form-input" min="1" max="12" />
      </div>

      <div class="form-group">
        <label class="form-label">备注</label>
        <input v-model="form.description" type="text" class="form-input" placeholder="可选" />
      </div>

      <div class="form-group">
        <label class="checkbox-item">
          <input type="checkbox" v-model="form.autoFlexEmployment" />
          <span>结束后自动转为灵活就业缴费至退休</span>
        </label>
      </div>

      <div v-if="form.autoFlexEmployment" class="form-group">
        <label class="form-label">灵活就业缴费基数比例（%）</label>
        <input v-model.number="form.flexBasePercent" type="number" class="form-input" min="60" max="300" step="10" />
        <div class="form-hint">范围 60-300，默认 60%（最低档）</div>
      </div>

      <!-- 预览 -->
      <div class="preview-box">
        <div class="preview-row">
          <span>阶段年数</span>
          <span>{{ phaseYears }}年</span>
        </div>
        <div class="preview-row">
          <span>月个人缴费</span>
          <span>{{ formatMoney(monthlyPersonal) }}</span>
        </div>
        <div class="preview-row">
          <span>月单位缴费</span>
          <span>{{ formatMoney(monthlyEmployer) }}</span>
        </div>
        <div class="preview-row preview-total">
          <span>个人累计缴费</span>
          <span>{{ formatMoney(totalPersonalPaid) }}</span>
        </div>
        <div v-if="form.autoFlexEmployment" class="preview-row">
          <span>灵活就业年限</span>
          <span>{{ flexYears }}年（推算）</span>
        </div>
      </div>

      <button class="btn btn-primary btn-block" @click="save" :disabled="saving">
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePensionStore } from '../stores/pension';
import { formatMoney } from '../utils/format';
import type { PensionPhase } from '../types';

const route = useRoute();
const router = useRouter();
const pensionStore = usePensionStore();
const saving = ref(false);

const isEdit = computed(() => !!route.params.id);
const phaseId = computed(() => route.params.id as string);

const form = ref({
  startYear: new Date().getFullYear() - 5,
  endYear: new Date().getFullYear(),
  monthlyBase: 8000,
  avgWage: 8000,
  personalRate: 8,
  employerRate: 16,
  monthsPaidPerYear: 12,
  description: '',
  autoFlexEmployment: false,
  flexBasePercent: 60,
});

const phaseYears = computed(() => {
  return Math.max(0, form.value.endYear - form.value.startYear + 1);
});

const monthlyPersonal = computed(() =>
  Math.round(form.value.monthlyBase * (form.value.personalRate / 100))
);

const monthlyEmployer = computed(() =>
  Math.round(form.value.monthlyBase * (form.value.employerRate / 100))
);

const totalPersonalPaid = computed(() =>
  monthlyPersonal.value * form.value.monthsPaidPerYear * phaseYears.value
);

const flexYears = computed(() => {
  if (!form.value.autoFlexEmployment) return 0;
  const cfg = pensionStore.config?.data;
  if (!cfg) return 0;
  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - 1990; // 简化估算
  const retirementYear = currentYear + (cfg.retirementAge - currentAge);
  return Math.max(0, retirementYear - form.value.endYear);
});

onMounted(async () => {
  await pensionStore.loadPhases();
  if (isEdit.value) {
    const phase = pensionStore.phases.find(p => p.id === phaseId.value);
    if (phase) {
      form.value = {
        startYear: phase.startYear,
        endYear: phase.endYear,
        monthlyBase: phase.monthlyBase,
        avgWage: phase.avgWage,
        personalRate: phase.personalRate,
        employerRate: phase.employerRate,
        monthsPaidPerYear: phase.monthsPaidPerYear,
        description: phase.description || '',
        autoFlexEmployment: phase.autoFlexEmployment,
        flexBasePercent: phase.flexBasePercent || 60,
      };
    }
  }
});

async function save() {
  if (form.value.startYear > form.value.endYear) {
    alert('起始年份不能大于结束年份');
    return;
  }
  if (form.value.monthlyBase <= 0) {
    alert('请输入月缴费基数');
    return;
  }

  saving.value = true;
  try {
    if (isEdit.value) {
      await pensionStore.updatePhase(phaseId.value, form.value);
    } else {
      await pensionStore.addPhase(form.value as PensionPhase);
    }
    router.back();
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.pension-phase-form-page {
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

.form-group {
  margin-bottom: 16px;
}

.form-group.half {
  flex: 1;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 15px;
  background: var(--card-bg);
  color: var(--text-primary);
}

.form-hint {
  font-size: 12px;
  color: var(--text-light);
  margin-top: 4px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
}

.checkbox-item input {
  width: 18px;
  height: 18px;
}

.preview-box {
  background: var(--bg);
  border-radius: var(--radius);
  padding: 12px;
  margin-bottom: 16px;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);
  padding: 4px 0;
}

.preview-total {
  border-top: 1px dashed var(--border);
  padding-top: 8px;
  margin-top: 4px;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-block {
  margin: 0;
}
</style>
