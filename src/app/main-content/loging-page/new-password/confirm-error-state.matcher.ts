import { ErrorStateMatcher } from '@angular/material/core';
import { FormControl, FormGroupDirective, NgForm } from '@angular/forms';

export class ConfirmErrorStateMatcher implements ErrorStateMatcher {
    isErrorState(
        control: FormControl | null,
        form: FormGroupDirective | NgForm | null
    ): boolean {
        const isSubmitted = !!form && form.submitted;
        const controlInvalid = !!control && control.invalid;
        const groupMismatch = !!control?.parent?.hasError('PasswordNoMatch'); // <-- Gruppenfehler
        const interacted = !!control && (control.touched || control.dirty || isSubmitted);
        return interacted && (controlInvalid || groupMismatch);
    }
}