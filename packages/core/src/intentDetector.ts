export type IntentType =
  | "debugging"
  | "code_generation"
  | "refactoring"
  | "learning"
  | "summarization"
  | "writing"
  | "research"
  | "analysis"
  | "optimization"
  | "general";

export interface IntentMatch {
  intent: IntentType;
  confidence: number;
}

export class IntentDetector {
  private keywordMap: Record<IntentType, string[]> = {
    debugging: ["fix", "error", "bug", "issue", "fails", "doesn't work", "broken", "hydration", "mismatch"],
    code_generation: ["create", "generate", "write", "make", "build", "implement"],
    refactoring: ["refactor", "clean up", "improve", "simplify", "restructure"],
    learning: ["explain", "how does", "what is", "why", "understand", "learn"],
    summarization: ["summarize", "tl;dr", "brief", "outline", "recap"],
    writing: ["write", "draft", "compose", "email", "blog", "essay"],
    research: ["search", "find", "research", "lookup", "info", "information"],
    analysis: ["analyze", "evaluate", "review", "audit", "critique"],
    optimization: ["optimize", "performance", "fast", "slow", "efficient", "bottleneck"],
    general: []
  };

  detect(text: string): IntentMatch {
    const lowerText = text.toLowerCase();
    
    let bestIntent: IntentType = "general";
    let maxMatches = 0;

    for (const [intent, keywords] of Object.entries(this.keywordMap)) {
      if (intent === "general") continue;
      
      const matchCount = keywords.filter(kw => lowerText.includes(kw)).length;
      if (matchCount > maxMatches) {
        maxMatches = matchCount;
        bestIntent = intent as IntentType;
      }
    }

    // Simple confidence score based on matches
    const confidence = maxMatches > 0 ? Math.min(0.5 + (maxMatches * 0.1), 0.95) : 0.5;

    return {
      intent: bestIntent,
      confidence
    };
  }
}
