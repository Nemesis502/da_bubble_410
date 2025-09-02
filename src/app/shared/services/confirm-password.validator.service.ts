import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const confirmPasswordValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    const pwd = group.get('password')?.value;
    const confirm = group.get('passwordContoll')?.value; // exakt gleicher Key wie im FormGroup
    const mismatch = !!pwd && !!confirm && pwd !== confirm;
    return mismatch ? { PasswordNoMatch: true } : null;
};