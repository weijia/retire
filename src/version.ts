// 版本信息 - 构建时自动注入
declare const __APP_VERSION__: string
declare const __APP_BUILD_TIME__: string
declare const __APP_COMMIT_SHA__: string

export const VERSION = (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev') as string
export const BUILD_TIME = (typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : new Date().toISOString()) as string
export const COMMIT_SHA = (typeof __APP_COMMIT_SHA__ !== 'undefined' ? __APP_COMMIT_SHA__ : 'unknown') as string

// 格式化显示
export const versionDisplay = `${VERSION} (${COMMIT_SHA})`
export const buildTimeDisplay = new Date(BUILD_TIME).toLocaleString('zh-CN')
