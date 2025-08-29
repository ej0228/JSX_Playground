// promptsDetailApi.js
// 코드 수정후

// [추가] langfuse.api 객체에 어떤 함수가 있는지 확인하기 위한 코드
//console.log("사용 가능한 Langfuse API 함수 목록:", langfuse.api);

// src/Pages/Prompts/PromptsDetailApi.js

import { langfuse } from 'lib/langfuse';

/**
 * 특정 프롬프트의 모든 버전 상세 정보를 가져옵니다.
 * @param {string} promptName - 조회할 프롬프트의 이름
 * @returns {Promise<Array<Object>>} UI에 표시될 버전 정보 배열
 */
export const fetchPromptVersions = async (promptName) => {
  // [수정] 1단계: promptsList를 호출하여 프롬프트의 기본 정보와 '버전 번호 목록'을 가져옵니다.
  const listResponse = await langfuse.api.promptsList({ name: promptName });

  // API 응답이 없거나 데이터가 없으면 빈 배열을 반환합니다.
  if (!listResponse.data || listResponse.data.length === 0) {
    return [];
  }

  const promptInfo = listResponse.data[0];
  const versionNumbers = promptInfo.versions || [];

  // [수정] 2단계: 각 버전 번호에 대해 promptsGet API를 호출하여 상세 정보를 가져옵니다.
  // Promise.all을 사용하여 모든 버전 정보를 병렬로 동시에 요청합니다.
  const versionDetailsPromises = versionNumbers.map(versionNumber =>
    langfuse.api.promptsGet({ promptName, version: versionNumber })
  );

  const versionsResponse = await Promise.all(versionDetailsPromises);

  const isChatPrompt = (prompt) => Array.isArray(prompt);

  // 이제 각 버전의 상세 정보(v)를 가지고 UI에 맞게 데이터를 가공합니다.
  return versionsResponse.map((v) => {
    const pythonCode = `from langfuse import Langfuse

    # Initialize langfuse client
    langfuse = Langfuse()

    # Get production prompt
    prompt = langfuse.get_prompt("${v.name}")

    # Get by Label
    # You can use as many labels as you'd like to identify different deployment targets
    prompt = langfuse.get_prompt("${v.name}", label="latest")

    # Get by version number, usually not recommended as it requires code changes to deploy new prompt versions
    langfuse.get_prompt("${v.name}", version=${v.version})`;
    const jsTsCode = `import { Langfuse } from "langfuse";

    // Initialize the langfuse client
    const langfuse = new Langfuse();

    // Get production prompt
    const prompt = await langfuse.getPrompt("${v.name}");

    // Get by Label
    # You can use as many labels as you'd like to identify different deployment targets
    const prompt = await langfuse.getPrompt("${v.name}", { label: "latest" });

    # Get by version number, usually not recommended as it requires code changes to deploy new prompt versions
    langfuse.getPrompt("${v.name}", { version: ${v.version} });`;

    return {
      id: v.version,
      label: v.commitMessage || `Version ${v.version}`,
      labels: v.labels,
      details: v.updatedAt ? new Date(v.updatedAt).toLocaleString() : 'N/A',
      author: v.createdBy,
      prompt: {
        user: isChatPrompt(v.prompt) ? v.prompt.find(p => p.role === 'user')?.content ?? '' : v.prompt,
        system: isChatPrompt(v.prompt) ? v.prompt.find(p => p.role === 'system')?.content : undefined,
      },
      config: v.config,
      useprompts: { python: pythonCode, jsTs: jsTsCode },
      tags: v.tags,
      commitMessage: v.commitMessage,
    };
  }).sort((a, b) => b.id - a.id);
};


// ... (createNewPromptVersion, duplicatePrompt 함수는 그대로 둡니다)


/**
 * 기존 프롬프트를 기반으로 새 버전을 생성합니다.
 * @param {string} name - 프롬프트 이름
 * @param {object} versionData - 새 버전에 대한 데이터
 * @returns {Promise<Object>} 생성된 프롬프트 정보
 */
export const createNewPromptVersion = async (
  name,
  versionData
) => {
  const { prompt, config, commitMessage: versionCommitMessage } = versionData;
  const isChat = !!prompt.system;
  const commitMessage = versionCommitMessage ? `${versionCommitMessage} (copy)` : `Forked from v${versionData.id}`;

  const commonPayload = {
    name: name,
    config: config,
    labels: [],
    commitMessage: commitMessage,
  };

  if (isChat) {
    const chatPromptPayload = [
      { type: 'chatmessage', role: 'system', content: prompt.system },
      { type: 'chatmessage', role: 'user', content: prompt.user },
    ];
    const response = await langfuse.api.promptsCreate({ ...commonPayload, type: 'chat', prompt: chatPromptPayload });
    return response;
  } else {
    const response = await langfuse.api.promptsCreate({ ...commonPayload, type: 'text', prompt: prompt.user });
    return response;
  }
};
