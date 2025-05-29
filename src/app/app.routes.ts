import { Routes } from '@angular/router';
import { MainContentComponent } from './main-content/main-content.component';
import { LogingPageComponent } from './main-content/loging-page/loging-page.component';

export const routes: Routes = [
    { path: '', component: LogingPageComponent },
];
