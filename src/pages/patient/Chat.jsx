import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import SymptomReport from "./SymptomReport";

export default function PatientChat() {
  const { appointmentId } = useParams();
  const { authFetch, user } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [detectedSymptom, setDetectedSymptom] = useState(null);
  const [showSymptomModal, setShowSymptomModal] = useState(false);
  const [listening, setListening] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    authFetch(`/api/chat?appointmentId=${appointmentId}`)
      .then((r) => r.json())
      .then((data) => { if (data.messages?.length) setMessages(data.messages.map((m) => ({ role: m.role, content: m.content }))); })
      .catch(console.error)
      .finally(() => setInitialLoad(false));
  }, [appointmentId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    setDetectedSymptom(null);
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    try {
      const res = await authFetch("/api/chat", { method: "POST", body: JSON.stringify({ appointmentId, message: text, history }) });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply || "Sorry, I couldn't process that." }]);
      if (data.symptomDetected) setDetectedSymptom(data.symptomDetected);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "I'm having trouble connecting right now. Please try again." }]);
    } finally { setLoading(false); inputRef.current?.focus(); }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const rec = new SR();
    rec.lang = "en-US"; rec.continuous = false; rec.interimResults = false;
    rec.onresult = (e) => setInput((prev) => (prev ? prev + " " : "") + e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec; rec.start(); setListening(true);
  };

  if (initialLoad) return <div className="flex items-center justify-center py-32"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 80px)" }}>
      {showSymptomModal && <SymptomReport appointmentId={appointmentId} onClose={() => setShowSymptomModal(false)} />}

      <div className="flex items-center gap-3 pb-4 border-b border-slate-800 mb-4 flex-shrink-0">
        <button onClick={() => navigate("/patient/dashboard")} className="text-slate-400 hover:text-white transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h2 className="text-base font-semibold text-white">Medical Assistant</h2>
          <p className="text-slate-400 text-xs">Ask questions about your care plan</p>
        </div>
      </div>

      {detectedSymptom && (
        <div className="mb-4 flex-shrink-0 px-4 py-3 rounded-xl bg-yellow-950/60 border border-yellow-700 flex items-center justify-between gap-3">
          <p className="text-yellow-200 text-sm">⚠ New symptom detected: <span className="font-medium">{detectedSymptom}</span></p>
          <button onClick={() => setShowSymptomModal(true)} className="text-xs bg-yellow-700 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-lg font-medium transition flex-shrink-0">Report it</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-12 h-12 rounded-full bg-indigo-900/40 border border-indigo-700/40 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            <p className="text-slate-400 text-sm font-medium">Hi {user?.name?.split(" ")[0]}, I'm here to help</p>
            <p className="text-slate-500 text-xs mt-1 max-w-xs">Ask me anything about your diagnosis, medicines, or care plan.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {["What did the doctor find?", "How do I take my medicine?", "What side effects should I watch for?", "What should I do today?"].map((q) => (
                <button key={q} onClick={() => setInput(q)} className="text-xs px-3 py-2 rounded-full border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition">{q}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && <div className="w-7 h-7 rounded-full bg-indigo-700 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5 text-xs font-bold text-white">AI</div>}
            <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-indigo-600 text-white rounded-br-sm" : "bg-slate-800 text-slate-200 rounded-bl-sm"}`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-indigo-700 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5 text-xs font-bold text-white">AI</div>
            <div className="bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1">
              {[0, 1, 2].map((i) => <span key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 flex items-end gap-2 pt-4 border-t border-slate-800">
        <button onClick={toggleVoice} title="Voice input"
          className={`p-2.5 rounded-xl border transition flex-shrink-0 ${listening ? "bg-red-700 border-red-600 text-white animate-pulse" : "border-slate-700 text-slate-400 hover:text-white hover:border-slate-500"}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
        </button>
        <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} rows={1}
          placeholder="Ask about your care plan..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 resize-none focus:outline-none focus:border-indigo-500 max-h-32"
        />
        <button onClick={sendMessage} disabled={!input.trim() || loading}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
        </button>
      </div>
    </div>
  );
}
