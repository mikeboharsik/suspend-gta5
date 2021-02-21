import { useEffect, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';

import './App.css';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [ready, setReady] = useState(false);
  const [inProgress, setInProgress] = useState(false);

  const [bindings, setBindings] = useState(null);
  const [message, setMessage] = useState('&nbsp');
  function resetMessage() { setMessage('&nbsp') };

  const buttonText = inProgress ? (<div class="loader">Loading...</div>) : 'Click/tap to suspend';
  const cursor = inProgress ? 'default' : 'pointer';
  const background = inProgress ? 'radial-gradient(#d00, rgba(0, 0, 0, 0))' : 'radial-gradient(#0d0, rgba(0, 0, 0, 0))';

  let secondsRemaining = 15;
  let interval = null;

  async function getHostInfo() {
    await fetch('/hostinfo')
      .then(res => res.json())
      .then(json => {
        const newBindings = json.reduce(
          (acc, cur) => {
            const binding = cur.works ? (
              <li className="binding-item">
                <a href={`http://${cur.name}`} target="_blank">
                  {`http://${cur.name}`}
                </a>
              </li>
            ) : null;

            if (binding) {
              if (acc) {
                return [...acc, binding];
              }

              return [binding];
            }

            return acc;
          },
          null,
        );

        setBindings(newBindings);
      })
      .finally(() => {
        setReady(true);
      });
  }

  async function suspend() {
    if (inProgress) {
      return;
    }

    toast.dismiss();
    setInProgress(true);   

    interval = setInterval(
      () => {
        if (secondsRemaining >= 0) {
          setMessage(`${secondsRemaining} seconds remaining`);
          --secondsRemaining;
        }
      },
      1000,
    );

    await fetch('/suspend', { method: 'POST' })
      .then(res => res.json())
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
        interval = null;
        resetMessage();
      });
  }

  useEffect(() => {
    getHostInfo();
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <div className="App">
      <ToastContainer
        position="top-center"
        toastClassName="dark"
      />
      <div
        onClick={suspend}
        style={{ background, cursor }}
        className="button">
        <span>
          {buttonText}
        </span>
      </div>
      <div>
        <span
          style={{ fontSize: '0.6em' }}
          dangerouslySetInnerHTML={{ __html: message }}
        />
      </div>
      <div style={{ fontSize: '0.5em', marginTop: '3em' }}>
        <span>This page is accessible at:</span>
        <ul style={{ listStyleType: 'none', marginBlockStart: 0, paddingLeft: '2em' }}>
          {bindings}
        </ul>
      </div>
    </div>
  );
}

export default App;
