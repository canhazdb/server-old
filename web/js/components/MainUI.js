import React from 'react';
import useApi from '../hooks/useApi.js';
import styled from '@emotion/styled';
import classnames from 'classnames';

const mainUiStyle = {
  display: 'flex',
  flexGrow: 1
};

const CollectionsListView = styled.div(`
  flex-grow: 1;

  ul {
    margin: 5px;
    padding: 0;
  }

  ul > li {
    margin: 0 0 3px 0;
    padding: 0;
    list-style: none;
  }
  ul > li {
    display: flex;
    place-items: center;
    padding: 5px;
    background-color: white;
    border-radius: 3px;
  }

  .panel-title {
    padding: 5px 10px 0 10px;
    font-weight: bold;
  }
`);

const CollectionsTree = styled.div(`
  background-color: white;

  ul {
    padding: 0;
    margin: 0;
  }

  ul > li > a:hover {
    background-color: #325759;
  }

  ul > li > a > img {
    height: 20px;
    margin-right: 5px;
  }
  ul > li.active > a {
    background-color: #325759;
  }
  ul > li > a {
    display: flex;
    place-items: center;
    background-color: #588486;
    color: white;
    padding: 5px 10px 5px 5px;
    text-decoration: none;
  }
`);

function MainUI (props) {
  const collectionId = window.location.pathname.substr(1) || 'system.collections';

  const [collections] = useApi('/api/system.collections', {
    headers: {
      authorisation: props.authToken
    }
  });

  const [documents] = useApi(`/api/${collectionId}?limit=10`, {
    headers: {
      authorisation: props.authToken
    }
  });

  return (
    <div style={mainUiStyle}>
      <CollectionsTree>
        <ul>
          {(collections || []).map(collection => {
            return (
              <li
                key={collection.id}
                className={
                  classnames({
                    active: collection.collectionId === collectionId
                  })
                }
              >
                <a href={`/${collection.collectionId}`}>
                  <img src={require('../../img/folderWhite.svg').default} />
                  {collection.collectionId}
                </a>
              </li>
            );
          })}
        </ul>
      </CollectionsTree>

      <CollectionsListView>
        <div className='panel-title'>{collectionId}</div>
        <ul>
          {(documents || []).map(collection => {
            return (
              <li key={collection.id}>
                <pre><code>{JSON.stringify(collection, null, 2)}</code></pre>
              </li>
            );
          })}
        </ul>
      </CollectionsListView>
    </div>
  );
}

export default MainUI;
