import { writeFileSync } from "node:fs"
import { resolve, isAbsolute } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT_DIR = resolve(fileURLToPath(new URL("..", import.meta.url)))
const DEFAULT_OUTPUT_FILE = resolve(ROOT_DIR, "scripts/prompt-catalog.popular-50.json")
const DEFAULT_LIMIT = 50
const SEARCH_ENDPOINT = "https://prompts.chat/api/prompts"

const CATEGORY_OVERRIDES = {
  "linux terminal": ["Coding", "Terminal", "Simulation"],
  "english translator and improver": ["Writing", "Translation", "Language Learning"],
  "job interviewer": ["Career", "Interview Prep", "Recruiting"],
  "javascript console": ["Coding", "JavaScript", "Simulation"],
  "excel sheet": ["Productivity", "Spreadsheets", "Simulation"],
  "english pronunciation helper": ["Language Learning", "Pronunciation", "English"],
  "spoken english teacher and improver": ["Language Learning", "English", "Conversation Practice"],
  "travel guide": ["Travel", "Local Discovery", "Recommendations"],
  "advertiser": ["Marketing", "Copywriting", "Advertising"],
  "storyteller": ["Writing", "Storytelling", "Creative"],
  "motivational coach": ["Coaching", "Productivity", "Personal Growth"],
  "debater": ["Writing", "Critical Thinking", "Argumentation"],
  "debate coach": ["Coaching", "Argumentation", "Public Speaking"],
  "screenwriter": ["Writing", "Scriptwriting", "Creative"],
  "novelist": ["Writing", "Fiction", "Creative"],
  "movie critic": ["Writing", "Film", "Review"],
  "relationship coach": ["Relationships", "Coaching", "Personal Growth"],
  "motivational speaker": ["Public Speaking", "Motivation", "Personal Growth"],
  "philosophy teacher": ["Education", "Philosophy", "Explainers"],
  "philosopher": ["Philosophy", "Critical Thinking", "Decision Making"],
  "math teacher": ["Education", "Mathematics", "Explainers"],
  "ai writing tutor": ["Writing", "Editing", "Education"],
  "ux ui developer": ["Design", "UX/UI", "Product Development"],
  "cyber security specialist": ["Security", "Coding", "Strategy"],
  "life coach": ["Coaching", "Personal Growth", "Planning"],
  "etymologist": ["Language", "Research", "Education"],
  "commentariat": ["Writing", "Opinion", "Current Events"],
  "magician": ["Entertainment", "Creative", "Performance"],
  "career counselor": ["Career", "Coaching", "Job Search"],
  "pet behaviorist": ["Pets", "Coaching", "Behavior"],
  "personal trainer": ["Fitness", "Coaching", "Health"],
  "real estate agent": ["Sales", "Real Estate", "Marketing"],
  "logistician": ["Operations", "Planning", "Supply Chain"],
  "web design consultant": ["Design", "Web", "Consulting"],
  "svg designer": ["Design", "SVG", "Coding"],
  "it architect": ["Architecture", "Systems Design", "Coding"],
  "journal reviewer": ["Research", "Academic Writing", "Review"],
  "social media influencer": ["Social Media", "Content Creation", "Marketing"],
  "socrat": ["Education", "Critical Thinking", "Socratic Dialogue"],
  "educational content creator": ["Education", "Content Creation", "Writing"],
  "essay writer": ["Writing", "Academic", "Long-form"],
  "chess player": ["Games", "Strategy", "Chess"],
  "r programming interpreter": ["Coding", "R", "Data Analysis"],
  "stackoverflow post": ["Coding", "Debugging", "Q&A"],
  "emoji translator": ["Translation", "Fun", "Communication"],
  "php interpreter": ["Coding", "PHP", "Simulation"],
  "software quality assurance tester": ["QA", "Testing", "Software"],
  "startup idea generator": ["Startups", "Ideation", "Business"],
  "product manager": ["Product Management", "Strategy", "Planning"],
  "regex generator": ["Coding", "Regex", "Developer Tools"],
}

