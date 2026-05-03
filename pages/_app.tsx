/*
# Copyright 2020 Open Climate Tech Contributors
# Licensed under the Apache License, Version 2.0
*/

import React, { useEffect, useState } from 'react';
import type { AppProps } from 'next/app';
import Link from 'next/link';
import { useRouter } from 'next/router';

import '../src/App.css';
import '../src/index.css';
import '../src/Login.css';
import {
  getServerUrl,
  serverGet,
  Legalese,
} from './OctReactUtils';

function FirePagesHeader({ validCookie }: { validCookie: boolean }) {
  const router = useRouter();
  const myPath = router.pathname;

  async function logout() {
    const serverUrl = getServerUrl('/api/logout');
    const logoutResp = await serverGet(serverUrl);
    const logoutText = await (logoutResp as Response).text();
    if (logoutText === 'success') {
      window.location.reload();
    }
  }

  function login() {
    router.push({
      pathname: '/login',
      query: { fwdPath: myPath },
    });
  }

  return (
    <div>
      <div className="w3-bar w3-wide w3-padding w3-card">
        <div className="w3-col s2 w3-button w3-block">
          <Link href="/">Home</Link>
        </div>
        <div className="w3-col s3 w3-button w3-block">
          <Link href="/wildfirecheck">Potential fires</Link>
        </div>
        <div className="w3-col s3 w3-button w3-block">
          <Link href="/confirmed">Confirmed fires</Link>
        </div>
        <div className="w3-col s2 w3-button w3-block">
          <Link href="/preferences">Preferences</Link>
        </div>
        <div className="w3-col s2 w3-button w3-block">
          {validCookie ? (
            <button className="w3-black w3-round-large" onClick={logout}>
              Sign off
            </button>
          ) : (
            <button className="w3-black w3-round-large" onClick={login}>
              Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyApp({ Component, pageProps }: AppProps) {
  const [validCookie, setValidCookie] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const resp = await serverGet(getServerUrl('/api/checkAuth'));
        const text = await (resp as Response).text();
        setValidCookie(text === 'success');
      } catch (e) {
        setValidCookie(false);
      }
    })();
  }, []);

  // Forward query-string redirects (legacy `?redirect=/path`) once on mount.
  const router = useRouter();
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (redirect && redirect.startsWith('/')) {
      router.replace(redirect);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="App">
      {router.pathname !== '/' && <FirePagesHeader validCookie={validCookie} />}
      <Component {...pageProps} validCookie={validCookie} />
      <Legalese />
    </div>
  );
}
