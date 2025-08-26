import { useEffect, useMemo, useRef, useState } from "react";
import {
  Info,
  Play,
  RotateCcw,
  Plus,
  Copy,
  Save,
  Wrench,
  BookText,
  Variable,
  Search,
  Minus,
  Edit,
  X,
  Settings,
} from "lucide-react";
import styles from "./Playground.module.css";
import ChatBox from "../../components/ChatBox/ChatBox";
import NewLlmConnectionModal from "./NewLlmConnectionModal";
import PlaygroundPanel from "./PlaygroundPanel";
import NewItemModal from "./NewItemModal";
import SavePromptPopover from "./SavePromptPopover";


// ---------- Tools Panel ----------
const ToolsPanelContent = ({
  attachedTools,
  availableTools,
  onAddTool,
  onRemoveTool,
  onCreateTool,
}) => (
  <>
    {attachedTools.map((tool) => (
      <div className={styles.toolSection} key={tool.id}>
        <div className={styles.toolItem}>
          <div className={styles.toolInfo}>
            <Wrench size={14} />
            <div className={styles.toolText}>
              <span className={styles.toolName}>{tool.name}</span>
              <span className={styles.toolDesc}>{tool.description}</span>
            </div>
          </div>
          <div className={styles.iconCircle} onClick={() => onRemoveTool(tool.id)}>
            <Minus size={14} />
          </div>
        </div>
      </div>
    ))}

    <div className={styles.toolSearch}>
      <Search size={14} />
      <input type="text" placeholder="Search tools..." />
    </div>

    <div className={styles.toolList}>
      {availableTools.map((tool) => (
        <div
          className={styles.toolItem}
          key={tool.id}
          onDoubleClick={() => onAddTool(tool)}
        >
          <div className={styles.toolInfo}>
            <Wrench size={14} />
            <div className={styles.toolText}>
              <span className={styles.toolName}>{tool.name}</span>
              <span className={styles.toolDesc}>{tool.description}</span>
            </div>
          </div>
          <button className={styles.editButton}>
            <Edit size={14} />
          </button>
        </div>
      ))}
    </div>

    <button className={styles.toolButton} onClick={onCreateTool}>
      <Plus size={14} /> Create new tool
    </button>
  </>
);

// ---------- Schema Panel ----------
const SchemaPanelContent = ({
  userSchema,
  onAddSchema,
  onRemoveSchema,
  availableSchemas,
  onCreateSchema,
}) => (
  <>
    {userSchema && (
      <div className={styles.toolSection}>
        <div className={styles.toolItem}>
          <div className={styles.toolInfo}>
            <BookText size={14} />
            <div className={styles.toolText}>
              <span className={styles.toolName}>{userSchema.name}</span>
              <span className={styles.toolDesc}>{userSchema.description}</span>
            </div>
          </div>
          <div className={styles.iconCircle} onClick={() => onRemoveSchema(userSchema.id)}>
            <Minus size={14} />
          </div>
        </div>
      </div>
    )}

    <div className={styles.toolSearch}>
      <Search size={14} />
      <input type="text" placeholder="Search schemas..." />
    </div>

    <div className={styles.toolList}>
      {availableSchemas.map((schema) => (
        <div
          className={styles.toolItem}
          key={schema.id}
          onDoubleClick={() => onAddSchema(schema)}
        >
          <div className={styles.toolInfo}>
            <div className={styles.toolText}>
              <span className={styles.toolName}>{schema.name}</span>
              <span className={styles.toolDesc}>{schema.description}</span>
            </div>
          </div>
          <button className={styles.editButton}>
            <Edit size={14} />
          </button>
        </div>
      ))}
    </div>

    <button className={styles.toolButton} onClick={onCreateSchema}>
      <Plus size={14} /> Create new schema
    </button>
  </>
);

