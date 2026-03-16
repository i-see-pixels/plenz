import { IntentType } from "./intentDetector";

export interface Template {
    text: string;
    variables: string[];
}

export class TemplateEngine {
    private templates: Record<string, string[]> = {
        debugging: [
            "Analyze the following {framework} error and explain the root cause: {text}",
            "Provide a step-by-step debugging approach for {error_type} in {language} applications.",
            "Review this {framework} component and identify potential causes of {error_type}. Suggest fixes.",
            "Explain why this {language} code might be throwing a {error_type}."
        ],
        code_generation: [
            "Create a {framework} component that implements {topic}.",
            "Generate a {language} function to handle {topic}.",
            "Write a basic {framework} setup for {topic}.",
            "Implement {topic} using {language} and best practices."
        ],
        refactoring: [
            "Refactor the following {language} code to improve readability and performance: {text}",
            "Simplify this {framework} component while maintaining its functionality.",
            "Suggest modern {language} patterns to replace the legacy logic in this snippet.",
            "Identify code smells in this {language} code and provide a refactored version."
        ],
        learning: [
            "Explain the concept of {topic} in {framework} to a beginner.",
            "How does {topic} work in {language}? Provide examples.",
            "Compare {topic} with other similar concepts in {framework}.",
            "What are the best practices for using {topic} in {language}?"
        ],
        summarization: [
            "Summarize the key points of the following text: {text}",
            "Provide a brief TL;DR of this discussion on {topic}.",
            "Outline the main arguments in this {language} documentation snippet.",
            "Give me a bullet-point recap of the following content: {text}"
        ],
        writing: [
            "Draft a {topic} based on the following context: {text}",
            "Compose an email regarding {topic} that is professional and concise.",
            "Write a blog post intro about {topic} for {framework} developers.",
            "Create a structured outline for an article about {topic}."
        ],
        research: [
            "Research the latest trends in {topic} for {language} development.",
            "Find documentation and examples for {topic} in {framework}.",
            "Lookup common solutions for {topic} when using {language}.",
            "Provide a summary of available libraries for {topic} in {framework}."
        ],
        analysis: [
            "Analyze the architectural decisions in this {framework} project.",
            "Evaluate the performance implications of this {language} logic.",
            "Review the security aspects of the following code: {text}",
            "Critique this implementation of {topic} and suggest improvements."
        ],
        optimization: [
            "Optimize the following {language} code for better performance: {text}",
            "Identify performance bottlenecks in this {framework} component.",
            "Suggest ways to make this {topic} implementation more efficient in {language}.",
            "Provide an optimized version of this SQL query or algorithm."
        ],
        general: [
            "Help me improve this prompt: {text}",
            "Provide more detailed context for: {text}",
            "Suggest better ways to phrase this request: {text}"
        ]
    };

    getTemplates(intent: IntentType): string[] {
        return this.templates[intent] || this.templates.general;
    }
}
