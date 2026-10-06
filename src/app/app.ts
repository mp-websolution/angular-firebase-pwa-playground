import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UpdatePrompt } from './pwa/update-prompt';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UpdatePrompt],
  template: '<router-outlet /><app-update-prompt />',
})
export class App {}
