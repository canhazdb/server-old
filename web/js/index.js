import React from 'react';
import ReactDOM from 'react-dom';

import AuthenticationDialog from './components/AuthenticationDialog.js';
import MainUI from './components/MainUI.js';
import useLocalStorage from './hooks/useLocalStorage.js';

async function checkToken (authToken) {
  if (!authToken) {
    return false;
  }

  try {
    const collectionsResponse = await window.fetch('/api/authenticate/' + authToken, {
      headers: {
        authorisation: authToken
      }
    });

    return collectionsResponse.status === 200;
  } catch (error) {
    console.error(error);
    return false;
  }
}

function App () {
  const [authToken, setAuthToken] = useLocalStorage('authToken');
  const [authValid, setAuthValid] = React.useState(false);

  function handleAuthenticate (token) {
    setAuthToken(token);
  }

  React.useEffect(() => {
    checkToken(authToken).then(valid => {
      if (!valid) {
        setAuthToken(null);
      } else {
        setAuthValid(true);
      }
    });
  }, [authToken, setAuthToken]);

  return (
    <>
      <header>
        <img src={require('../img/logo.svg').default} />
        <div>
          <span>canhazdb</span>
          <strong>Web UI</strong>
        </div>
      </header>

      {!authToken && <AuthenticationDialog onAuthenticate={handleAuthenticate} />}

      {authValid && <MainUI authToken={authToken} />}
    </>
  );
}

document.addEventListener('DOMContentLoaded', function () {
  const appElement = document.body.getElementsByTagName('app')[0];
  ReactDOM.render(<App />, appElement);
});
