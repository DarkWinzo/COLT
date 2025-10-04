import { useState, useEffect, useCallback } from 'react';
import { WebContainer } from '@webcontainer/api';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { FileExplorer } from './FileExplorer';
import { CodeEditor } from './CodeEditor';
import { Preview } from './Preview';
import { Terminal } from './Terminal';
import { AIAssistant } from './AIAssistant';
import { ErrorPanel } from './ErrorPanel';
import { CollaborationPanel } from './CollaborationPanel';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';
import {
  Save,
  Download,
  Share2,
  FolderOpen,
  Play,
  LogOut,
  Code2,
  Rocket,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';

export function IDE({ user, isGuest, onLogout, initialProject }) {
  const [webcontainer, setWebcontainer] = useState(null);
  const [files, setFiles] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [projectId, setProjectId] = useState(initialProject?.id || null);
  const [projectName, setProjectName] = useState(initialProject?.name || 'Untitled Project');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    const initWebContainer = async () => {
      try {
        const instance = await WebContainer.boot();
        setWebcontainer(instance);

        if (initialProject) {
          const projectFiles = {};
          const { data: fileData } = await supabase
            .from('project_files')
            .select('*')
            .eq('project_id', initialProject.id);

          fileData?.forEach(file => {
            projectFiles[file.path] = file.content;
          });

          setFiles(projectFiles);
          await instance.mount(projectFiles);

          const installProcess = await instance.spawn('npm', ['install']);
          await installProcess.exit;

          const devProcess = await instance.spawn('npm', ['run', 'dev']);

          devProcess.output.pipeTo(
            new WritableStream({
              write(data) {
                console.log(data);
              },
            })
          );

          instance.on('server-ready', (port, url) => {
            setPreviewUrl(url);
          });
        }
      } catch (error) {
        console.error('WebContainer initialization error:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to initialize WebContainer. Some browsers may not support this feature.',
        });
      }
    };

    initWebContainer();
  }, [initialProject]);

  const handleFileSelect = (path) => {
    setSelectedFile(path);
  };

  const handleFileChange = async (newContent) => {
    if (!selectedFile || !webcontainer) return;

    const updatedFiles = { ...files, [selectedFile]: newContent };
    setFiles(updatedFiles);

    try {
      await webcontainer.fs.writeFile(selectedFile, newContent);
    } catch (error) {
      console.error('Error writing file:', error);
    }
  };

  const handleFileCreate = async (path) => {
    if (!webcontainer) return;

    const updatedFiles = { ...files, [path]: '' };
    setFiles(updatedFiles);

    try {
      const parts = path.split('/');
      if (parts.length > 1) {
        const dir = parts.slice(0, -1).join('/');
        await webcontainer.fs.mkdir(dir, { recursive: true });
      }
      await webcontainer.fs.writeFile(path, '');
      setSelectedFile(path);

      toast({
        title: 'File created',
        description: path,
      });
    } catch (error) {
      console.error('Error creating file:', error);
    }
  };

  const handleFileDelete = async (path) => {
    if (!webcontainer) return;

    const updatedFiles = { ...files };
    delete updatedFiles[path];
    setFiles(updatedFiles);

    try {
      await webcontainer.fs.rm(path);
      if (selectedFile === path) {
        setSelectedFile(null);
      }

      toast({
        title: 'File deleted',
        description: path,
      });
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleSave = async () => {
    if (isGuest) {
      toast({
        title: 'Sign in required',
        description: 'Create an account to save your projects.',
      });
      return;
    }

    setSaving(true);
    try {
      let currentProjectId = projectId;

      if (!currentProjectId) {
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            name: projectName,
            template: 'react',
          })
          .select()
          .single();

        if (projectError) throw projectError;
        currentProjectId = project.id;
        setProjectId(currentProjectId);
      }

      const { error: deleteError } = await supabase
        .from('project_files')
        .delete()
        .eq('project_id', currentProjectId);

      if (deleteError) throw deleteError;

      const fileInserts = Object.entries(files).map(([path, content]) => ({
        project_id: currentProjectId,
        path,
        content,
      }));

      if (fileInserts.length > 0) {
        const { error: insertError } = await supabase
          .from('project_files')
          .insert(fileInserts);

        if (insertError) throw insertError;
      }

      toast({
        title: 'Project saved',
        description: 'Your changes have been saved successfully.',
      });
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save project.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const zip = new JSZip();

      Object.entries(files).forEach(([path, content]) => {
        zip.file(path, content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/\s+/g, '-')}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Project exported',
        description: 'Your project has been downloaded as a ZIP file.',
      });
    } catch (error) {
      console.error('Error exporting project:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to export project.',
      });
    }
  };

  const handleShare = async () => {
    if (isGuest || !projectId) {
      toast({
        title: 'Sign in required',
        description: 'Create an account to share your projects.',
      });
      return;
    }

    try {
      const shareToken = uuidv4();

      const { error } = await supabase
        .from('projects')
        .update({
          is_public: true,
          share_token: shareToken,
        })
        .eq('id', projectId);

      if (error) throw error;

      const shareUrl = `${window.location.origin}?share=${shareToken}`;

      await navigator.clipboard.writeText(shareUrl);

      toast({
        title: 'Share link copied',
        description: 'Anyone with this link can view your project.',
      });
    } catch (error) {
      console.error('Error sharing project:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to share project.',
      });
    }
  };

  const handleDeploy = async () => {
    if (isGuest || !projectId) {
      toast({
        title: 'Sign in required',
        description: 'Create an account to deploy your projects.',
      });
      return;
    }

    try {
      toast({
        title: 'Deploying...',
        description: 'Your project is being prepared for deployment.',
      });

      const deploymentUrl = `${window.location.origin}/preview/${uuidv4()}`;

      const { error } = await supabase
        .from('project_deployments')
        .insert({
          project_id: projectId,
          url: deploymentUrl,
          status: 'live',
          provider: 'custom',
        });

      if (error) throw error;

      await navigator.clipboard.writeText(deploymentUrl);

      toast({
        title: 'Deployed successfully!',
        description: 'Deployment URL copied to clipboard.',
      });
    } catch (error) {
      console.error('Error deploying project:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to deploy project.',
      });
    }
  };

  const handleAIApplyChanges = async (generatedFiles) => {
    if (!webcontainer) return;

    try {
      const updatedFiles = { ...files, ...generatedFiles };
      setFiles(updatedFiles);

      for (const [path, content] of Object.entries(generatedFiles)) {
        const parts = path.split('/');
        if (parts.length > 1) {
          const dir = parts.slice(0, -1).join('/');
          await webcontainer.fs.mkdir(dir, { recursive: true });
        }
        await webcontainer.fs.writeFile(path, content);
      }

      if (generatedFiles['package.json']) {
        const installProcess = await webcontainer.spawn('npm', ['install']);
        await installProcess.exit;

        const devProcess = await webcontainer.spawn('npm', ['run', 'dev']);
        devProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              console.log(data);
            },
          })
        );
      }

      if (Object.keys(generatedFiles).length > 0) {
        setSelectedFile(Object.keys(generatedFiles)[0]);
      }

      toast({
        title: 'Code applied',
        description: `${Object.keys(generatedFiles).length} files updated.`,
      });
    } catch (error) {
      console.error('Error applying AI changes:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to apply generated code.',
      });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <div className="flex items-center gap-3">
          <Code2 className="w-6 h-6 text-primary" />
          <h1 className="text-lg font-semibold">{projectName}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button size="sm" variant="ghost" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <CollaborationPanel projectId={projectId} userId={user?.id} />
          <Button size="sm" variant="ghost" onClick={handleDeploy}>
            <Rocket className="w-4 h-4 mr-2" />
            Deploy
          </Button>
          {!isGuest && (
            <Button size="sm" variant="ghost" onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          <Panel defaultSize={20} minSize={15}>
            <FileExplorer
              files={files}
              selectedFile={selectedFile}
              onFileSelect={handleFileSelect}
              onFileCreate={handleFileCreate}
              onFileDelete={handleFileDelete}
            />
          </Panel>

          <PanelResizeHandle className="w-1 bg-border hover:bg-primary transition-colors" />

          <Panel defaultSize={40} minSize={20}>
            <PanelGroup direction="vertical">
              <Panel defaultSize={70}>
                <CodeEditor
                  file={selectedFile}
                  content={files[selectedFile] || ''}
                  onChange={handleFileChange}
                  onErrorsChange={setErrors}
                />
              </Panel>

              <PanelResizeHandle className="h-1 bg-border hover:bg-primary transition-colors" />

              <Panel defaultSize={30} minSize={15}>
                <Terminal webcontainerInstance={webcontainer} />
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-1 bg-border hover:bg-primary transition-colors" />

          <Panel defaultSize={40} minSize={20}>
            <Preview url={previewUrl} />
          </Panel>
        </PanelGroup>
      </div>

      <AIAssistant
        onApplyChanges={handleAIApplyChanges}
        files={files}
        userId={user?.id}
      />
      <ErrorPanel errors={errors} onClear={() => setErrors([])} />
    </div>
  );
}
