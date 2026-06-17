<template>
  <div class="pension-record-form-page">
    <div class="page-header">
      <button class="back-btn" @click="$router.back()">&#8249; 返回</button>
      <h1>{{ isEdit ? '编辑缴存记录' : '添加缴存记录' }}</h1>
      <span></span>
    </div>

    <div class="card">
      <div class="form-group">
        <label class="form-label">缴费年份</label>
        <input v-model.number="form.year" type="number" class="form-input" :min="2000" :max="new Date().getFullYear()" />
      </div>

      <div class="form-group">
        <label class="form-label">养老金类型</label>
        <div class="radio-group">
          <label class="radio-item" :class="{ active: form.pensionType === 'basic' }">
            <input type="radio" v-model="form.pensionType" value="basic" />
            <span>基本养老保险</span>
          </label>
          <label class="radio-item" :class="{ active: form.pensionType === 'supplementary' }">
            <input type="radio" v-model="form.pensionType" value="supplementary" />
            <span>补充养老保险</span>
          </label>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group half">
          <label class="form-label">月缴费基数（元）</label>
          <input v-model.number="form.monthlyBase" type="number" class="form-input" min="0" />
        </div>
        <div class="form-group half">
          <label class="form-label">当年社平工资（元/月）</label>
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
        <label class="form-label">当年缴费月数</label>
        <input v-model.number="form.monthsPaid" type="number" class="form-input" min="1" max="12" />
      </div>

      <div class="form-group">
        <label class="form-label">备注</label>
        <input v-model="form.description" type="text" class="form-input" placeholder="可选" />
      </div>

      <!-- 预览 -->
      <div class="preview-box">
        <div class="preview-row">
          <span>月个人缴费</span>
          <span>{{ formatMoney(monthlyPersonal) }}</span>
        </div>
        <div class="preview-row">
          <span>月单位缴费</span>
          <span>{{ formatMoney(monthlyEmployer) }}</span>
        </div>
        <div class="preview-row preview-total">
          <span>当年总缴费</span>
          <span>{{ formatMoney(totalPaid) }}</span>
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

const route = useRoute();
const router = useRouter();
const pensionStore = usePensionStore();
const saving = ref(false);

const isEdit = computed(() => !!route.params.id);
const recordId = computed(() => route.params.id as string);

const form = ref({
  year: new Date().getFullYear(),
  pensionType: 'basic' as 'basic' | 'supplementary',
  monthlyBase: 8000,
  avgWage: 8000,
  personalRate: 8,
  employerRate: 16,
  monthsPaid: 12,
  description: '',
});

const monthlyPersonal = computed(() =>
  Math.round(form.value.monthlyBase * (form.value.personalRate / 100))
);

const monthlyEmployer = computed(() =>
  Math.round(form.value.monthlyBase * (form.value.employerRate / 100))
);

const totalPaid = computed(() =>
  (monthlyPersonal.value + monthlyEmployer.value) * form.value.monthsPaid
);

onMounted(async () => {
  if (isEdit.value) {
    await pensionStore.loadRecords();
    const record = pensionStore.records.find(r => r._id === recordId.value);
    if (record) {
        const d = record.data;
        form.value = {
          year: d.year,
          pensionType: d.pensionType,
          monthlyBase: d.monthlyBase,
          avgWage: d.avgWage || 8000,
          personalRate: d.personalRate,
          employerRate: d.employerRate,
          monthsPaid: d.monthsPaid,
          description: d.description || '',
        };
      }
  }
});

async function save() {
  if (form.value.monthlyBase <= 0) {
    alert('请输入月缴费基数');
    return;
  }

  saving.value = true;
  try {
    if (isEdit.value) {
      await pensionStore.updateRecord(recordId.value, form.value);
    } else {
      // addRecord 会自动计算派生字段，传入原始数据即可
      await pensionStore.addRecord(form.value as any);
    }
    router.back();
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.pension-record-form-page {
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

.radio-group {
  display: flex;
  gap: 8px;
}

.radio-item {
  flex: 1;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  text-align: center;
  font-size: 13px;
  cursor: pointer;
  background: var(--card-bg);
}

.radio-item input {
  display: none;
}

.radio-item.active {
  border-color: var(--primary);
  background: rgba(74, 144, 217, 0.1);
  color: var(--primary);
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
