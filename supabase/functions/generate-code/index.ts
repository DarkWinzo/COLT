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
}

const SYSTEM_PROMPT = `You are an expert full-stack developer. Generate complete, production-ready code based on user prompts.

Rules:
- Generate all necessary files for a working application
- Include package.json with all required dependencies
- Use modern best practices and clean code
- Include proper error handling and validation
- Generate TypeScript/JavaScript based on the framework
- Return ONLY valid JSON with file structure

Response format:
{
  "files": {
    "path/to/file.js": "file content",
    "package.json": "{...}"
  },
  "description": "Brief description of what was created"
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

    const { prompt, framework = "react", existingFiles }: GenerateRequest = await req.json();

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
          error: "AI service not configured",
          demo: true,
          files: generateDemoProject(framework, prompt)
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userPrompt = existingFiles 
      ? `Modify the existing project: ${prompt}\n\nExisting files:\n${JSON.stringify(existingFiles, null, 2)}`
      : `Create a ${framework} application: ${prompt}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Anthropic API error:", error);
      return new Response(
        JSON.stringify({ 
          error: "AI generation failed",
          demo: true,
          files: generateDemoProject(framework, prompt)
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const content = data.content[0].text;
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid response format");
    }

    const result = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        demo: true,
        files: generateDemoProject("react", "demo app")
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function generateDemoProject(framework: string, prompt: string): Record<string, string> {
  const demoProjects: Record<string, Record<string, string>> = {
    react: {
      "package.json": JSON.stringify({
        name: "react-app",
        version: "1.0.0",
        type: "module",
        scripts: {
          dev: "vite",
          build: "vite build",
          preview: "vite preview"
        },
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0"
        },
        devDependencies: {
          "@vitejs/plugin-react": "^4.2.1",
          vite: "^5.1.0"
        }
      }, null, 2),
      "index.html": `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>React App</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.jsx"></script>\n  </body>\n</html>`,
      "src/main.jsx": `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './index.css';\n\nReactDOM.createRoot(document.getElementById('root')).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);`,
      "src/App.jsx": `import { useState } from 'react';\n\nfunction App() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div style={{ textAlign: 'center', padding: '2rem' }}>\n      <h1>Welcome to Your App!</h1>\n      <p>Prompt: ${prompt}</p>\n      <button onClick={() => setCount(count + 1)}>\n        Count: {count}\n      </button>\n    </div>\n  );\n}\n\nexport default App;`,
      "src/index.css": `body {\n  margin: 0;\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;\n}`,
      "vite.config.js": `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n});`
    }
  };

  return demoProjects[framework] || demoProjects.react;
}