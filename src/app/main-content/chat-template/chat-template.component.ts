import { Component } from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatCardModule} from '@angular/material/card';

@Component({
  selector: 'app-chat-template',
  standalone: true,
  imports: [MatIconModule, MatCardModule],
  templateUrl: './chat-template.component.html',
  styleUrl: './chat-template.component.scss'
})
export class ChatTemplateComponent {

}
