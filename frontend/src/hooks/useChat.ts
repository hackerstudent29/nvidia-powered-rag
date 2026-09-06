import { useState, useEffect, useRef } from "react";
import { Message, Session, ModelOption, SystemStats, RateLimitInfo } from "../types/chat";
import { audioManager } from "../utils/audioManager";
import { detectRateLimitFromText } from "../utils/rateLimitHelper";

const API_BASE = "/api";

export function useChat() {
  const [userId] = useState<string>(() => {
    let uid = localStorage.getItem("lorin_user_id");
    if (!uid) {
      uid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem("lorin_user_id", uid);
    }
    return uid;
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const cached = localStorage.getItem("lorin_cached_messages");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => {
    return localStorage.getItem("lorin_session_id") || `sess_${Date.now()}`;
  });
  const [sessions, setSessions] = useState<Session[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("zai/glm-5.3-flash");
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(() => {
    try {
      const cached = localStorage.getItem("lorin_rate_limit_info");
      if (cached) {
        const parsed: RateLimitInfo = JSON.parse(cached);
        if (parsed.untilTimestamp && parsed.untilTimestamp > Date.now()) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync rate limit state to localStorage
  useEffect(() => {
    if (rateLimitInfo && rateLimitInfo.isLimited) {
      localStorage.setItem("lorin_rate_limit_info", JSON.stringify(rateLimitInfo));
    } else {
      localStorage.removeItem("lorin_rate_limit_info");
    }
  }, [rateLimitInfo]);

  // Save session ID
  useEffect(() => {
    localStorage.setItem("lorin_session_id", sessionId);
  }, [sessionId]);

  // Persist current active messages locally for instant zero-latency page reloads
  useEffect(() => {
    if (messages.length > 0 && !isStreaming) {
      try {
        localStorage.setItem("lorin_cached_messages", JSON.stringify(messages));
      } catch (err) {
        // quota limit fallback
      }
    }
  }, [messages, isStreaming]);

  // Fetch available models
  useEffect(() => {
    fetch(`${API_BASE}/models`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setModels(data);
          const defaultMod = data.find((m: any) => m.is_default);
          if (defaultMod) setSelectedModel(defaultMod.id);
        }
      })
      .catch((err) => console.error("Error fetching models:", err));
  }, []);

  // Helper to load messages for a specific session ID
  const loadSessionMessages = async (targetSessionId: string) => {
    try {
      const res = await fetch(`${API_BASE}/sessions/${targetSessionId}`, {
        headers: { "X-User-ID": userId }
      });
      if (res.ok) {
        const history = await res.json();
        if (Array.isArray(history) && history.length > 0) {
          const formatted: Message[] = history.map((h: any) => ({
            id: h.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            role: h.role,
            content: h.content,
            timestamp: h.created_at || new Date(),
            model: h.model,
            latency_ms: h.latency_ms,
            sources: h.sources || [],
            reasoning_steps: h.reasoning_steps || [],
            token_metrics: h.token_metrics,
            resource_attachments: h.resource_attachments,
          }));
          setMessages(formatted);
          localStorage.setItem("lorin_cached_messages", JSON.stringify(formatted));
          return true;
        }
      }
    } catch (err) {
      console.error("Error loading session history:", err);
    }
    return false;
  };

  // Fetch past sessions for THIS specific user
  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_BASE}/sessions?user_id=${encodeURIComponent(userId)}`, {
        headers: { "X-User-ID": userId }
      });
      if (res.ok) {
        const data = await res.json();
        const safeData: Session[] = Array.isArray(data) ? data : [];
        setSessions(safeData);
        return safeData;
      }
    } catch (err) {
      console.error("Error fetching sessions:", err);
    }
    setSessions([]);
    return [];
  };

  // On page refresh / initial load: INSTANT 0ms restoration from local cache + parallel server sync
  useEffect(() => {
    const initLastSession = async () => {
      const storedId = localStorage.getItem("lorin_session_id");

      // Execute session list fetch and active history fetch IN PARALLEL!
      const [pastSessions] = await Promise.all([
        fetchSessions(),
        storedId ? loadSessionMessages(storedId) : Promise.resolve(false)
      ]);

      if (Array.isArray(pastSessions) && pastSessions.length > 0) {
        const targetSession = pastSessions.find((s) => s.id === storedId);
        if (targetSession && targetSession.id) {
          setSessionId(targetSession.id);
          localStorage.setItem("lorin_session_id", targetSession.id);
          await loadSessionMessages(targetSession.id);
        }
      }
    };

    initLastSession();
  }, [userId]);

  // Fetch live stats
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Switch session
  const selectSession = async (newSessionId: string) => {
    audioManager.stopAll();
    if (isStreaming) {
      stopStreaming();
    }
    setSessionId(newSessionId);
    localStorage.setItem("lorin_session_id", newSessionId);
    const loaded = await loadSessionMessages(newSessionId);
    if (!loaded) {
      setMessages([]);
      localStorage.removeItem("lorin_cached_messages");
    }
  };

  // New Chat
  const startNewChat = () => {
    audioManager.stopAll();
    if (isStreaming) {
      stopStreaming();
    }
    const newId = `sess_${Date.now()}`;
    setSessionId(newId);
    setMessages([]);
    localStorage.removeItem("lorin_cached_messages");
    fetchSessions();
  };

  // Delete a single session (soft-delete / archive)
  const deleteSession = async (idToDelete: string) => {
    audioManager.stopAll();
    
    // 1. Instant optimistic update in UI state
    setSessions((prev) => prev.filter((s) => s.id !== idToDelete));

    const isCurrentActiveSession = sessionId === idToDelete;

    if (isCurrentActiveSession) {
      if (isStreaming) {
        stopStreaming();
      }
      const newId = `sess_${Date.now()}`;
      setSessionId(newId);
      setMessages([]);
      localStorage.setItem("lorin_session_id", newId);
      localStorage.removeItem("lorin_cached_messages");
    }

    try {
      // 2. Await backend DB soft-delete to commit
      await fetch(`${API_BASE}/sessions/${idToDelete}`, { method: "DELETE" });
    } catch (err) {
      console.error("Error soft-deleting session:", err);
    } finally {
      // 3. Fetch fresh session list & ensure idToDelete remains removed
      const freshSessions = await fetchSessions();
      if (Array.isArray(freshSessions)) {
        setSessions(freshSessions.filter((s) => s.id !== idToDelete));
      }
    }
  };

  // Clear all sessions (bulk soft-delete / archive)
  const clearAllSessions = async () => {
    audioManager.stopAll();
    if (isStreaming) {
      stopStreaming();
    }
    // 1. Instant optimistic clear
    setSessions([]);
    const newId = `sess_${Date.now()}`;
    setSessionId(newId);
    setMessages([]);
    localStorage.setItem("lorin_session_id", newId);
    localStorage.removeItem("lorin_cached_messages");

    try {
      // 2. Await backend bulk soft-delete
      await fetch(`${API_BASE}/sessions`, { method: "DELETE" });
    } catch (err) {
      console.error("Error archiving all sessions:", err);
    } finally {
      fetchSessions();
    }
  };

  // Stop current streaming response
  const stopStreaming = () => {
    audioManager.stopAll();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((msg) => (msg.is_streaming ? { ...msg, is_streaming: false } : msg))
    );
  };

  // Send message with SSE streaming and retry on temporary failures
  const sendMessage = async (text: string, effort?: string) => {
    if (!text.trim() || isStreaming) return;
    audioManager.stopAll();

    const cleanText = text.trim().toLowerCase();
    if (cleanText === "/admin" || cleanText === "/ admin" || cleanText === "admin/") {
      window.location.href = "/admin";
      return;
    }

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    const assistantPlaceholderId = `asst_${Date.now()}`;
    const assistantPlaceholder: Message = {
      id: assistantPlaceholderId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      is_streaming: true,
      sources: [],
      reasoning_steps: [],
    };

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setIsStreaming(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          user_id: userId,
          model: selectedModel,
          effort: effort || "Medium",
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No readable stream");

      const decoder = new TextDecoder();
      let accumulatedContent = "";
      let accumulatedSources: any[] = [];
      let accumulatedAttachments: any[] = [];
      let accumulatedReasoning: string[] = [];
      let accumulatedSuggestions: string[] = [];
      let streamMetrics: any = null;
      let tokenMetrics: any = null;

      let buffer = "";
      let lastFlushTime = 0;
      let pendingFlushTimeout: any = null;

      const flushState = () => {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== assistantPlaceholderId) return msg;
            return {
              ...msg,
              content: accumulatedContent,
              sources: accumulatedSources.length > 0 ? accumulatedSources : msg.sources,
              resource_attachments: accumulatedAttachments.length > 0 ? accumulatedAttachments : msg.resource_attachments,
              reasoning_steps: [...accumulatedReasoning],
              suggestions: accumulatedSuggestions.length > 0 ? accumulatedSuggestions : msg.suggestions,
              token_metrics: tokenMetrics || msg.token_metrics,
              latency_ms: streamMetrics?.latency_ms || msg.latency_ms,
              model: streamMetrics?.model || msg.model,
              is_cached: streamMetrics?.cache_hit ?? msg.is_cached,
            };
          })
        );
      };

      const requestFlush = (force = false) => {
        const now = Date.now();
        if (force || now - lastFlushTime >= 30) {
          if (pendingFlushTimeout) {
            clearTimeout(pendingFlushTimeout);
            pendingFlushTimeout = null;
          }
          lastFlushTime = now;
          flushState();
        } else if (!pendingFlushTimeout) {
          pendingFlushTimeout = setTimeout(() => {
            pendingFlushTimeout = null;
            lastFlushTime = Date.now();
            flushState();
          }, 30);
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const dataStr = trimmed.replace(/^data:\s*/, "");
          if (dataStr === "[DONE]") break;

          try {
            const data = JSON.parse(dataStr);

            if (data.type === "token") {
              accumulatedContent += data.token;
              const detected = detectRateLimitFromText(data.token);
              if (detected) setRateLimitInfo(detected);
              requestFlush(false);
            } else if (data.type === "sources") {
              accumulatedSources = data.sources || [];
              requestFlush(true);
            } else if (data.type === "resource_attachments") {
              accumulatedAttachments = data.attachments || [];
              requestFlush(true);
            } else if (data.type === "reasoning") {
              if (data.step && data.step.trim().length > 3) {
                const cleanStep = data.step.trim();
                if (!accumulatedReasoning.includes(cleanStep)) {
                  accumulatedReasoning.push(cleanStep);
                }
              }
              requestFlush(true);
            } else if (data.type === "suggestions") {
              accumulatedSuggestions = data.suggestions || [];
              requestFlush(true);
            } else if (data.type === "token_metrics") {
              tokenMetrics = data.metrics;
              requestFlush(true);
            } else if (data.type === "metrics") {
              streamMetrics = data;
              requestFlush(true);
            } else if (data.type === "error") {
              const errStr = data.error || "";
              const detected = detectRateLimitFromText(errStr);
              if (detected) setRateLimitInfo(detected);
              if (!accumulatedContent.trim()) {
                accumulatedContent = errStr || "I am temporarily unable to connect to the Lorin AI campus service. Please try again in a moment.";
              }
              requestFlush(true);
            }
          } catch (e) {
            // Non-JSON line or chunk boundary
          }
        }
      }

      // Ensure 100% final flush of all content & turn off streaming flag
      requestFlush(true);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantPlaceholderId
            ? { ...msg, is_streaming: false, timestamp: new Date() }
            : msg
        )
      );
      fetchSessions();
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Chat streaming error:", err);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantPlaceholderId
              ? {
                  ...msg,
                  content:
                    msg.content.trim() ||
                    "I am temporarily unable to connect to the Lorin AI campus service. Please try again in a moment.",
                  is_streaming: false,
                }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Regenerate last assistant response
  const regenerateLastMessage = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      sendMessage(lastUserMsg.content);
    }
  };

  // Regenerate response using NVIDIA Nemotron Reranker (nvidia/llama-nemotron-rerank-1b-v2)
  const regenerateWithNeMo = async (queryText: string) => {
    if (isStreaming) return;
    setIsStreaming(true);

    const tempId = `msg_nemo_${Date.now()}`;
    const initialAssistantMsg: Message = {
      id: tempId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      model: "nvidia/llama-nemotron-rerank-1b-v2",
      is_streaming: true,
      reasoning_steps: [
        "1. Activated NVIDIA Nemotron Reranker (nvidia/llama-nemotron-rerank-1b-v2)",
        "2. Intercepted Colang 2.0 Guardrails and domain boundary policies",
        "3. Fusing dense & sparse retrieval candidates via RRF (k=60)",
        "4. Generating high-precision re-evaluated campus response"
      ],
    };

    setMessages((prev) => [...prev, initialAssistantMsg]);

    try {
      const res = await fetch(`${API_BASE}/feedback/regenerate-nemo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query_text: queryText,
          session_id: sessionId
        }),
      });

      const data = await res.json();

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId
            ? {
                ...msg,
                content: data.response || "No reranked response received.",
                is_streaming: false,
                sources: data.sources || [],
                model: "nvidia/llama-nemotron-rerank-1b-v2"
              }
            : msg
        )
      );
    } catch (err) {
      console.error("Error in NeMo regeneration:", err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId
            ? {
                ...msg,
                content: "Failed to regenerate with NVIDIA Nemotron. Please try again.",
                is_streaming: false
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  // Submit feedback
  const submitFeedback = async (data: {
    message_id: string;
    session_id: string;
    query_text: string;
    response_text: string;
    rating: number;
    category: string;
    user_comment: string;
  }) => {
    try {
      await fetch(`${API_BASE}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.error("Error saving feedback:", err);
    }
  };

  return {
    messages,
    isStreaming,
    sessionId,
    sessions,
    models,
    selectedModel,
    setSelectedModel,
    stats,
    loadingStats,
    rateLimitInfo,
    setRateLimitInfo,
    fetchSessions,
    fetchStats,
    sendMessage,
    stopStreaming,
    startNewChat,
    selectSession,
    deleteSession,
    clearAllSessions,
    regenerateLastMessage,
    regenerateWithNeMo,
    submitFeedback,
  };
}
