# WebCode Studio

A production-ready, browser-based IDE similar to Bolt.new that enables instant web development with live preview, real-time collaboration, and AI assistance.

## Features

### Core Functionality
- **Browser-Based Development**: Full IDE running entirely in the browser using WebContainer technology
- **Live Code Preview**: Instant preview of your application with hot module reloading
- **Monaco Editor**: Professional code editor with syntax highlighting, IntelliSense, and multi-language support
- **File Explorer**: Intuitive file tree with create, delete, and organize capabilities
- **Integrated Terminal**: Full terminal access with command execution support

### Advanced Features
- **Multiple Framework Support**: Pre-built templates for React, Next.js, Vue, Express, and Vanilla JS
- **Real-Time Collaboration**: WebSocket-based collaboration (via optional backend server)
- **Project Management**: Save, load, and organize multiple projects
- **Export & Share**: Export projects as ZIP or share with public links
- **AI Coding Assistant**: AI-powered code suggestions and modifications (demo mode included)
- **Authentication**: Supabase-powered auth with guest mode option
- **Responsive Design**: Beautiful UI with Tailwind CSS and shadcn/ui components

## Tech Stack

### Frontend
- React 18
- Vite (build tool)
- Tailwind CSS + shadcn/ui
- Monaco Editor (code editor)
- WebContainer API (browser-based runtime)
- XTerm.js (terminal)
- React Resizable Panels (layout)

### Backend & Database
- Supabase (authentication + PostgreSQL database)
- Express.js + Socket.io (optional collaboration server)

### Libraries
- @supabase/supabase-js
- @monaco-editor/react
- @webcontainer/api
- jszip (project export)
- lucide-react (icons)

## Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier works perfectly)
- Modern browser with SharedArrayBuffer support (Chrome, Edge, or Firefox)

## Setup Instructions

### 1. Clone and Install

```bash
npm install
```

### 2. Configure Supabase

The database schema is already set up through migrations. You just need to add your Supabase credentials.

Update your `.env` file with:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 4. Optional: Run WebSocket Server (for collaboration)

```bash
npm run server
```

The WebSocket server will run on port 3001.

## Project Structure

```
webcode-studio/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── AIAssistant.jsx  # AI coding assistant
│   │   ├── Auth.jsx         # Authentication
│   │   ├── CodeEditor.jsx   # Monaco editor wrapper
│   │   ├── FileExplorer.jsx # File tree
│   │   ├── IDE.jsx          # Main IDE component
│   │   ├── Preview.jsx      # Live preview panel
│   │   ├── ProjectDialog.jsx # New project dialog
│   │   └── Terminal.jsx     # Terminal component
│   ├── lib/
│   │   ├── supabase.js      # Supabase client
│   │   ├── templates.js     # Project templates
│   │   └── utils.js         # Utility functions
│   ├── App.jsx              # Main application
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
├── server/
│   └── index.js             # WebSocket server
└── supabase/
    └── migrations/          # Database migrations
```

## Usage Guide

### Creating a New Project

1. Click "New Project" button
2. Enter a project name
3. Select a template (React, Next.js, Vue, Express, or Vanilla JS)
4. Click "Create Project"

### Editing Code

1. Select a file from the file explorer
2. Edit code in the Monaco editor
3. Changes are automatically written to the WebContainer
4. View live updates in the preview panel

### Using the Terminal

- The integrated terminal provides full shell access
- Run any npm commands, build scripts, or other terminal operations
- Terminal output is displayed in real-time

### Saving Projects

- Click the "Save" button in the header
- Projects are automatically saved to your Supabase database
- All files and their contents are persisted

### Exporting Projects

- Click "Export" to download your project as a ZIP file
- The ZIP contains all files and can be extracted and run locally

### Sharing Projects

- Click "Share" to generate a public link
- Anyone with the link can view (read-only) your project
- Share link is copied to clipboard automatically

### AI Assistant (Demo)

- Click the AI assistant button (sparkle icon) in the bottom-right
- Type natural language prompts describing what you want to build
- In production, this would integrate with OpenAI/Claude APIs

## Deployment

### Deploy Frontend (Vercel)

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

### Deploy Frontend (Render)

1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables
5. Deploy

### Deploy WebSocket Server

The WebSocket server is optional. To deploy:

1. Use Render, Railway, or any Node.js hosting
2. Set start command: `npm run server`
3. Note the server URL for connecting from frontend

## Browser Compatibility

WebContainer requires browsers that support SharedArrayBuffer:

- Chrome/Edge 92+
- Firefox 95+
- Safari 15.2+ (with some limitations)

Note: The browser must be in a secure context (HTTPS or localhost).

## Database Schema

The application uses two main tables:

### `projects`
- Stores project metadata (name, template, owner, share settings)
- Row Level Security ensures users only access their own projects
- Public projects can be shared via tokens

### `project_files`
- Stores individual file contents for each project
- Linked to projects via foreign key
- Row Level Security inherits from project permissions

## Extending the Project

### Adding New Templates

Edit `src/lib/templates.js` and add your template:

```javascript
mytemplate: {
  name: 'My Template',
  description: 'Description here',
  files: {
    'package.json': '...',
    'src/index.js': '...',
    // ... more files
  }
}
```

### Adding AI Integration

To connect real AI services:

1. Get an API key from OpenAI or Anthropic
2. Create a Supabase Edge Function to proxy AI requests
3. Update `src/components/AIAssistant.jsx` to call your function
4. Parse AI responses and apply code changes

### Customizing Themes

Edit `src/index.css` to modify the color scheme. The project uses CSS variables for easy theming.

## Performance Tips

- WebContainer initialization can take 2-3 seconds on first load
- File operations are instant after initialization
- Large projects (500+ files) may require additional optimization
- Consider implementing virtual scrolling for large file trees

## Troubleshooting

**WebContainer fails to boot**
- Ensure you're using a compatible browser
- Check that your site is served over HTTPS or localhost
- Verify SharedArrayBuffer is enabled in your browser

**Preview not showing**
- Wait for npm install to complete (check terminal)
- Ensure the dev server started successfully
- Check browser console for errors

**Files not saving**
- Verify Supabase credentials are correct
- Check browser console for authentication errors
- Ensure you're signed in (not in guest mode)

## License

MIT License - see LICENSE file for details

## Credits

Built with:
- [WebContainer](https://webcontainers.io/) by StackBlitz
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) by Microsoft
- [Supabase](https://supabase.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

## Support

For issues, questions, or contributions, please open an issue on GitHub.
