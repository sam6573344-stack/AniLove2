import { Anime, GachaCard, UserMediaListItem } from '../types';
import { executeQuery } from './anilist';

export interface AnimeCharacterProfile {
  id: number;
  name: string;
  nativeName?: string;
  image: string;
  animeId: number;
  animeTitle: string;
  role: 'Main' | 'Supporting' | 'Protagonist' | 'Antagonist' | string;
  voiceActor?: string;
  quote?: string;
}

// Built-in rich character pool for top anime
export const ICONIC_CHARACTERS_POOL: AnimeCharacterProfile[] = [
  // Frieren
  {
    id: 1001,
    name: 'Frieren',
    nativeName: 'フリーレン',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b176754-C30kZ089j4r0.png',
    animeId: 154587,
    animeTitle: "Frieren: Beyond Journey's End",
    role: 'Protagonist',
    voiceActor: 'Atsumi Tanezaki',
    quote: 'It is the courage to stand up and face the unknown that makes us truly alive.',
  },
  {
    id: 1002,
    name: 'Fern',
    nativeName: 'フェルン',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b176755-kL60u6N77rY8.jpg',
    animeId: 154587,
    animeTitle: "Frieren: Beyond Journey's End",
    role: 'Main',
    voiceActor: 'Kana Ichinose',
    quote: 'Master Frieren, please wake up. We have a long journey ahead.',
  },
  {
    id: 1003,
    name: 'Stark',
    nativeName: 'シュタルク',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b176756-xQfF9b0R6nNq.jpg',
    animeId: 154587,
    animeTitle: "Frieren: Beyond Journey's End",
    role: 'Main',
    voiceActor: 'Chiaki Kobayashi',
    quote: 'Even if my knees are trembling, I will stand and fight with my axe.',
  },
  // Attack on Titan
  {
    id: 1004,
    name: 'Levi Ackerman',
    nativeName: 'リヴァイ・アッカーマン',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b45627-7nU2Q0m9p3eD.png',
    animeId: 16498,
    animeTitle: 'Attack on Titan',
    role: 'Main',
    voiceActor: 'Hiroshi Kamiya',
    quote: 'Give up on your dreams and die for us. Lead the recruits straight into hell.',
  },
  {
    id: 1005,
    name: 'Eren Yeager',
    nativeName: 'エレン・イェーガー',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b40882-sQ5u2k3V9h4N.png',
    animeId: 16498,
    animeTitle: 'Attack on Titan',
    role: 'Protagonist',
    voiceActor: 'Yuki Kaji',
    quote: 'If you win, you live. If you lose, you die. If you do not fight, you cannot win!',
  },
  {
    id: 1006,
    name: 'Mikasa Ackerman',
    nativeName: 'ミカサ・アッカーマン',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b40881-r0M2o7p7L0fQ.png',
    animeId: 16498,
    animeTitle: 'Attack on Titan',
    role: 'Main',
    voiceActor: 'Yui Ishikawa',
    quote: 'This world is cruel, but it is also very beautiful.',
  },
  // Jujutsu Kaisen
  {
    id: 1007,
    name: 'Satoru Gojo',
    nativeName: '五条 悟',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b127691-D3fXjW7iL5Xz.png',
    animeId: 113415,
    animeTitle: 'Jujutsu Kaisen',
    role: 'Main',
    voiceActor: 'Yuichi Nakamura',
    quote: 'Throughout heaven and earth, I alone am the honored one.',
  },
  {
    id: 1008,
    name: 'Yuji Itadori',
    nativeName: '虎杖 悠仁',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b127690-X1900Fp04X8k.png',
    animeId: 113415,
    animeTitle: 'Jujutsu Kaisen',
    role: 'Protagonist',
    voiceActor: 'Junya Enoki',
    quote: 'I want to live a life with no regrets and save as many people as I can.',
  },
  {
    id: 1009,
    name: 'Megumi Fushiguro',
    nativeName: '伏黒 恵',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b127692-f0464P4aA6zZ.png',
    animeId: 113415,
    animeTitle: 'Jujutsu Kaisen',
    role: 'Main',
    voiceActor: 'Yuma Uchida',
    quote: 'I will save people unequally according to my own convictions.',
  },
  // Demon Slayer
  {
    id: 1010,
    name: 'Tanjiro Kamado',
    nativeName: '竈門 炭治郎',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b126071-Gf9p2W6p7L0.png',
    animeId: 101922,
    animeTitle: 'Demon Slayer: Kimetsu no Yaiba',
    role: 'Protagonist',
    voiceActor: 'Natsuki Hanae',
    quote: 'No matter how many people you may lose, you have no choice but to go on living.',
  },
  {
    id: 1011,
    name: 'Nezuko Kamado',
    nativeName: '竈門 禰豆子',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b126072-88B1o1k6q3a7.png',
    animeId: 101922,
    animeTitle: 'Demon Slayer: Kimetsu no Yaiba',
    role: 'Main',
    voiceActor: 'Akari Kito',
    quote: 'Humans are to be protected and saved... I will never hurt them.',
  },
  {
    id: 1012,
    name: 'Kyojuro Rengoku',
    nativeName: '煉獄 杏寿郎',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b126077-wQ6M4z2O7p9k.png',
    animeId: 101922,
    animeTitle: 'Demon Slayer: Kimetsu no Yaiba',
    role: 'Main',
    voiceActor: 'Satoshi Hino',
    quote: 'Set your heart ablaze! Go beyond your limits!',
  },
  // Death Note
  {
    id: 1013,
    name: 'L Lawliet',
    nativeName: 'エル・ローライト',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b71-3m6z9M1k0qP4.png',
    animeId: 1535,
    animeTitle: 'Death Note',
    role: 'Main',
    voiceActor: 'Kappei Yamaguchi',
    quote: 'There are many types of monsters in this world... Monsters who will not show themselves.',
  },
  {
    id: 1014,
    name: 'Light Yagami',
    nativeName: '夜神 月',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b80-V9h4b2a8z1N6.png',
    animeId: 1535,
    animeTitle: 'Death Note',
    role: 'Protagonist',
    voiceActor: 'Mamoru Miyano',
    quote: 'I will become the god of the new world!',
  },
  // Hunter x Hunter
  {
    id: 1015,
    name: 'Killua Zoldyck',
    nativeName: 'キルア＝ゾルディック',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b27-o9k2m1q7w5p.png',
    animeId: 11061,
    animeTitle: 'Hunter x Hunter',
    role: 'Main',
    voiceActor: 'Mariya Ise',
    quote: 'Gon, you are light. Sometimes you shine so brightly, I must look away.',
  },
  {
    id: 1016,
    name: 'Gon Freecss',
    nativeName: 'ゴン＝フリークス',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b30-q2p8m9k1w5o.png',
    animeId: 11061,
    animeTitle: 'Hunter x Hunter',
    role: 'Protagonist',
    voiceActor: 'Megumi Han',
    quote: 'If you want to get to know someone, find out what makes them angry.',
  },
  // One Piece
  {
    id: 1017,
    name: 'Monkey D. Luffy',
    nativeName: 'モンキー・D・ルフィ',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b40-8b0Q4f6G2h8k.png',
    animeId: 21,
    animeTitle: 'One Piece',
    role: 'Protagonist',
    voiceActor: 'Mayumi Tanaka',
    quote: "I'm going to be the King of the Pirates!",
  },
  {
    id: 1018,
    name: 'Roronoa Zoro',
    nativeName: 'ロロノア・ゾロ',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b62-6Z1k8f0G9q2w.png',
    animeId: 21,
    animeTitle: 'One Piece',
    role: 'Main',
    voiceActor: 'Kazuya Nakai',
    quote: 'Scars on the back are a swordsman’s shame.',
  },
  // Fullmetal Alchemist
  {
    id: 1019,
    name: 'Edward Elric',
    nativeName: 'エドワード・エルリック',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b11-9Q5b1k8Z2w7x.png',
    animeId: 5114,
    animeTitle: 'Fullmetal Alchemist: Brotherhood',
    role: 'Protagonist',
    voiceActor: 'Romi Park',
    quote: 'A lesson without pain is meaningless.',
  },
  {
    id: 1020,
    name: 'Roy Mustang',
    nativeName: 'ロイ・マスタング',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b68-8M2n1k7w4q0a.png',
    animeId: 5114,
    animeTitle: 'Fullmetal Alchemist: Brotherhood',
    role: 'Main',
    voiceActor: 'Shinichiro Miki',
    quote: 'Nothing is impossible, and that includes alchemy.',
  },
  // Solo Leveling
  {
    id: 1021,
    name: 'Sung Jin-woo',
    nativeName: '성진우',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b139701-a1b2c3d4e5.png',
    animeId: 151807,
    animeTitle: 'Solo Leveling',
    role: 'Protagonist',
    voiceActor: 'Taito Ban',
    quote: 'Arise. From now on, you are my shadow army.',
  },
  // Spy x Family
  {
    id: 1022,
    name: 'Anya Forger',
    nativeName: 'アーニャ・フォージャー',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b147444-n1k8p3q7w0.png',
    animeId: 140960,
    animeTitle: 'SPY x FAMILY',
    role: 'Main',
    voiceActor: 'Atsumi Tanezaki',
    quote: 'Waku waku! Anya wants peanuts and to help world peace!',
  },
  {
    id: 1023,
    name: 'Loid Forger',
    nativeName: 'ロイド・フォージャー',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b147443-4m8q2p1w9k.png',
    animeId: 140960,
    animeTitle: 'SPY x FAMILY',
    role: 'Protagonist',
    voiceActor: 'Takuya Eguchi',
    quote: 'To create a world where children do not need to cry.',
  },
  // Steins;Gate
  {
    id: 1024,
    name: 'Rintaro Okabe',
    nativeName: '岡部 倫太郎',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b35252-a1b2c3d4.png',
    animeId: 9253,
    animeTitle: 'Steins;Gate',
    role: 'Protagonist',
    voiceActor: 'Mamoru Miyano',
    quote: 'I am the mad scientist, Hououin Kyouma! El Psy Kongroo.',
  },
  {
    id: 1025,
    name: 'Kurisu Makise',
    nativeName: '牧瀬 紅莉栖',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b35253-x1y2z3w4.png',
    animeId: 9253,
    animeTitle: 'Steins;Gate',
    role: 'Main',
    voiceActor: 'Asami Imai',
    quote: 'Time is passing so fast. Let’s make this moment eternal.',
  },
  // Chainsaw Man
  {
    id: 1026,
    name: 'Power',
    nativeName: 'パワー',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b137080-w1q9m2p7.png',
    animeId: 127230,
    animeTitle: 'Chainsaw Man',
    role: 'Main',
    voiceActor: 'Fairouz Ai',
    quote: 'Bow before me, human! For I am the Blood Devil!',
  },
  {
    id: 1027,
    name: 'Denji',
    nativeName: 'デンジ',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b137079-q8p2m1k4.png',
    animeId: 127230,
    animeTitle: 'Chainsaw Man',
    role: 'Protagonist',
    voiceActor: 'Kikunosuke Toya',
    quote: 'Everyone wants to touch a dream. I just want jam on my toast!',
  },
  // Naruto
  {
    id: 1028,
    name: 'Itachi Uchiha',
    nativeName: 'うちは イタチ',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b14-m1k8q2p9.png',
    animeId: 1735,
    animeTitle: 'Naruto Shippuden',
    role: 'Supporting',
    voiceActor: 'Hideo Ishikawa',
    quote: 'No matter what you decide to do from now on, I will love you always.',
  },
  {
    id: 1029,
    name: 'Kakashi Hatake',
    nativeName: 'はたけ カカシ',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b85-8q1m4p2k.png',
    animeId: 1735,
    animeTitle: 'Naruto Shippuden',
    role: 'Main',
    voiceActor: 'Kazuhiko Inoue',
    quote: 'Those who break the rules are scum, but those who abandon their friends are worse than scum.',
  },
  // Bleach
  {
    id: 1030,
    name: 'Ichigo Kurosaki',
    nativeName: '黒崎 一護',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b5-q1m8k4p2.png',
    animeId: 269,
    animeTitle: 'Bleach',
    role: 'Protagonist',
    voiceActor: 'Masakazu Morita',
    quote: 'I do not fight because I think I can win. I fight because I have to fight!',
  },
];

