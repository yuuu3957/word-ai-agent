import { useState, useRef, useEffect, ReactNode } from 'react';
import { ActionButton } from './buttons/ActionButton';
import InteractiveElement from '../InteractiveElement';

const ArrowLeftIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    fill="none"
    viewBox="0 0 24 24"
  >
    <path fill="#000" d="M14.25 5.25L8.25 12l6 6.75L12 18l-6-6 6-6.75z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    fill="none"
    viewBox="0 0 24 24"
  >
    <path fill="#000" d="M9.75 5.25L15.75 12l-6 6.75L12 18l6-6-6-6.75z" />
  </svg>
);

export const ToolBar = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [listWidth, setListWidth] = useState(0);

  useEffect(() => {
    if (listRef.current) {
      setListWidth(listRef.current.offsetWidth);
    }
  }, [open]);

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        right: 0,
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row-reverse',
          alignItems: 'center',
          transition: 'transform 0.3s ease-in-out',
          transform: open ? 'translateX(0)' : `translateX(${listWidth}px)`,
        }}
      >
        <InteractiveElement>
          <div
            ref={listRef}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '8px',
              borderRadius: '12px',
              transition:
                'transform 0.3s ease-in-out, opacity 0.3s ease-in-out',
              transform: open ? 'translateX(0)' : 'translateX(100%)',
              opacity: open ? 1 : 0,
              backgroundColor: 'white',
            }}
          >
            {children}
          </div>
        </InteractiveElement>
        <InteractiveElement>
          <button
            type="button"
            style={{
              borderRadius: '12px',
              minWidth: '40px',
              height: '40px',
              padding: '8px',
              marginLeft: '8px',
              transition: 'transform 0.3s ease-in-out',
              background: 'gray',
              cursor: 'pointer',
            }}
            onClick={() => setOpen(!open)}
          >
            {open ? <ArrowLeftIcon /> : <ArrowRightIcon />}
          </button>
        </InteractiveElement>
      </div>
    </div>
  );
};

ToolBar.ActionButton = ActionButton;

export default ToolBar;
