import './NeonButton.css';

/**
 * Reusable neon-styled button.
 * @param {string} variant  - 'primary' | 'secondary' | 'danger' (default: '')
 * @param {string} size     - 'sm' | '' (default: '')
 * @param {function} onClick
 * @param {React.ReactNode} children
 * @param {string} id
 */
function NeonButton({ variant = '', size = '', onClick, children, id, disabled }) {
  const classes = ['neon-btn', variant, size].filter(Boolean).join(' ');
  return (
    <button
      id={id}
      className={classes}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default NeonButton;
