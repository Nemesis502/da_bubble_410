import { inject, Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, GoogleAuthProvider, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut } from '@angular/fire/auth';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private auth: Auth = inject(Auth);

    async registerUser(email: string, password: string) {
        const cred = await createUserWithEmailAndPassword(this.auth, email, password);
        console.log(cred.user);
    }

    login(email: string, password: string) {
        return signInWithEmailAndPassword(this.auth, email, password);
    }

    async signInWithGoogle() {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(this.auth, provider);
            const user = result.user;
            console.log('Google Login erfolgreich:', user);
            return user;
        } catch (error) {
            console.error('Google Login fehlgeschlagen:', error);
            throw error;
        }
    }

    async logout() {
        try {
            await signOut(this.auth);
            console.log('Erfolgreich abgemeldet');
        } catch (err) {
            console.error('Fehler beim Logout:', err);
        }
    }

    async sendNewPasswordLink(email: string) {
        let result = sendPasswordResetEmail(this.auth, email)
            .then(() => {
                console.log(result);
            })
            .catch((error) => {
                const errorCode = error.code;
                const errorMessage = error.message;
                // ..
            });
    }
}