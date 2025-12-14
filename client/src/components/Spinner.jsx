import './Spinner.css';

function Spinner({ size = 'medium' }) {
  return (
    <div className={`spinner spinner--${size}`}>
      <div className="spinner__ring"></div>
      <div className="spinner__ring"></div>
      <div className="spinner__ring"></div>
    </div>
  );
}

export default Spinner;
