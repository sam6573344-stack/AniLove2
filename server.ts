import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // AI Anime Quiz Generator with Google Search Grounding (Strictly In-Universe Story & Manga Lore)
  app.post('/api/ai/quiz', async (req, res) => {
    try {
      const { animeTitle, animeId, genres } = req.body;
      if (!animeTitle) {
        res.status(400).json({ error: 'Anime title is required' });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.json({
          animeTitle,
          questions: generateFallbackQuiz(animeTitle),
          isFallback: true,
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      const prompt = `Generate exactly 5 thrilling, in-depth multiple-choice quiz questions for the anime "${animeTitle}".

CRITICAL RULES (STRICTLY IN-UNIVERSE STORY & CANON ONLY):
1. Focus 100% exclusively on the internal story, plot events, character backstories, secret origins, fight outcomes, techniques/powers, deaths, emotional connections, and canon details from the anime and manga/light novels.
2. Example questions: "Who defeated Rengoku in the Mugen Train arc?", "What is the true origin of Tanjiro's Sun Breathing?", "Why did Itachi make his tragic sacrifice?", "What was revealed in the flashback about character X's past?", "Which ability was used to counter villain Y?".
3. STRICTLY FORBIDDEN: Do NOT ask about animation studios (Ufotable, MAPPA, etc.), voice actors, release dates, box office gross, TV ratings, episode counts, or real-world awards. Fans want deep story and character lore!
4. Make 4 clear options for each question (A, B, C, D) with exactly 1 correct answer. Provide a detailed 1-2 sentence canon explanation for the correct answer.

Respond ONLY with valid JSON in this exact structure, with no extra markdown codeblocks or conversational text:
{
  "questions": [
    {
      "id": 1,
      "question": "In-universe story question here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Canon story explanation of why this is true."
    }
  ]
}`;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        const rawText = response.text || '';
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
            title: chunk.web?.title || 'Google Search Source',
            url: chunk.web?.uri || '',
          })).filter((s: any) => Boolean(s.url)) || [];

          res.json({
            animeTitle,
            questions: parsed.questions || generateFallbackQuiz(animeTitle),
            groundingSources,
            isFallback: false,
          });
          return;
        }
      } catch (genError) {
        console.warn('Gemini 3.7 Flash Search Grounding error, falling back:', genError);
      }

      // Fallback
      res.json({
        animeTitle,
        questions: generateFallbackQuiz(animeTitle),
        isFallback: true,
      });
    } catch (error: any) {
      console.error('Quiz Generation Error:', error);
      res.json({
        animeTitle: req.body?.animeTitle || 'Anime',
        questions: generateFallbackQuiz(req.body?.animeTitle || 'Anime'),
        isFallback: true,
      });
    }
  });

  // AI Anime Fun Facts Generator with Google Search Grounding (Story, Backstories & Manga Canon Lore)
  app.post('/api/ai/facts', async (req, res) => {
    try {
      const { animeTitle, animeId, genres } = req.body;
      if (!animeTitle) {
        res.status(400).json({ error: 'Anime title is required' });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.json({
          animeTitle,
          facts: generateFallbackFacts(animeTitle),
          isFallback: true,
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      const prompt = `Find exactly 5 fascinating, emotional, and little-known IN-UNIVERSE fun facts and canon story lore about the anime "${animeTitle}".

CRITICAL RULES (STRICTLY IN-UNIVERSE STORY, BACKSTORIES & MANGA/NOVEL LORE):
1. Focus 100% on the fictional universe: character backstories, tragic or heartwarming personal trivia, hidden pasts, manga-exclusive details left out of the anime adaptation, character habits, secret relationships, ability origins, and emotional story moments.
2. Example style:
   - "After Kyojuro Rengoku died, his younger brother Senjuro never celebrated his own birthday again because Kyojuro was the only one in the family who used to celebrate it with him."
   - "Levi Ackerman suffers from severe insomnia and sleeps only 2-3 hours a night in a chair without taking off his uniform."
   - "In Jujutsu Kaisen, Satoru Gojo constantly eats sweets and candy because using the Six Eyes burns so much mental energy that his brain craves sugar."
3. STRICTLY FORBIDDEN: Do NOT include meta production trivia about animation studios (MAPPA, Ufotable, Bones), budget, director names, voice actors, Blu-ray sales, or box office revenue. Keep everything 100% inside the story and lore!
4. Categorize each fact accurately (e.g. "Character Backstory", "Manga-Exclusive Lore", "Hidden Past", "Canon Ability Secrets", "Emotional Bond").

Respond ONLY with valid JSON in this exact structure, with no markdown code fences or conversational text:
{
  "facts": [
    {
      "id": 1,
      "fact": "Rich story or character lore fact with specific names and details.",
      "category": "Character Backstory / Manga Cut Lore / Secret Past"
    }
  ]
}`;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        const rawText = response.text || '';
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
            title: chunk.web?.title || 'Google Search Source',
            url: chunk.web?.uri || '',
          })).filter((s: any) => Boolean(s.url)) || [];

          res.json({
            animeTitle,
            facts: parsed.facts || generateFallbackFacts(animeTitle),
            groundingSources,
            isFallback: false,
          });
          return;
        }
      } catch (genError) {
        console.warn('Gemini 3.7 Flash Facts Error, falling back:', genError);
      }

      res.json({
        animeTitle,
        facts: generateFallbackFacts(animeTitle),
        isFallback: true,
      });
    } catch (error: any) {
      console.error('Facts Generation Error:', error);
      res.json({
        animeTitle: req.body?.animeTitle || 'Anime',
        facts: generateFallbackFacts(req.body?.animeTitle || 'Anime'),
        isFallback: true,
      });
    }
  });

  // AI Anime Sensei chat proxy endpoint
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { message, context, mode = 'general' } = req.body;

      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Fallback intelligent response if no API key is provided
        res.json({
          reply: generateSmartFallbackReply(message, context, mode),
          isFallback: true,
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      
      const systemInstruction = `You are "AniAI Sensei", the ultra-knowledgeable, friendly, and enthusiastic anime expert and guide for AniLove.
Your mission is to provide accurate, engaging, and well-structured anime recommendations, watch order guides, character lore explanations, and spoiler-free insights.

Guidelines:
1. Always format anime titles in bold brackets like **[Attack on Titan]** or **[Steins;Gate]** so the app can detect and create interactive media cards for them.
2. Keep responses concise, well-formatted with markdown bullet points, emojis where appropriate, and clear headings.
3. If asked for recommendations, always mention the genre, episode count, why it matches the user's taste, and what makes it special.
4. If asked about watch order (e.g. Fate series, Monogatari series), clearly delineate between Chronological Order and Release/Recommended Order with numbered steps.
5. Strictly avoid major unmarked spoilers. Clearly warn before mild thematic spoilers.
6. Context provided by app: Current anime: "${context?.currentAnime || 'None'}", User genres: "${(context?.genres || []).join(', ')}", Library size: ${context?.libraryCount || 0}.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\nUser Query: ${message}` }],
          },
        ],
      });

      const reply = response.text || 'I could not generate an anime recommendation at this moment.';
      res.json({ reply, isFallback: false });
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      const { message, context, mode = 'general' } = req.body || {};
      res.json({
        reply: generateSmartFallbackReply(message || '', context, mode),
        isFallback: true,
      });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AniLove server running on http://0.0.0.0:${PORT}`);
  });
}

