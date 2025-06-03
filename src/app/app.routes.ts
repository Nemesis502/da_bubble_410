import { Routes } from '@angular/router';
import { LogingPageComponent } from './main-content/loging-page/loging-page.component';
import { SingInPageComponent } from './main-content/loging-page/sing-in-page/sing-in-page.component';

export const routes: Routes = [
    { path: '', component: LogingPageComponent },
    { path: 'singIn', component: SingInPageComponent },
];