/** 스트리밍 설정 팝오버: 외부 클릭/ESC 닫기 지원 */
function StreamSettingsPopover({ open, streaming, onChangeStreaming, onClose }) {
  const popRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    const onClick = (e) => {
      if (!popRef.current) return;
      if (!popRef.current.contains(e.target)) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      ref={popRef}
      className={styles.streamPopover}
      role="dialog"
      aria-modal="true"
      aria-label="Streaming settings"
    >
      <div className={styles.streamPopoverHeader}>Stream responses</div>
      <div className={styles.streamPopoverSub}>Real-time response streaming</div>

      <label className={styles.switchRow}>
        <span>Enable</span>
        <label className={styles.switch}>
          <input
            type="checkbox"
            checked={streaming}
            onChange={(e) => onChangeStreaming(e.target.checked)}
          />
          <span className={styles.slider} />
        </label>
      </label>
    </div>
  );
}

// ---------- 단일 패널 ----------


const PlaygroundComponent = ({ onCopy, onRemove, showRemoveButton }) => {
  const [messages, setMessages] = useState([]);
  const [isLlmModalOpen, setIsLlmModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null); // 'tool' | 'schema' | null
  const [activePanel, setActivePanel] = useState(null); // 'tools' | 'schema' | null
  const [isSavePopoverOpen, setIsSavePopoverOpen] = useState(false);
  const [isStreamSettingsOpen, setIsStreamSettingsOpen] = useState(false);

  const [attachedTools, setAttachedTools] = useState([]);
  const [availableTools] = useState([
    { id: "tool-1", name: "tool", description: "ddd" },
    { id: "tool-2", name: "search_web", description: "Search the web for information." },
  ]);

  const [attachedUserSchema, setAttachedUserSchema] = useState(null);
  const [availableSchemas] = useState([{ id: "schema-1", name: "waetae", description: "weddfwe" }]);

  const togglePanel = (panelName) => {
    setActivePanel(activePanel === panelName ? null : panelName);
  };
  const handleAddTool = (toolToAdd) => {
    if (!attachedTools.some((t) => t.id === toolToAdd.id)) {
      setAttachedTools((prev) => [...prev, toolToAdd]);
    }
  };
  const handleRemoveTool = (toolId) => {
    setAttachedTools((prev) => prev.filter((t) => t.id !== toolId));
  };
  const handleAddSchema = (schemaToAdd) => setAttachedUserSchema(schemaToAdd);
  const handleRemoveSchema = (schemaId) => {
    if (attachedUserSchema && attachedUserSchema.id === schemaId) setAttachedUserSchema(null);
  };

  // ===== 서버 호출/모델 선택/스트리밍 =====
  const API_URL = "/api/chatCompletion";
  const PROJECT_ID = "cmekxpet50001qe07qeelt05h"; //----> 이후 프로젝트 모델 연동되도록 수정 필요

  // LLM Connections 로딩 (tRPC 읽기)
  const [connections, setConnections] = useState([]); // [{provider, adapter, baseURL, customModels, withDefaultModels}, ...]
  const [loadingConn, setLoadingConn] = useState(false);
  const [connError, setConnError] = useState(null);

  const [selectedProvider, setSelectedProvider] = useState("");   // provider 문자열
  const [selectedAdapter, setSelectedAdapter] = useState("openai");
  const [selectedModel, setSelectedModel] = useState("");         // 정확한 모델명(예: "Qwen-xxx")

  const [streaming, setStreaming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [output, setOutput] = useState(null);
  const outputTextRef = useRef(""); // 스트리밍 누적 출력

  useEffect(() => {
    (async () => {
      try {
        setLoadingConn(true);
        setConnError(null);
        // tRPC query: llmApiKey.all GET + input=...
        const qs = encodeURIComponent(JSON.stringify({ json: { projectId: PROJECT_ID } }));
        const url = `/api/trpc/llmApiKey.all?input=${qs}`;
        const r = await fetch(url, { credentials: "include" });
        const j = await r.json().catch(() => ({}));
        const rows = j?.result?.data?.json?.data || [];
        setConnections(rows);

        // 기본 선택값: 첫 번째 커넥션
        if (rows.length > 0) {
          setSelectedProvider(rows[0].provider);
          setSelectedAdapter(rows[0].adapter || "openai");
          // 모델 후보: customModels, withDefaultModels면 UI에서 직접 입력 가능(간단화: 첫 항목)
          const firstModel =
            (rows[0].customModels && rows[0].customModels[0]) || (rows[0].withDefaultModels ? "gpt-4o-mini" : "");
          setSelectedModel(firstModel || "");
        }
      } catch (e) {
        setConnError("Failed to load LLM connections");
        console.error("[llm connections] load failed", e);
      } finally {
        setLoadingConn(false);
      }
    })();
  }, []);


  const currentConn = useMemo(
    () => connections.find((c) => c.provider === selectedProvider),
    [connections, selectedProvider]
  );
  const modelOptions = currentConn?.customModels || [];

  const hasContent = useMemo(
    () => messages.some((m) => (m.content || "").trim().length > 0),
    [messages]
  );
  const disabledReason = useMemo(() => {
    return loadingConn
      ? "Loading LLM connections…"
      : !selectedProvider
        ? "Select a provider"
        : !selectedModel
          ? "Select or type a model"
          : !hasContent
            ? "Add at least one message"
            : "";
  }, [loadingConn, selectedProvider, selectedModel, hasContent]);

  const canSubmit = hasContent && !!selectedProvider && !!selectedModel;

  function toServerBody(messages) {
    const toRole = (role) => (role || "user").toLowerCase();
    const toType = (role) => {
      const r = toRole(role);
      if (r === "assistant") return "assistant";
      if (r === "system") return "system";
      if (r === "developer") return "developer";
      return "user";
    };
    const chat = messages
      .filter((m) => m.kind !== "placeholder" && m.role !== "Placeholder")
      .map((m) => ({
        type: toType(m.role),
        role: toRole(m.role),
        content: (m.content || "").trim(),
      }));

    return {
      projectId: PROJECT_ID,
      messages: chat,
      modelParams: {
        provider: selectedProvider,
        adapter: selectedAdapter,
        model: selectedModel,
        temperature: 0.7,
      },
      streaming,
    };
  }

  // 논-스트리밍
  async function submitNonStreaming(body) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || "Chat failed");
    }
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await res.json() : { content: await res.text() };
    setOutput(data);
  }

  // 스트리밍(ReadableStream) — text/event-stream 또는 chunked json 둘 다 단순 텍스트로 붙임
  async function submitStreaming(body) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || "Chat failed");
    }

    outputTextRef.current = "";
    setOutput({ content: "" });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      // 서버 구현에 따라 line/chunk 형태가 다를 수 있으니 단순 텍스트로 누적
      outputTextRef.current += chunk;
      setOutput({ content: outputTextRef.current });
    }
  }

  async function handleSubmit() {
    if (!canSubmit) {
      alert("Select provider/model and add at least one message.");
      return;
    }
    const body = toServerBody(messages);
    try {
      setIsSubmitting(true);
      setOutput(null);
      if (streaming) {
        await submitStreaming(body);
      } else {
        await submitNonStreaming(body);
      }
    } catch (e) {
      console.error("Submit failed", e);
      alert(e.message || "실행 중 오류가 발생했습니다. 콘솔을 확인하세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.panelContainer}>
      {/* Model Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span>Model</span>
          <div className={styles.cardActions}>
            <button className={styles.iconActionBtn} onClick={onCopy} title="Duplicate panel">
              <Copy size={16} />
            </button>
            <button
              className={styles.iconActionBtn}
              onClick={() => setIsSavePopoverOpen((prev) => !prev)}
              title="Save prompt"
            >
              <Save size={16} />
            </button>
            <button
              className={styles.iconActionBtn}
              onClick={() => setIsLlmModalOpen(true)}
              title="LLM Connection"
            >
              <Settings size={16} />
            </button>
            {showRemoveButton && (
              <button className={styles.iconActionBtn} onClick={onRemove} title="Remove panel">
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className={styles.cardBody}>
          {loadingConn ? (
            <p className={styles.muted}>Loading LLM connections…</p>
          ) : connError ? (
            <p className={styles.errorText}>{connError}</p>

            // LLM 추가 구현 후 사용 가능
            // ) : connections.length === 0 ? (
            //   <>
            //     <p className={styles.noApiKeyText}>No LLM API key set in project.</p>
            //     <button className={styles.addLlmBtn} onClick={() => setIsLlmModalOpen(true)}>
            //       <Plus size={16} /> Add LLM Connection
            //     </button>
            //   </>
            // ) : (

            // LLM 모델 구현 전 테스트로 값 넣기
          ) : connections.length === 0 ? (
            <>
              <p className={styles.noApiKeyText}>No LLM API key set in project.</p>
              <button className={styles.addLlmBtn} onClick={() => setIsLlmModalOpen(true)}>
                <Plus size={16} /> Add LLM Connection
              </button>

              {/* === 수동 입력 모드: 연결이 없어도 테스트 가능 === */}
              <div className={styles.modelRow} style={{ marginTop: 12 }}>
                <div className={styles.selectGroup}>
                  <label>Provider (manual)</label>
                  <input
                    className={`${styles.textInput} ${!selectedProvider ? styles.inputError : ""}`}
                    placeholder='e.g., test (Provider name)'
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                  />
                </div>

                <div className={styles.selectGroup}>
                  <label>Adapter</label>
                  <select
                    className={styles.select}
                    value={selectedAdapter}
                    onChange={(e) => setSelectedAdapter(e.target.value)}
                  >
                    <option value="openai">openai</option>
                    {/* 필요하면 추가 */}
                  </select>
                </div>

                <div className={styles.selectGroup}>
                  <label>Model</label>
                  <input
                    className={`${styles.textInput} ${!selectedModel ? styles.inputError : ""}`}
                    placeholder='Exact model id (e.g., Qwen3-30B-A3B-Instruct-...)'
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                  />
                </div>
              </div>
            </>
          ) : (


            <div className={styles.modelRow}>
              <div className={styles.selectGroup}>
                <label>Provider</label>
                <select
                  className={styles.select}
                  value={selectedProvider}
                  onChange={(e) => {
                    const pv = e.target.value;
                    setSelectedProvider(pv);
                    const next = connections.find((c) => c.provider === pv);
                    setSelectedAdapter(next?.adapter || "openai");
                    const firstModel =
                      (next?.customModels && next.customModels[0]) ||
                      (next?.withDefaultModels ? "gpt-4o-mini" : "");
                    setSelectedModel(firstModel || "");
                  }}
                >
                  {connections.map((c) => (
                    <option key={c.id} value={c.provider}>
                      {c.provider} ({c.adapter})
                    </option>
                  ))}
                </select>
              </div>


              {/* Model 입력/선택 */}
              <div className={styles.selectGroup}>
                <label>Model</label>

                {modelOptions?.length > 0 ? (
                  // 1) customModels가 있는 경우: 셀렉트 박스
                  <select
                    className={`${styles.select} ${!selectedModel ? styles.inputError : ""}`}
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                  >
                    {modelOptions.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : currentConn?.withDefaultModels ? (
                  // 2) 기본 모델 사용 가능한 경우: 대표 옵션 제공
                  <select
                    className={`${styles.select} ${!selectedModel ? styles.inputError : ""}`}
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                  >
                    <option value="">-- select a model --</option>
                    <option value="gpt-4o-mini">gpt-4o-mini</option>
                    {/* 필요하면 다른 기본 모델을 추가 */}
                  </select>
                ) : (
                  // 3) 어떤 목록도 제공되지 않는 경우: 직접 타이핑 입력
                  <input
                    className={`${styles.textInput} ${!selectedModel ? styles.inputError : ""}`}
                    type="text"
                    placeholder="Type model id (e.g., Qwen-32B-Instruct)"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                  />
                )}
              </div>


            </div>
          )}
        </div>

        {isSavePopoverOpen && <SavePromptPopover onSaveAsNew={() => console.log("onSaveAsNew")} />}
      </div>

      {/* Controls */}
      <div className={styles.controlsBar}>
        <button className={styles.controlBtn} onClick={() => togglePanel("tools")}>
          <Wrench size={14} /> Tools <span className={styles.badge}>{attachedTools.length}</span>
        </button>
        <button className={styles.controlBtn} onClick={() => togglePanel("schema")}>
          <BookText size={14} /> Schema <span className={styles.badge}>{attachedUserSchema ? 1 : 0}</span>
        </button>
        <button className={styles.controlBtn}>
          <Variable size={14} /> Variables
        </button>
      </div>

      {activePanel === "tools" && (
        <PlaygroundPanel title="Tools" description="Configure tools for your model to use.">
          <ToolsPanelContent
            attachedTools={attachedTools}
            availableTools={availableTools}
            onAddTool={handleAddTool}
            onRemoveTool={handleRemoveTool}
            onCreateTool={() => setModalType("tool")}
          />
        </PlaygroundPanel>
      )}

      {activePanel === "schema" && (
        <PlaygroundPanel title="Structured Output" description="Configure JSON schema for structured output.">
          <SchemaPanelContent
            userSchema={attachedUserSchema}
            availableSchemas={availableSchemas}
            onAddSchema={handleAddSchema}
            onRemoveSchema={handleRemoveSchema}
            onCreateSchema={() => setModalType("schema")}
          />
        </PlaygroundPanel>
      )}

      {/* Messages */}
      <ChatBox messages={messages} setMessages={setMessages} />

      {/* Output */}
      <div className={styles.outputCard}>
        <div className={styles.cardHeader}>
          <span>Output</span>
        </div>
        <div className={styles.outputBody}>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
            {output ? (typeof output === "string" ? output : output.content ?? JSON.stringify(output, null, 2)) : ""}
          </pre>
        </div>
      </div>

      {/* Footer full-width Submit + Right controls */}
      <div className={styles.footerBar}>
        <button
          className={styles.submitBtnFull}
          onClick={handleSubmit}
          // ⬇️ 비활성화 + 이유 툴팁
          disabled={!!disabledReason || isSubmitting}
          title={disabledReason || ""} // ← 마우스를 올리면 이유가 뜸
        >

          {isSubmitting ? "Running..." : "Submit"}
        </button>

        <div className={styles.footerRight}>
          {/* 스트리밍 설정(팝오버 열기) */}
          <button
            className={styles.iconActionBtn}
            title="Streaming settings"
            aria-haspopup="dialog"
            aria-expanded={isStreamSettingsOpen}
            onClick={() => setIsStreamSettingsOpen((v) => !v)}
            type="button"
          >
            <Settings size={16} />
          </button>
        </div>

        {/* 팝오버 자체 (화면 우하단 고정) */}
        <StreamSettingsPopover
          open={isStreamSettingsOpen}
          streaming={streaming}
          onChangeStreaming={setStreaming}
          onClose={() => setIsStreamSettingsOpen(false)}
        />
      </div>

      {/* Modals */}
      <NewLlmConnectionModal isOpen={isLlmModalOpen} onClose={() => setIsLlmModalOpen(false)} />
      {modalType && <NewItemModal isOpen={!!modalType} type={modalType} onClose={() => setModalType(null)} />}
    </div>
  );
};

// ---------- 메인 ----------
export default function Playground() {
  const [panels, setPanels] = useState([Date.now()]);
  const addPanel = () => setPanels((prev) => [...prev, Date.now()]);
  const removePanel = (idToRemove) => {
    if (panels.length > 1) setPanels((prev) => prev.filter((id) => id !== idToRemove));
  };
  const resetPlayground = () => setPanels([Date.now()]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          Playground <Info size={16} />
        </div>
        <div className={styles.actions}>
          <span className={styles.windowInfo}>{panels.length} windows</span>
          <button className={styles.actionBtn} onClick={addPanel}>
            <Plus size={16} /> Add Panel
          </button>
          <button className={styles.actionBtn}>
            <Play size={16} /> Run All (Ctrl + Enter)
          </button>
          <button className={styles.actionBtn} onClick={resetPlayground}>
            <RotateCcw size={16} /> Reset playground
          </button>
        </div>
      </div>

      <div className={styles.mainGrid}>
        {panels.map((id) => (
          <PlaygroundComponent
            key={id}
            onCopy={addPanel}
            onRemove={() => removePanel(id)}
            showRemoveButton={panels.length > 1}
          />
        ))}
      </div>
    </div>
  );
}
