<template>
  <div class="asset-form-page">
    <div class="page-header">
      <button class="back-btn" @click="$router.back()">‹ 返回</button>
      <h1>{{ isEdit ? '编辑资产' : '添加资产' }}</h1>
      <span></span>
    </div>

    <div class="card">
      <div class="form-group">
        <label class="form-label">账户名称 *</label>
        <input v-model="form.name" class="form-input" placeholder="如：工商银行储蓄卡" />
      </div>

      <div class="form-group">
        <label class="form-label">账户类型 *</label>
        <select v-model="form.accountType" class="form-select">
          <option value="">请选择</option>
          <option v-for="(label, key) in AccountTypeLabels" :key="key" :value="key">
            {{ label }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">当前余额（元）*</label>
        <input v-model.number="form.balance" type="number" class="form-input" placeholder="0.00" step="0.01" />
      </div>

      <div class="form-group" v-if="form.accountType === 'bank_deposit'">
        <label class="form-label">银行名称</label>
        <input v-model="form.bankName" class="form-input" placeholder="如：中国工商银行" />
      </div>

      <div class="form-group" v-if="form.accountType === 'fund'">
        <label class="form-label">基金代码</label>
        <input v-model="form.fundCode" class="form-input" placeholder="如：000001" />
      </div>

      <div class="form-group" v-if="form.accountType === 'stock'">
        <label class="form-label">股票代码</label>
        <input v-model="form.stockCode" class="form-input" placeholder="如：600000" />
      </div>

      <div class="form-group">
        <label class="form-label">备注</label>
        <input v-model="form.description" class="form-input" placeholder="可选" />
      </div>

      <div class="form-group checkbox-group">
        <label>
          <input type="checkbox" v-model="form.isHidden" />
          <span>不计入总资产（隐藏）</span>
        </label>
      </div>

      <div class="form-actions">
        <button v-if="isEdit" class="btn btn-danger" @click="handleDelete">删除</button>
        <button class="btn btn-primary" @click="handleSave" :disabled="saving">
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAssetsStore } from '../stores/assets';
import { AccountTypeLabels, type AccountType } from '../types';

const route = useRoute();
const router = useRouter();
const assetsStore = useAssetsStore();
const saving = ref(false);

const isEdit = computed(() => !!route.params.id);

const form = ref({
  name: '',
  accountType: '' as AccountType | '',
  balance: 0,
  bankName: '',
  fundCode: '',
  stockCode: '',
  description: '',
  isHidden: false,
  currency: 'CNY',
});

onMounted(async () => {
  if (route.params.id) {
    const account = await assetsStore.getById(route.params.id as string);
    if (account) {
      form.value = {
        name: account.data.name,
        accountType: account.data.accountType,
        balance: account.data.balance,
        bankName: account.data.bankName || '',
        fundCode: account.data.fundCode || '',
        stockCode: account.data.stockCode || '',
        description: account.data.description || '',
        isHidden: account.data.isHidden,
        currency: account.data.currency || 'CNY',
      };
    }
  }
});

async function handleSave() {
  if (!form.value.name || !form.value.accountType) {
    alert('请填写必填项');
    return;
  }

  saving.value = true;
  try {
    const data = { ...form.value, accountType: form.value.accountType as AccountType };
    if (isEdit.value) {
      await assetsStore.updateAccount(route.params.id as string, data as any);
    } else {
      await assetsStore.addAccount(data as any);
    }
    router.back();
  } finally {
    saving.value = false;
  }
}

async function handleDelete() {
  if (!confirm('确定删除该资产账户吗？')) return;
  await assetsStore.deleteAccount(route.params.id as string);
  router.replace('/assets');
}
</script>

<style scoped>
.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.form-actions .btn {
  flex: 1;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}
</style>