// Smart offline/fallback responses for key anime questions
function generateSmartFallbackReply(query: string, context?: any, _mode: string = 'general'): string {
  const q = query.toLowerCase();

  if (q.includes('fate') && (q.includes('order') || q.includes('watch'))) {
    return `### 🧭 **Fate Series: Recommended Watch Order**

The Fate franchise can be intimidating, but here is the definitive community-approved route:

1. **[Fate/stay night: Unlimited Blade Works]** (Ufotable TV Series - 2014) — *Best entry point! Gorgeous animation and introduces the Holy Grail War fundamentals.*
2. **[Fate/stay night: Heaven's Feel]** (Movie Trilogy: Presage Flower, Lost Butterfly, Spring Song) — *The darkest, highest budget visual masterpiece.*
3. **[Fate/Zero]** (2 Seasons - 2011) — *The prequel series. Watching this after UBW and Heaven's Feel delivers maximum narrative payoff without spoiling the mystery.*
4. **Spin-offs (Watch anytime after)**:
   - **[Fate/Apocrypha]** — Great 14-servant team war.
   - **[Fate/Grand Order: Absolute Demonic Front - Babylonia]** — Epic mythic action.`;
  }

  if (q.includes('monogatari') && (q.includes('order') || q.includes('watch'))) {
    return `### 📚 **Monogatari Series: Recommended Watch Order (Light Novel Order)**

1. **[Bakemonogatari]** (15 Episodes)
2. **[Kizumonogatari]** (Trilogy of movies: Tekketsu, Nekketsu, Reiketsu)
3. **[Nisemonogatari]** (11 Episodes)
4. **[Nekomonogatari: Kuro]** (4 Episodes)
5. **[Monogatari Series: Second Season]** (26 Episodes)
6. **[Hanamonogatari]** (5 Episodes)
7. **[Tsukimonogatari]** (4 Episodes)
8. **[Owarimonogatari]** (Season 1 & 2)
9. **[Zoku Owarimonogatari]** (6 Episodes)`;
  }

  if (q.includes('vibe') || q.includes('like') || q.includes('similar')) {
    return `### 🔮 **Vibe Matcher Recommendations**

Based on top acclaimed anime with gripping pacing, outstanding animation, and unforgettable characters:

- **[Jujutsu Kaisen]** — Modern occult dark fantasy with world-class fight choreography and pacing.
- **[Chainsaw Man]** — Gritty, cinematic, unhinged action with top-tier MAPPA production.
- **[Frieren: Beyond Journey's End]** — A deeply moving fantasy masterpiece about time, memory, and companionship.
- **[Solo Leveling]** — High-octane power progression, dynamic dungeon raids, and incredible musical score.
- **[Cyberpunk: Edgerunners]** — Fast-paced, visually electric sci-fi tragedy by Studio Trigger.`;
  }

  if (q.includes('gem') || q.includes('underrated')) {
    return `### 💎 **Hidden Gems & Modern Masterpieces**

Here are outstanding anime that deserve more spotlight:

- **[Odd Taxi]** — A witty, intricately plotted mystery thriller disguised as an anthropomorphic drama.
- **[The Apothecary Diaries]** — Fascinating historical mystery and palace intrigue with an endearing chemist protagonist.
- **[Summer Time Rendering]** — A thrilling supernatural time-loop mystery on a secluded Japanese island.
- **[Dungeon Meshi]** (Delicious in Dungeon) — Brilliant world-building blending classic D&D fantasy with culinary craft.
- **[Vivy: Fluorite Eye's Song]** — Sci-fi time travel AI spectacle with incredible Wit Studio animation.`;
  }

  return `### ✨ **AniAI Sensei Recommendations**

Here are highly acclaimed anime tailored for you:

- **[Frieren: Beyond Journey's End]** — Acclaimed #1 rated modern fantasy with heartfelt storytelling and spectacular battles.
- **[Attack on Titan]** — Epic dark fantasy mystery with relentless plot twists and jaw-dropping lore.
- **[Bocchi the Rock!]** — Heartwarming, inventive comedy with creative animation and relatable social awkwardness.
- **[Vinland Saga]** — Historic viking epic chronicling growth, vengeance, and true peace.

*💡 Tip: Type any anime title or ask me "What should I watch next if I loved X?" or "Explain the timeline of Y"!*`;
}

