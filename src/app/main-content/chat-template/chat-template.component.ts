import { Component } from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatCardModule} from '@angular/material/card';
import { Router } from '@angular/router';

@Component({
  selector: 'app-chat-template',
  standalone: true,
  imports: [MatIconModule, MatCardModule],
  templateUrl: './chat-template.component.html',
  styleUrl: './chat-template.component.scss'
})
export class ChatTemplateComponent {
  constructor(private router: Router) {}

  navigateToMain() {
    this.router.navigate(['/main']);
  }
}
