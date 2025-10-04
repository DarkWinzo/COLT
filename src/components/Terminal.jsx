import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

export function Terminal({ webcontainerInstance }) {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
      },
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);

    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      xterm.dispose();
    };
  }, []);

  useEffect(() => {
    if (!webcontainerInstance || !xtermRef.current) return;

    let shellProcess;

    const startShell = async () => {
      try {
        shellProcess = await webcontainerInstance.spawn('jsh', {
          terminal: {
            cols: xtermRef.current.cols,
            rows: xtermRef.current.rows,
          },
        });

        shellProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              xtermRef.current.write(data);
            },
          })
        );

        const input = shellProcess.input.getWriter();
        xtermRef.current.onData((data) => {
          input.write(data);
        });

        await shellProcess.exit;
      } catch (error) {
        console.error('Terminal error:', error);
        xtermRef.current.writeln(`Error: ${error.message}`);
      }
    };

    startShell();

    return () => {
      if (shellProcess) {
        shellProcess.kill();
      }
    };
  }, [webcontainerInstance]);

  return <div ref={terminalRef} className="h-full w-full" />;
}