// Fallback anime quiz generator (In-Universe Story, Fights, Backstories & Canon)
function generateFallbackQuiz(title: string) {
  const cleanTitle = title || 'Anime';
  const lower = cleanTitle.toLowerCase();

  if (lower.includes('demon slayer') || lower.includes('kimetsu')) {
    return [
      {
        id: 1,
        question: 'Who killed Flame Hashira Kyojuro Rengoku during the climax of the Mugen Train arc?',
        options: ['Upper Moon Three Akaza', 'Upper Moon One Kokushibo', 'Upper Moon Two Doma', 'Muzan Kibutsuji'],
        correctIndex: 0,
        explanation: 'Akaza fatally wounded Rengoku with his Destructive Death technique, though Rengoku fought bravely until the morning sunrise.',
      },
      {
        id: 2,
        question: 'What is the true origin of Tanjiro Kamado\'s Hinokami Kagura dance passed down by his father?',
        options: ['It is the primordial Sun Breathing style', 'It is an ancient Water Breathing technique', 'It is a form of Thunder Breathing', 'It is a ritual to summon mountain gods'],
        correctIndex: 0,
        explanation: 'The Hinokami Kagura dance is the legendary Sun Breathing, originally created by Yoriichi Tsugikuni and taught to Tanjiro\'s ancestor Sumiyoshi.',
      },
      {
        id: 3,
        question: 'Why did Inosuke Hashibira originally grow up wearing a hollowed boar head?',
        options: ['He was raised by a wild female boar who cared for him as her child', 'It was a prize from his first demon kill', 'His grandfather gifted it to hide his handsome face', 'To intimidate rival mountain hunters'],
        correctIndex: 0,
        explanation: 'After his mother Kotoha threw him off a cliff to save him from Doma, Inosuke was adopted and raised by a mountain boar.',
      },
      {
        id: 4,
        question: 'What unique physical condition prevents Genya Shinazugawa from using Breathing Styles?',
        options: ['He cannot use breathing styles, but can consume demon flesh to gain demon powers temporarily', 'He has broken spiritual pressure', 'He lost his internal lungs in an accident', 'He only uses firearms without stamina'],
        correctIndex: 0,
        explanation: 'Genya has special digestive organs that allow him to temporarily gain demon physiology and healing by ingesting demon flesh.',
      },
      {
        id: 5,
        question: 'What tragic reason made Giyu Tomioka believe he was unfit to be the Water Hashira?',
        options: ['His best friend Sabito sacrificed his life to save everyone in the Final Selection while Giyu was unconscious', 'He failed to master the 11th form', 'Urokodaki expelled him for mercy to demons', 'He injured his master\'s sword'],
        correctIndex: 0,
        explanation: 'Giyu felt immense survivor\'s guilt because Sabito defeated almost every demon during the selection to save others before perishing to the Hand Demon.',
      },
    ];
  }

  if (lower.includes('jujutsu kaisen') || lower.includes('jjk')) {
    return [
      {
        id: 1,
        question: 'What condition does Satoru Gojo\'s Limitless technique require in order to be used to its absolute fullest potential?',
        options: ['Possession of the Six Eyes (Rikugan)', 'A Heavenly Restriction pact', 'Consuming a special-grade cursed object', 'Performing a reverse blood ritual'],
        correctIndex: 0,
        explanation: 'The Six Eyes allow the bearer to process cursed energy at an atomic level, making the infinite calculation of Limitless feasible without brain burnout.',
      },
      {
        id: 2,
        question: 'Why was Toji Fushiguro able to bypass Tengen\'s barrier and defeat Gojo during the Hidden Inventory arc?',
        options: ['His Heavenly Restriction granted zero cursed energy and superhuman physical senses', 'He drank the cursed blood of Sukuna', 'He stole the Prison Realm', 'He was immune to domain expansions'],
        correctIndex: 0,
        explanation: 'Having zero cursed energy made Toji invisible to cursed barriers and undetectable by normal jujutsu sensory perception.',
      },
      {
        id: 3,
        question: 'What was the true identity and vessel of the cursed spirit manipulator Kenjaku in Shibuya?',
        options: ['He was inhabiting the corpse of Suguru Geto', 'He was a cursed illusion cast by Mahito', 'He was Gojo\'s former teacher disguised', 'He was an avatar of Ryomen Sukuna'],
        correctIndex: 0,
        explanation: 'Kenjaku transplanted his own brain into Suguru Geto\'s deceased body following the events of Jujutsu Kaisen 0.',
      },
      {
        id: 4,
        question: 'What is the binding rule of Megumi Fushiguro\'s Eight-Handled Sword Divergent Sila Divine General Mahoraga?',
        options: ['It adapts to any and all phenomena after taking damage from an attack', 'It reflects double damage instantly', 'It freezes all time within 50 meters', 'It permanently steals the opponent\'s cursed technique'],
        correctIndex: 0,
        explanation: 'Mahoraga\'s dharmachakra wheel turns when attacked, allowing it to adapt defensively and offensively to any technique.',
      },
      {
        id: 5,
        question: 'Why did Sukuna show sudden interest in Megumi Fushiguro rather than Yuji Itadori?',
        options: ['Sukuna recognized the potential of the Ten Shadows technique to create a new physical vessel', 'Megumi possessed the remaining fingers', 'Megumi knew the secret of Sukuna\'s true name', 'Sukuna wanted to kill Satoru Gojo alone'],
        correctIndex: 0,
        explanation: 'Sukuna realized Megumi\'s Ten Shadows technique could be exploited to bypass Gojo\'s infinity and serve as a pliable host vessel.',
      },
    ];
  }

  if (lower.includes('attack on titan') || lower.includes('shingeki')) {
    return [
      {
        id: 1,
        question: 'What was the shocking secret hidden inside the basement of Eren Yeager\'s childhood home in Shiganshina?',
        options: ['Three journals and a photograph revealing humanity thrives in civilization outside the Walls in Marley', 'The original Titan serum synthesized by King Fritz', 'A map of the Colossal Titans buried underground', 'Grisha\'s secret diary ordering Eren to destroy the world'],
        correctIndex: 0,
        explanation: 'Grisha\'s photograph proved that humanity was not extinct outside the island, exposing the 100-year deception of the Eldian King.',
      },
      {
        id: 2,
        question: 'Why did Eren Kruger choose Grisha Yeager to inherit the Attack Titan in Marley?',
        options: ['He saw Grisha\'s burning hatred for oppression and drive to restore Eldia after his sister Faye\'s murder', 'Grisha had royal Fritz blood', 'Grisha was the strongest Eldian warrior candidate', 'Grisha discovered the Founding Titan\'s location first'],
        correctIndex: 0,
        explanation: 'Kruger passed the Attack Titan to Grisha at the border wall, urging him to start a family on Paradis to save Mikasa and Armin.',
      },
      {
        id: 3,
        question: 'What unique ability of the Attack Titan allowed Eren to influence past inheritors like Grisha?',
        options: ['The ability to perceive the memories of future successors and share memories across time', 'Immunity to the 13-year curse of Ymir', 'The power to command Pure Titans without royal blood', 'Instantaneous crystal hardening across the body'],
        correctIndex: 0,
        explanation: 'The Attack Titan transcends time by receiving memories of its future inheritors, allowing Eren to push Grisha into slaughtering the Reiss family.',
      },
      {
        id: 4,
        question: 'Who was the true mastermind who broke Wall Maria alongside Reiner (Armored) and Bertolt (Colossal)?',
        options: ['Annie Leonhart (Female Titan)', 'Marcel Galliard (Jaw Titan)', 'Zeke Yeager (Beast Titan)', 'Pieck Finger (Cart Titan)'],
        correctIndex: 0,
        explanation: 'Annie gathered hordes of Pure Titans using her scream to direct them straight into the breach in Shiganshina.',
      },
      {
        id: 5,
        question: 'Why did Levi Ackerman choose Armin Arlert over Commander Erwin Smith for the Titan injection serum?',
        options: ['He wanted Erwin to finally be released from the hell of leadership, trusting Armin\'s uncorrupted dream of seeing the sea', 'Armin begged for his life', 'Erwin ordered Levi to save Armin before fainting', 'Armin had superior tactical strength'],
        correctIndex: 0,
        explanation: 'Levi chose to let Erwin rest in peace and entrusted humanity\'s future to Armin\'s optimistic vision for a world beyond the walls.',
      },
    ];
  }

  // Universal story lore fallback
  return [
    {
      id: 1,
      question: `What core emotional drive and vow motivates the protagonist's journey throughout "${cleanTitle}"?`,
      options: [
        `Protecting their companions and overcoming deep personal trauma or destiny`,
        `Seeking endless material wealth with no regard for others`,
        `Retiring peacefully as a shopkeeper in episode one`,
        `Abandoning their powers to become a bystander`,
      ],
      correctIndex: 0,
      explanation: `In "${cleanTitle}", the central conflict is defined by high-stakes moral choices, character sacrifices, and profound personal conviction.`,
    },
    {
      id: 2,
      question: `What makes the primary antagonist's ideology compelling in the universe of "${cleanTitle}"?`,
      options: [
        `Their tragic past, twisted sense of justice, or belief that their painful methods are necessary`,
        `They have no backstory or motivation at all`,
        `They accidentally became a villain by filling out the wrong form`,
        `They only want to steal candy from children on weekends`,
      ],
      correctIndex: 0,
      explanation: `Memorable antagonists in "${cleanTitle}" are mirrors to the protagonist, driven by ideological conviction and painful past experiences.`,
    },
    {
      id: 3,
      question: `How does the master or mentor figure influence the main hero's development in "${cleanTitle}"?`,
      options: [
        `By passing down vital combat philosophies, secret techniques, and personal sacrifices`,
        `By completely ignoring the protagonist throughout the storyline`,
        `By secretly working as a comedian with no combat skills`,
        `By leaving the story permanently after five seconds`,
      ],
      correctIndex: 0,
      explanation: `Mentor figures provide the philosophical foundation and combat discipline required to survive the story's deadliest trials.`,
    },
    {
      id: 4,
      question: `What critical turning point or plot revelation shifts the trajectory of the main arc in "${cleanTitle}"?`,
      options: [
        `A shocking betrayal, secret lineage reveal, or catastrophic loss of a beloved ally`,
        `A peaceful picnic where nothing changes for the rest of the series`,
        `The characters forgetting their mission and going on vacation`,
        `The main villain giving up for no reason`,
      ],
      correctIndex: 0,
      explanation: `Crucial plot turning points test the hero's resolve and force them to awaken new inner strength or tactical mastery.`,
    },
    {
      id: 5,
      question: `What ultimate truth or relationship bond anchors the emotional climax in "${cleanTitle}"?`,
      options: [
        `The unbreakable bonds forged through shared suffering, loyalty, and self-sacrifice`,
        `Relying purely on raw ego without trusting any comrades`,
        `Running away when the final conflict begins`,
        `Discovering that the whole story was just a video game simulation`,
      ],
      correctIndex: 0,
      explanation: `The climax rewards emotional growth and trust forged through shared trials across the entire narrative journey.`,
    },
  ];
}

