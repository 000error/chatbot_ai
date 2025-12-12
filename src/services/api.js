export const sendMessageToApi = async ({ messages, config, model }) => {
  if (!config.apiKey) {
    throw new Error('请先配置 API Key');
  }

  const buildContext = () => {
    if (!config.useFileContext || !Array.isArray(config.loadedFiles) || config.loadedFiles.length === 0) return null;
    const maxLen = 15000;
    let text = '';
    for (const f of config.loadedFiles) {
      const name = f.name || 'file';
      const sizeKB = f.size ? Math.round(f.size / 1024) + 'KB' : '';
      const content = String(f.content || '').slice(0, maxLen);
      text += `--- ${name} ${sizeKB} ---\n${content}\n\n`;
      if (text.length > maxLen) break;
    }
    return `以下为用户加载的文件内容，作为对话上下文：\n\n${text}`.slice(0, maxLen);
  };

  const systemContext = buildContext();
  const finalMessages = systemContext
    ? [{ role: 'system', content: systemContext }, ...messages]
    : messages;

  if (String(model?.id).toLowerCase() === 'google/nano-banana-pro') {
    const prompt = String(messages?.[messages.length - 1]?.content || '').trim();
    const origin = (() => {
      try { return new URL(config.baseUrl).origin; } catch { return 'https://mg.aid.pub'; }
    })();

    const endpoints = [
      `${origin}/api/v1/images/generations`,
      `${origin}/v1/images/generations`,
    ];

    const tryGenerate = async (endpoint, payload) => {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(payload)
      });
      return resp;
    };

    let imgResp;
    const basePayload = {
      model: 'google/nano-banana-pro',
      prompt,
      size: '1024x1024',
      output_type: 'base64',
      output_format: 'png'
    };
    for (const ep of endpoints) {
      imgResp = await tryGenerate(ep, basePayload);
      if (imgResp.ok) break;
    }

    if (!imgResp?.ok) {
      const errorData = await imgResp.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API 请求失败: ${imgResp?.status}`);
    }

    const result = await imgResp.json();
    const extract = () => {
      const urls = [];
      const b64s = [];
      if (Array.isArray(result?.data)) {
        for (const it of result.data) {
          if (it?.b64_json) b64s.push(it.b64_json);
          if (it?.base64) b64s.push(it.base64);
          if (it?.url) urls.push(it.url);
          if (it?.image_url) urls.push(it.image_url);
        }
      }
      if (Array.isArray(result?.images)) {
        for (const im of result.images) {
          if (im?.base64) b64s.push(im.base64);
          if (im?.url) urls.push(im.url);
        }
      }
      if (result?.base64) b64s.push(result.base64);
      if (result?.url) urls.push(result.url);
      if (result?.image_base64) b64s.push(result.image_base64);
      if (result?.image_url) urls.push(result.image_url);
      return { b64: b64s[0], url: urls[0] };
    };

    const { b64, url } = extract();
    if (b64) {
      const dataUrl = `data:image/png;base64,${b64}`;
      return [{ type: 'image', url: dataUrl }];
    }
    if (url) {
      return [{ type: 'image', url }];
    }

    const altPayloads = [
      { ...basePayload, output_type: 'url' },
      { ...basePayload, size: '768x768', output_type: 'base64' },
      { ...basePayload, size: '512x512', output_type: 'base64' },
    ];
    for (const payload of altPayloads) {
      for (const ep of endpoints) {
        const altResp = await tryGenerate(ep, payload);
        if (!altResp.ok) continue;
        const altResult = await altResp.json().catch(() => ({}));
        const aUrls = [];
        const aB64s = [];
        if (Array.isArray(altResult?.data)) {
          for (const it of altResult.data) {
            if (it?.b64_json) aB64s.push(it.b64_json);
            if (it?.base64) aB64s.push(it.base64);
            if (it?.url) aUrls.push(it.url);
            if (it?.image_url) aUrls.push(it.image_url);
          }
        }
        if (Array.isArray(altResult?.images)) {
          for (const im of altResult.images) {
            if (im?.base64) aB64s.push(im.base64);
            if (im?.url) aUrls.push(im.url);
          }
        }
        if (altResult?.base64) aB64s.push(altResult.base64);
        if (altResult?.url) aUrls.push(altResult.url);
        if (altResult?.image_base64) aB64s.push(altResult.image_base64);
        if (altResult?.image_url) aUrls.push(altResult.image_url);
        const aB64 = aB64s[0];
        const aUrl = aUrls[0];
        if (aB64) return [{ type: 'image', url: `data:image/png;base64,${aB64}` }];
        if (aUrl) return [{ type: 'image', url: aUrl }];
      }
    }

    const serialized = JSON.stringify(result);
    return `图片生成失败或响应为空\n${serialized}`;
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: model.id,
      messages: finalMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: 0.7,
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`);
  }

  const data = await response.json();
  const msg = data?.choices?.[0]?.message || {};
  const content = msg?.content;

  const normalizePart = (part) => {
    if (typeof part === 'string') return { type: 'text', text: part };
    if (part?.type === 'text' && typeof part?.text === 'string') {
      return { type: 'text', text: part.text };
    }
    if (part?.type === 'image_url' && part?.image_url?.url) {
      return { type: 'image', url: part.image_url.url };
    }
    if (part?.type === 'image' && part?.url) {
      return { type: 'image', url: part.url };
    }
    return { type: 'text', text: JSON.stringify(part) };
  };

  if (Array.isArray(content)) {
    return content.map(normalizePart);
  }

  if (typeof content === 'string') {
    return content;
  }

  return JSON.stringify(content ?? '');
};
