import { FileAttachment, ModelConfig } from "../types";
import { uploadMultipleToQiniu } from "./qiniuService";

export const generateContent = async (
  prompt: string,
  files: FileAttachment[],
  config: ModelConfig,
  seedUrls?: string[]
): Promise<{ text?: string; imageBase64s?: string[]; imageUrls?: string[]; rawResponse?: string; requestPayload?: string; endpoint?: string }> => {
  const apiKey = config.apiKey || (typeof import.meta !== 'undefined' ? (import.meta as any)?.env?.VITE_API_KEY : undefined) || (process as any)?.env?.VITE_API_KEY || (process as any)?.env?.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please configure it in the settings or environment.");
  }

  const messages: any[] = [];
  if (config.systemInstruction) {
    messages.push({ role: "system", content: config.systemInstruction });
  }

  const userContent: any[] = [];
  if (prompt) {
    userContent.push({ type: "text", text: prompt });
  }

  files.forEach((file) => {
    const isDataUrl = file.data.startsWith("data:");
    const base64Data = file.data.includes(",") ? file.data.split(",")[1] : file.data;
    const dataUrl = isDataUrl ? file.data : `data:${file.mimeType};base64,${base64Data}`;
    userContent.push({ type: "image_url", image_url: { url: dataUrl } });
  });

  if (userContent.length === 0) {
    throw new Error("Input is empty. Please provide text or an image.");
  }

  messages.push({ role: "user", content: userContent });

  const baseUrl = (config.baseUrl?.trim() || "https://mg.aid.pub/api/v1").replace(/\/+$/, "");

  if ((/mg\.aid\.pub/.test(baseUrl) || /localhost:13148/.test(baseUrl) || /\/api\/v1$/.test(baseUrl)) && (files.length > 0 || (seedUrls && seedUrls.length > 0) || (/^google\//i.test(config.modelName || '') || /^volcengine\//i.test(config.modelName || '')))) {
    const imagesBase = /\/api\/v1$/.test(baseUrl)
      ? baseUrl
      : /\/v1$/.test(baseUrl)
        ? baseUrl.replace(/\/v1$/, '/api/v1')
        : `${baseUrl}/api/v1`;
    const endpoint = `${imagesBase}/images/generations`;
    let endpointUsed = endpoint;
    const modelLower = (config.modelName || '').toLowerCase();
    const isGoogle = modelLower.startsWith('google/');
    const isDoubao = modelLower.startsWith('volcengine/');
    let sizeCandidates = isDoubao ? ['2560x1440','1920x1080','3840x2160','1024x1024','960x960','896x896','832x832','768x768'] : (isGoogle ? ['1024x1024','768x768','512x512'] : ['1024x1024','768x768','512x512']);
    let sizeIndex = 0;
    const initialSize = (config.size && typeof config.size === 'string' && /\b\d{3,4}x\d{3,4}\b/i.test(config.size.trim())) ? config.size.trim().toLowerCase() : sizeCandidates[sizeIndex];
    const payload: any = {
      model: config.modelName,
      prompt,
      size: initialSize,
      output_type: "base64",
      number_results: (typeof config.numberResults === 'number' && config.numberResults > 0 ? config.numberResults : 1),
    };
    if (isGoogle) {
      payload.output_format = 'png';
      // 先收集已有的 seed URLs
      console.log('[Google] 传入的 seedUrls:', seedUrls);
      const existingUrls = (seedUrls || []).filter(u => typeof u === 'string' && /^https?:\/\//i.test(u));
      console.log('[Google] 过滤后的 existingUrls:', existingUrls);
      
      // 如果有本地图片且配置了七牛云，先上传到图床
      let uploadedUrls: string[] = [];
      console.log('[Google] files.length:', files.length);
      console.log('[Google] 七牛云配置:', {
        hasAK: !!config.qiniuAccessKey,
        hasSK: !!config.qiniuSecretKey,
        hasBucket: !!config.qiniuBucket,
        hasDomain: !!config.qiniuDomain,
      });
      if (files.length > 0 && config.qiniuAccessKey && config.qiniuSecretKey && config.qiniuBucket && config.qiniuDomain) {
        console.log('[Google] 开始上传图片到七牛云...');
        const imageDataUrls = files.map(file => {
          const isDataUrl = file.data.startsWith("data:");
          const base64Data = file.data.includes(",") ? file.data.split(",")[1] : file.data;
          return isDataUrl ? file.data : `data:${file.mimeType};base64,${base64Data}`;
        });
        try {
          uploadedUrls = await uploadMultipleToQiniu(imageDataUrls, {
            accessKey: config.qiniuAccessKey,
            secretKey: config.qiniuSecretKey,
            bucket: config.qiniuBucket,
            domain: config.qiniuDomain,
            region: config.qiniuRegion,
          });
          console.log('[Google] 上传成功，URLs:', uploadedUrls);
        } catch (e) {
          console.error('[Google] 上传失败:', e);
        }
      } else {
        console.log('[Google] 跳过七牛云上传 - 缺少文件或配置');
      }
      
      // 合并所有 URLs
      const allUrls = [...uploadedUrls, ...existingUrls];
      console.log('[Google] 合并后的 allUrls:', allUrls);
      if (allUrls.length > 0) {
        // ModelGate 使用 seed_images 参数（不是 seed_image_urls）
        payload.seed_images = allUrls;
        console.log('[Google] 已添加 seed_images 到 payload');
      }
    }
    if (isDoubao) {
      payload.output_format = 'png';
    }
    // 按 ModelGate 要求，Doubao 参数顺序：output_type, number_results, model, prompt, size, output_format
    if (isDoubao) {
      const ordered: any = {
        output_type: payload.output_type,
        number_results: payload.number_results,
        model: payload.model,
        prompt: payload.prompt,
        size: payload.size,
        output_format: payload.output_format,
      };
      Object.assign(payload, ordered);
    }
    if (isDoubao) {
      const seedDataUrls = await Promise.all(files.map(async (file) => {
        const isDataUrl = file.data.startsWith("data:");
        const base64Data = file.data.includes(",") ? file.data.split(",")[1] : file.data;
        const origDataUrl = isDataUrl ? file.data : `data:${String(file.mimeType).toLowerCase()};base64,${base64Data}`;
        return await new Promise<string>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const maxDim = 1024;
            const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
            const w = Math.round(img.width * ratio);
            const h = Math.round(img.height * ratio);
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              // 返回 data URL 格式
              resolve(origDataUrl);
              return;
            }
            ctx.drawImage(img, 0, 0, w, h);
            // 返回 data URL 格式（带前缀）
            const out = canvas.toDataURL('image/jpeg', 0.75);
            resolve(out);
          };
          img.onerror = () => {
            resolve(origDataUrl);
          };
          img.src = origDataUrl;
        });
      }));
      const urlsFromSeeds = (seedUrls || []).filter(u => typeof u === 'string' && /^https?:\/\//i.test(u));
      // 使用 seed_images 参数（ModelGate API 要求，data URL 格式）
      const seedImagesParam: string[] = [...seedDataUrls, ...urlsFromSeeds];
      if (seedImagesParam.length > 0) {
        payload.seed_images = seedImagesParam;
      }
    }
    let lastJson: any = null;
    // 支持 Doubao 模型变体切换：volcengine/doubao-seedream-4-0-250828
    const doubaoVariants = isDoubao ? ['volcengine/doubao-seedream-4-0','volcengine/doubao-seedream-4-0-250828'] : [config.modelName];
    let modelVariantIndex = 0;
    for (let attempt = 0; attempt < sizeCandidates.length + 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60000);
      let res: Response;
      // 尝试当前模型变体
      payload.model = doubaoVariants[modelVariantIndex];
      try {
        endpointUsed = endpoint;
        res = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch (err: any) {
        clearTimeout(timer);
        // network fallback: use dev proxy relative path
        try {
          endpointUsed = '/api/v1/images/generations';
          let res2 = await fetch('/api/v1/images/generations', {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });
          if (!res2.ok) {
            const t2 = await res2.text();
            if (res2.status === 405) {
              endpointUsed = '/v1/images/generations';
              const res3 = await fetch('/v1/images/generations', {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
              });
              if (!res3.ok) {
                const t3 = await res3.text();
                throw new Error(`ModelGate API Error: ${res3.status} ${t3}`);
              }
              const json3 = await res3.json();
              const arr3 = Array.isArray(json3?.data) ? json3.data : [];
              const b64s3 = arr3.map((item: any) => item?.b64_json).filter(Boolean);
              const urls3 = arr3.map((item: any) => item?.url).filter((u: any) => typeof u === 'string');
              const contentUrls3 = arr3
                .map((item: any) => (typeof item?.content === 'string' && item.content.startsWith('data:')) ? item.content : null)
                .filter(Boolean) as string[];
              const allUrls3 = [...urls3, ...contentUrls3];
              if (b64s3.length === 0 && allUrls3.length === 0) {
                return { text: "No image returned.", rawResponse: JSON.stringify(json3), requestPayload: JSON.stringify(payload), endpoint: endpointUsed };
              }
              return { imageBase64s: b64s3.length ? b64s3 : undefined, imageUrls: allUrls3.length ? allUrls3 : undefined, rawResponse: JSON.stringify(json3), requestPayload: JSON.stringify(payload), endpoint: endpointUsed };
            }
            throw new Error(`ModelGate API Error: ${res2.status} ${t2}`);
          }
          const json2 = await res2.json();
          if (json2?.status === 'error') {
            const emsg2 = String(json2?.message?.error?.message || json2?.error?.message || '').toLowerCase();
            const listA = Array.from(new Set((emsg2.match(/\b\d{3,4}x\d{3,4}\b/gi) || []).map((s: string) => s.toLowerCase())));
            const kA = Array.from(new Set((emsg2.match(/\b[124]k\b/gi) || []).map((s: string) => s.toLowerCase())));
            let nextList = listA;
            if (nextList.length === 0 && kA.length > 0) {
              nextList = kA.map((k: string) => k === '1k' ? '1024x1024' : (k === '2k' ? '2048x2048' : (k === '4k' ? '4096x4096' : ''))).filter(Boolean) as string[];
            }
            if ((emsg2.includes('invalid size') || emsg2.includes('supported resolutions')) && nextList.length === 0 && isDoubao) {
              nextList = ['1024x1024','960x960','896x896','832x832','768x768'];
            }
            if ((emsg2.includes('invalid size') || emsg2.includes('supported resolutions')) && nextList.length > 0) {
              sizeCandidates = nextList;
              sizeIndex = 0;
              payload.size = sizeCandidates[sizeIndex];
              continue;
            }
            await new Promise(r => setTimeout(r, 1200));
            continue;
          }
          const arr2 = Array.isArray(json2?.data) ? json2.data : [];
          const b64s2 = arr2.map((item: any) => item?.b64_json).filter(Boolean);
          const urls2 = arr2.map((item: any) => item?.url).filter((u: any) => typeof u === 'string');
          const contentUrls2 = arr2
            .map((item: any) => (typeof item?.content === 'string' && item.content.startsWith('data:')) ? item.content : null)
            .filter(Boolean) as string[];
          const allUrls2 = [...urls2, ...contentUrls2];
          if (b64s2.length === 0 && allUrls2.length === 0) {
            return { text: "No image returned.", rawResponse: JSON.stringify(json2), requestPayload: JSON.stringify(payload), endpoint: endpointUsed };
          }
          return { imageBase64s: b64s2.length ? b64s2 : undefined, imageUrls: allUrls2.length ? allUrls2 : undefined, rawResponse: JSON.stringify(json2), requestPayload: JSON.stringify(payload), endpoint: endpointUsed };
        } catch (err2: any) {
          throw new Error(`Network error: ${String(err)}`);
        }
      }
      clearTimeout(timer);
      if (!res.ok) {
        const errText = await res.text();
        const lower = errText.toLowerCase();
        const isInvalidSize = lower.includes('invalid size') || lower.includes('supported resolutions');
        if (isInvalidSize && sizeIndex < sizeCandidates.length - 1) {
          sizeIndex++;
          payload.size = sizeCandidates[sizeIndex];
          continue;
        }
        if (res.status === 405 && attempt < 1) {
          let fallback = `/api/v1/images/generations`;
          endpointUsed = fallback;
          let res2 = await fetch(fallback, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });
          if (!res2.ok) {
            const t2 = await res2.text();
            if (res2.status === 405) {
              fallback = `/v1/images/generations`;
              endpointUsed = fallback;
              const res3 = await fetch(fallback, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
              });
              if (!res3.ok) {
                const t3 = await res3.text();
                throw new Error(`ModelGate API Error: ${res3.status} ${t3}`);
              }
              const json3 = await res3.json();
              const arr3 = Array.isArray(json3?.data) ? json3.data : [];
              const b64s3 = arr3.map((item: any) => item?.b64_json).filter(Boolean);
              const urls3 = arr3.map((item: any) => item?.url).filter((u: any) => typeof u === 'string');
              const contentUrls3 = arr3
                .map((item: any) => (typeof item?.content === 'string' && item.content.startsWith('data:')) ? item.content : null)
                .filter(Boolean) as string[];
              const allUrls3 = [...urls3, ...contentUrls3];
              if (b64s3.length === 0 && allUrls3.length === 0) {
                return { text: "No image returned.", rawResponse: JSON.stringify(json3), requestPayload: JSON.stringify(payload), endpoint: endpointUsed };
              }
              return { imageBase64s: b64s3.length ? b64s3 : undefined, imageUrls: allUrls3.length ? allUrls3 : undefined, rawResponse: JSON.stringify(json3), requestPayload: JSON.stringify(payload), endpoint: endpointUsed };
            }
            throw new Error(`ModelGate API Error: ${res2.status} ${t2}`);
          }
          const json2 = await res2.json();
          if (json2?.status === 'error') {
            const emsg2 = String(json2?.message?.error?.message || json2?.error?.message || '').toLowerCase();
            const listB = Array.from(new Set((emsg2.match(/\b\d{3,4}x\d{3,4}\b/gi) || []).map((s: string) => s.toLowerCase())));
            const kB = Array.from(new Set((emsg2.match(/\b[124]k\b/gi) || []).map((s: string) => s.toLowerCase())));
            let nextList2 = listB;
            if (nextList2.length === 0 && kB.length > 0) {
              nextList2 = kB.map((k: string) => k === '1k' ? '1024x1024' : (k === '2k' ? '2048x2048' : (k === '4k' ? '4096x4096' : ''))).filter(Boolean) as string[];
            }
            if ((emsg2.includes('invalid size') || emsg2.includes('supported resolutions')) && nextList2.length === 0 && isDoubao) {
              nextList2 = ['1024x1024','960x960','896x896','832x832','768x768'];
            }
            if ((emsg2.includes('invalid size') || emsg2.includes('supported resolutions')) && nextList2.length > 0) {
              sizeCandidates = nextList2;
              sizeIndex = 0;
              payload.size = sizeCandidates[sizeIndex];
              continue;
            }
            await new Promise(r => setTimeout(r, 1200));
            continue;
          }
          const arr2 = Array.isArray(json2?.data) ? json2.data : [];
          const b64s2 = arr2.map((item: any) => item?.b64_json).filter(Boolean);
          const urls2 = arr2.map((item: any) => item?.url).filter((u: any) => typeof u === 'string');
          const contentUrls2 = arr2
            .map((item: any) => (typeof item?.content === 'string' && item.content.startsWith('data:')) ? item.content : null)
            .filter(Boolean) as string[];
          const allUrls2 = [...urls2, ...contentUrls2];
          if (b64s2.length === 0 && allUrls2.length === 0) {
            return { text: "No image returned.", rawResponse: JSON.stringify(json2), requestPayload: JSON.stringify(payload), endpoint: endpointUsed };
          }
          return { imageBase64s: b64s2.length ? b64s2 : undefined, imageUrls: allUrls2.length ? allUrls2 : undefined, rawResponse: JSON.stringify(json2), requestPayload: JSON.stringify(payload), endpoint: endpointUsed };
        }
        if (res.status === 508 && attempt < sizeCandidates.length + 1) { await new Promise(r => setTimeout(r, 1200)); continue; }
        throw new Error(`ModelGate API Error: ${res.status} ${errText}`);
      }
      const json = await res.json();
      lastJson = json;
      if (json?.status === 'error') {
        const emsg = String(json?.message?.error?.message || json?.error?.message || '').toLowerCase();
        if ((emsg.includes('invalid size') || emsg.includes('supported resolutions')) && sizeIndex < sizeCandidates.length - 1) {
          sizeIndex++;
          payload.size = sizeCandidates[sizeIndex];
          continue;
        }
        if ((json?.code === 508 || json?.is_retry) && attempt < sizeCandidates.length + 1) { await new Promise(r => setTimeout(r, 1200)); continue; }
      }
      const arr = Array.isArray(json?.data) ? json.data : [];
      const b64s = arr.map((item: any) => item?.b64_json).filter(Boolean);
      const urls = arr.map((item: any) => item?.url).filter((u: any) => typeof u === 'string');
      const contentUrls = arr
        .map((item: any) => (typeof item?.content === 'string' && item.content.startsWith('data:')) ? item.content : null)
        .filter(Boolean) as string[];
      const allUrls = [...urls, ...contentUrls];
      if (b64s.length === 0 && allUrls.length === 0) {
        return { text: "No image returned.", rawResponse: JSON.stringify(json), requestPayload: JSON.stringify(payload), endpoint: endpointUsed };
      }
      return { imageBase64s: b64s.length ? b64s : undefined, imageUrls: allUrls.length ? allUrls : undefined, rawResponse: JSON.stringify(json), requestPayload: JSON.stringify(payload), endpoint: endpointUsed };
    }
    return { text: "No image returned.", rawResponse: JSON.stringify(lastJson), requestPayload: JSON.stringify(payload), endpoint: endpointUsed };
  }

  else if (/mg\.aid\.pub/.test(baseUrl) || /localhost:13148/.test(baseUrl) || /\/api\/v1$/.test(baseUrl) || /\/v1$/.test(baseUrl)) {
    const textBase = baseUrl.replace(/\/_?api\/v1$/, '/v1');
    const endpoint = `${textBase}/chat/completions`;
    const input = config.systemInstruction && prompt
      ? [{ role: 'system', content: config.systemInstruction }, { role: 'user', content: prompt }]
      : (prompt || '');
    const payload: any = {
      model: config.modelName,
      input,
      temperature: config.temperature,
    };
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      // network fallback via dev proxy
      const res2 = await fetch('/v1/chat/completions', {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res2.ok) {
        const t2 = await res2.text();
        throw new Error(`ModelGate API Error: ${res2.status} ${t2}`);
      }
      const json2 = await res2.json();
      const text2 = json2?.output?.[0]?.content?.[0]?.text ?? json2?.choices?.[0]?.message?.content;
      if (!text2) {
        return { text: "No text content returned.", rawResponse: JSON.stringify(json2) };
      }
      return { text: text2, rawResponse: JSON.stringify(json2) };
    }
    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 405) {
        const res2 = await fetch('/v1/chat/completions', {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (!res2.ok) {
          const t2 = await res2.text();
          throw new Error(`ModelGate API Error: ${res2.status} ${t2}`);
        }
        const json2 = await res2.json();
        const text2 = json2?.output?.[0]?.content?.[0]?.text ?? json2?.choices?.[0]?.message?.content;
        if (!text2) {
          return { text: "No text content returned.", rawResponse: JSON.stringify(json2) };
        }
        return { text: text2, rawResponse: JSON.stringify(json2) };
      }
      throw new Error(`ModelGate API Error: ${res.status} ${errText}`);
    }
    const json = await res.json();
    const text = json?.output?.[0]?.content?.[0]?.text ?? json?.choices?.[0]?.message?.content;
    if (!text) {
      return { text: "No text content returned.", rawResponse: JSON.stringify(json) };
    }
    return { text, rawResponse: JSON.stringify(json) };
  }

  const body = {
    model: config.modelName,
    messages,
    temperature: config.temperature,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API Error: ${res.status} ${errText}`);
  }

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text) {
    return { text: "No text content returned from model.", rawResponse: JSON.stringify(json) };
  }
  return { text, rawResponse: JSON.stringify(json) };
};
