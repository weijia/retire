import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { UserConfig } from '../types';
import { putDoc, getDoc } from '../db';

export const useUserStore = defineStore('user', () => {
  const config = ref<UserConfig | null>(null);

  const DOC_ID = 'user_config_profile';

  // 加载用户配置
  async function loadConfig() {
    try {
      const doc = await getDoc(DOC_ID);
      if (doc) {
        config.value = doc as UserConfig;
      } else {
        config.value = null;
      }
    } catch {
      config.value = null;
    }
  }

  // 保存用户配置
  async function saveConfig(data: UserConfig['data']) {
    const now = new Date().toISOString();
    if (config.value) {
      const updated = {
        ...config.value,
        data,
        updatedAt: now,
      };
      await putDoc(updated);
      config.value = updated;
    } else {
      const newDoc: UserConfig = {
        _id: DOC_ID,
        type: 'user_config',
        createdAt: now,
        updatedAt: now,
        data,
      };
      await putDoc(newDoc);
      config.value = newDoc;
    }
  }

  // 是否已配置
  const isConfigured = ref(false);

  function checkConfigured() {
    isConfigured.value = !!(
      config.value &&
      config.value.data.birthDate &&
      config.value.data.targetRetireAge
    );
  }

  return { config, isConfigured, loadConfig, saveConfig, checkConfigured };
});
