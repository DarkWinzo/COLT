import { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { IDE } from './components/IDE';
import { ProjectDialog } from './components/ProjectDialog';
import { Toaster } from './components/ui/toaster';
import { useToast } from './components/ui/use-toast';
import { supabase } from './lib/supabase';
import { templates } from './lib/templates';
import { Button } from './components/ui/button';
import { Plus, FolderOpen, Code2 } from 'lucide-react';

function App() {
  console.log('App component rendering...');

  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const { toast } = useToast();

  console.log('App state:', { user: !!user, isGuest, loading, hasProject: !!currentProject });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
        setLoading(false);

        const urlParams = new URLSearchParams(window.location.search);
        const shareToken = urlParams.get('share');

        if (shareToken) {
          await loadSharedProject(shareToken);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user || null);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && !isGuest) {
      loadProjects();
    }
  }, [user, isGuest]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadSharedProject = async (shareToken) => {
    try {
      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('share_token', shareToken)
        .eq('is_public', true)
        .maybeSingle();

      if (error) throw error;

      if (project) {
        setCurrentProject(project);
        setIsGuest(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Shared project not found.',
        });
      }
    } catch (error) {
      console.error('Error loading shared project:', error);
    }
  };

  const handleCreateProject = async (name, template) => {
    try {
      const templateData = templates[template];

      if (isGuest) {
        const guestProject = {
          id: `guest-${Date.now()}`,
          name,
          template,
          files: templateData.files,
        };
        setCurrentProject(guestProject);
        return;
      }

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name,
          template,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      const fileInserts = Object.entries(templateData.files).map(([path, content]) => ({
        project_id: project.id,
        path,
        content,
      }));

      const { error: filesError } = await supabase
        .from('project_files')
        .insert(fileInserts);

      if (filesError) throw filesError;

      setCurrentProject(project);
      loadProjects();

      toast({
        title: 'Project created',
        description: `${name} is ready to go!`,
      });
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create project.',
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsGuest(false);
    setCurrentProject(null);
    setProjects([]);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <>
        <Auth
          onAuthSuccess={(guest = false) => {
            if (guest) {
              setIsGuest(true);
              setShowNewProject(true);
            }
          }}
        />
        <Toaster />
      </>
    );
  }

  if (!currentProject) {
    return (
      <>
        <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b">
            <div className="flex items-center gap-3">
              <Code2 className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold">WebCode Studio</h1>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </header>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold">Your Projects</h2>
                <Button onClick={() => setShowNewProject(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </div>

              {projects.length === 0 ? (
                <div className="text-center py-20">
                  <FolderOpen className="w-20 h-20 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Create your first project to get started
                  </p>
                  <Button onClick={() => setShowNewProject(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => setCurrentProject(project)}
                      className="p-6 bg-white dark:bg-slate-900 rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <h3 className="font-semibold text-lg mb-2">{project.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {project.description || templates[project.template]?.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{templates[project.template]?.name || project.template}</span>
                        <span>{new Date(project.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <ProjectDialog
          open={showNewProject}
          onClose={() => setShowNewProject(false)}
          onCreateProject={handleCreateProject}
        />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <IDE
        user={user}
        isGuest={isGuest}
        onLogout={handleLogout}
        initialProject={currentProject}
      />
      <Toaster />
    </>
  );
}

export default App;
