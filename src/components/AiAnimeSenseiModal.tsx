import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Compass,
  Flame,
  Gem,
  Tv,
  Play,
  Info,
  Copy,
  Check,
  RefreshCw,
  Zap,
  Bookmark,
  MessageSquare,
  HelpCircle,
  Volume2,
  VolumeX,
  Share2,
  ListOrdered,
  BookOpen,
} from 'lucide-react';
import { Anime, UserMediaListItem } from '../types';
import { askAnimeSensei, AiChatMessage, AiContext } from '../services/gemini';

interface AiAnimeSenseiModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAnime?: Anime | null;
  userLibrary: UserMediaListItem[];
  onOpenDetails: (anime: Anime) => void;
  onPlayStream: (anime: Anime) => void;
}

interface PromptCategory {
  id: string;
  label: string;
  icon: any;
  prompts: { label: string; query: string }[];
}

const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    id: 'recommendations',
    label: '✨ Smart Recommendations',
    icon: Sparkles,
    prompts: [
      {
        label: '🔮 Vibe Matcher',
        query: 'Find me anime similar to Jujutsu Kaisen + Attack on Titan with high stakes and insane sakuga fights.',
      },
      {
        label: '💎 2024-2026 Hidden Gems',
        query: 'Recommend 4 underrated hidden gem anime from recent years that have exceptional writing and animation.',
      },
      {
        label: '🍿 Weekend Binge Thrillers',
        query: 'What are the top psychological thriller anime that hook you immediately from Episode 1 with relentless plot twists?',
      },
      {
        label: '🌸 Wholesome & Cozy',
        query: 'Recommend comforting, wholesome slice-of-life anime with beautiful atmospheres like Laid-Back Camp and Frieren.',
      },
    ],
  },
  {
    id: 'orders',
    label: '🧭 Watch Orders & Timelines',
    icon: Compass,
    prompts: [
      {
        label: '⚔️ Fate Series Order',
        query: 'What is the definitive community-recommended watch order for the Fate franchise (UBW, Heaven\'s Feel, Zero)?',
      },
      {
        label: '📚 Monogatari Series Order',
        query: 'Explain the recommended light novel broadcast order for the Monogatari series.',
      },
      {
        label: '🕰️ Steins;Gate Timeline',
        query: 'How should I watch Steins;Gate, Steins;Gate 0, and Episode 23β in proper narrative order?',
      },
      {
        label: '🚀 Gundam Universal Century',
        query: 'What is the best entry point for the Mobile Suit Gundam Universal Century (UC) timeline?',
      },
    ],
  },
  {
    id: 'lore',
    label: '📜 Lore & Tropes',
    icon: BookOpen,
    prompts: [
      {
        label: '🧙 Magic Systems Breakdown',
        query: 'Compare the hard magic systems of Hunter x Hunter (Nen) and Jujutsu Kaisen (Cursed Energy).',
      },
      {
        label: '🎭 Deep Anime Lore',
        query: 'Explain the deeper thematic philosophy and historical inspiration behind Vinland Saga.',
      },
      {
        label: '🧠 Psychological Masterpieces',
        query: 'Break down why Monster and Death Note are considered the pinnacle of anime psychological cat-and-mouse thrillers.',
      },
    ],
  },
];

