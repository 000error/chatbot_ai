/**
 * 七牛云图床上传服务
 * 用于将本地图片上传到七牛云获取公开 URL
 */

export interface QiniuConfig {
  accessKey: string;
  secretKey: string;
  bucket: string;
  domain: string; // 访问域名，如 http://xxx.bkt.clouddn.com
  region?: string; // 存储区域: z0(华东), z1(华北), z2(华南), na0(北美), as0(东南亚)
}

export interface QiniuUploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

/**
 * 通过后端代理上传图片到七牛云
 * @param base64Data - 纯 base64 数据或 data URL
 * @param config - 七牛云配置
 * @returns 上传结果，包含图片 URL
 */
export const uploadToQiniu = async (
  base64Data: string,
  config: QiniuConfig
): Promise<QiniuUploadResult> => {
  if (!config.accessKey || !config.secretKey || !config.bucket || !config.domain) {
    console.error('[Qiniu] 配置不完整');
    return { success: false, error: '七牛云配置不完整' };
  }

  try {
    // 提取纯 base64 数据（去掉 data URL 前缀）
    const pureBase64 = base64Data.includes(',') 
      ? base64Data.split(',')[1] 
      : base64Data;

    // 获取 MIME 类型
    const mimeMatch = base64Data.match(/^data:([^;]+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

    console.log('[Qiniu] 准备上传, mimeType:', mimeType, ', base64长度:', pureBase64.length);

    // 通过后端代理上传
    const response = await fetch('/api/qiniu/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64: pureBase64,
        mimeType,
        accessKey: config.accessKey,
        secretKey: config.secretKey,
        bucket: config.bucket,
        domain: config.domain,
        region: config.region,
      }),
    });

    console.log('[Qiniu] 响应状态:', response.status);
    const result = await response.json();
    console.log('[Qiniu] 响应内容:', result);

    if (result.success) {
      return {
        success: true,
        url: result.url,
        key: result.key,
      };
    } else {
      console.error('[Qiniu] 上传失败:', result.error);
      return {
        success: false,
        error: result.error || '上传失败',
      };
    }
  } catch (error: any) {
    console.error('[Qiniu] 网络错误:', error);
    return {
      success: false,
      error: error.message || '网络错误',
    };
  }
};

/**
 * 批量上传图片到七牛云
 * @param images - 图片数组，每个元素是 base64 或 data URL
 * @param config - 七牛云配置
 * @returns 上传成功的 URL 数组
 */
export const uploadMultipleToQiniu = async (
  images: string[],
  config: QiniuConfig
): Promise<string[]> => {
  const results = await Promise.all(
    images.map(img => uploadToQiniu(img, config))
  );
  
  return results
    .filter(r => r.success && r.url)
    .map(r => r.url as string);
};
