import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sparkles, Send, X } from 'lucide-react';
import { useToast } from './ui/use-toast';

export function AIAssistant({ onApplyChanges, files }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userMessage = { role: 'user', content: prompt };
    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setLoading(true);

    try {
      const assistantMessage = {
        role: 'assistant',
        content: `I understand you want to: "${prompt}". This is a demo AI assistant. In production, this would integrate with OpenAI/Claude API to analyze your code and suggest changes.`
      };

      setMessages(prev => [...prev, assistantMessage]);

      toast({
        title: 'AI Assistant (Demo)',
        description: 'In production, this would connect to AI services to modify your code.',
      });
    } catch (error) {
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
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-primary opacity-50" />
            <p>Ask me to help with your code!</p>
            <p className="mt-2 text-xs">Examples:</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>"Add a dark mode toggle"</li>
              <li>"Create a login form"</li>
              <li>"Fix the styling"</li>
            </ul>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground ml-8'
                  : 'bg-muted mr-8'
              }`}
            >
              <p className="text-sm">{msg.content}</p>
            </div>
          ))
        )}
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            <span>Thinking...</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Describe what you want to build..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
          />
          <Button type="submit" size="icon" disabled={loading || !prompt.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
