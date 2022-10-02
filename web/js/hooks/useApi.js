import React from 'react';

function useApi (url, options) {
  const [data, setData] = React.useState();
  const [state, setState] = React.useState('idle');

  React.useEffect(() => {
    (async function () {
      setState('loading');

      try {
        const response = await window.fetch(url, options);
        const data = await response.json();
        setData(data);
        setState('loaded');
      } catch (error) {
        console.log(error);
        setState('error');
      }
    }());
  }, [url, JSON.stringify(options)]);

  return [data, state];
}

export default useApi;
