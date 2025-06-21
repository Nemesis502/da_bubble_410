import { inject, Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, GoogleAuthProvider, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut } from '@angular/fire/auth';
import { confirmPasswordReset, getAuth, updatePassword } from 'firebase/auth';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private auth: Auth = inject(Auth);

    async registerUser(email: string, password: string) {
        let cred = await createUserWithEmailAndPassword(this.auth, email, password);
        return cred.user.uid;
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

            })
            .catch((error) => {
                const errorCode = error.code;
                const errorMessage = error.message;
            });
    }

    async setNewPassword(oobCode: string, newPassword: string) {
        try {
            await confirmPasswordReset(this.auth, oobCode, newPassword);
        } catch (error) {
            console.error('Passwort-Zurücksetzen fehlgeschlagen:', error);
            // Fehler anzeigen, z. B. Link abgelaufen, ungültig, etc.
        }
    }

}