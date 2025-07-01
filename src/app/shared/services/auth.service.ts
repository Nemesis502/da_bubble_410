import { inject, Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, GoogleAuthProvider, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { confirmPasswordReset } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private auth: Auth = inject(Auth);
    firestore: Firestore = inject(Firestore);

    async registerUser(email: string, password: string) {
        let cred = await createUserWithEmailAndPassword(this.auth, email, password);
        return cred.user.uid;
    }

    login(email: string, password: string) {
        return signInWithEmailAndPassword(this.auth, email, password);
    }

    async signInWithGoogle() {
        let provider = new GoogleAuthProvider();
        try {
            let result = await signInWithPopup(this.auth, provider);
            let user = result.user;
            // console.log('Google Login erfolgreich:', user);
            return user;
        } catch (error) {
            console.error('Google Login fehlgeschlagen:', error);
            throw error;
        }
    }

    async checkUserExistsInFirestore(uid: string): Promise<boolean> {
        let userRef = doc(this.firestore, 'users', uid);
        let userSnap = await getDoc(userRef);
        return userSnap.exists();
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
                let errorCode = error.code;
                let errorMessage = error.message;
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