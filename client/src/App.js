import { useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';

import './App.css';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [inProgress, setInProgress] = useState(false);
  const [message, setMessage] = useState('&nbsp');
  function resetMessage() { setMessage('&nbsp') };

  const buttonText = inProgress ? (<div class="loader">Loading...</div>) : 'Click/tap to suspend';
  const cursor = inProgress ? 'default' : 'pointer';
  const background = inProgress ? 'radial-gradient(#d00, rgba(0, 0, 0, 0))' : 'radial-gradient(#0d0, rgba(0, 0, 0, 0))';

  let interval;
  let secondsRemaining = 15;

  async function suspend() {
    if (inProgress) {
      return;
    }

    toast.dismiss();
    setInProgress(true);

    interval = setInterval(() => {
      if (secondsRemaining < 0) {
        clearInterval(interval);
      } else {
        setMessage(`${secondsRemaining} seconds remaining`);
        --secondsRemaining;
      }
    }, 1000);

    await fetch('/suspend', { method: 'POST' })
      .then(async res => await res.json())
      .then(json => {
        if (json.error) {
          toast(`Error: ${json.error}`, { autoClose: false });
          return;
        }

        toast('Success!');
      })
      .finally(() => {
        setInProgress(false);
        clearInterval(interval);
        resetMessage();
      });
  }

  return (
    <div className="App">
      <ToastContainer
        position="top-center"
        toastClassName="dark"
      />
      <div
        onClick={suspend}
        style={{
          alignItems: 'center',
          background,
          border: '0.5em solid black',
          borderRadius: '50%',
          cursor,
          display: 'flex',
          fontSize: '0.45em',
          height: '128px',
          justifyContent: 'center',
          textAlign: 'center',
          textShadow: '0px 0px 2px #000, 0px 0px 2px #000, 0px 0px 2px #000, 0px 0px 2px #000',
          userSelect: 'none',
          width: '128px',
        }}>
        <span>{buttonText}</span>
      </div>
      <div>
        <span
          style={{ fontSize: '0.6em' }}
          dangerouslySetInnerHTML={{ __html: message }}
        />
      </div>
    </div>
  );
}

export default App;
