import React, { useContext, useEffect, useRef, useState } from 'react';
import { HomContext } from './context/HomContext';
import { ToolBar } from './components/toolbar/ToolBar';



export const HelloWorld = () => {
  const { venomInstance, setSubscribedHost, subscribedHostInstance } =
    useContext(HomContext);

  useEffect(() => {
    const initializeSubscribedHost = async () => {
      if (venomInstance && !subscribedHostInstance) {
        await setSubscribedHost();
      }
    };

    initializeSubscribedHost();
  }, [venomInstance, subscribedHostInstance, setSubscribedHost]);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[Renderer Process - React] hom:', subscribedHostInstance);
    // eslint-disable-next-line no-console
    console.log(
      '[Renderer Process - React] hose.boundingBox',
      subscribedHostInstance?.boundingBox,
    );
  }, [subscribedHostInstance]);

  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<string[]>([
    'AI：你好，我可以幫你整理 Word 文件 👋',
  ]);
  const [selectedText, setSelectedText] = useState('');
  const [pos, setPos] = useState({ right: 100, bottom: 20 });
  const [size, setSize] = useState({ width: 320, height: 420 });
  const dragging = useRef(false);
  const resizing = useRef(false);
  const userCleared = useRef(false);
  const lastRefreshedAt = useRef(0);
  const dragStart = useRef({ x: 0, y: 0, right: 100, bottom: 20 });
  const resizeStart = useRef({ x: 0, y: 0, width: 320, height: 420 });

  const handleTitleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, right: pos.right, bottom: pos.bottom };

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const dx = ev.clientX - dragStart.current.x;
      const dy = ev.clientY - dragStart.current.y;
      setPos({
        right: dragStart.current.right - dx,
        bottom: dragStart.current.bottom - dy,
      });
    };

    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = true;
    resizeStart.current = { x: e.clientX, y: e.clientY, width: size.width, height: size.height };

    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const dx = ev.clientX - resizeStart.current.x;
      const dy = ev.clientY - resizeStart.current.y;
      setSize({
        width: Math.max(260, resizeStart.current.width - dx),
        height: Math.max(300, resizeStart.current.height - dy),
      });
    };

    const onUp = () => {
      resizing.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const refreshSelectedTextCache = async () => {
    try {
      const [textRes, rangeRes] = await Promise.all([
        fetch('http://localhost:3002/word/refresh-selected-text-cache', { method: 'POST' }),
        fetch('http://localhost:3002/word/cache-selection-range', { method: 'POST' }),
      ]);
      const data = await textRes.json();
      if (data.selected_text) {
        setSelectedText(data.selected_text);
      }
      const rangeData = await rangeRes.json();
      console.log('[UI] cache-selection-range:', rangeData);
    } catch (error) {
      console.error('[UI] refresh selected text cache failed:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userInput = input;

    setMessages((prev) => [
      ...prev,
      `你：${userInput}`,
      'AI：思考中...',
    ]);

    setInput('');

    try {
      const res = await fetch('http://localhost:3002/word-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: userInput }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev.slice(0, -1),
        `AI：${data.content || '沒有取得回覆'}`,
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        'AI：連線失敗，請確認 server.ts 有沒有啟動。',
      ]);
    }
  };

  return (
    <>
        <div
        onMouseEnter={() => {
          window.api.button.EnterButton();
          const now = Date.now();
          if (!userCleared.current && now - lastRefreshedAt.current > 2000) {
            lastRefreshedAt.current = now;
            refreshSelectedTextCache();
          }
        }}
        onMouseLeave={() => {
          userCleared.current = false;
          if (!dragging.current && !resizing.current) window.api.button.OutButton();
        }}
        style={{
          position: 'fixed',
          right: pos.right,
          bottom: pos.bottom,
          width: size.width,
          height: size.height,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(10px)',
          borderRadius: 16,
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontSize: 14,
          zIndex: 999999,
          pointerEvents: 'auto',
        }}
      >
        <div
          onMouseDown={handleResizeMouseDown}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 18,
            height: 18,
            cursor: 'nw-resize',
            zIndex: 1,
          }}
        />
        <div
          onMouseDown={handleTitleMouseDown}
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #eee',
            fontWeight: 600,
            color: '#111',
            cursor: 'grab',
            userSelect: 'none',
          }}
        >
          ✨ AI Assistant
        </div>

        <div
          style={{
            flex: 1,
            padding: 12,
            overflowY: 'auto',
            color: '#333',
          }}
        >
          {messages.map((message, index) => (
            <div
              key={index}
              style={{
                marginBottom: 10,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}
            >
              {message}
            </div>
          ))}
        </div>

        <div
          style={{
            borderTop: '1px solid #eee',
            padding: 10,
          }}
        >
          {selectedText && (
            <div
              style={{
                fontSize: 11,
                color: '#888',
                background: '#f5f5f5',
                borderRadius: 6,
                padding: '4px 8px',
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                📌 選取：{selectedText.length > 40 ? `${selectedText.slice(0, 40)}…` : selectedText}
              </span>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={async () => {
                  userCleared.current = true;
                  setSelectedText('');
                  await fetch('http://localhost:3002/word/clear-cache', { method: 'POST' });
                }}
                style={{
                  flexShrink: 0,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#aaa',
                  fontSize: 14,
                  lineHeight: 1,
                  padding: '0 2px',
                }}
              >
                ✕
              </button>
            </div>
          )}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            inputRef.current?.focus();
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            border: '1px solid #ddd',
            borderRadius: 999,
            padding: '6px 8px 6px 12px',
            background: '#fff',
            pointerEvents: 'auto',
          }}
          >
            <input
              ref={inputRef}
              value={input}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                inputRef.current?.focus();
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  sendMessage();
                }
              }}
              placeholder="輸入指令..."
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: 14,
                background: 'transparent',
                color: '#111',
                pointerEvents: 'auto',
              }}
            />

            <button
              type="button"
              onClick={sendMessage}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: 'none',
                background: '#111',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              ↑
            </button>
          </div>
        </div>
      </div>
      <ToolBar>
        <ToolBar.ActionButton
          label="Start"
          onClick={async () => {
            // eslint-disable-next-line no-console
            console.log('Start button clicked');
          }}
        />
        <ToolBar.ActionButton
          label="Stop"
          onClick={async () => {
            // eslint-disable-next-line no-console
            console.log('Stop button clicked');
          }}
        />
        <ToolBar.ActionButton
          label="Close"
          onClick={async () => {
            // eslint-disable-next-line no-console
            console.log('Settings button clicked');
            window.api.event.CloseWindow();
          }}
        />
      </ToolBar>
    </>
  );
};

export default HelloWorld;
