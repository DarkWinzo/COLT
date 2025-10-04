import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sparkles, Send, X, Wand2, Code2 } from 'lucide-react';
import { useToast } from './ui/use-toast';
import { supabase } from '@/lib/supabase';

export function AIAssistant({ onApplyChanges, files, userId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userMessage = { role: 'user', content: prompt };
    setMessages(prev => [...prev, userMessage]);
    const currentPrompt = prompt;
    setPrompt('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: currentPrompt,
          existingFiles: files,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate code');
      }

      const result = await response.json();

      const assistantMessage = {
        role: 'assistant',
        content: result.description || 'Generated your project successfully!',
        files: result.files,
        isDemo: result.demo
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (result.files && onApplyChanges) {
        onApplyChanges(result.files);
      }

      if (userId && !result.demo) {
        await supabase.from('ai_generations').insert({
          user_id: userId,
          prompt: currentPrompt,
          tokens_used: result.tokens_used || 0,
        });
      }

      toast({
        title: result.demo ? 'Demo Code Generated' : 'Code Generated',
        description: result.demo
          ? 'Demo project created. Add ANTHROPIC_API_KEY for AI generation.'
          : 'Your code has been generated and applied!',
      });
    } catch (error) {
      console.error('AI generation error:', error);
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.message}. Please try again.`,
      };
      setMessages(prev => [...prev, errorMessage]);

      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-6 right-6 rounded-full shadow-lg h-14 w-14"
        onClick={() => setIsOpen(true)}
      >
        <Sparkles className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-background border rounded-lg shadow-2xl flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">AI Assistant</h3>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setIsOpen(false)}
          className="h-8 w-8"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm">
            <Wand2 className="w-12 h-12 mx-auto mb-3 text-primary opacity-50" />
            <p className="font-semibold mb-2">Create apps with natural language!</p>
            <p className="text-xs mb-4">Describe what you want to build</p>
            <div className="space-y-2 text-left max-w-xs mx-auto">
              <div className="bg-muted/50 rounded p-2 text-xs cursor-pointer hover:bg-muted" onClick={() => setPrompt('Create a todo app with add, delete, and mark complete')}>
                <Code2 className="w-3 h-3 inline mr-1" />
                Todo app with CRUD operations
              </div>
              <div className="bg-muted/50 rounded p-2 text-xs cursor-pointer hover:bg-muted" onClick={() => setPrompt('Build a weather dashboard with search')}>
                <Code2 className="w-3 h-3 inline mr-1" />
                Weather dashboard
              </div>
              <div className="bg-muted/50 rounded p-2 text-xs cursor-pointer hover:bg-muted" onClick={() => setPrompt('Create a calculator with basic operations')}>
                <Code2 className="w-3 h-3 inline mr-1" />
                Calculator app
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground ml-8'
                    : 'bg-muted mr-8'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                {msg.files && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-xs font-semibold mb-1">Files generated:</p>
                    <ul className="text-xs space-y-0.5">
                      {Object.keys(msg.files).map(file => (
                        <li key={file} className="truncate">📄 {file}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {msg.isDemo && (
                  <div className="mt-2 text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 p-2 rounded">
                    Demo mode - Add ANTHROPIC_API_KEY for AI generation
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            <span>Generating code...</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Input
            placeholder="Create a todo app, weather dashboard, calculator..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={loading || !prompt.trim()}>
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
