interface IActionButtonProps {
  label: string;
  onClick: () => void | Promise<void>;
}

export const ActionButton = ({ label, onClick }: IActionButtonProps) => (
  <button
    type="button"
    style={{
      width: '100px',
      backgroundColor: 'lightgray',
      fontWeight: 600,
      cursor: 'pointer',
      borderRadius: '6px',
      height: '40px',
      margin: '5px',
    }}
    onClick={onClick}
  >
    {label}
  </button>
);

export default ActionButton;
