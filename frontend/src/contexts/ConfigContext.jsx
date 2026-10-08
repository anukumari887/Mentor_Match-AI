import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchPublicConfig } from '../services/publicConfig';

const ConfigContext = createContext(null);

export function ConfigProvider({ children, value }) {
  const [config, setConfig] = useState(value || { emailMode: 'live' });

  useEffect(() => {
    if (value) return;
    let active = true;
    fetchPublicConfig().then((cfg) => {
      if (active && cfg) {
        setConfig(cfg);
      }
    });
    return () => {
      active = false;
    };
  }, [value]);

  return (
    <ConfigContext.Provider value={value || config}>
      {children}
    </ConfigContext.Provider>
  );
}

export function usePublicConfig() {
  const context = useContext(ConfigContext);
  const [localConfig, setLocalConfig] = useState({ emailMode: 'live' });

  useEffect(() => {
    if (context) return;
    let active = true;
    fetchPublicConfig().then((cfg) => {
      if (active && cfg) {
        setLocalConfig(cfg);
      }
    });
    return () => {
      active = false;
    };
  }, [context]);

  return context || localConfig;
}
