import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SearchAddon } from 'xterm-addon-search';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { WebglAddon } from 'xterm-addon-webgl';
import { Button } from './ui/button';
import { Search, X, Plus, Terminal as TerminalIcon, Trash2, ChevronDown } from 'lucide-react';
import 'xterm/css/xterm.css';

export function Terminal({ webcontainerInstance }) {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const searchAddonRef = useRef(null);
  const [terminals, setTerminals] = useState([{ id: 1, name: 'Terminal 1' }]);
  const [activeTerminal, setActiveTerminal] = useState(1);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const terminalsMap = useRef(new Map());
  const shellProcessesMap = useRef(new Map());

  const createTerminal = (terminalId) => {
    const container = document.getElementById(`terminal-${terminalId}`);
    if (!container || terminalsMap.current.has(terminalId)) return;

    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Fira Code, Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        cursorAccent: '#000000',
        selection: 'rgba(255, 255, 255, 0.3)',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
      convertEol: true,
      scrollback: 10000,
      fastScrollModifier: 'shift',
      fastScrollSensitivity: 5,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const webLinksAddon = new WebLinksAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(searchAddon);
    xterm.loadAddon(webLinksAddon);

    try {
      const webglAddon = new WebglAddon();
      xterm.loadAddon(webglAddon);
    } catch (e) {
      console.warn('WebGL addon not available, using canvas renderer');
    }

    xterm.open(container);
    fitAddon.fit();

    terminalsMap.current.set(terminalId, { xterm, fitAddon, searchAddon });

    if (terminalId === activeTerminal) {
      xtermRef.current = xterm;
      fitAddonRef.current = fitAddon;
      searchAddonRef.current = searchAddon;
    }

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      xterm.dispose();
    };
  };

  useEffect(() => {
    terminals.forEach(term => {
      createTerminal(term.id);
    });
  }, [terminals]);

  useEffect(() => {
    if (!webcontainerInstance) return;

    terminals.forEach(term => {
      if (shellProcessesMap.current.has(term.id)) return;

      const startShell = async () => {
        const terminalData = terminalsMap.current.get(term.id);
        if (!terminalData) return;

        try {
          const shellProcess = await webcontainerInstance.spawn('jsh', {
            terminal: {
              cols: terminalData.xterm.cols,
              rows: terminalData.xterm.rows,
            },
          });

          shellProcessesMap.current.set(term.id, shellProcess);

          shellProcess.output.pipeTo(
            new WritableStream({
              write(data) {
                terminalData.xterm.write(data);
              },
            })
          );

          const input = shellProcess.input.getWriter();
          terminalData.xterm.onData((data) => {
            input.write(data);
          });

          await shellProcess.exit;
        } catch (error) {
          console.error('Terminal error:', error);
          terminalData.xterm.writeln(`\r\n\x1b[31mError: ${error.message}\x1b[0m`);
        }
      };

      startShell();
    });

    return () => {
      shellProcessesMap.current.forEach(process => {
        process.kill();
      });
      shellProcessesMap.current.clear();
    };
  }, [webcontainerInstance, terminals]);

  useEffect(() => {
    const terminalData = terminalsMap.current.get(activeTerminal);
    if (terminalData) {
      xtermRef.current = terminalData.xterm;
      fitAddonRef.current = terminalData.fitAddon;
      searchAddonRef.current = terminalData.searchAddon;
      terminalData.xterm.focus();
    }
  }, [activeTerminal]);

  const addTerminal = () => {
    const newId = Math.max(...terminals.map(t => t.id)) + 1;
    setTerminals([...terminals, { id: newId, name: `Terminal ${newId}` }]);
    setActiveTerminal(newId);
  };

  const removeTerminal = (terminalId, e) => {
    e.stopPropagation();
    if (terminals.length === 1) return;

    const terminalData = terminalsMap.current.get(terminalId);
    if (terminalData) {
      terminalData.xterm.dispose();
      terminalsMap.current.delete(terminalId);
    }

    const shellProcess = shellProcessesMap.current.get(terminalId);
    if (shellProcess) {
      shellProcess.kill();
      shellProcessesMap.current.delete(terminalId);
    }

    const newTerminals = terminals.filter(t => t.id !== terminalId);
    setTerminals(newTerminals);

    if (activeTerminal === terminalId) {
      setActiveTerminal(newTerminals[0].id);
    }
  };

  const handleSearch = () => {
    if (searchQuery && searchAddonRef.current) {
      searchAddonRef.current.findNext(searchQuery, {
        incremental: true,
        caseSensitive: false,
      });
    }
  };

  const clearTerminal = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#1e1e1e]">
      <div className="flex items-center gap-1 bg-[#2d2d2d] px-2 py-1 border-b border-[#3e3e3e]">
        <div className="flex items-center gap-1 flex-1 overflow-x-auto">
          {terminals.map(term => (
            <div
              key={term.id}
              onClick={() => setActiveTerminal(term.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer text-sm transition-colors ${
                activeTerminal === term.id
                  ? 'bg-[#1e1e1e] text-white'
                  : 'text-gray-400 hover:text-white hover:bg-[#3e3e3e]'
              }`}
            >
              <TerminalIcon className="w-3.5 h-3.5" />
              <span>{term.name}</span>
              {terminals.length > 1 && (
                <button
                  onClick={(e) => removeTerminal(term.id, e)}
                  className="hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          <Button
            size="sm"
            variant="ghost"
            onClick={addTerminal}
            className="h-7 w-7 p-0 text-gray-400 hover:text-white"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSearchVisible(!searchVisible)}
            className="h-7 w-7 p-0 text-gray-400 hover:text-white"
          >
            <Search className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={clearTerminal}
            className="h-7 w-7 p-0 text-gray-400 hover:text-white"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {searchVisible && (
        <div className="flex items-center gap-2 bg-[#2d2d2d] px-3 py-2 border-b border-[#3e3e3e]">
          <input
            type="text"
            placeholder="Search in terminal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 bg-[#3e3e3e] text-white px-3 py-1 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500"
          />
          <Button size="sm" onClick={handleSearch} className="h-7">
            Find
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSearchVisible(false)}
            className="h-7 w-7 p-0"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      <div className="flex-1 relative">
        {terminals.map(term => (
          <div
            key={term.id}
            id={`terminal-${term.id}`}
            className={`absolute inset-0 ${
              activeTerminal === term.id ? 'block' : 'hidden'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
