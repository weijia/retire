// Gitee 云同步工具

export interface GiteeConfig {
  token: string;      // Gitee 私人令牌
  owner: string;      // 用户名
  repo: string;       // 仓库名
  branch?: string;    // 分支名，默认 master
  filePath?: string;  // 文件路径，默认 retire-config.json
}

const GITEE_API_BASE = 'https://gitee.com/api/v5';

// Base64 编码（浏览器环境）
function base64Encode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

// Base64 解码（浏览器环境）
function base64Decode(base64: string): string {
  return decodeURIComponent(escape(atob(base64)));
}

// 获取文件内容
export async function loadFromGitee(config: GiteeConfig): Promise<{ content: string; sha: string } | null> {
  const { token, owner, repo, branch = 'master', filePath = 'retire-config.json' } = config;
  const url = `${GITEE_API_BASE}/repos/${owner}/${repo}/contents/${filePath}?access_token=${token}&ref=${branch}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`加载失败: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return {
    content: base64Decode(data.content),
    sha: data.sha,
  };
}

// 保存文件内容（创建或更新）
export async function saveToGitee(config: GiteeConfig, content: string, sha?: string): Promise<void> {
  const { token, owner, repo, branch = 'master', filePath = 'retire-config.json' } = config;
  
  const body: Record<string, any> = {
    access_token: token,
    content: base64Encode(content),
    message: sha ? '更新退休规划配置' : '创建退休规划配置',
    branch,
  };
  
  // 更新文件需要 sha
  if (sha) {
    body.sha = sha;
  }
  
  const method = sha ? 'PUT' : 'POST';
  const url = `${GITEE_API_BASE}/repos/${owner}/${repo}/contents/${filePath}`;
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`保存失败: ${error.message || response.statusText}`);
  }
}

// 测试 Gitee 配置是否有效
export async function testGiteeConfig(config: GiteeConfig): Promise<boolean> {
  try {
    await loadFromGitee(config);
    return true; // 能访问仓库即可
  } catch (e) {
    return false;
  }
}
