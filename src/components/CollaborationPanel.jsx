import { useState, useEffect } from 'react';
import { Users, UserPlus, X, Mail, Shield, Eye, CreditCard as Edit } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { supabase } from '@/lib/supabase';
import { useToast } from './ui/use-toast';

export function CollaborationPanel({ projectId, userId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && projectId) {
      loadCollaborators();
    }
  }, [isOpen, projectId]);

  const loadCollaborators = async () => {
    try {
      const { data, error } = await supabase
        .from('project_collaborators')
        .select('*, user:user_id(*)')
        .eq('project_id', projectId);

      if (error) throw error;
      setCollaborators(data || []);
    } catch (error) {
      console.error('Error loading collaborators:', error);
    }
  };

  const addCollaborator = async () => {
    if (!email.trim()) return;

    setLoading(true);
    try {
      const { data: targetUser, error: userError } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (userError || !targetUser) {
        toast({
          variant: 'destructive',
          title: 'User not found',
          description: 'No user with this email address exists.',
        });
        return;
      }

      const { error } = await supabase
        .from('project_collaborators')
        .insert({
          project_id: projectId,
          user_id: targetUser.id,
          role: 'editor',
        });

      if (error) throw error;

      toast({
        title: 'Collaborator added',
        description: `${email} can now edit this project.`,
      });

      setEmail('');
      loadCollaborators();
    } catch (error) {
      console.error('Error adding collaborator:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add collaborator.',
      });
    } finally {
      setLoading(false);
    }
  };

  const removeCollaborator = async (collaboratorId) => {
    try {
      const { error } = await supabase
        .from('project_collaborators')
        .delete()
        .eq('id', collaboratorId);

      if (error) throw error;

      toast({
        title: 'Collaborator removed',
      });

      loadCollaborators();
    } catch (error) {
      console.error('Error removing collaborator:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove collaborator.',
      });
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner':
        return <Shield className="w-3 h-3" />;
      case 'editor':
        return <Edit className="w-3 h-3" />;
      default:
        return <Eye className="w-3 h-3" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Users className="w-4 h-4 mr-2" />
          Collaborate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Collaborators</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCollaborator()}
              disabled={loading}
            />
            <Button onClick={addCollaborator} disabled={loading || !email.trim()}>
              <UserPlus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {collaborators.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No collaborators yet
              </p>
            ) : (
              collaborators.map((collab) => (
                <div
                  key={collab.id}
                  className="flex items-center justify-between p-2 rounded border"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {collab.user?.email || 'Unknown'}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {getRoleIcon(collab.role)}
                        <span className="capitalize">{collab.role}</span>
                      </div>
                    </div>
                  </div>
                  {collab.role !== 'owner' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeCollaborator(collab.id)}
                      className="h-7 w-7"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
