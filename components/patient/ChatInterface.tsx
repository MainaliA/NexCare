"use client";

import { useState, useRef, useEffect } from "react";

interface Message { role: "user" | "assistant"; content: string; }
interface Props   { appointmentId: string; diagnosisSummary: string; doctorName: string; }

export default function ChatInterface({ appointmentId, diagnosisSummary, doctorName }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hi! I'm here to help you understand your doctor's notes. I can answer questions about your diagnosis, medications, and daily plan. What would you like to know?`,
    },
  ]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [listening, setListening] = useState(false);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const recognitionRef            = useRef<unknown>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Voice input
  function startListening() {
    type SpeechRecognitionCtor = new () => {
      lang: string;
      interimResults: boolean;
      onresult: (e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void;
      onerror: () => void;
      onend: () => void;
      start: () => void;
    };
    const W = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    const SpeechRecognitionCls = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!SpeechRecognitionCls) return;

    const recognition = new SpeechRecognitionCls();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      setInput((prev) => prev + e.results[0][0].transcript);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend   = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          appointmentId,
          message: text,
          history: messages,
        }),
      });
      if (!res.ok) throw new Error("API error");
      const { reply } = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `I'm having trouble connecting right now. Please contact Dr. ${doctorName}'s office directly if you have an urgent question.` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
      {/* Context banner */}
      <div className="px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl mb-4 text-xs text-slate-400">
        <span className="text-slate-300 font-medium">Grounded on: </span>
        {diagnosisSummary}
        <span className="ml-2 badge-blue">Dr. {doctorName}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white mr-2 shrink-0 mt-0.5">N</div>
            )}
            <div
              className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white mr-2 shrink-0 mt-0.5">N</div>
            <div className="bg-slate-800 border border-slate-700 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 flex gap-2 items-end">
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            placeholder="Ask about your diagnosis, medicines, or daily plan…"
            className="input pr-10 resize-none"
            style={{ minHeight: "44px", maxHeight: "120px" }}
          />
          {/* Voice button */}
          <button
            onClick={startListening}
            className={`absolute right-2 top-2.5 transition-colors ${listening ? "text-red-400 animate-pulse" : "text-slate-500 hover:text-slate-300"}`}
            title="Voice input"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
        </div>
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="btn-primary px-4 py-2.5 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
      <p className="text-xs text-slate-600 mt-2 text-center">
        This assistant only knows what's in your doctor's notes. For emergencies, call 911.
      </p>
    </div>
  );
}
