import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthSession } from '../../../auth/auth-session';
import { NoteForm } from './note-form';
import { NotesData } from './notes-data';

@Component({
  selector: 'app-notes',
  imports: [NoteForm, RouterLink],
  templateUrl: './notes.html',
})
export class Notes {
  protected readonly session = inject(AuthSession);
  protected readonly notesData = inject(NotesData);

  protected readonly editingId = signal<string | undefined>(undefined);

  protected readonly createNote = (text: string) => this.notesData.create(text);

  protected readonly updateNote = async (text: string) => {
    const id = this.editingId();
    if (id) {
      await this.notesData.update(id, text);
    }
    this.editingId.set(undefined);
  };
}