const CANDIDATE_TITLES = [
  "Linux Terminal",
  "English Translator and Improver",
  "Job Interviewer",
  "JavaScript Console",
  "Excel Sheet",
  "English Pronunciation Helper",
  "Spoken English Teacher and Improver",
  "Travel Guide",
  "Character",
  "Advertiser",
  "Storyteller",
  "Motivational Coach",
  "Debater",
  "Debate Coach",
  "Screenwriter",
  "Novelist",
  "Movie Critic",
  "Relationship Coach",
  "Poet",
  "Motivational Speaker",
  "Philosophy Teacher",
  "Philosopher",
  "Math Teacher",
  "AI Writing Tutor",
  "UX/UI Developer",
  "Cyber Security Specialist",
  "Recruiter",
  "Life Coach",
  "Etymologist",
  "Commentariat",
  "Magician",
  "Career Counselor",
  "Pet Behaviorist",
  "Personal Trainer",
  "Real Estate Agent",
  "Logistician",
  "Web Design Consultant",
  "SVG Designer",
  "IT Architect",
  "Journal Reviewer",
  "Social Media Influencer",
  "Socrat",
  "Educational Content Creator",
  "Essay Writer",
  "Chess Player",
  "R Programming Interpreter",
  "StackOverflow Post",
  "Emoji Translator",
  "PHP Interpreter",
  "Software Quality Assurance Tester",
  "Startup Idea Generator",
  "Product Manager",
  "Regex Generator",
  "Public Speaking Coach",
  "Ascii Artist",
  "Tech Writer",
  "Journalist",
  "Chef",
  "Artist Advisor",
  "Interior Decorator",
  "Self-Help Book",
  "Text Based Adventure Game",
  "Fancy Title Generator",
  "Statistician",
  "Prompt Generator",
  "School Instructor",
  "Machine Learning Engineer",
  "Biblical Translator",
  "DIY Expert",
  "Yogi",
  "Food Critic",
  "Midjourney Prompt Generator",
  "Emergency Response Professional",
  "Fill in the Blank Worksheets Generator",
  "Password Generator",
  "New Language Creator",
  "Title Generator for Written Pieces",
  "Drunk Person",
  "Mathematician",
  "Time Travel Guide",
  "Dream Interpreter",
  "Talent Coach",
  "Personal Shopper",
  "Mental Health Adviser",
  "Accountant",
  "Tea-Taster",
  "Florist",
  "Gnomist",
  "Aphorism Book",
  "Automobile Mechanic",
  "Dentist",
]

function parseArgs(argv) {
  const args = {
    limit: DEFAULT_LIMIT,
    out: DEFAULT_OUTPUT_FILE,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]

    if (value === "--out" || value === "-o") {
      const nextValue = argv[index + 1]

      if (!nextValue) {
        throw new Error("Missing value for --out.")
      }

      args.out = nextValue
      index += 1
      continue
    }

    if (value === "--limit" || value === "-l") {
      const nextValue = argv[index + 1]

      if (!nextValue) {
        throw new Error("Missing value for --limit.")
      }

      const parsedLimit = Number(nextValue)

      if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
        throw new Error("--limit must be a positive integer.")
      }

      args.limit = parsedLimit
      index += 1
      continue
    }

    if (value === "--help" || value === "-h") {
      console.log(`Usage:
  node scripts/fetch-popular-prompt-catalog.mjs [--out ./path.json] [--limit 50]

Options:
  --out, -o     Output JSON path. Defaults to scripts/prompt-catalog.popular-50.json
  --limit, -l   Number of prompts to write. Defaults to 50
  --help, -h    Show this help message
`)
      process.exit(0)
    }

    throw new Error(`Unknown argument: ${value}`)
  }

  return args
}

function resolveOutputPath(filePath) {
  return isAbsolute(filePath) ? filePath : resolve(ROOT_DIR, filePath)
}

function normalizeTitle(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function uniqueValues(values) {
  return [...new Set(values)]
}

function pickExactMatch(title, prompts) {
  const normalizedTarget = normalizeTitle(title)

  return prompts.find((prompt) => normalizeTitle(prompt.title) === normalizedTarget) ?? null
}

async function searchPromptByTitle(title) {
  const url = new URL(SEARCH_ENDPOINT)
  url.searchParams.set("q", title)
  url.searchParams.set("perPage", "10")

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Search failed for "${title}" with ${response.status}.`)
  }

  const payload = await response.json()
  const prompts = Array.isArray(payload?.prompts) ? payload.prompts : []

  return pickExactMatch(title, prompts)
}

function toCatalogEntry(prompt, rank) {
  const normalizedTitle = normalizeTitle(prompt.title)
  const sourceCategory = prompt.category?.name ?? null
  const category = uniqueValues([
    ...(sourceCategory ? [sourceCategory] : []),
    ...(CATEGORY_OVERRIDES[normalizedTitle] ?? []),
  ])

  return {
    id: prompt.slug || slugify(prompt.title),
    title: prompt.title,
    slug: prompt.slug || slugify(prompt.title),
    prompt: prompt.content,
    category,
    trendScore: Math.max(100 - rank, 1),
    shareEnabled: true,
    createdAt: prompt.createdAt,
    updatedAt: prompt.updatedAt,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const outputPath = resolveOutputPath(args.out)
  const selectedPrompts = []

  for (const title of CANDIDATE_TITLES) {
    if (selectedPrompts.length >= args.limit) {
      break
    }

    const prompt = await searchPromptByTitle(title)

    if (!prompt) {
      console.warn(`No exact prompt match found for "${title}".`)
      continue
    }

    if (selectedPrompts.some((entry) => entry.slug === prompt.slug)) {
      continue
    }

    selectedPrompts.push(toCatalogEntry(prompt, selectedPrompts.length))
    console.log(`Resolved ${selectedPrompts.length}/${args.limit}: ${prompt.title}`)
  }

  if (selectedPrompts.length < args.limit) {
    throw new Error(
      `Only resolved ${selectedPrompts.length} prompt(s). Add more candidate titles before writing the batch.`,
    )
  }

  writeFileSync(outputPath, JSON.stringify(selectedPrompts, null, 2) + "\n", "utf8")
  console.log(`Wrote ${selectedPrompts.length} prompt(s) to ${outputPath}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
