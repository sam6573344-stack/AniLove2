import { Anime } from '../types';
import { searchAnimeAdvanced } from './anilist';

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  suggestedAnime?: Anime[];
  isFallback?: boolean;
  isLoadingAnime?: boolean;
}

export interface AiContext {
  currentAnime?: string;
  genres?: string[];
  libraryCount?: number;
}

// Function to extract bracketed anime titles: **[Title]** or [Title]
export function extractAnimeTitles(markdownText: string): string[] {
  const titles: string[] = [];
  const regex = /\[([A-Za-z0-9\s:;,\-–—'’!?&]+)\]/g;
  let match;
  while ((match = regex.exec(markdownText)) !== null) {
    const title = match[1].trim();
    if (title && !titles.includes(title) && title.length > 2 && title.length < 60) {
      titles.push(title);
    }
  }
  return titles;
}

// Send message to the backend Gemini AI Sensei endpoint
export async function askAnimeSensei(
  message: string,
  context?: AiContext,
  mode: 'general' | 'vibe' | 'watch_order' | 'recap' = 'general'
): Promise<{ reply: string; isFallback: boolean; suggestedAnime: Anime[] }> {
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context, mode }),
    });

    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    const data = await res.json();
    const reply = data.reply || 'No response received from Anime Sensei.';
    const isFallback = Boolean(data.isFallback);

    // Extract mentioned titles and fetch rich AniList media cards
    const mentionedTitles = extractAnimeTitles(reply).slice(0, 4);
    const suggestedAnime: Anime[] = [];

    for (const title of mentionedTitles) {
      try {
        const results = await searchAnimeAdvanced({ search: title, perPage: 1 });
        if (results && results.length > 0) {
          suggestedAnime.push(results[0]);
        }
      } catch (err) {
        console.warn(`Could not fetch details for suggested anime "${title}":`, err);
      }
    }

    return {
      reply,
      isFallback,
      suggestedAnime,
    };
  } catch (error) {
    console.error('Error calling /api/ai/chat:', error);
    return {
      reply: `### ✨ **AniAI Sensei Recommendations**

- **[Frieren: Beyond Journey's End]** — A breathtaking fantasy journey exploring time, legacy, and poignant relationships.
- **[Solo Leveling]** — Peak modern dungeon hunter action with jaw-dropping fights and rapid progression.
- **[Attack on Titan]** — The pinnacle of dark fantasy, high-stakes mystery, and relentless twists.
- **[Bocchi the Rock!]** — Hilarious, creative, and heartwarming slice of life with standout visual direction.

*(Note: AI server currently running in offline knowledge mode. Add your GEMINI_API_KEY for dynamic real-time querying!)*`,
      isFallback: true,
      suggestedAnime: [],
    };
  }
}
