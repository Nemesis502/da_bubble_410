import { inject, Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, GoogleAuthProvider, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { confirmPasswordReset } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

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

    async checkUserExistsByEmail(email: string): Promise<boolean> {
        let usersRef = collection(this.firestore, 'users');
        let q = query(usersRef, where('email', '==', email));
        let querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    }

    async logout() {
        try {
            await signOut(this.auth);
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
        }
    }

}