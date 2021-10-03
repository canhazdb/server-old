import React from 'react';
import useLocalStorage from '../hooks/useLocalStorage.js';
import FileInput from '../components/FileInput.js';
import useApi from '../hooks/useApi.js';
import useHttp from 'use-http';

function AuthenticationDialog (props) {
  const { post, response, loading, error } = useHttp({
    cachePolicy: 'no-cache'
  });
  const [settings, settingsState] = useApi('/api/settings');
  const [authenticationData, setAuthenticationData] =
    useLocalStorage('authenticationData', {});

  React.useEffect(() => {
    if (!settings) {
      return;
    }

    if (!authenticationData.ca && settings.ca) {
      setAuthenticationData({
        ...authenticationData,
        ca: settings.ca
      });
    }
  }, [settings, authenticationData, setAuthenticationData]);

  function handleChange (name) {
    return (file) => {
      setAuthenticationData({
        ...authenticationData,
        [name]: file
      });
    };
  }

  async function submit (event) {
    event.preventDefault();
    const response = await post('/api/authenticate', authenticationData);
    const token = response.token;
    props.onAuthenticate && props.onAuthenticate(token);
  }

  const continueDisabled = !(
    authenticationData &&
    authenticationData.ca &&
    authenticationData.cert &&
    authenticationData.privateKey
  );

  return (
    <dialog open>
      <article>
        <h1>Authenticate</h1>
        <p>
          Select the client tls files below to authenticate with this data server.
        </p>
        <form onSubmit={submit}>
          <div className='form-field'>
            <label>Certificate Authority (CA)</label>
            <FileInput readonly onChange={handleChange('ca')} value={authenticationData && authenticationData.ca} />
          </div>
          <div className='form-field'>
            <label>Client Certificate</label>
            <FileInput onChange={handleChange('cert')} value={authenticationData && authenticationData.cert} />
          </div>
          <div className='form-field'>
            <label>Private Key</label>
            <FileInput onChange={handleChange('privateKey')} value={authenticationData && authenticationData.privateKey} />
          </div>

          <hr />

          <button disabled={continueDisabled}>Continue</button>
        </form>
      </article>
    </dialog>
  );
}

export default AuthenticationDialog;
