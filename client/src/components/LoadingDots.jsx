import './LoadingDots.css';

function LoadingDots({ size = 'small' }) {
  return (
    <span className={`loading-dots loading-dots--${size}`}>
      <span className="loading-dots__dot"></span>
      <span className="loading-dots__dot"></span>
      <span className="loading-dots__dot"></span>
    </span>
  );
}

export default LoadingDots;
