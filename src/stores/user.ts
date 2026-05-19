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
        // 兼容旧数据：补充新增字段的默认值
        if (config.value) {
          const d = config.value.data as any;
          if (d.actualRetireAge === undefined) d.actualRetireAge = 65;
          // 兼容旧数据：将 birthDate 转换为 birthYear
          if (d.birthYear === undefined && d.birthDate) {
            d.birthYear = new Date(d.birthDate).getFullYear();
          }
        }
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
    // 深拷贝 data，确保去除 Vue reactive proxy
    const plainData = JSON.parse(JSON.stringify(data));
    if (config.value) {
      const updated: UserConfig = {
        _id: DOC_ID,
        type: 'user_config' as const,
        createdAt: config.value.createdAt,
        updatedAt: now,
        data: plainData,
      };
      await putDoc(updated);
      config.value = updated;
    } else {
      const newDoc: UserConfig = {
        _id: DOC_ID,
        type: 'user_config',
        createdAt: now,
        updatedAt: now,
        data: plainData,
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
      config.value.data.birthYear &&
      config.value.data.targetRetireAge
    );
  }

  return { config, isConfigured, loadConfig, saveConfig, checkConfigured };
});
