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
  ChevronDown,
} from "lucide-react";
import styles from "./Playground.module.css";
import ChatBox from "../../components/ChatBox/ChatBox";
import NewLlmConnectionModal from "./NewLlmConnectionModal";
import PlaygroundPanel from "./PlaygroundPanel";
import NewItemModal from "./NewItemModal";
import SavePromptPopover from "./SavePromptPopover";
// import PageHeader from "../../components/PageHeader/PageHeader";
import useProjectId from "../../hooks/useProjectId";

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


// ---------- Variables Panel ----------
const VariablesPanelContent = () => (
  <>

    <div className={styles.emptyNote} style={{ marginTop: 8 }}>
    </div>
  </>
);



// ---------- 단일 패널 ----------


const PlaygroundComponent = ({ onCopy, onRemove, showRemoveButton }) => {
  const [messages, setMessages] = useState([]);
  const [isLlmModalOpen, setIsLlmModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null); // 'tool' | 'schema' | null
  const [activePanel, setActivePanel] = useState(null); // 'tools' | 'schema' | null
  const [isSavePopoverOpen, setIsSavePopoverOpen] = useState(false);
  const [isStreamSettingsOpen, setIsStreamSettingsOpen] = useState(false);
  const { projectId: PROJECT_ID, source, setProjectId } = useProjectId();
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

  // LLM Connections 로딩 (tRPC 읽기)
  const [connections, setConnections] = useState([]); // [{provider, adapter, baseURL, customModels, withDefaultModels}, ...]
  const [loadingConn, setLoadingConn] = useState(false);
  const [connError, setConnError] = useState(null);

  const [selectedProvider, setSelectedProvider] = useState("");   // provider 문자열
  const [selectedAdapter, setSelectedAdapter] = useState("");
  const [selectedModel, setSelectedModel] = useState("");         // 정확한 모델명(예: "Qwen-xxx")

  const [streaming, setStreaming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [output, setOutput] = useState(null);
  const outputTextRef = useRef(""); // 스트리밍 누적 출력


  // --- 드롭다운 상태/참조 (model pill)
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const modelBtnRef = useRef(null);
  const modelMenuRef = useRef(null);


  // tRPC payload 언랩 유틸 (안전하게 파싱)
  function unwrapTrpcJson(j) {
    // 보통 j.result.data.json 에 최종 페이로드가 들어오지만,
    // 버전/어댑터에 따라 j.result.data 인 경우도 있으니 폭넓게 처리
    return j?.result?.data?.json ?? j?.result?.data ?? j;
  }

  useEffect(() => {
    // 1) null: useProjectId가 아직 결정 중 (초기 로딩 단계)
    if (PROJECT_ID === null) return;
    // 2) 빈 문자열: 진짜 projectId를 못 찾은 상태 → UI 초기화 후 종료
    if (PROJECT_ID === "") {
      setConnections([]);
      setSelectedProvider("");
      setSelectedAdapter("");
      setSelectedModel("");
      return;
    }

    const ac = new AbortController();

    (async () => {
      try {
        setLoadingConn(true);
        setConnError(null);

        const qs = encodeURIComponent(JSON.stringify({ json: { projectId: PROJECT_ID } }));
        const url = `/api/trpc/llmApiKey.all?input=${qs}`;
        const r = await fetch(url, { credentials: "include", signal: ac.signal });

        if (ac.signal.aborted) return;

        if (r.status === 401) {
          // 401은 세션/쿠키(프록시) 또는 멤버십 문제
          throw new Error("401 Unauthorized — 로그인/쿠키 또는 프로젝트 멤버십/프록시 설정 확인");
        }
        if (!r.ok) throw new Error(`Failed to load LLM connections (${r.status})`);

        const j = await r.json().catch(() => ({}));
        const payload = unwrapTrpcJson(j); // => { data, totalCount } 형태 기대
        const rows = payload?.data || [];

        setConnections(rows);

        if (rows.length > 0) {
          const first = rows[0];
          setSelectedProvider(first.provider || "");
          setSelectedAdapter(first.adapter ?? "");
          setSelectedModel(first.customModels?.[0] ?? "");
        } else {
          setSelectedProvider("");
          setSelectedAdapter("");
          setSelectedModel("");
        }
      } catch (e) {
        if (ac.signal.aborted) return;
        console.error("[llm connections] load failed", e);
        setConnError(e?.message || "Failed to load LLM connections");
        setConnections([]);
        setSelectedProvider("");
        setSelectedAdapter("");
        setSelectedModel("");
      } finally {
        if (!ac.signal.aborted) setLoadingConn(false);
      }
    })();

    // PROJECT_ID가 바뀌거나 언마운트되면 요청 취소
    return () => ac.abort();
  }, [PROJECT_ID]);


  // ✅ 현재 선택된 연결 탐색 (provider+adapter로 정확히 매칭)
  const currentConn = useMemo(
    () =>
      connections.find(
        (c) =>
          c.provider === selectedProvider &&
          (c.adapter ?? "") === (selectedAdapter ?? "")
      ),
    [connections, selectedProvider, selectedAdapter]
  );

  // ✅ 드롭다운에 뿌릴 "저장된 모델" 리스트
  const modelMenuItems = useMemo(
    () =>
      connections.flatMap((c) =>
        (c.customModels ?? []).map((m) => ({
          id: `${c.id}::${m}`,
          conn: c,
          model: m,
        }))
      ),
    [connections]
  );
  // ✅ 외부 클릭 시 드롭다운 닫기 (JS 버전)
  useEffect(() => {
    if (!isModelMenuOpen) return;
    const onDown = (e) => {
      if (!modelMenuRef.current || !modelBtnRef.current) return;
      const target = e.target;
      if (
        !modelMenuRef.current.contains(target) &&
        !modelBtnRef.current.contains(target)
      ) {
        setIsModelMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [isModelMenuOpen]);

  // ✅ 목록에서 (연결,모델) 클릭 시 정확히 그 값으로만 세팅
  function pickConnection(item) {
    setSelectedProvider(item.conn.provider);
    setSelectedAdapter(item.conn.adapter ?? "");
    setSelectedModel(item.model);
    setIsModelMenuOpen(false);
  }



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

  //렌더 가드
  if (PROJECT_ID === null) return <div className={styles.muted}>Loading project…</div>;
  if (PROJECT_ID === "") return <div className={styles.errorText}>Project ID not found</div>;


  return (
    <div className={styles.panelContainer}>
      {/* Model Card */}
      <div className={styles.card}>
        {/* ✅ 헤더에 model pill + 우측 액션 버튼 */}
        <div className={styles.cardHeader /* position:relative 추천 */}>
          <div className={styles.cardHeaderLeft}>
            <button
              ref={modelBtnRef}
              type="button"
              className={styles.modelPill}
              onClick={() => connections.length > 0 && setIsModelMenuOpen((v) => !v)}
              title={connections.length > 0 ? "Change model" : "No LLM connection"}
              disabled={connections.length === 0}
            >
              <span className={styles.modelProvider}>
                {selectedProvider || (loadingConn ? "Loading…" : "No connection")}
                {selectedProvider && (selectedAdapter ? ` (${selectedAdapter})` : "")}
              </span>
              <span className={styles.modelSep}>:</span>
              <strong className={styles.modelName}>
                {selectedModel ||
                  (connections.length === 0
                    ? "—"
                    : loadingConn
                      ? "Loading…"
                      : "select model")}
              </strong>
              {connections.length > 0 && <ChevronDown size={14} />}
            </button>

            {/* 연결이 없으면 옆에 추가 버튼 표시 */}
            {connections.length === 0 && (
              <button className={styles.addLlmBtn} onClick={() => setIsLlmModalOpen(true)}>
                <Plus size={16} /> Add LLM Connection
              </button>
            )}

            {/* ▼ 드롭다운 메뉴 (연결이 있을 때만) */}
            {isModelMenuOpen && connections.length > 0 && (
              <div ref={modelMenuRef} className={styles.modelMenu}>
                <div className={styles.menuSectionLabel}>Saved models</div>

                {loadingConn ? (
                  <div className={styles.menuEmpty}>Loading…</div>
                ) : modelMenuItems.length > 0 ? (
                  modelMenuItems.map((item) => {
                    const isActive =
                      selectedProvider === item.conn.provider &&
                      (selectedAdapter ?? "") === (item.conn.adapter ?? "") &&
                      selectedModel === item.model;

                    return (
                      <button
                        key={item.id}
                        className={`${styles.menuItem} ${isActive ? styles.active : ""}`}
                        onClick={() => pickConnection(item)}
                      >
                        <span className={styles.menuMain}>
                          {item.conn.provider}
                          {item.conn.adapter ? ` (${item.conn.adapter})` : ""}
                        </span>
                        <span className={styles.menuSep}>:</span>
                        <span className={styles.menuModel}>{item.model}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className={styles.menuEmpty}>No saved models</div>
                )}

                <div className={styles.menuDivider} />
                <button
                  className={styles.menuItem}
                  onClick={() => {
                    setIsModelMenuOpen(false);
                    setIsLlmModalOpen(true);
                  }}
                >
                  <Plus size={14} /> Add new connection…
                </button>
              </div>
            )}
          </div>

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


        {/* ✅ 이제 cardBody에는 모델 관련 내용 없음 */}
        <div className={styles.cardBody}>
          {loadingConn ? (
            <p className={styles.muted}>Loading LLM connections…</p>
          ) : connError ? (
            <p className={styles.errorText}>{connError}</p>
          ) : null}
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
        <button className={styles.controlBtn} onClick={() => togglePanel("variables")}>
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


      {activePanel === "variables" && (
        <PlaygroundPanel
          title="Variables & Message Placeholders"
          description={
            <>
              Configure variables and message placeholders for your prompts.
              <br />
              No variables or message placeholders defined.
            </>
          }
          compact
          floating
        >
          <VariablesPanelContent />
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
      {/* ✅ 글로벌 헤더(레이아웃)는 그대로. 우리는 그 바로 아래에 툴바만 붙임 */}
      <div className={styles.pageToolbar}>
        <span className={styles.windowInfo}>{panels.length} windows</span>
        <button className={styles.actionBtn} onClick={addPanel}>
          <Plus size={16} /> Add Panel
        </button>
        <button className={styles.actionBtn} onClick={() => { /* TODO: Run All 연결 */ }}>
          <Play size={16} /> Run All (Ctrl + Enter)
        </button>
        <button className={styles.actionBtn} onClick={resetPlayground}>
          <RotateCcw size={16} /> Reset playground
        </button>
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