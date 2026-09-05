/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, X, Sparkles, Key, AlertCircle, Loader2 } from 'lucide-react';
import { FlowEdge, FlowNode, Language, TutorMessage } from '../types';
import { translations } from '../i18n/translations';
import { TUTOR_PROMPTS } from '../i18n/keywords';
import { diagramToPseudocode } from '../core/flowchart-gen';

interface AITutorPanelProps {
  language: Language;
  isOpen: boolean;
  onClose: () => void;
  nodes: FlowNode[];
  edges: FlowEdge[];
  onHighlightNode: (nodeId: string | null) => void;
}

export const AITutorPanel: React.FC<AITutorPanelProps> = ({
  language,
  isOpen,
  onClose,
  nodes,
  edges,
  onHighlightNode,
}) => {
  const t = translations[language];
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clean and parse node highlight tag from AI response
  const extractNodeHighlight = (text: string): { cleanText: string; targetId: string | null } => {
    const match = /\n?\[\[CVOR:([A-Za-z0-9_]+)\]\]\s*$/.exec(text);
    if (!match) return { cleanText: text, targetId: null };
    return { cleanText: text.slice(0, match.index).trimEnd(), targetId: match[1] };
  };

  const handleSend = async () => {
    const promptText = input.trim();
    if (!promptText || isSending) return;

    if (!apiKey.trim()) {
      setMessages((prev) => [
        ...prev,
        { role: 'error', text: t.tutorNeedKey },
      ]);
      return;
    }

    const newMessages: TutorMessage[] = [...messages, { role: 'user', text: promptText }];
    setMessages(newMessages);
    setInput('');
    setIsSending(true);

    let currentCode = '';
    try {
      currentCode = diagramToPseudocode(nodes, edges, language);
    } catch {
      currentCode = '(empty or invalid diagram)';
    }

    const nodesDescription = nodes.length
      ? nodes.map((n) => `- ID: ${n.id}, Type: ${n.type}, Text: "${n.text}"`).join('\n')
      : '(no nodes on canvas)';

    const systemPrompt = `${TUTOR_PROMPTS[language]}

CURRENT STUDENT FLOWCHART / PSEUDOCODE:
${currentCode}

CURRENT CANVAS NODES:
${nodesDescription}
`;

    try {
      const contents = newMessages
        .filter((m) => m.role === 'user' || m.role === 'model')
        .map((m) => ({
          role: m.role,
          parts: [{ text: m.text }],
        }));

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { maxOutputTokens: 700 },
          }),
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const errorMsg = data?.error?.message || `HTTP error ${res.status}`;
        setMessages((prev) => [...prev, { role: 'error', text: `${t.tutorError} ${errorMsg}` }]);
        return;
      }

      const rawReply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawReply) {
        setMessages((prev) => [...prev, { role: 'error', text: t.tutorEmptyReply }]);
        return;
      }

      const { cleanText, targetId } = extractNodeHighlight(rawReply.trim());
      setMessages((prev) => [...prev, { role: 'model', text: cleanText }]);

      if (targetId) {
        onHighlightNode(targetId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [...prev, { role: 'error', text: `${t.tutorError} ${msg}` }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    onHighlightNode(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[380px] md:w-[420px] bg-[#0A0A0A] text-[#F5F5F5] border-l border-white/10 shadow-2xl z-40 flex flex-col transition-all">
      {/* Header */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between bg-[#121212] text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#06B6D4]" />
          <span className="font-black text-xs uppercase tracking-widest text-white">{t.tutorTitle}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleClear}
            className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors text-xs font-bold uppercase tracking-wider flex items-center gap-1 px-2"
            title={t.tutorNewChat}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.tutorNewChat}</span>
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* API Key Banner */}
      <div className="p-3 bg-[#111111] border-b border-white/10 text-xs flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="gemini-key" className="font-bold text-white/80 uppercase tracking-wider text-[10.5px] flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-[#06B6D4]" />
            <span>{t.tutorApiKeyLabel}</span>
          </label>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#06B6D4] hover:underline font-mono font-bold text-[11px]"
          >
            aistudio.google.com ↗
          </a>
        </div>
        <input
          id="gemini-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={t.tutorApiKeyPlaceholder}
          className="w-full px-2.5 py-1.5 bg-[#181818] border border-white/15 rounded-lg text-xs text-white outline-none focus:border-white/50 font-mono"
        />
        <div className="flex items-center justify-between text-[10.5px] text-white/50">
          <span>{t.tutorKeyHint}</span>
          <div className="flex items-center gap-1.5 font-mono">
            <span>{t.tutorModelLabel}:</span>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-24 px-1.5 py-0.5 bg-[#181818] border border-white/15 rounded font-mono text-[10px] text-white outline-none"
            />
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#050505]">
        {messages.length === 0 && (
          <div className="p-4 rounded-xl bg-[#111111] border border-white/10 text-center text-xs text-white/70 space-y-2">
            <p className="font-black text-sm uppercase tracking-wider text-white">
              {language === 'en'
                ? 'Welcome to your AI Programming Tutor!'
                : language === 'de'
                ? 'Willkommen bei deinem KI-Programmier-Tutor!'
                : 'Dobrodošli kod svog AI tutora za programiranje!'}
            </p>
            <p className="text-[11px] leading-relaxed text-white/60">
              {language === 'en'
                ? 'Ask questions about your pseudocode algorithm, logic branches, loop bounds, or flowchart symbols. The tutor will provide tailored advice and highlight key steps on your canvas.'
                : language === 'de'
                ? 'Stelle Fragen zu deinem Algorithmus, Schleifen oder Verzweigungen. Der Tutor hilft dir didaktisch und hebt relevante Schritte auf der Zeichenfläche hervor.'
                : 'Postavi pitanje o svom algoritmu, petljama, grananju ili simbolima. Tutor pruža prijateljske savjete i ističe čvorove na platnu.'}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[88%] p-2.5 rounded-xl text-xs leading-relaxed whitespace-pre-wrap break-words ${
              msg.role === 'user'
                ? 'ml-auto bg-white text-black font-semibold rounded-br-none shadow-md'
                : msg.role === 'model'
                ? 'mr-auto bg-[#181818] text-[#F5F5F5] rounded-bl-none shadow-md border border-white/15 font-sans'
                : 'w-full bg-red-950/70 text-red-200 border border-red-500/30 flex items-center gap-2 font-mono'
            }`}
          >
            {msg.role === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />}
            <span>{msg.text}</span>
          </div>
        ))}

        {isSending && (
          <div className="mr-auto bg-[#181818] text-white/70 text-xs p-2.5 rounded-xl rounded-bl-none italic flex items-center gap-2 border border-white/10 font-mono">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#06B6D4]" />
            <span>{t.tutorThinking}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input row */}
      <div className="p-2.5 border-t border-white/10 bg-[#121212] flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={t.tutorPlaceholder}
          rows={2}
          disabled={isSending}
          className="flex-1 p-2 text-xs bg-[#181818] text-white placeholder:text-white/40 border border-white/15 rounded-lg outline-none focus:border-white/50 resize-none font-mono"
        />
        <button
          onClick={handleSend}
          disabled={isSending || !input.trim()}
          className="self-end bg-white hover:bg-neutral-200 disabled:opacity-30 text-black p-2.5 rounded-lg transition-colors font-black"
          title={t.tutorSend}
        >
          <Send className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
