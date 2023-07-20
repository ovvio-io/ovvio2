import { Fragment, useRef } from 'react';
import config from 'core/config';
import { initializeApp } from "firebase/app";
import 'firebase/auth';

interface FirebaseAppInitProps {
  children: any;
}

export default function FirebaseAppInit({ children }: FirebaseAppInitProps) {
  const hasInitRef = useRef(false);

  if (!hasInitRef.current) {
    initializeApp(config.firebase);
    hasInitRef.current = true;
  }

  return <Fragment>{children}</Fragment>;
}