// Query characters from AniList GraphQL for any custom anime
export async function fetchCharactersForAnime(animeId: number): Promise<AnimeCharacterProfile[]> {
  const query = `
    query ($animeId: Int) {
      Media (id: $animeId, type: ANIME) {
        id
        title {
          english
          romaji
          userPreferred
        }
        characters (sort: ROLE, perPage: 10) {
          edges {
            role
            node {
              id
              name {
                full
                native
              }
              image {
                large
                medium
              }
            }
            voiceActors (language: JAPANESE) {
              name {
                full
              }
            }
          }
        }
      }
    }
  `;

  try {
    const data = await executeQuery<{
      Media: {
        id: number;
        title: { english?: string; romaji?: string; userPreferred?: string };
        characters: {
          edges: {
            role: string;
            node: {
              id: number;
              name: { full: string; native?: string };
              image: { large?: string; medium?: string };
            };
            voiceActors?: { name: { full: string } }[];
          }[];
        };
      };
    }>(query, { animeId });

    if (!data.Media?.characters?.edges?.length) {
      return [];
    }

    const animeTitle =
      data.Media.title.english || data.Media.title.userPreferred || data.Media.title.romaji || 'Anime';

    return data.Media.characters.edges.map(edge => ({
      id: edge.node.id,
      name: edge.node.name.full,
      nativeName: edge.node.name.native,
      image: edge.node.image?.large || edge.node.image?.medium || '',
      animeId: data.Media.id,
      animeTitle,
      role: edge.role === 'MAIN' ? 'Main Character' : 'Supporting Character',
      voiceActor: edge.voiceActors?.[0]?.name?.full,
    }));
  } catch (err) {
    console.warn(`Could not fetch online characters for anime ${animeId}:`, err);
    return [];
  }
}

// Convert a character profile into a GachaCard
export function createCharacterCardFromProfile(profile: AnimeCharacterProfile): GachaCard {
  return {
    id: `char-${profile.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    animeId: profile.animeId,
    animeTitle: profile.animeTitle,
    characterName: profile.name,
    characterNativeName: profile.nativeName,
    characterImage: profile.image,
    imageUrl: profile.image,
    characterRole: profile.role,
    voiceActor: profile.voiceActor,
    quote: profile.quote,
    obtainedAt: Date.now(),
  };
}