export const AiAnimeSenseiModal: React.FC<AiAnimeSenseiModalProps> = ({
  isOpen,
  onClose,
  currentAnime,
  userLibrary,
  onOpenDetails,
  onPlayStream,
}) => {
  const [messages, setMessages] = useState<AiChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'assistant',
      text: `### Konnichiwa! ⛩️ I'm **AniAI Sensei**
Your personalized anime intelligence advisor and lore guide. 

Ask me anything about:
- 🔮 **Personalized Recommendations** based on mood, tropes, or hybrid genres.
- 🧭 **Watch Orders & Chronological Timelines** (e.g. *Fate*, *Monogatari*, *Steins;Gate*, *Gundam*).
- 📜 **Lore & Character Analysis** (spoiler-safe insights).
- 💎 **Hidden Gems & Seasonal Highlights**.

Select a prompt category below or type your custom anime question!`,
      timestamp: Date.now(),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('recommendations');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [currentSpeakingId, setCurrentSpeakingId] = useState<string | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // If opened with a specific currentAnime context, inject an initial contextual prompt
  useEffect(() => {
    if (isOpen && currentAnime) {
      const animeTitle = currentAnime.title?.english || currentAnime.title?.romaji || 'this anime';
      const promptText = `Tell me about **[${animeTitle}]** — what makes it unique, its target audience, and 3 other anime that have a similar vibe!`;
      setInputQuery(promptText);
    }
  }, [isOpen, currentAnime]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  // Speech synthesis cleanup
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isTyping) return;

    const userMsg: AiChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    const context: AiContext = {
      currentAnime: currentAnime ? (currentAnime.title?.english || currentAnime.title?.romaji) : undefined,
      genres: currentAnime?.genres || ['Action', 'Fantasy'],
      libraryCount: userLibrary.length,
    };

    try {
      const result = await askAnimeSensei(query, context);

      const assistantMsg: AiChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: result.reply,
        timestamp: Date.now(),
        suggestedAnime: result.suggestedAnime,
        isFallback: result.isFallback,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Error fetching AI response:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: 'assistant',
          text: 'Gomen! I encountered a brief network delay. Please try asking again in a moment.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleSpeak = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking && currentSpeakingId === id) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean markdown symbols for cleaner TTS
    const cleanText = text
      .replace(/[#*`_\[\]()~]/g, '')
      .replace(/<[^>]*>/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
    };

    setCurrentSpeakingId(id);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleClearChat = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setCurrentSpeakingId(null);
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        text: '### Chat Cleared! ✨\nHow can I help guide your anime journey today?',
        timestamp: Date.now(),
      },
    ]);
  };

  if (!isOpen) return null;

  const currentCategoryData = PROMPT_CATEGORIES.find(c => c.id === activeCategory) || PROMPT_CATEGORIES[0];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-3xl h-[92vh] max-h-[840px] bg-[#0c0e18] border border-indigo-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 relative"
        >
          {/* Header */}
          <div className="px-4 sm:px-6 py-3.5 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-white tracking-tight">AniAI Sensei</h2>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    Gemini 3.7 Intelligence
                  </span>
                </div>
                <p className="text-xs text-slate-400">Smart Anime Recommendations, Lore & Watch Order Navigator</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleClearChat}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs font-medium flex items-center gap-1 cursor-pointer"
                title="Reset conversation"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
              <button
                onClick={() => {
                  if (window.speechSynthesis) window.speechSynthesis.cancel();
                  onClose();
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="px-4 sm:px-6 py-2 bg-slate-950/70 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {PROMPT_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Quick Preset Topics Chips */}
          <div className="px-4 sm:px-6 py-2 bg-slate-950/40 border-b border-slate-800/60 overflow-x-auto flex items-center gap-2 no-scrollbar">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              Topic:
            </span>
            {currentCategoryData.prompts.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(preset.query)}
                className="px-3 py-1 rounded-full bg-slate-900 hover:bg-indigo-950/80 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-200 text-xs font-medium border border-slate-800 transition shrink-0 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>{preset.label}</span>
              </button>
            ))}
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {messages.map(msg => {
              const isUser = msg.sender === 'user';
              const isThisSpeaking = isSpeaking && currentSpeakingId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0 mt-1 shadow-md">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[90%] sm:max-w-[84%] rounded-2xl p-4 shadow-lg ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-[#131728] border border-slate-800/90 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    {/* Message Body */}
                    <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-line space-y-2 prose prose-invert max-w-none">
                      {msg.text}
                    </div>

                    {/* Interactive Anime Cards Preview */}
                    {msg.suggestedAnime && msg.suggestedAnime.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-700/60 space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                          <Play className="w-3 h-3 text-indigo-400" />
                          <span>Detected Anime Cards:</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {msg.suggestedAnime.map(anime => {
                            const title =
                              anime.title?.english ||
                              anime.title?.romaji ||
                              anime.title?.userPreferred ||
                              'Anime';
                            const cover = anime.coverImage?.large || anime.coverImage?.medium;
                            const score = anime.averageScore || anime.meanScore;

                            return (
                              <div
                                key={anime.id}
                                className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 transition group"
                              >
                                {cover && (
                                  <img
                                    src={cover}
                                    alt={title}
                                    className="w-12 h-16 rounded-lg object-cover border border-slate-700 shrink-0"
                                  />
                                )}
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-xs font-bold text-white truncate group-hover:text-indigo-300 transition">
                                    {title}
                                  </h4>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                    {score && (
                                      <span className="text-yellow-400 font-bold">★ {score}%</span>
                                    )}
                                    {anime.format && <span>• {anime.format}</span>}
                                    {anime.episodes && <span>• {anime.episodes} eps</span>}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-2">
                                    <button
                                      onClick={() => {
                                        onClose();
                                        onPlayStream(anime);
                                      }}
                                      className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-sm"
                                    >
                                      <Play className="w-2.5 h-2.5 fill-current" />
                                      <span>Watch</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        onClose();
                                        onOpenDetails(anime);
                                      }}
                                      className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer border border-slate-700"
                                    >
                                      <Info className="w-2.5 h-2.5" />
                                      <span>Details</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Bottom toolbar for Assistant message */}
                    {!isUser && (
                      <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/50">
                        <span className="text-[10px] text-slate-500">AniAI Sensei</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleSpeak(msg.id, msg.text)}
                            className={`flex items-center gap-1 transition text-[11px] cursor-pointer ${
                              isThisSpeaking
                                ? 'text-amber-400 font-bold'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                            title="Read response aloud"
                          >
                            {isThisSpeaking ? (
                              <>
                                <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                                <span>Stop</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>Listen</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleCopy(msg.id, msg.text)}
                            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition text-[11px] cursor-pointer"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 mt-1 shadow-md">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0 shadow-md">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-[#131728] border border-slate-800/90 text-slate-300 flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping [animation-delay:0.4s]" />
                  <span className="text-slate-400 font-medium ml-1">Sensei is analyzing anime catalogs...</span>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Footer Input Bar */}
          <div className="p-3 sm:p-4 bg-slate-900/90 border-t border-slate-800/90">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 bg-[#090b14] border border-slate-700/80 focus-within:border-indigo-500 rounded-2xl px-3 py-2 shadow-inner transition"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={e => setInputQuery(e.target.value)}
                placeholder="Ask AniAI for recommendations, watch orders, lore, or vibes..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none px-1"
                disabled={isTyping}
              />

              <button
                type="submit"
                disabled={!inputQuery.trim() || isTyping}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shadow-md shadow-indigo-600/30 transition cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="flex items-center justify-between text-[11px] text-slate-500 px-2 mt-2">
              <span>Powered by Google Gemini 3.7 Flash & AniList GraphQL</span>
              <span className="hidden sm:inline">Press Enter to Send</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