// Fallback anime fun facts generator (Strictly In-Universe Story, Backstories & Manga Lore)
function generateFallbackFacts(title: string) {
  const cleanTitle = title || 'Anime';
  const lower = cleanTitle.toLowerCase();

  if (lower.includes('demon slayer') || lower.includes('kimetsu')) {
    return [
      {
        id: 1,
        fact: 'Heartbreaking Backstory: After Kyojuro Rengoku died, his younger brother Senjuro never celebrated his own birthday again, because Kyojuro was the only person in the family who made sure to celebrate it with him.',
        category: 'Character Backstory',
      },
      {
        id: 2,
        fact: 'Manga Canon Secret: Sanemi Shinazugawa\'s rare "Marechi" blood is so intoxicating and potent to demons that even inhaling a whiff of it causes Upper Moon demons like Kokushibo to feel disoriented and drunk.',
        category: 'Manga Canon Lore',
      },
      {
        id: 3,
        fact: 'Tragic Past: Akaza (Hakuji) originally had a fiancée named Koyuki and a martial arts master Keizo. After a rival dojo poisoned their well and murdered both of them, Hakuji slaughtered all 67 dojo members barehanded in sheer grief before Muzan turned him into a demon.',
        category: 'Hidden Past',
      },
      {
        id: 4,
        fact: 'Character Bond: Shinobu Kocho wore the butterfly haori of her late sister Kanae Kocho, while Kanao Tsuyuri wore Kanae\'s hair clip to carry on her loving spirit in battle.',
        category: 'Emotional Bond',
      },
      {
        id: 5,
        fact: 'Canon Ability Secret: Yoriichi Tsugikuni was born with the Demon Slayer Mark and the Transparent World active, yet lived well past 80 years old, completely defying the fatal age-25 curse of the mark.',
        category: 'Power & Techniques',
      },
    ];
  }

  if (lower.includes('jujutsu kaisen') || lower.includes('jjk')) {
    return [
      {
        id: 1,
        fact: 'Canon Habit Secret: Satoru Gojo originally didn\'t care for sweet treats, but began constantly snacking on sugar and candy because operating the Six Eyes burns so much mental energy that his brain constantly demands glucose.',
        category: 'Character Lore',
      },
      {
        id: 2,
        fact: 'Hidden Past: In Jujutsu Kaisen 0, Suguru Geto genuinely considered Satoru Gojo his "one and only best friend" until his dying breath, and Gojo refused to allow anyone else to execute Geto.',
        category: 'Emotional Bond',
      },
      {
        id: 3,
        fact: 'Manga-Exclusive Detail: Kento Nanami originally worked as a high-earning financial stockbroker after graduation, but returned to jujutsu sorcery after realizing that saving ordinary people brought real meaning to his existence.',
        category: 'Character Backstory',
      },
      {
        id: 4,
        fact: 'Technique Lore: Megumi Fushiguro\'s Divine Dog (Totality) combined the essence of his slain white Divine Dog into his surviving black dog, inheriting all the power and speed of both shikigami.',
        category: 'Power & Techniques',
      },
      {
        id: 5,
        fact: 'Deep Canon Lore: Ryomen Sukuna in the Heian Era was not an incarnated demon god from folklore, but a human sorcerer whose overwhelming prowess and four-armed anatomy made people fear him like a natural disaster.',
        category: 'Ancient Lore',
      },
    ];
  }

  if (lower.includes('attack on titan') || lower.includes('shingeki')) {
    return [
      {
        id: 1,
        fact: 'Character Quirk & Trauma: Captain Levi Ackerman suffers from severe chronic insomnia, sleeping only 2 to 3 hours a night in a chair without taking off his Scout uniform so he is always ready for danger.',
        category: 'Character Backstory',
      },
      {
        id: 2,
        fact: 'Manga Cut Lore: The dark red scarf Mikasa wears was wrapped around her by Eren on the day he saved her life from human traffickers; she wore it every single day for over a decade as her anchor to life.',
        category: 'Emotional Bond',
      },
      {
        id: 3,
        fact: 'Hidden Origin: Sasha Blouse was originally planned by author Hajime Isayama to die much earlier in the Clash of the Titans arc, but the editor cried in the bathroom after reading the storyboard, prompting Isayama to spare her until Marley.',
        category: 'Canon Story Arc',
      },
      {
        id: 4,
        fact: 'Titan Lore: The Founding Titan\'s vow renouncing war, enacted by the 145th King Karl Fritz, forced all royal inheritors to submit to pacifism, which is why Eren Yeager needed to bypass royal succession to act freely.',
        category: 'Hidden Past',
      },
      {
        id: 5,
        fact: 'Emotional Detail: Erwin Smith\'s famous final charge was not motivated by glory, but by his quiet agony that he had sent thousands of young soldiers to their deaths while secretly chasing the truth in his father\'s basement.',
        category: 'Character Backstory',
      },
    ];
  }

  return [
    {
      id: 1,
      fact: `Character Backstory: In the canon universe of "${cleanTitle}", the protagonist carries a hidden scar and personal oath shaped by a pivotal childhood loss or mentor sacrifice.`,
      category: 'Character Backstory',
    },
    {
      id: 2,
      fact: `Manga & Novel Cut Lore: Several subtle emotional exchanges and character origins that appeared in the original source material provide deeper context for key relationships in "${cleanTitle}".`,
      category: 'Manga Canon Lore',
    },
    {
      id: 3,
      fact: `Secret Techniques: The signature technique used during the climactic duel of "${cleanTitle}" required strict self-imposed restrictions or immense physical toll to execute.`,
      category: 'Power & Techniques',
    },
    {
      id: 4,
      fact: `Hidden Past: Key supporting allies in "${cleanTitle}" possess interconnected backstories that quietly shaped major events before the story\'s opening chapter.`,
      category: 'Hidden Lore',
    },
    {
      id: 5,
      fact: `Emotional Bond: The emotional core of "${cleanTitle}" rests on promises made between allies during times of deep vulnerability and shared hardship.`,
      category: 'Emotional Bond',
    },
  ];
}

startServer();
