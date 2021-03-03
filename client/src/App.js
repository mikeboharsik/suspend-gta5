import { useEffect, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { io } from 'socket.io-client';

import './App.css';
import 'react-toastify/dist/ReactToastify.css';

let { hostname, protocol } = window.location;

if (process.env.NODE_ENV === 'development') {
  hostname = 'localhost';
}

const networkConfig = `${protocol}//${hostname}`;
const hostInfoPath = `${networkConfig}/hostinfo`;
const suspendPath = `${networkConfig}/suspend`;

const baseBinding = { name: 'localhost', works: true };

function generateJsxFromHostInfo(hostInfo) {
  const allBindings = [baseBinding, ...hostInfo];

  const newBindings = allBindings.reduce(
    (acc, cur) => {
      const binding = cur.works ? (
        <li key={cur.name} className="binding-item">
          <a
            href={`${protocol}//${cur.name}`}
            rel="noreferrer"
            target="_blank"
          >
            {`${protocol}//${cur.name}`}
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

  return newBindings;
}

function useHostInfo() {
  const [hostInfo, setHostInfo] = useState(null);
  const [jsx, setJsx] = useState(null);

  useEffect(
    () => {
      fetch(hostInfoPath)
        .then(res => res.json())
        .then(json => {
          setHostInfo(json);
          setJsx(generateJsxFromHostInfo(json));
        });
    },
    []
  );

  return [hostInfo, jsx];
}

function App() {
  const [, bindings] = useHostInfo();

  const [ready, setReady] = useState(false);
  const [inProgress, setInProgress] = useState(false);

  const [message, setMessage] = useState('&nbsp');
  function resetMessage() { setMessage('&nbsp') };

  const buttonText = inProgress ? (<div className="loader">Loading...</div>) : 'Click/tap to suspend';
  const cursor = inProgress ? 'default' : 'pointer';
  const background = inProgress ? 'radial-gradient(#d00, rgba(0, 0, 0, 0))' : 'radial-gradient(#0d0, rgba(0, 0, 0, 0))';

  useEffect(() => {
    io(networkConfig, { autoConnect: true })
      .onAny((event, ...args) => {
        console.debug({ event, args });

        switch (event) {
          case 'SuspendSuccess':
            setMessage("Waiting for unsuspend...");
            break;
          case 'UnsuspendSuccess':
            resetMessage();
            setInProgress(false);
            toast('Success!');
            break;
          case 'SuspendError':
            resetMessage();
            setInProgress(false);
            toast(`Error: ${args}`);
            break;
          default: break;
        }
      });
  }, []);

  useEffect(() => {
    if (bindings) {
      setReady(true);
    }
  }, [bindings])

  async function suspend() {
    if (inProgress) {
      return;
    }

    toast.dismiss();
    setInProgress(true);    

    await fetch(suspendPath, { method: 'POST' });

    setMessage("Submitted suspend request...");
  }

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
