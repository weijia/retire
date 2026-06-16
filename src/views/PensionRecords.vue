<template>
  <div class="pension-records-page">
    <div class="page-header">
      <button class="back-btn" @click="$router.back()">&#8249; 返回</button>
      <h1>缴存记录</h1>
      <router-link to="/pension/records/add" class="add-btn">+ 添加</router-link>
    </div>

    <div v-if="pensionStore.sortedRecords.length === 0" class="card empty-hint">
      暂无缴存记录，点击右上角添加
    </div>

    <div v-for="record in pensionStore.sortedRecords" :key="record._id" class="card record-card">
      <div class="record-header">
        <span class="record-year">{{ record.data.year }}年</span>
        <span class="record-type">{{ record.data.pensionType === 'basic' ? '基本养老保险' : '补充养老保险' }}</span>
      </div>
      <div class="record-detail">
        <div class="detail-row">
          <span>月缴费基数</span>
          <span>{{ formatMoney(record.data.monthlyBase) }}</span>
        </div>
        <div class="detail-row">
          <span>个人缴费 {{ record.data.personalRate }}%</span>
          <span>{{ formatMoney(record.data.monthlyPersonal) }}/月</span>
        </div>
        <div class="detail-row">
          <span>单位缴费 {{ record.data.employerRate }}%</span>
          <span>{{ formatMoney(record.data.monthlyEmployer) }}/月</span>
        </div>
        <div class="detail-row">
          <span>缴费月数</span>
          <span>{{ record.data.monthsPaid }}个月</span>
        </div>
        <div class="detail-row total-row">
          <span>当年总缴费</span>
          <span>{{ formatMoney(record.data.totalPaid) }}</span>
        </div>
      </div>
      <div class="record-actions">
        <button class="btn btn-sm" @click="editRecord(record._id)">编辑</button>
        <button class="btn btn-sm btn-danger" @click="deleteRecord(record._id)">删除</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usePensionStore } from '../stores/pension';
import { formatMoney } from '../utils/format';

const router = useRouter();
const pensionStore = usePensionStore();

function editRecord(id: string) {
  router.push(`/pension/records/edit/${id}`);
}

async function deleteRecord(id: string) {
  if (!confirm('确定删除这条缴存记录吗？')) return;
  await pensionStore.removeRecord(id);
}

onMounted(async () => {
  await pensionStore.loadRecords();
});
</script>

<style scoped>
.pension-records-page {
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

.add-btn {
  font-size: 14px;
  color: var(--primary);
  text-decoration: none;
  padding: 6px 12px;
  border: 1px solid var(--primary);
  border-radius: var(--radius);
}

.empty-hint {
  text-align: center;
  padding: 32px;
  color: var(--text-light);
  margin: 16px;
}

.record-card {
  margin: 8px 16px;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.record-year {
  font-size: 16px;
  font-weight: 600;
}

.record-type {
  font-size: 12px;
  padding: 2px 8px;
  background: var(--bg);
  border-radius: 4px;
  color: var(--text-secondary);
}

.record-detail {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);
}

.total-row {
  border-top: 1px dashed var(--border);
  padding-top: 6px;
  margin-top: 2px;
  font-weight: 600;
  color: var(--text-primary);
}

.record-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

.btn-danger {
  background: var(--danger, #ff4d4f);
  color: white;
  border: none;
}
</style>
