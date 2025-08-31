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

    // Registers a new user with email and password
    // Returns the UID of the created user
    async registerUser(email: string, password: string) {
        let cred = await createUserWithEmailAndPassword(this.auth, email, password);
        return cred.user.uid;
    }

    // Logs in a user with email and password
    login(email: string, password: string) {
        return signInWithEmailAndPassword(this.auth, email, password);
    }

    // Signs in a user with Google popup authentication
    // Returns the signed-in user object
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

    // Checks if a user document exists in Firestore by UID
    async checkUserExistsInFirestore(uid: string): Promise<boolean> {
        let userRef = doc(this.firestore, 'users', uid);
        let userSnap = await getDoc(userRef);
        return userSnap.exists();
    }

    // Checks if a user exists in Firestore by email
    async checkUserExistsByEmail(email: string): Promise<boolean> {
        let usersRef = collection(this.firestore, 'users');
        let q = query(usersRef, where('email', '==', email));
        let querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    }

    // Logs out the currently signed-in user
    async logout() {
        try {
            await signOut(this.auth);
        } catch (err) {
            console.error('Fehler beim Logout:', err);
        }
    }

    // Sends a password reset email to the given address
    async sendNewPasswordLink(email: string) {
        let result = sendPasswordResetEmail(this.auth, email)
            .then(() => {
            })
            .catch((error) => {
                let errorCode = error.code;
                let errorMessage = error.message;
            });
    }

    // Confirms a password reset using the oobCode from email and sets a new password
    async setNewPassword(oobCode: string, newPassword: string) {
        try {
            await confirmPasswordReset(this.auth, oobCode, newPassword);
        } catch (error) {
            console.error('Passwort-Zurücksetzen fehlgeschlagen:', error);
        }
    }
}
