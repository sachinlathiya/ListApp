import React, { useState, useEffect } from 'react';
import './App.css';
import logo from './assets/logo.png';
import loader from './assets/loader.svg';
import arrowIcon from './assets/back.png';

const { exec } = window.require('child_process');
const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

function App() {
  const [loading, setLoading] = useState(true);
  const [showMainPage, setShowMainPage] = useState(false);
  const [apps, setApps] = useState([]);
  const [filteredApps, setFilteredApps] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  //convert icns to base64 fron elctron ipcRenderer
  const imageUrlToBase64 = async (url) => {
    try {
      const base64data = await ipcRenderer.invoke('read-local-file', url);
      return base64data;
    } catch (error) {
      console.error('Error reading file:', error);
    }
  };

  const fetchApps = async () => {
    setLoading(true);
    let command;
    //get app list os wise
    if (process.platform === 'darwin') {
      command = 'mdfind "kMDItemContentType == \'com.apple.application-bundle\'"';
    } else if (process.platform === 'win32') {
      command = 'powershell "Get-ChildItem \'C:\\Program Files\\\' -Name -Directory"';
    } else {
      command = 'ls /usr/share/applications';
    }

    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        setLoading(false);
        return;
      }

      let appList;
      if (process.platform === 'win32') {
        appList = stdout.split('\n').filter(app => app.endsWith('.exe'));
      } else if (process.platform === 'darwin') {
        const appPaths = stdout.split('\n').filter(path => path.endsWith('.app'));
        appList = await Promise.all(appPaths.map(async path => {
          const nameMatches = path.match(/\/([^/]+)\.app/);
          const name = nameMatches ? nameMatches[1] : path;
          const iconPath = `${path}/Contents/Resources/appIcon.icns`;
          console.log(`App found: ${name}, Path: ${path}, Icon: ${iconPath}`);
          const base64data = await imageUrlToBase64(iconPath);
          return { name, path, icon: base64data, description: `Description of ${name}` };
        }));
      } else { // Linux
        appList = stdout.split('\n').filter(app => app.endsWith('.desktop')).map(app => {
          const name = app.replace('.desktop', '');
          const iconPath = `/usr/share/icons/hicolor/256x256/apps/${name}.png`;
          console.log(`App found: ${name}, Path: ${app}, Icon: ${iconPath}`);
          return { name, path: app, icon: iconPath, description: `Description of ${name}` };
        });
      }

      let filteredApps = appList.filter(app =>
        app.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      filteredApps.sort((a, b) => {
        if (a.icon && !b.icon) return -1;
        if (!a.icon && b.icon) return 1;
        return 0;
      });

      ipcRenderer.send(
        'window-resize',
        600,
        800
      )

      setLoading(false);
      setShowMainPage(true);
      setApps([...filteredApps]);
      setFilteredApps([...filteredApps]);
    });
  };

  const handleBackButtonClick = () => {
    ipcRenderer.send(
      'window-resize',
      600,
      400
    )
    setShowMainPage(false);
    setApps([]);
    setFilteredApps([]);
    setSearchTerm('');
  };

  const handleSearchButtonClick = () => {

    const filteredApps = apps.filter(app =>
      app.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filteredApps.sort((a, b) => {
      if (a.icon && !b.icon) return -1;
      if (!a.icon && b.icon) return 1;
      return 0;
    });
    setFilteredApps([...filteredApps]);
  };

  const handleInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleSearchButtonClick();
    }
  };

  //app open on icon click from list
  const openApp = (appPath) => {
    let openCommand;
    if (process.platform === 'win32') {
      openCommand = `start "" "C:\\Program Files\\${appPath}"`;
    } else if (process.platform === 'darwin') {
      openCommand = `open ${appPath}`;
    } else {
      openCommand = `xdg-open ${appPath}`;
    }

    exec(openCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
    });
  };

  return (
    <div className="App">
      {loading ? (
        <div className="SplashScreen">
          <img src={logo} className="App-logo" alt="logo" />
          <div className="LoaderContainer">
            <img src={loader} className="Loader" alt="loading" />
            <p>Loading apps...</p>
          </div>
        </div>
      ) : showMainPage ? (
        <div>
          <header className={`App-header ${showMainPage ? 'App-header-small' : ''}`}>
            <button className="BackButton" onClick={handleBackButtonClick}>
              <img src={arrowIcon} alt="Back" />
            </button>
            <h1>App List</h1>
          </header>
          <div className="SearchContainer">
            <input
              type="text"
              value={searchTerm}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Search apps..."
              className="SearchInput"
            />
            <button className="SearchButton" onClick={handleSearchButtonClick}>
              Search
            </button>
          </div>
          <div className="App-list">
            {filteredApps.map(app => (
              <div key={app.name} className="App-item" onClick={() => openApp(app.path)}>
                {app.icon ? (
                  <img src={app.icon} alt={app.name} className="App-icon" />
                ) : (
                  <img src={logo} alt="Default Icon" className="App-icon" />
                )}
                <div className="App-details">
                  <h2>{app.name}</h2>
                  <p>{app.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <header className="App-header">
          <img src={logo} className="App-main-logo" alt="logo" />
          <h1>Apps</h1>
          <p>Your go-to app for managing and launching applications.</p>
          <button className="ListButton" onClick={fetchApps}>Show Apps</button>
        </header>
      )}
    </div>
  );
}

export default App;
