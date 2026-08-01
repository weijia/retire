<template>
  <div class="data-sync-settings">
    <!-- 当前数据后端列表 -->
    <div v-if="store.dataBackends.length > 0" class="backend-list">
      <div class="list-title">已配置的数据同步后端</div>
      <div v-for="b in store.dataBackends" :key="b.id" class="backend-item">
        <div class="backend-info">
          <span class="backend-type">{{ b.type }}</span>
          <span class="backend-desc">{{ b.description || b.id }}</span>
        </div>
        <div class="backend-actions">
          <button class="btn btn-sm btn-danger" @click="handleRemove(b.id)" :disabled="store.syncing">
            删除
          </button>
        </div>
      </div>

      <button class="btn btn-sm" @click="handleFlush" :disabled="store.syncing">
        {{ store.syncing ? '同步中...' : '立即同步' }}
      </button>
    </div>

    <!-- 添加新数据后端 -->
    <div v-if="store.accountBackends.length > 0" class="add-backend-form">
      <div class="form-title">添加数据同步后端</div>
      <div class="form-hint" style="margin-bottom: 12px;">
        数据将同步到配置的后端。可添加多个后端实现多副本备份。
      </div>

      <div class="form-group">
        <label>基于账号后端</label>
        <select v-model="selectedAccount" class="form-select">
          <option value="">选择 config-sync 后端</option>
          <option v-for="b in store.accountBackends" :key="b.id" :value="b.id">
            {{ b.type }} - {{ b.id }}
          </option>
        </select>
        <div class="form-hint">将复用该后端的 token 和账号信息</div>
      </div>

      <div class="form-group">
        <label>数据仓库/存储位置</label>
        <input v-model="dataRepo" type="text" class="form-input" placeholder="如：retire-data" />
        <div class="form-hint">与配置仓库可以相同或不同</div>
      </div>

      <div class="form-group">
        <label>分支名</label>
        <input v-model="dataBranch" type="text" class="form-input" placeholder="默认 main" />
      </div>

      <div class="form-group">
        <label>后端标识</label>
        <input v-model="backendId" type="text" class="form-input" placeholder="如：gitee-data-1" />
      </div>

      <button
        class="btn btn-primary btn-block"
        @click="handleAdd"
        :disabled="!canAdd || store.syncing"
      >
        {{ store.syncing ? '添加中...' : '添加数据后端' }}
      </button>
    </div>

    <!-- 无可用账号后端 -->
    <div v-if="store.accountBackends.length === 0" class="no-account-hint">
      请先在「配置云同步」中添加一个后端，再配置数据同步
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useDataSyncStore } from '../stores/dataSyncStore';

const store = useDataSyncStore();

const selectedAccount = ref('');
const dataRepo = ref('');
const dataBranch = ref('main');
const backendId = ref('');

const canAdd = computed(() =>
  selectedAccount.value &&
  dataRepo.value &&
  backendId.value
);

onMounted(async () => {
  await store.init();
});

async function handleAdd() {
  const account = store.accountBackends.find(b => b.id === selectedAccount.value);
  if (!account) return;

  await store.addBackend(
    backendId.value,
    account.type,
    {
      repo: dataRepo.value,
      branch: dataBranch.value,
    },
    selectedAccount.value,
    '数据存储'
  );

  // 清空表单
  dataRepo.value = '';
  backendId.value = '';
}

async function handleRemove(id: string) {
  if (confirm('确定删除该数据后端？数据不会从云端删除。')) {
    await store.removeBackend(id);
  }
}

async function handleFlush() {
  await store.flush();
}
</script>

<style scoped>
.data-sync-settings {
  margin-top: 16px;
}

.list-title,
.form-title {
  font-weight: 600;
  margin-bottom: 12px;
}

.backend-list {
  margin-bottom: 16px;
}

.backend-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border: 1px solid #eee;
  border-radius: 4px;
  margin-bottom: 8px;
}

.backend-info {
  display: flex;
  gap: 8px;
}

.backend-type {
  font-weight: 500;
}

.backend-desc {
  color: #666;
}

.add-backend-form {
  border-top: 1px solid #eee;
  padding-top: 16px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
}

.form-select,
.form-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
}

.form-hint {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.no-account-hint {
  color: #666;
  font-size: 14px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary {
  background: #1890ff;
  color: white;
}

.btn-danger {
  background: #ff4d4f;
  color: white;
}

.btn-block {
  width: 100%;
  box-sizing: border-box;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>