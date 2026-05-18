import React, { useState, useEffect, useRef } from 'react';
import { X, UploadCloud, Library, FileText, FileUp, Loader2, GitBranch, Database, File } from 'lucide-react';
import useSourceStore from '@/store/sourceStore';
import useChatStore from '@/store/chatStore';

export default function AddSourceModal({ isOpen, onClose, currentSession }) {
  const { attachSources } = useChatStore();
  const [activeTab, setActiveTab] = useState('upload'); // 'upload', 'github', 'library'

  const FileIcon = ({ filename, className }) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <img src="/fileIcons/file-pdf.svg" alt="PDF" className={className} />;
    if (ext === 'doc' || ext === 'docx') return <img src="/fileIcons/file-docx.svg" alt="Word" className={className} />;
    if (ext === 'md' || ext === 'markdown') return <img src="/fileIcons/file-code.svg" alt="Markdown" className={className} />;
    return <img src="/fileIcons/file-text-dark.svg" alt="Text" className={className} />;
  };

  // Store
  const { uploadDocument, addGithub, fetchSources, sources, isLoadingSources, isUploading, autoAttach, setAutoAttach } = useSourceStore();

  // Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const fileInputRef = useRef(null);

  // GitHub State
  const [repoUrl, setRepoUrl] = useState('');
  const [repoTitle, setRepoTitle] = useState('');
  const [branch, setBranch] = useState('main');

  // Fetch sources when library tab is opened
  useEffect(() => {
    if (isOpen && activeTab === 'library') {
      fetchSources(0, 50);
    }
  }, [isOpen, activeTab, fetchSources]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setUploadTitle('');
      setRepoUrl('');
      setRepoTitle('');
      setBranch('main');
      setActiveTab('upload');
    }
  }, [isOpen]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadTitle) {
        // Auto-fill title with extension
        setUploadTitle(file.name);
      }
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    try {
      const res = await uploadDocument(selectedFile, uploadTitle || selectedFile.name);
      if (autoAttach && currentSession) {
        const sourceId = res.data?.source_id || res.source_id;
        if (sourceId) {
          await attachSources(currentSession.id, [sourceId]);
        }
      }
      onClose();
    } catch (error) {
      // Error is handled by store toast
    }
  };

  const handleGithubSubmit = async (e) => {
    e.preventDefault();
    if (!repoUrl) return;
    try {
      // Extract title from URL if not provided
      let finalTitle = repoTitle;
      if (!finalTitle) {
        const parts = repoUrl.split('/');
        finalTitle = parts[parts.length - 1] || 'GitHub Repo';
      }
      const res = await addGithub(repoUrl, finalTitle, branch, []);
      if (autoAttach && currentSession) {
        const sourceId = res.data?.source_id || res.source_id;
        if (sourceId) {
          await attachSources(currentSession.id, [sourceId]);
        }
      }
      onClose();
    } catch (error) {
      // Error is handled by store toast
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-(--bg-elevated) border border-(--border-strong) rounded overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-subtle) bg-(--bg-surface)">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-(--accent-cyan-dim) text-(--accent-cyan) rounded">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-(--text-primary)" style={{ fontFamily: 'var(--font-mono)' }}>Add Knowledge Source</h2>
              <p className="text-xs text-(--text-muted)">Connect documents and repositories to the graph</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-(--text-muted) hover:text-(--text-primary) rounded hover:bg-(--bg-hover) transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex px-6 border-b border-(--border-subtle) bg-(--bg-surface)">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'upload' ? 'border-(--accent-cyan) text-(--accent-cyan)' : 'border-transparent text-(--text-muted) hover:text-(--text-secondary)'
            }`}
            style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            <FileUp className="w-3.5 h-3.5" /> Upload
          </button>
          <button
            onClick={() => setActiveTab('github')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'github' ? 'border-(--accent-cyan) text-(--accent-cyan)' : 'border-transparent text-(--text-muted) hover:text-(--text-secondary)'
            }`}
            style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            <GitBranch className="w-3.5 h-3.5" /> GitHub
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'library' ? 'border-(--accent-cyan) text-(--accent-cyan)' : 'border-transparent text-(--text-muted) hover:text-(--text-secondary)'
            }`}
            style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            <Library className="w-3.5 h-3.5" /> Library
          </button>
        </div>

        {/* Auto-Attach Toggle */}
        <div className="flex items-center justify-end px-6 py-2 bg-(--bg-surface) border-b border-(--border-subtle)">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-(--text-secondary) hover:text-(--text-primary) transition-colors" style={{ fontFamily: 'var(--font-mono)' }}>
            <input
              type="checkbox"
              checked={autoAttach}
              onChange={(e) => setAutoAttach(e.target.checked)}
              className="rounded border-(--border-default) bg-(--bg-elevated) accent-(--accent-cyan)"
            />
            Auto-attach to current chat
          </label>
        </div>

        {/* Content Area */}
        <div className="p-5 bg-(--bg-elevated) min-h-[280px]">
          {/* TAB: UPLOAD */}
          {activeTab === 'upload' && (
            <form onSubmit={handleUploadSubmit} className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
              {!selectedFile ? (
                <div
                  className="flex-1 border-2 border-dashed border-(--border-default) rounded flex flex-col items-center justify-center p-8 hover:border-(--accent-cyan) hover:bg-(--accent-cyan-dim) transition-all cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-14 h-14 bg-(--bg-surface) group-hover:bg-(--accent-cyan-dim) rounded flex items-center justify-center mb-4 transition-colors">
                    <UploadCloud className="w-7 h-7 text-(--text-muted) group-hover:text-(--accent-cyan) transition-colors" />
                  </div>
                  <h3 className="text-sm font-medium text-(--text-primary) mb-1" style={{ fontFamily: 'var(--font-mono)' }}>Click or drag file to upload</h3>
                  <p className="text-xs text-(--text-muted) text-center max-w-xs">
                    Supported formats: PDF, DOCX, TXT, MD. Maximum file size 50MB.
                  </p>
                  <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    accept=".pdf,.docx,.txt,.md"
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-4">
                  <div className="p-4 border border-(--accent-cyan)/30 bg-(--accent-cyan-dim) rounded flex items-start gap-4">
                    <div className="p-2.5 bg-(--bg-elevated) rounded border border-(--border-default) flex items-center justify-center">
                      <FileIcon filename={selectedFile.name} className="w-7 h-7 shrink-0" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-(--text-muted) mb-1" style={{ fontFamily: 'var(--font-mono)' }}>Selected File</p>
                      <p className="text-sm text-(--text-primary) font-medium truncate">{selectedFile.name}</p>
                      <p className="text-xs text-(--text-muted) mt-1" style={{ fontFamily: 'var(--font-mono)' }}>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-(--text-muted) hover:text-(--accent-red) transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-5 flex justify-end gap-3 pt-4 border-t border-(--border-subtle)">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="btn-primary"
                >
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                  {isUploading ? 'Uploading...' : 'Upload & Index'}
                </button>
              </div>
            </form>
          )}

          {/* TAB: GITHUB */}
          {activeTab === 'github' && (
            <form onSubmit={handleGithubSubmit} className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="field-label">Repository URL</label>
                  <div className="relative">
                    <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted)" />
                    <input
                      type="url"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/owner/repo"
                      className="field-input pl-10!"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="field-label">Title (Optional)</label>
                    <input
                      type="text"
                      value={repoTitle}
                      onChange={(e) => setRepoTitle(e.target.value)}
                      placeholder="Custom name"
                      className="field-input"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="field-label">Branch</label>
                    <div className="relative">
                      <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--text-muted)" />
                      <input
                        type="text"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        placeholder="main"
                        className="field-input pl-9!"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-3 pt-4 border-t border-(--border-subtle)">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!repoUrl || isUploading}
                  className="btn-primary"
                >
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitBranch className="w-3.5 h-3.5" />}
                  {isUploading ? 'Connecting...' : 'Connect Repository'}
                </button>
              </div>
            </form>
          )}

          {/* TAB: LIBRARY */}
          {activeTab === 'library' && (
            <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300 max-h-[360px]">
              {isLoadingSources ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-(--accent-cyan) animate-spin" />
                </div>
              ) : sources.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                  <Library className="w-10 h-10 text-(--text-muted) mb-3" />
                  <h3 className="text-sm font-medium text-(--text-primary) mb-1" style={{ fontFamily: 'var(--font-mono)' }}>Your library is empty</h3>
                  <p className="text-xs text-(--text-muted) max-w-sm">
                    You haven't uploaded any documents or connected any repositories yet.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
                  {sources.map(source => {
                    const isAttached = currentSession?.sources?.some(s => s.id === source.id);
                    return (
                    <div key={source.id} className="flex items-center justify-between p-3 bg-(--bg-surface) border border-(--border-subtle) rounded hover:border-(--border-default) transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-(--bg-elevated) rounded border border-(--border-subtle)">
                          {source.type === 'github' ? (
                            <GitBranch className="w-4 h-4 text-(--text-secondary)" />
                          ) : (
                            <File className="w-4 h-4 text-(--accent-cyan)" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-(--text-primary)" style={{ fontFamily: 'var(--font-mono)' }}>{source.title}</p>
                          <p className="text-[10px] text-(--text-muted) capitalize" style={{ fontFamily: 'var(--font-mono)' }}>{source.type} · {source.status}</p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (currentSession && !isAttached) {
                            await attachSources(currentSession.id, [source.id]);
                            onClose();
                          }
                        }}
                        disabled={isAttached}
                        className={`px-3 py-1 text-[10px] font-medium rounded transition-colors ${
                          isAttached
                            ? 'text-(--text-muted) bg-(--bg-elevated) cursor-not-allowed'
                            : 'text-(--accent-cyan) border border-(--accent-cyan)/40 hover:bg-(--accent-cyan-dim)'
                        }`}
                        style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                      >
                        {isAttached ? 'Attached' : 'Attach'}
                      </button>
                    </div>
                  )})}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
