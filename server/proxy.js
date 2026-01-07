/**
 * API Proxy Server
 * 
 * This server acts as a proxy between the frontend and external APIs:
 * - Handles CORS for cross-origin requests
 * - Proxies OpenAI API requests
 * - Manages Qiniu Cloud image uploads
 * - Secures API keys on the server side
 * 
 * Endpoints:
 * - POST /api/qiniu/upload - Upload images to Qiniu Cloud
 * - POST /v1/chat/completions - OpenAI chat completions
 * - POST /v1/responses - OpenAI responses
 * - POST /api/v1/images/generations - Image generation
 * 
 * @module proxy
 */

import { createServer } from 'http';
import { URL } from 'url';
import qiniu from 'qiniu';
import crypto from 'crypto';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8787;

/**
 * 七牛云上传处理
 */
async function handleQiniuUpload(body, res) {
  try {
    const { base64, mimeType, accessKey, secretKey, bucket, domain, region } = JSON.parse(body);
    
    console.log('[qiniu] 收到上传请求, bucket:', bucket, ', region:', region);
    console.log('[qiniu] AK前6位:', accessKey?.substring(0, 6), ', SK前6位:', secretKey?.substring(0, 6));
    console.log('[qiniu] AK长度:', accessKey?.length, ', SK长度:', secretKey?.length);
    
    if (!accessKey || !secretKey || !bucket || !domain) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: '七牛云配置不完整' }));
      return;
    }

    // 配置七牛云
    const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
    const config = new qiniu.conf.Config();
    
    // 设置存储区域
    const zoneMap = {
      'z0': qiniu.zone.Zone_z0,      // 华东
      'z1': qiniu.zone.Zone_z1,      // 华北
      'z2': qiniu.zone.Zone_z2,      // 华南
      'na0': qiniu.zone.Zone_na0,    // 北美
      'as0': qiniu.zone.Zone_as0,    // 东南亚
      'cn-east-2': qiniu.zone.Zone_cn_east_2,  // 华东-浙江2
    };
    if (region && zoneMap[region]) {
      config.zone = zoneMap[region];
      console.log('[qiniu] 使用区域:', region);
    } else {
      // 默认使用华东
      config.zone = qiniu.zone.Zone_z0;
      console.log('[qiniu] 使用默认区域: z0 (华东)');
    }
    
    // 生成文件名
    const ext = mimeType.split('/')[1] || 'png';
    const key = `upload_${Date.now()}_${crypto.randomBytes(8).toString('hex')}.${ext}`;
    
    // 生成上传凭证 - 使用简单的 scope
    const putPolicy = new qiniu.rs.PutPolicy({
      scope: bucket,  // 简化为只用 bucket
      expires: 7200,
    });
    const uploadToken = putPolicy.uploadToken(mac);
    console.log('[qiniu] 生成上传凭证, key:', key);
    
    // 将 base64 转换为 Buffer
    const buffer = Buffer.from(base64, 'base64');
    console.log('[qiniu] Buffer 大小:', buffer.length, 'bytes');
    
    // 上传
    const formUploader = new qiniu.form_up.FormUploader(config);
    const putExtra = new qiniu.form_up.PutExtra();
    
    const result = await new Promise((resolve, reject) => {
      formUploader.put(uploadToken, key, buffer, putExtra, (err, body, info) => {
        console.log('[qiniu] 上传回调, statusCode:', info?.statusCode, ', body:', body, ', err:', err);
        if (err) {
          reject(err);
        } else if (info.statusCode === 200) {
          resolve({ success: true, key: body.key });
        } else {
          reject(new Error(`上传失败: ${info.statusCode} - ${JSON.stringify(body)}`));
        }
      });
    });
    
    // 拼接访问 URL
    const finalDomain = domain.endsWith('/') ? domain.slice(0, -1) : domain;
    const url = `${finalDomain}/${result.key}`;
    
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, url, key: result.key }));
    
  } catch (e) {
    console.error('[qiniu] Upload error:', e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: String(e.message || e) }));
  }
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  console.log(`[proxy] ${req.method} ${url.pathname}`);

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ detail: 'Method Not Allowed' }));
    return;
  }

  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', async () => {
    // 七牛云上传端点
    if (url.pathname === '/api/qiniu/upload') {
      await handleQiniuUpload(body, res);
      return;
    }

    try {
      const apiKeyHeader = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const apiKey = process.env.OPENAI_API_KEY || process.env.API_KEY || process.env.MODELGATE_API_KEY || apiKeyHeader;
      if (!apiKey) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Missing API Key' }));
        return;
      }

      const map = {
        '/v1/chat/completions': 'https://api.openai.com/v1/chat/completions',
        '/v1/responses': 'https://api.openai.com/v1/responses',
        '/api/v1/images/generations': 'https://mg.aid.pub/api/v1/images/generations'
      };
      const target = map[url.pathname];
      if (!target) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Not Found' }));
        return;
      }

      const r = await fetch(target, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body
      });
      const text = await r.text();
      console.log(`[proxy] -> ${r.status} (${text.length} bytes)`);
      res.statusCode = r.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(text);
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: String(e) }));
    }
  });
});

server.listen(PORT);
