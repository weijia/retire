import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { UserConfig } from '../types';
import { useConfigStore } from './config';

export const useUserStore = defineStore('user', () => {
  const config = ref<UserConfig | null>(null);

  // 加载用户配置（从 zen-fs-config 配置仓库读取）
  async function loadConfig() {
    try {
      const configStore = useConfigStore();
      const data = configStore.getUserConfig();
      if (data) {
        // 兼容旧数据：补充新增字段的默认值
        const d = data as any;
        if (d.actualRetireAge === undefined) d.actualRetireAge = 65;
        if (d.birthYear === undefined && d.birthDate) {
          d.birthYear = new Date(d.birthDate).getFullYear();
        }
        // 构造完整文档对象以保持向后兼容
        config.value = {
          _id: 'user_config_profile',
          type: 'user_config',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          data: JSON.parse(JSON.stringify(d)),
        };
      } else {
        config.value = null;
      }
    } catch {
      config.value = null;
    }
  }

  // 保存用户配置（写入 zen-fs-config 配置仓库，自动同步到副本后端）
  async function saveConfig(data: UserConfig['data']) {
    const configStore = useConfigStore();
    const plainData = JSON.parse(JSON.stringify(data));
    configStore.setUserConfig(plainData);
    // 更新本地 state
    config.value = {
      _id: 'user_config_profile',
      type: 'user_config',
      createdAt: config.value?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: plainData,
    };
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
