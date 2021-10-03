import React from 'react';
import readFile from '../utils/readFile.js';

function FileInput (props) {
  const [state, setState] = React.useState(props.value);

  React.useEffect(function () {
    if (state !== props.value) {
      setState(props.value);
    }
  }, [state, props]);

  async function handleChange (event) {
    const file = event.target.files[0];

    if (!file) {
      setState(null);
      return;
    }

    const newState = {
      name: file.name,
      data: await readFile(file)
    };

    setState(newState);
    props.onChange && props.onChange(newState);
  }

  return (
    <>
      {state
        ? (
          <div className='file-value'>
            <img src={require('../../img/file.svg').default} />
            {state.name}
          </div>
          )
        : null}
      {!props.readonly && <input type='file' onChange={handleChange} />}
    </>
  );
}

export default FileInput;
