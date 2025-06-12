import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync(),
    provideFirebaseApp(() => initializeApp({ 
      "projectId": "dabubble-410", 
      "appId": "1:524198237065:web:6410e2a9f34a4d1a688758", 
      "storageBucket": "dabubble-410.firebasestorage.app", 
      "apiKey": "AIzaSyCYoio2ZzK0rBWIk7XlUg_88LkFco-_hfU", 
      "authDomain": "dabubble-410.firebaseapp.com", 
      "messagingSenderId": "524198237065" 
    })),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore())
  ]
};