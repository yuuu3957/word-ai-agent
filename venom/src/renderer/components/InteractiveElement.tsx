import { ReactNode, useEffect, useId } from 'react';

declare global {
  interface Window {
    interactiveElements: Set<string>;
  }
}

const InteractiveElement = ({ children }: { children: ReactNode }) => {
  const id = useId();

  const handleMouseEnter = () => {
    window.interactiveElements.add(id);
    window.api.button.EnterButton();
  };

  const handleMouseLeave = () => {
    window.interactiveElements.delete(id);

    if (window.interactiveElements.size === 0) {
      window.api.button.OutButton();
    }
  };

  useEffect(() => {
    if (!window.interactiveElements) {
      window.interactiveElements = new Set<string>();
    }

    return () => {
      window.interactiveElements.delete(id);

      if (window.interactiveElements.size === 0) {
        window.api.button.OutButton();
      }
    };
  }, [id]);

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ display: 'inline-block' }}
    >
      {children}
    </div>
  );
};

export default InteractiveElement;
