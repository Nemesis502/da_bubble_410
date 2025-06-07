import { Routes } from '@angular/router';
import { LogingPageComponent } from './main-content/loging-page/loging-page.component';
import { SingInPageComponent } from './main-content/loging-page/sing-in-page/sing-in-page.component';
import { ChooseAvatarPageComponent } from './main-content/loging-page/sing-in-page/choose-avatar-page/choose-avatar-page.component';
import { ChatTemplateComponent } from './main-content/chat-template/chat-template.component';
import { MainMenuComponent } from './main-content/main-menu/main-menu.component';

export const routes: Routes = [
    { path: '', component: LogingPageComponent },
    { path: 'singIn', component: SingInPageComponent },
    { path: 'singIn/chooseAvatar', component: ChooseAvatarPageComponent },
    { path: 'chat', component: ChatTemplateComponent },
     { path: 'main', component: MainMenuComponent },
];
