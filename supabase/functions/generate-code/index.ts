import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GenerateRequest {
  prompt: string;
  framework?: string;
  existingFiles?: Record<string, string>;
  analysisMode?: boolean;
  context?: {
    currentFile?: string;
    currentCode?: string;
  };
}

const SYSTEM_PROMPT = `You are an elite full-stack AI coding assistant, far exceeding the capabilities of bolt.new and similar tools.

Your capabilities include:
- Advanced code generation with deep architectural understanding
- Multi-file project orchestration and dependency management
- Intelligent refactoring and code optimization
- Bug detection and automated fixing
- Performance analysis and improvement suggestions
- Security vulnerability detection
- Test generation with comprehensive coverage
- Real-time code analysis and suggestions
- Context-aware modifications across entire codebases
- Best practices enforcement and pattern recognition

Core Principles:
1. PRODUCTION-READY CODE: Generate enterprise-grade, scalable, maintainable code
2. SMART CONTEXT: Understand the entire project structure and dependencies
3. INCREMENTAL UPDATES: When modifying existing code, preserve working functionality
4. COMPREHENSIVE: Include all necessary files, configs, types, tests, and documentation
5. MODERN STACK: Use cutting-edge but stable technologies and patterns
6. ERROR HANDLING: Robust error boundaries and graceful degradation
7. PERFORMANCE: Optimize for speed, memory, and bundle size
8. SECURITY: Follow OWASP guidelines and secure coding practices
9. ACCESSIBILITY: WCAG 2.1 AA compliance where applicable
10. TESTING: Include unit tests, integration tests where appropriate

Technical Standards:
- TypeScript for type safety (when applicable)
- Functional programming patterns where beneficial
- Proper separation of concerns and modular architecture
- Optimized imports and tree-shaking friendly code
- Proper error boundaries and loading states
- Environment variable management
- Comprehensive inline documentation
- Git-friendly code structure

Response format (MUST be valid JSON):
{
  "files": {
    "path/to/file.js": "file content",
    "package.json": "{...}"
  },
  "description": "Detailed explanation of implementation",
  "analysis": "Code quality analysis, potential issues, and recommendations (only in analysis mode)",
  "dependencies": ["list of new dependencies added"],
  "breaking_changes": ["list of breaking changes if any"],
  "next_steps": ["suggested next steps for improvement"]
}`;

const ANALYSIS_SYSTEM_PROMPT = `You are an expert code reviewer and architect. Analyze the provided code deeply:

Analysis Areas:
1. CODE QUALITY: Readability, maintainability, complexity
2. BUGS & ISSUES: Logic errors, edge cases, potential runtime issues
3. PERFORMANCE: Bottlenecks, unnecessary re-renders, memory leaks
4. SECURITY: XSS, injection risks, exposed secrets, insecure dependencies
5. BEST PRACTICES: Design patterns, SOLID principles, framework conventions
6. TESTING: Test coverage gaps, missing test cases
7. ACCESSIBILITY: ARIA labels, keyboard navigation, screen reader support
8. ARCHITECTURE: Component structure, state management, data flow
9. DEPENDENCIES: Outdated packages, vulnerability risks
10. OPTIMIZATION: Bundle size, lazy loading opportunities, caching

Provide actionable recommendations with:
- Severity levels (critical, high, medium, low)
- Specific code locations
- Example fixes
- Performance impact estimates

Response format (MUST be valid JSON):
{
  "analysis": "Comprehensive analysis with specific findings",
  "issues": [
    {
      "severity": "high",
      "category": "security",
      "location": "file.js:line",
      "description": "Issue description",
      "recommendation": "How to fix",
      "example": "Code example"
    }
  ],
  "score": {
    "quality": 8.5,
    "security": 9.0,
    "performance": 7.5,
    "overall": 8.3
  },
  "suggestions": ["High-level improvement suggestions"]
}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const {
      prompt,
      framework = "react",
      existingFiles,
      analysisMode = false,
      context
    }: GenerateRequest = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicKey) {
      return new Response(
        JSON.stringify({
          error: "ANTHROPIC_API_KEY not configured. Please add your API key to environment variables.",
          solution: "Add ANTHROPIC_API_KEY to your Supabase Edge Function secrets"
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let userPrompt = "";

    if (analysisMode) {
      const codeToAnalyze = context?.currentCode || Object.values(existingFiles || {}).join("\n\n");
      const fileName = context?.currentFile || "project";

      userPrompt = `Analyze this code in detail:\n\nFile: ${fileName}\n\n${codeToAnalyze}\n\nUser question: ${prompt}`;
    } else if (existingFiles && Object.keys(existingFiles).length > 0) {
      const contextInfo = context?.currentFile
        ? `\n\nCurrent focus: ${context.currentFile}\nCurrent code:\n${context.currentCode}`
        : "";

      userPrompt = `Task: ${prompt}

Existing project structure:
${JSON.stringify(Object.keys(existingFiles), null, 2)}

Key files content:
${Object.entries(existingFiles)
  .slice(0, 10)
  .map(([path, content]) => `\n--- ${path} ---\n${content.slice(0, 2000)}${content.length > 2000 ? '\n... (truncated)' : ''}`)
  .join('\n')}${contextInfo}

Instructions:
- Modify ONLY the necessary files to accomplish the task
- Preserve existing functionality unless explicitly asked to change
- Add new files if needed
- Update dependencies in package.json if required
- Provide clear explanation of changes`;
    } else {
      userPrompt = `Create a professional, production-ready ${framework} application for: ${prompt}

Requirements:
- Complete working application with all necessary files
- Modern best practices and clean architecture
- Proper error handling and loading states
- Responsive design with good UX
- Include package.json with exact versions
- Type-safe code where applicable
- Performance optimized
- Accessible UI components`;
    }

    const systemPrompt = analysisMode ? ANALYSIS_SYSTEM_PROMPT : SYSTEM_PROMPT;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 8000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Anthropic API error:", error);
      return new Response(
        JSON.stringify({
          error: "AI generation failed. Please check your API key and try again.",
          details: error
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const content = data.content[0].text;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response:", content);
      return new Response(
        JSON.stringify({
          error: "Invalid AI response format",
          raw_response: content.slice(0, 500)
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = JSON.parse(jsonMatch[0]);

    result.tokens_used = data.usage?.input_tokens + data.usage?.output_tokens || 0;
    result.model = "claude-3-5-sonnet-20241022";

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
